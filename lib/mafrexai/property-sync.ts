import 'server-only'
import { createHash } from 'crypto'

const defaultBaseUrl = 'https://www.mafrexai.com'

export type PropertySyncResource = 'room-categories' | 'rooms' | 'bookings' | 'checkins'

export interface PropertySyncResponse {
  ok: boolean
  status: number
  requestId: string | null
  runId: string | null
  data: Record<string, unknown>
}

export class PropertySyncError extends Error {
  constructor(
    message: string,
    public readonly status = 500,
    public readonly code = 'PROPERTY_SYNC_ERROR',
    public readonly details: Record<string, unknown> = {}
  ) {
    super(message)
  }
}

export function getPropertySyncConfiguration() {
  const key = process.env.MAFREXAI_PROPERTY_SYNC_KEY?.trim() || ''
  const baseUrl = (process.env.MAFREXAI_PROPERTY_SYNC_BASE_URL || defaultBaseUrl).replace(/\/+$/, '')
  const externalSource = process.env.MAFREXAI_PROPERTY_SYNC_SOURCE?.trim() || 'atican-website'
  return {
    configured: Boolean(key && key.startsWith('mfx_sync_')),
    baseUrl,
    externalSource,
    keyPrefix: key ? key.slice(0, 16) : null,
  }
}

export async function pushPropertySyncResource(resource: PropertySyncResource, payload: Record<string, unknown>) {
  const key = requireSyncKey()
  const body = JSON.stringify(payload)
  const idempotencyKey = `atican-${resource}-${createHash('sha256').update(body).digest('hex').slice(0, 32)}`
  return propertySyncRequest(`/api/v1/property-sync/${resource}`, {
    method: 'PUT',
    body,
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
  }, key)
}

export async function testPropertySyncConnection() {
  const key = requireSyncKey()
  const checkIn = new Date()
  checkIn.setUTCDate(checkIn.getUTCDate() + 30)
  const checkOut = new Date(checkIn)
  checkOut.setUTCDate(checkOut.getUTCDate() + 1)
  const query = new URLSearchParams({
    check_in_date: checkIn.toISOString().slice(0, 10),
    check_out_date: checkOut.toISOString().slice(0, 10),
    guests: '1',
  })
  return propertySyncRequest(`/api/v1/property-sync/availability?${query}`, { method: 'GET' }, key)
}

async function propertySyncRequest(path: string, init: RequestInit, key: string): Promise<PropertySyncResponse> {
  const { baseUrl } = getPropertySyncConfiguration()
  let response: Response
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...init,
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
      headers: { Authorization: `Bearer ${key}`, Accept: 'application/json', ...init.headers },
    })
  } catch (error) {
    throw new PropertySyncError(
      error instanceof DOMException && error.name === 'TimeoutError'
        ? 'MafrexAI did not respond within 15 seconds.'
        : 'MafrexAI Property Sync is currently unreachable.',
      503,
      'PROPERTY_SYNC_UNAVAILABLE'
    )
  }

  const raw = await response.text()
  let data: Record<string, unknown> = {}
  if (raw) {
    try { data = JSON.parse(raw) as Record<string, unknown> }
    catch { data = { message: raw.slice(0, 500) } }
  }
  if (!response.ok) {
    const nested = data.error && typeof data.error === 'object' ? data.error as Record<string, unknown> : null
    throw new PropertySyncError(
      String(nested?.message || data.message || `MafrexAI returned HTTP ${response.status}.`),
      response.status,
      String(nested?.code || data.code || 'PROPERTY_SYNC_REJECTED'),
      data
    )
  }
  return {
    ok: true,
    status: response.status,
    requestId: stringValue(data.request_id) || response.headers.get('x-request-id'),
    runId: stringValue(data.run_id) || stringValue(data.sync_run_id),
    data,
  }
}

function requireSyncKey() {
  const key = process.env.MAFREXAI_PROPERTY_SYNC_KEY?.trim()
  if (!key || !key.startsWith('mfx_sync_')) {
    throw new PropertySyncError('Property Sync is not configured with a valid mfx_sync_ key.', 503, 'PROPERTY_SYNC_NOT_CONFIGURED')
  }
  return key
}

function stringValue(value: unknown) {
  return typeof value === 'string' && value ? value : null
}
