import { describe, expect, it, vi } from 'vitest'
import { GroqClient } from '../src/server/ai/groqClient'
import { ParseStatsProvider } from '../src/server/valorant/parseProvider'
import { analyzePlayer } from '../src/domain/analyzePlayer'
import { playerStatsFixture } from './fixtures'
import { AppError } from '../src/server/errors'

describe('ParseStatsProvider', () => {
  it('makes exactly the two MCP-confirmed requests and tolerates profile failure', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response(JSON.stringify({ data: [1] }), { status: 200 })).mockResolvedValueOnce(new Response('', { status: 502 }))
    const result = await new ParseStatsProvider({ apiKey: 'test', fetcher }).getPlayerData({ name: 'Name', tag: 'TAG', value: 'Name#TAG' })
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(String(fetcher.mock.calls[0][0])).toContain('get_player_matches?player_id=Name%23TAG')
    expect(String(fetcher.mock.calls[1][0])).toContain('get_player_profile?player_id=Name%23TAG')
    expect(result.profile).toBeUndefined()
  })
  it.each([[404, 'PLAYER_NOT_FOUND'], [429, 'RATE_LIMITED'], [500, 'STATS_PROVIDER_ERROR']] as const)('maps upstream status %s', async (status, code) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status }))
    try {
      await new ParseStatsProvider({ apiKey: 'test', fetcher }).getPlayerData({ name: 'Name', tag: 'TAG', value: 'Name#TAG' })
      throw new Error('Expected rejection')
    } catch (error) {
      expect(error).toBeInstanceOf(AppError)
      expect((error as AppError).code).toBe(code)
    }
  })
})

describe('GroqClient', () => {
  it('rejects invalid JSON and invalid structured output', async () => {
    const invalidJson = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: 'nope' } }] }), { status: 200 }))
    await expect(new GroqClient({ apiKey: 'test', model: 'test', fetcher: invalidJson }).generate(playerStatsFixture, analyzePlayer(playerStatsFixture), 'mild', 'en')).rejects.toThrow()
    const invalidShape = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ title: 'ok', roast: 'ok', secondaryRoast: null, rating: 99 }) } }] }), { status: 200 }))
    await expect(new GroqClient({ apiKey: 'test', model: 'test', fetcher: invalidShape }).generate(playerStatsFixture, analyzePlayer(playerStatsFixture), 'mild', 'en')).rejects.toThrow()
  })

  it('sends an explicit Spanish output-language instruction', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ title: 'Sin excusas', roast: 'El marcador ya presentó las pruebas.', secondaryRoast: null, rating: 6 }) } }] }), { status: 200 }))
    await new GroqClient({ apiKey: 'test', model: 'test', fetcher }).generate(playerStatsFixture, analyzePlayer(playerStatsFixture), 'spicy', 'es')
    const request = fetcher.mock.calls[0]?.[1]
    expect(typeof request?.body).toBe('string')
    expect(request?.body).toContain('\\"outputLanguage\\":\\"Spanish\\"')
    expect(request?.body).toContain('Never default to English when outputLanguage is Spanish')
  })

  it('forbids criticism inferred independently from raw statistics', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ title: 'Bounded roast', roast: 'Only deterministic facts are used.', secondaryRoast: null, rating: 4 }) } }] }), { status: 200 }))

    await new GroqClient({ apiKey: 'test', model: 'test', fetcher }).generate(playerStatsFixture, analyzePlayer(playerStatsFixture), 'spicy', 'en')

    const body = fetcher.mock.calls[0]?.[1]?.body
    expect(typeof body).toBe('string')
    expect(body).toContain('The only permitted sources for criticism are analysis.weaknesses, analysis.roastableFacts, and analysis.archetypes')
    expect(body).toContain('Raw stats are neutral context')
  })
})
