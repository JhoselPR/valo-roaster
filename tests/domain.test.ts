import { describe, expect, it } from 'vitest'
import { analyzePlayer } from '../src/domain/analyzePlayer'
import { generateFallbackRoast } from '../src/domain/fallbackRoast'
import { parseRiotId } from '../src/domain/riotId'
import { STAT_THRESHOLDS } from '../src/domain/statThresholds'
import { playerStatsFixture } from './fixtures'

describe('parseRiotId', () => {
  it('trims and preserves valid Unicode', () => expect(parseRiotId('  José 火#LATAM ')).toEqual({ name: 'José 火', tag: 'LATAM', value: 'José 火#LATAM' }))
  it.each(['missing', '#TAG', 'Name#', 'A#B#C', 'A\n#TAG'])('rejects invalid input %s', (value) => expect(parseRiotId(value)).toBeNull())
})

describe('analyzePlayer', () => {
  it('uses centralized low thresholds and combined signals', () => {
    const analysis = analyzePlayer(playerStatsFixture)
    expect(analysis.weaknesses.map(({ code }) => code)).toEqual(expect.arrayContaining(['LOW_KD', 'LOW_HS', 'LOW_KAST', 'LOW_ACS', 'LOW_ADR', 'LOW_WIN_RATE']))
    expect(analysis.roastableFacts.map(({ code }) => code)).toContain('NEGATIVE_MAIN')
  })
  it('does not call a value below the exact boundary when equal', () => {
    const analysis = analyzePlayer({ ...playerStatsFixture, kd: STAT_THRESHOLDS.kd.low, headshotPercentage: STAT_THRESHOLDS.headshot.low })
    expect(analysis.weaknesses.map(({ code }) => code)).not.toEqual(expect.arrayContaining(['LOW_KD', 'LOW_HS']))
  })
  it('requires enough matches before roasting a main agent', () => {
    const analysis = analyzePlayer({ ...playerStatsFixture, mainAgent: { name: 'Reyna', matches: 2, kd: 0.2 } })
    expect(analysis.roastableFacts.map(({ code }) => code)).not.toContain('NEGATIVE_MAIN')
  })
})

describe('generateFallbackRoast', () => {
  it('returns validated-size bilingual deterministic output', () => {
    const analysis = analyzePlayer(playerStatsFixture)
    expect(generateFallbackRoast(analysis, 'brutal', 'en')).toMatchObject({ title: 'First Class Entry' })
    expect(generateFallbackRoast(analysis, 'spicy', 'es')).toMatchObject({ title: 'Entrada de primera' })
  })
})
