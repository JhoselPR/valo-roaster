import type { RiotId } from '../../domain/riotId.js'
import { AppError } from '../errors.js'
import type { ProviderPayload, StatsProvider } from './provider.js'

const BASE_URL = 'https://api.parse.bot/scraper/6517942a-644e-4cbc-9349-6e6d5ddaa622'
// The MCP-confirmed scraper contract is release 11. The runtime route resolves
// that deployed release; the REST schema exposes no version query parameter.

type ParseProviderOptions = { apiKey: string; timeoutMs?: number; fetcher?: typeof fetch }

export class ParseStatsProvider implements StatsProvider {
  private readonly options: ParseProviderOptions
  private readonly timeoutMs: number
  private readonly fetcher: typeof fetch

  constructor(options: ParseProviderOptions) {
    this.options = options
    this.timeoutMs = options.timeoutMs ?? 8_000
    this.fetcher = options.fetcher ?? fetch
  }

  private async request(endpoint: string, params: URLSearchParams): Promise<unknown> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)
    try {
      const response = await this.fetcher(`${BASE_URL}/${endpoint}?${params.toString()}`, {
        headers: { 'X-API-Key': this.options.apiKey, Accept: 'application/json' },
        signal: controller.signal,
      })
      if (response.status === 404) throw new AppError('PLAYER_NOT_FOUND', 404, 'Player not found.')
      if (response.status === 429) throw new AppError('RATE_LIMITED', 429, 'The statistics provider rate limit was reached.')
      if (!response.ok) throw new AppError('STATS_PROVIDER_ERROR', 502, 'The statistics provider returned an error.')
      return await response.json() as unknown
    } catch (error) {
      if (error instanceof AppError) throw error
      throw new AppError('STATS_PROVIDER_ERROR', 504, 'The statistics provider timed out.')
    } finally {
      clearTimeout(timer)
    }
  }

  async getPlayerData(riotId: RiotId): Promise<ProviderPayload> {
    const identity = new URLSearchParams({ player_id: riotId.value })
    const [matchesResult, profileResult] = await Promise.allSettled([
      this.request('get_player_matches', new URLSearchParams(identity)),
      this.request('get_player_profile', new URLSearchParams(identity)),
    ])
    if (matchesResult.status === 'rejected') throw matchesResult.reason
    return { matches: matchesResult.value, profile: profileResult.status === 'fulfilled' ? profileResult.value : undefined }
  }
}
