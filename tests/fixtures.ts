import type { PlayerStats } from '../src/shared/schemas'

export const playerStatsFixture: PlayerStats = {
  riotId: 'Zelykz#J06', name: 'Zelykz', tag: 'J06', rank: 'Gold 2', matchesPlayed: 4,
  wins: 1, losses: 3, roundsPlayed: 40, kills: 40, deaths: 50, assists: 12, kd: 0.8, kda: 1.04,
  headshotPercentage: 18, kast: 66, winRate: 25, acs: 170, adr: 120,
  firstKills: 2, firstDeaths: 6,
  agents: [{ name: 'Reyna', matches: 4, wins: 1, kd: 0.8, winRate: 25 }],
  maps: [{ name: 'Ascent', matches: 2, wins: 1, winRate: 50 }, { name: 'Bind', matches: 2, wins: 0, winRate: 0 }],
  mainAgent: { name: 'Reyna', matches: 4, wins: 1, kd: 0.8, winRate: 25 },
}

export const parseMatchesFixture = {
  data: { matches: [
    { metadata: { result: 'victory', mapName: 'Ascent', agentName: 'Reyna', rankName: 'Gold 2' }, stats: { kills: 12, deaths: 10, assists: 4, headshotsPercentage: 20, kast: 72, scorePerRound: 205, damagePerRound: 145, firstKills: 2, firstDeaths: 1 }, segments: [{ stats: { roundsPlayed: { value: 22 } } }] },
    { metadata: { result: 'defeat', mapName: 'Ascent', agentName: 'Reyna' }, stats: { kills: 8, deaths: 12, assists: 3, headshotsPercentage: 16, kast: 64, scorePerRound: 165, damagePerRound: 125, firstKills: 0, firstDeaths: 2 }, segments: [{ stats: { roundsPlayed: { value: 20 } } }] },
  ] },
}
