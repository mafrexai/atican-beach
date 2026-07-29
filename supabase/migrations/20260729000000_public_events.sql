create table if not exists public.public_events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 140),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  summary text not null check (char_length(summary) between 10 and 320),
  description text not null check (char_length(description) between 20 and 6000),
  venue text not null default 'Atican Beach Resort, Okun-Ajah, Lagos',
  starts_at timestamptz not null,
  ends_at timestamptz,
  recurrence_label text,
  ticket_price numeric(12,2) check (ticket_price is null or ticket_price >= 0),
  payment_url text check (payment_url is null or payment_url ~ '^https://(www\.)?mafrexai\.com/'),
  cover_image_url text,
  gallery_images text[] not null default '{}',
  video_url text,
  highlights text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'published', 'cancelled')),
  is_featured boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);

create index if not exists public_events_public_schedule_idx
  on public.public_events (status, starts_at);
create index if not exists public_events_featured_idx
  on public.public_events (is_featured, starts_at)
  where status = 'published';

alter table public.public_events enable row level security;

drop policy if exists "Published events are publicly readable" on public.public_events;
create policy "Published events are publicly readable"
  on public.public_events for select
  using (status = 'published');

drop policy if exists "Managers can manage public events" on public.public_events;
create policy "Managers can manage public events"
  on public.public_events for all
  using (
    exists (
      select 1 from public.user_roles
      where user_roles.user_id = auth.uid()
        and user_roles.role in ('manager', 'admin')
        and coalesce(user_roles.is_active, true)
    )
  )
  with check (
    exists (
      select 1 from public.user_roles
      where user_roles.user_id = auth.uid()
        and user_roles.role in ('manager', 'admin')
        and coalesce(user_roles.is_active, true)
    )
  );

create or replace function public.touch_public_events_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists public_events_updated_at on public.public_events;
create trigger public_events_updated_at
before update on public.public_events
for each row execute function public.touch_public_events_updated_at();

insert into public.public_events (
  title, slug, summary, description, venue, starts_at, ends_at,
  ticket_price, payment_url, cover_image_url, highlights, status, is_featured
)
values (
  'Afro Live Band At the Beach',
  'afro-live-band-at-the-beach',
  'Live Afro sounds, ocean air and a high-energy beach night at Atican.',
  'Join us for Afro Live Band At the Beach—an electric night of live music, ocean views and unforgettable Lagos beach energy. Come early, settle in and enjoy the show with your people.',
  'Atican Beach Resort, Okun-Ajah off Coastal Road, Lagos',
  '2026-10-03 19:00:00+01',
  '2026-10-04 01:00:00+01',
  10000,
  'https://www.mafrexai.com/h/atican-beach-resort/pay/afro-live-band-at-the-beach',
  '/images/events/afro-live-band-at-the-beach.png',
  array['Live Afro band', 'Beachfront atmosphere', 'Complimentary tequila shots for early arrivals'],
  'published',
  true
)
on conflict (slug) do nothing;

alter table public.concierge_offers
  drop constraint if exists concierge_offers_target_type_check;
alter table public.concierge_offers
  add constraint concierge_offers_target_type_check
  check (target_type in ('room', 'experience', 'tent', 'event_space', 'public_event'));
