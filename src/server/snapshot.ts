import { createHmac, timingSafeEqual } from 'node:crypto'
import { playerStatsSchema, type PlayerStats } from '../shared/schemas'
import { AppError } from './errors'

type SnapshotPayload = { stats: PlayerStats; expiresAt: number }
const encode = (value: string) => Buffer.from(value).toString('base64url')
const sign = (body: string, secret: string) => createHmac('sha256', secret).update(body).digest('base64url')

export function createPlayerSnapshot(stats: PlayerStats, secret: string, now = Date.now()): string {
  const body = encode(JSON.stringify({ stats, expiresAt: now + 10 * 60_000 } satisfies SnapshotPayload))
  return `${body}.${sign(body, secret)}`
}

export function verifyPlayerSnapshot(snapshot: string, secret: string, now = Date.now()): PlayerStats {
  const [body, signature, extra] = snapshot.split('.')
  if (!body || !signature || extra) throw new AppError('INVALID_RIOT_ID', 400, 'The player snapshot is invalid.')
  const expected = Buffer.from(sign(body, secret))
  const actual = Buffer.from(signature)
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) throw new AppError('INVALID_RIOT_ID', 400, 'The player snapshot is invalid.')
  try {
    const decoded = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as unknown
    if (typeof decoded !== 'object' || decoded === null || !('expiresAt' in decoded) || typeof decoded.expiresAt !== 'number' || decoded.expiresAt < now || !('stats' in decoded)) {
      throw new Error('Expired or malformed snapshot')
    }
    return playerStatsSchema.parse(decoded.stats)
  } catch {
    throw new AppError('INVALID_RIOT_ID', 400, 'The player snapshot is invalid or expired.')
  }
}
