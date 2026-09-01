import { describe, expect, it } from 'vitest'
import { playerStatsSchema, roastResultSchema } from '../src/shared/schemas'
import { playerStatsFixture } from './fixtures'

describe('shared schemas', () => {
  it('accepts absent optional provider fields', () => expect(playerStatsSchema.parse({ riotId: 'A#B', name: 'A', tag: 'B', matchesPlayed: 1, wins: 0, losses: 1 })).toMatchObject({ agents: [], maps: [] }))
  it('rejects impossible stat values', () => expect(playerStatsSchema.safeParse({ ...playerStatsFixture, headshotPercentage: 101 }).success).toBe(false))
  it('rejects invalid roast output', () => expect(roastResultSchema.safeParse({ title: 'x'.repeat(41), roast: 'ok', rating: 11 }).success).toBe(false))
})
