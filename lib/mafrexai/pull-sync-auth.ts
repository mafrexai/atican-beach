import 'server-only'
import { createHash, timingSafeEqual } from 'crypto'

export function authorizeMafrexAIPull(request: Request) {
  const configuredToken = process.env.MAFREXAI_PULL_SYNC_TOKEN?.trim()
  const authorization = request.headers.get('authorization') || ''
  const suppliedToken = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : ''
  if (!configuredToken || !suppliedToken) return false

  const expected = createHash('sha256').update(configuredToken).digest()
  const received = createHash('sha256').update(suppliedToken).digest()
  return timingSafeEqual(expected, received)
}
