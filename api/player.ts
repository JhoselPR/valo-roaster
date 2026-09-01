import type { VercelRequest, VercelResponse } from '@vercel/node'
import { parseRiotId } from '../src/domain/riotId'
import { AppError } from '../src/server/errors'
import { requireMethod, sendError } from '../src/server/http'
import { createPlayerSnapshot } from '../src/server/snapshot'
import { normalizePlayer } from '../src/server/valorant/normalizePlayer'
import { ParseStatsProvider } from '../src/server/valorant/parseProvider'
import type { StatsProvider } from '../src/server/valorant/provider'

type PlayerHandlerDependencies = {
  createProvider: (apiKey: string) => StatsProvider
  getEnvironment: () => { apiKey?: string; signingSecret?: string }
}

const defaultDependencies: PlayerHandlerDependencies = {
  createProvider: (apiKey) => new ParseStatsProvider({ apiKey }),
  getEnvironment: () => ({ apiKey: process.env.PARSE_API_KEY, signingSecret: process.env.PLAYER_STATS_SIGNING_SECRET }),
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
    sendError(response, error)
  }
}
}

export default createPlayerHandler()
