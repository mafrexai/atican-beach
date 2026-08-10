# MafrexAI booking confirmation callback

Atican receives confirmed reception-QR bookings at:

```text
POST https://www.aticanbeachresort.com/api/mafrexai/booking-callback
```

Configure this exact URL as the Property Sync callback URL in MafrexAI. The original `/api/integrations/mafrexai/callback` route remains a compatible alias.

## Server environment

```env
MAFREX_SYNC_CLIENT_ID=property-sync-client-uuid
MAFREX_SYNC_CALLBACK_SECRET=high-entropy-callback-secret
```

Both values are server-only. Never expose them through a `NEXT_PUBLIC_` variable.

## Required headers

```http
Content-Type: application/json
X-MafrexAI-Event: booking.confirmed
X-MafrexAI-Client: property-sync-client-uuid
X-MafrexAI-Delivery: delivery-uuid
X-MafrexAI-Signature: lowercase_hex_hmac_sha256
```

The signature is:

```text
hex(HMAC-SHA256(callback_secret, exact_raw_utf8_request_body))
```

There is no `sha256=` prefix. Atican performs a constant-time comparison before parsing JSON.

## Payload

The receiver implements the callback body documented at `/developers/property-sync`: top-level `event`, `created_at`, `hotel_id`, `booking`, and `room` objects. `room.external_room_id` should be the Atican room UUID pushed to MafrexAI; the receiver can safely fall back to the supplied room number if required.

`booking.guests` is accepted when supplied. Because the current MafrexAI public example omits it, Atican defaults it to one guest for booking-item metadata.

## Responses

- `201`: booking safely recorded for the first time.
- `200`: delivery was already processed; no duplicate booking was created.
- `400`: malformed body or missing identity headers.
- `401`: invalid HMAC signature.
- `403`: Property Sync client ID does not match Atican.
- `409`: room or booking-reference conflict.
- `422`: unsupported event, invalid dates, unknown room, or capacity mismatch.
- `500`, `503`: temporary receiver failure; retry is safe.

MafrexAI should treat every `2xx` response as delivered. Atican stores and deduplicates the stable `X-MafrexAI-Delivery` value.


some new test textS