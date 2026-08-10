alter table public.bookings
  add column if not exists external_source text,
  add column if not exists external_booking_id text;

create unique index if not exists bookings_external_identity_unique
  on public.bookings (external_source, external_booking_id)
  where external_source is not null and external_booking_id is not null;

create table if not exists public.integration_callback_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  external_event_id text not null,
  event_type text not null,
  external_reference text,
  status text not null check (status in ('processed', 'ignored', 'failed')),
  payload_sha256 text not null,
  error_message text,
  processed_at timestamptz not null default now(),
  unique (provider, external_event_id)
);

alter table public.integration_callback_events enable row level security;
revoke all on public.integration_callback_events from anon, authenticated;

create or replace function public.process_mafrex_booking_confirmed_callback(
  p_event_id text,
  p_payload_sha256 text,
  p_external_booking_id text,
  p_booking_reference text,
  p_confirmation_code text,
  p_guest_name text,
  p_guest_email text,
  p_guest_phone text,
  p_external_room_id text,
  p_room_number text,
  p_check_in date,
  p_check_out date,
  p_guests integer,
  p_total_amount numeric,
  p_payment_reference text,
  p_qr_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_event integration_callback_events%rowtype;
  v_room rooms%rowtype;
  v_booking bookings%rowtype;
  v_nights integer;
begin
  perform pg_advisory_xact_lock(hashtext('mafrex-callback:' || p_event_id));

  select * into v_existing_event
  from integration_callback_events
  where provider = 'mafrexai' and external_event_id = p_event_id;

  if v_existing_event.id is not null then
    return jsonb_build_object('duplicate', true, 'booking_reference', v_existing_event.external_reference);
  end if;

  if p_check_in is null or p_check_out is null or p_check_in >= p_check_out then
    raise exception 'INVALID_BOOKING_DATES';
  end if;
  if p_guests is null or p_guests < 1 then
    raise exception 'INVALID_GUEST_COUNT';
  end if;
  if p_total_amount is null or p_total_amount < 0 then
    raise exception 'INVALID_TOTAL_AMOUNT';
  end if;

  select * into v_room
  from rooms
  where is_active = true
    and (id::text = p_external_room_id or room_number = p_room_number)
  order by case when id::text = p_external_room_id then 0 else 1 end
  limit 1
  for update;
  if v_room.id is null then
    raise exception 'ROOM_NOT_FOUND';
  end if;
  if p_guests > v_room.max_occupancy then
    raise exception 'ROOM_CAPACITY_EXCEEDED';
  end if;

  select * into v_booking
  from bookings
  where external_source = 'mafrexai' and external_booking_id = p_external_booking_id
  for update;

  if v_booking.id is null then
    if not check_room_availability(v_room.id, p_check_in, p_check_out) then
      raise exception 'ROOM_NOT_AVAILABLE';
    end if;

    v_nights := p_check_out - p_check_in;
    insert into bookings (
      booking_reference, confirmation_code, guest_name, guest_email, guest_phone,
      total_amount, status, payment_status, payment_reference, payment_provider,
      qr_code, check_in_date, check_out_date, booking_type,
      external_source, external_booking_id
    ) values (
      p_booking_reference, p_confirmation_code, trim(p_guest_name), lower(trim(p_guest_email)),
      nullif(trim(p_guest_phone), ''), p_total_amount, 'confirmed', 'paid',
      p_payment_reference, 'mafrexpay', p_qr_code, p_check_in, p_check_out, 'online',
      'mafrexai', p_external_booking_id
    ) returning * into v_booking;

    insert into booking_items (
      booking_id, item_type, item_id, quantity, price_at_booking,
      start_date, end_date, metadata
    ) values (
      v_booking.id, 'room', v_room.id, v_nights,
      case when v_nights > 0 then p_total_amount / v_nights else p_total_amount end,
      p_check_in, p_check_out,
      jsonb_build_object('guests', p_guests, 'room_number', v_room.room_number, 'source', 'mafrexai_callback')
    );
  else
    update bookings set
      status = 'confirmed', payment_status = 'paid', payment_reference = p_payment_reference,
      confirmation_code = p_confirmation_code, qr_code = coalesce(p_qr_code, qr_code),
      updated_at = now()
    where id = v_booking.id
    returning * into v_booking;
  end if;

  insert into integration_callback_events (
    provider, external_event_id, event_type, external_reference, status, payload_sha256
  ) values (
    'mafrexai', p_event_id, 'booking.confirmed', v_booking.booking_reference, 'processed', p_payload_sha256
  );

  return jsonb_build_object('duplicate', false, 'booking_id', v_booking.id, 'booking_reference', v_booking.booking_reference);
end;
$$;

revoke all on function public.process_mafrex_booking_confirmed_callback(
  text, text, text, text, text, text, text, text, text, text, date, date, integer, numeric, text, text
) from public, anon, authenticated;
grant execute on function public.process_mafrex_booking_confirmed_callback(
  text, text, text, text, text, text, text, text, text, text, date, date, integer, numeric, text, text
) to service_role;
