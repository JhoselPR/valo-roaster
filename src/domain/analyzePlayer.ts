import type { PlayerStats } from '../shared/schemas'
import { STAT_THRESHOLDS as T } from './statThresholds'

export type AnalysisFact = { code: string; message: string; value?: number | string }
export type PlayerAnalysis = {
  strengths: AnalysisFact[]
  weaknesses: AnalysisFact[]
  roastableFacts: AnalysisFact[]
  archetypes: AnalysisFact[]
}

const fact = (code: string, message: string, value?: number | string): AnalysisFact => ({ code, message, value })

export function analyzePlayer(stats: PlayerStats): PlayerAnalysis {
  const strengths: AnalysisFact[] = []
  const weaknesses: AnalysisFact[] = []
  const roastableFacts: AnalysisFact[] = []
  const archetypes: AnalysisFact[] = []

  if (stats.kd !== undefined) {
    if (stats.kd < T.kd.low) weaknesses.push(fact('LOW_KD', 'Loses more duels than they win', stats.kd))
    if (stats.kd >= T.kd.high) strengths.push(fact('HIGH_KD', 'Wins duels consistently', stats.kd))
  }
  if (stats.headshotPercentage !== undefined) {
    if (stats.headshotPercentage < T.headshot.low) weaknesses.push(fact('LOW_HS', 'Has a low headshot percentage', stats.headshotPercentage))
    if (stats.headshotPercentage >= T.headshot.high) strengths.push(fact('HIGH_HS', 'Has precise crosshair placement', stats.headshotPercentage))
  }
  if (stats.kast !== undefined) {
    if (stats.kast < T.kast.low) weaknesses.push(fact('LOW_KAST', 'Participates in too few successful rounds', stats.kast))
    if (stats.kast >= T.kast.high) strengths.push(fact('HIGH_KAST', 'Creates consistent round impact', stats.kast))
  }
  if (stats.acs !== undefined) {
    if (stats.acs < T.acs.low) weaknesses.push(fact('LOW_ACS', 'Produces little combat impact', stats.acs))
    if (stats.acs >= T.acs.high) strengths.push(fact('HIGH_ACS', 'Produces strong combat impact', stats.acs))
  }
  if (stats.adr !== undefined) {
    if (stats.adr < T.adr.low) weaknesses.push(fact('LOW_ADR', 'Deals low damage per round', stats.adr))
    if (stats.adr >= T.adr.high) strengths.push(fact('HIGH_ADR', 'Deals reliable damage per round', stats.adr))
  }
  if (stats.winRate !== undefined) {
    if (stats.winRate < T.winRate.low) weaknesses.push(fact('LOW_WIN_RATE', 'Has a losing record', stats.winRate))
    if (stats.winRate >= T.winRate.high) strengths.push(fact('HIGH_WIN_RATE', 'Converts matches into wins', stats.winRate))
  }
  if (stats.firstDeaths !== undefined && stats.firstKills !== undefined && stats.roundsPlayed !== undefined && stats.roundsPlayed > 0 && stats.firstDeaths > stats.firstKills && stats.firstDeaths / stats.roundsPlayed >= T.firstDeathPerRound) {
    roastableFacts.push(fact('FIRST_DEATH_FAN', 'Dies first more often than they secure the first kill', `${stats.firstDeaths}/${stats.firstKills}`))
  }
  if (stats.kd !== undefined && stats.winRate !== undefined && stats.kd >= T.kd.high && stats.winRate < T.winRate.low) {
    archetypes.push(fact('EMPTY_FRAGGER', 'Strong personal stats are not converting into wins'))
  }
  if (stats.acs !== undefined && stats.winRate !== undefined && stats.acs < T.acs.low && stats.winRate >= T.winRate.high) {
    archetypes.push(fact('TEAM_BACKPACK', 'Wins often despite low combat impact'))
  }
  if (stats.mainAgent && stats.mainAgent.matches >= T.minAgentMatches && stats.mainAgent.kd !== undefined && stats.mainAgent.kd < T.kd.low) {
    roastableFacts.push(fact('NEGATIVE_MAIN', `Runs a negative K/D on main agent ${stats.mainAgent.name}`, stats.mainAgent.kd))
  }
  if (weaknesses.length === 0 && strengths.length === 0) archetypes.push(fact('MYSTERY_PLAYER', 'Does not have enough decisive statistics'))
  else if (weaknesses.length <= 1 && strengths.length <= 1) archetypes.push(fact('PERFECTLY_AVERAGE', 'Is impressively close to average'))
  roastableFacts.push(...weaknesses)
  return { strengths, weaknesses, roastableFacts, archetypes }
}
