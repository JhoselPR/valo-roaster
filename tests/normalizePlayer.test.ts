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
  it('uses optional agent segments when available', () => {
    const result = normalizePlayer({ matches: parseMatchesFixture, segments: { data: [{ metadata: { name: 'Reyna' }, stats: { matchesPlayed: { value: 8 }, kDRatio: { value: 1.1 } } }] } }, riotId)
    expect(result.mainAgent).toMatchObject({ name: 'Reyna', matches: 8, kd: 1.1 })
  })
  it('maps an empty match list to player not found', () => expect(() => normalizePlayer({ matches: { data: { matches: [] } } }, riotId)).toThrow(AppError))
})
