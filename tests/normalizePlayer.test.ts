import { describe, expect, it } from 'vitest'
import { normalizePlayer } from '../src/server/valorant/normalizePlayer'
import { AppError } from '../src/server/errors'
import { parseMatchesFixture } from './fixtures'

const riotId = { name: 'Zelykz', tag: 'J06', value: 'Zelykz#J06' }

describe('normalizePlayer', () => {
  it('whitelists and aggregates match data', () => {
    const result = normalizePlayer({ matches: parseMatchesFixture }, riotId)
    expect(result).toMatchObject({ riotId: 'Zelykz#J06', matchesPlayed: 2, roundsPlayed: 42, wins: 1, losses: 1, kills: 20, deaths: 22, headshotPercentage: 18 })
    expect(result.maps).toHaveLength(1)
    expect(result).not.toHaveProperty('raw')
  })
  it('uses the optional profile avatar and recent matches for agents', () => {
    const result = normalizePlayer({
      matches: parseMatchesFixture,
      profile: { data: { platformInfo: { avatarUrl: 'https://titles.trackercdn.com/valorant-api/playercards/card/displayicon.png' } } },
    }, riotId)
    expect(result.avatarUrl).toContain('titles.trackercdn.com')
    expect(result.agents[0]).toMatchObject({ name: 'Reyna', matches: 2 })
    expect(result.mainAgent).toBeUndefined()
  })
  it('maps an empty match list to player not found', () => expect(() => normalizePlayer({ matches: { data: { matches: [] } } }, riotId)).toThrow(AppError))
})
