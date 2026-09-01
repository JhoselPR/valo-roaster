import type { VercelRequest, VercelResponse } from '@vercel/node'
import { afterEach, describe, expect, it, vi } from 'vitest'
import playerHandler, { createPlayerHandler } from '../api/player'
import roastHandler from '../api/roast'
import { createPlayerSnapshot } from '../src/server/snapshot'
import { playerStatsFixture } from './fixtures'
import { parseMatchesFixture } from './fixtures'
import { AppError } from '../src/server/errors'
import { ParseStatsProvider } from '../src/server/valorant/parseProvider'

type MockResponse = {
  status: ReturnType<typeof vi.fn>
  json: ReturnType<typeof vi.fn>
  setHeader: ReturnType<typeof vi.fn>
}

function responseMock(): MockResponse {
  const response = {} as MockResponse
  response.status = vi.fn(() => response)
  response.json = vi.fn(() => response)
  response.setHeader = vi.fn(() => response)
  return response
}

afterEach(() => {
  delete process.env.PLAYER_STATS_SIGNING_SECRET
  delete process.env.GROQ_API_KEY
  delete process.env.GROQ_MODEL
})

describe('API handlers', () => {
  it('returns a consistent 400 without exposing a stack for invalid Riot IDs', async () => {
    const response = responseMock()
    await playerHandler({ method: 'GET', query: { riotId: 'invalid' } } as unknown as VercelRequest, response as unknown as VercelResponse)
    expect(response.status).toHaveBeenCalledWith(400)
    expect(response.json).toHaveBeenCalledWith({ error: { code: 'INVALID_RIOT_ID', message: expect.any(String) } })
    expect(JSON.stringify(response.json.mock.calls)).not.toContain('stack')
  })

  it.each([
    [new AppError('PLAYER_NOT_FOUND', 404, 'Player not found.'), 404, 'PLAYER_NOT_FOUND'],
    [new AppError('RATE_LIMITED', 429, 'Rate limited.'), 429, 'RATE_LIMITED'],
    [new AppError('STATS_PROVIDER_ERROR', 504, 'Provider timed out.'), 504, 'STATS_PROVIDER_ERROR'],
    [new AppError('STATS_PROVIDER_ERROR', 502, 'Provider failed.'), 502, 'STATS_PROVIDER_ERROR'],
  ] as const)('maps provider failures at handler level', async (providerError, status, code) => {
    const response = responseMock()
    const handler = createPlayerHandler({
      createProvider: () => ({ getPlayerData: async () => { throw providerError } }),
      getEnvironment: () => ({ apiKey: 'test-key', signingSecret: 'test-secret' }),
    })
    await handler({ method: 'GET', query: { riotId: 'Name#TAG' } } as unknown as VercelRequest, response as unknown as VercelResponse)
    expect(response.status).toHaveBeenCalledWith(status)
    expect(response.json).toHaveBeenCalledWith({ error: { code, message: expect.any(String) } })
    const serialized = JSON.stringify(response.json.mock.calls)
    expect(serialized).not.toContain('stack')
    expect(serialized).not.toContain('test-key')
  })

  it('returns normalized stats when optional agent enrichment fails', async () => {
    const response = responseMock()
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ ...parseMatchesFixture, privateUpstreamField: 'never-expose-this' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ raw: 'upstream-error' }), { status: 502 }))
    const handler = createPlayerHandler({
      createProvider: (apiKey) => new ParseStatsProvider({ apiKey, fetcher }),
      getEnvironment: () => ({ apiKey: 'test-key', signingSecret: 'test-secret' }),
    })
    await handler({ method: 'GET', query: { riotId: 'Name#TAG' } } as unknown as VercelRequest, response as unknown as VercelResponse)
    expect(response.status).toHaveBeenCalledWith(200)
    const serialized = JSON.stringify(response.json.mock.calls)
    expect(serialized).not.toContain('never-expose-this')
    expect(serialized).not.toContain('upstream-error')
    expect(serialized).not.toContain('stack')
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('generates a deterministic fallback without any Groq or Parse call', async () => {
    process.env.PLAYER_STATS_SIGNING_SECRET = 'test-secret'
    const response = responseMock()
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    await roastHandler({ method: 'POST', body: { snapshot: createPlayerSnapshot(playerStatsFixture, 'test-secret'), intensity: 'spicy', locale: 'en' } } as unknown as VercelRequest, response as unknown as VercelResponse)
    expect(response.status).toHaveBeenCalledWith(200)
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ title: expect.any(String), rating: expect.any(Number) }))
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })
})
