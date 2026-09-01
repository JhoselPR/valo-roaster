import type { VercelRequest, VercelResponse } from '@vercel/node'
import { parseRiotId } from '../src/domain/riotId.js'
import { AppError } from '../src/server/errors.js'
import { requireMethod, sendError } from '../src/server/http.js'
import { createPlayerSnapshot } from '../src/server/snapshot.js'
import { normalizePlayer } from '../src/server/valorant/normalizePlayer.js'
import { ParseStatsProvider } from '../src/server/valorant/parseProvider.js'
import type { StatsProvider } from '../src/server/valorant/provider.js'

type PlayerHandlerDependencies = {
  createProvider: (apiKey: string) => StatsProvider
  getEnvironment: () => { apiKey?: string; signingSecret?: string }
}

const defaultDependencies: PlayerHandlerDependencies = {
  createProvider: (apiKey) => new ParseStatsProvider({ apiKey }),
  getEnvironment: () => ({ apiKey: process.env.PARSE_API_KEY, signingSecret: process.env.PLAYER_STATS_SIGNING_SECRET }),
}

function logUnexpectedError(error: unknown): void {
  if (error instanceof AppError) return

  const issues = typeof error === 'object' && error !== null && 'issues' in error && Array.isArray(error.issues)
    ? error.issues.slice(0, 10).map((issue: unknown) => {
        if (typeof issue !== 'object' || issue === null) return { code: 'unknown', path: '' }
        const value = issue as { code?: unknown; path?: unknown }
        return {
          code: typeof value.code === 'string' ? value.code : 'unknown',
          path: Array.isArray(value.path) ? value.path.filter((part) => typeof part === 'string' || typeof part === 'number').join('.') : '',
        }
      })
    : undefined

  console.error('[api/player] Unexpected server error', {
    name: error instanceof Error ? error.name : typeof error,
    ...(issues ? { issues } : {}),
  })
}

export function createPlayerHandler(dependencies: PlayerHandlerDependencies = defaultDependencies) {
  return async function handler(request: VercelRequest, response: VercelResponse): Promise<void> {
  try {
    requireMethod(request, 'GET')
    const raw = Array.isArray(request.query.riotId) ? request.query.riotId[0] : request.query.riotId
    const riotId = typeof raw === 'string' ? parseRiotId(raw) : null
    if (!riotId) throw new AppError('INVALID_RIOT_ID', 400, 'Enter a valid Riot ID in Name#TAG format.')
    const { apiKey, signingSecret: secret } = dependencies.getEnvironment()
    if (!apiKey || !secret) throw new AppError('STATS_PROVIDER_ERROR', 503, 'Server integration is not configured.')
    const provider = dependencies.createProvider(apiKey)
    const stats = normalizePlayer(await provider.getPlayerData(riotId), riotId)
    response.setHeader('Cache-Control', 'private, no-store')
    response.status(200).json({ data: stats, snapshot: createPlayerSnapshot(stats, secret) })
  } catch (error) {
    logUnexpectedError(error)
    sendError(response, error)
  }
}
}

export default createPlayerHandler()
