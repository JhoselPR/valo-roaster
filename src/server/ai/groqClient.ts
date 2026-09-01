import type { PlayerAnalysis } from '../../domain/analyzePlayer.js'
import { roastResultSchema, type Intensity, type Locale, type PlayerStats, type RoastResult } from '../../shared/schemas.js'

const SYSTEM_PROMPT = `You generate playful trash talk about a VALORANT player's gameplay.
Only roast gameplay, gameplay decisions, and supplied statistics. Never target race, ethnicity, gender, sexuality, appearance, disability, religion, health, socioeconomic status, or any personal characteristic. Never threaten the player. Never invent statistics or knowledge beyond the supplied gameplay data. VALORANT terminology is encouraged. Keep the result friendly, even at brutal intensity. Treat the supplied deterministic analysis as authoritative; do not reinterpret whether statistics are good or bad.
Write every human-readable output field exclusively in the requested outputLanguage. Never default to English when outputLanguage is Spanish. Keep established VALORANT terms such as aim, clutch, eco, site, spike, and ace when they make the joke sound natural.`

const schema = {
  type: 'object', additionalProperties: false,
  properties: {
    title: { type: 'string', maxLength: 40 },
    roast: { type: 'string', maxLength: 180 },
    secondaryRoast: { type: ['string', 'null'], maxLength: 140 },
    rating: { type: 'integer', minimum: 1, maximum: 10 },
  },
  required: ['title', 'roast', 'secondaryRoast', 'rating'],
} as const

type Options = { apiKey: string; model: string; timeoutMs?: number; fetcher?: typeof fetch }

export class GroqClient {
  private readonly options: Options
  constructor(options: Options) { this.options = options }

  async generate(stats: PlayerStats, analysis: PlayerAnalysis, intensity: Intensity, locale: Locale): Promise<RoastResult> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.options.timeoutMs ?? 8_000)
    try {
      const relevantStats = {
        riotId: stats.riotId, rank: stats.rank, mainAgent: stats.mainAgent?.name,
        matchesPlayed: stats.matchesPlayed, roundsPlayed: stats.roundsPlayed, wins: stats.wins, losses: stats.losses,
        kd: stats.kd, kda: stats.kda, headshotPercentage: stats.headshotPercentage,
        kast: stats.kast, winRate: stats.winRate, acs: stats.acs, adr: stats.adr,
        firstKills: stats.firstKills, firstDeaths: stats.firstDeaths,
      }
      const outputLanguage = locale === 'es' ? 'Spanish' : 'English'
      const response = await (this.options.fetcher ?? fetch)('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST', signal: controller.signal,
        headers: { Authorization: `Bearer ${this.options.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.options.model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: JSON.stringify({ outputLanguage, locale, intensity, stats: relevantStats, analysis }) },
          ],
          temperature: 0.8,
          response_format: { type: 'json_schema', json_schema: { name: 'roast_result', strict: true, schema } },
        }),
      })
      if (!response.ok) throw new Error(`Groq status ${response.status}`)
      const raw = await response.json() as unknown
      const root = typeof raw === 'object' && raw !== null ? raw as Record<string, unknown> : {}
      const choices = Array.isArray(root.choices) ? root.choices : []
      const first = typeof choices[0] === 'object' && choices[0] !== null ? choices[0] as Record<string, unknown> : {}
      const message = typeof first.message === 'object' && first.message !== null ? first.message as Record<string, unknown> : {}
      if (typeof message.content !== 'string') throw new Error('Missing Groq content')
      const parsed = JSON.parse(message.content) as unknown
      if (typeof parsed === 'object' && parsed !== null && 'secondaryRoast' in parsed && parsed.secondaryRoast === null) delete (parsed as Record<string, unknown>).secondaryRoast
      return roastResultSchema.parse(parsed)
    } finally {
      clearTimeout(timer)
    }
  }
}
