import type { RiotId } from '../../domain/riotId'
import { playerStatsSchema, type Performance, type PlayerStats } from '../../shared/schemas'
import { AppError } from '../errors'
import type { ProviderPayload } from './provider'

type JsonRecord = Record<string, unknown>
const record = (value: unknown): JsonRecord | undefined => typeof value === 'object' && value !== null && !Array.isArray(value) ? value as JsonRecord : undefined
const list = (value: unknown): unknown[] => Array.isArray(value) ? value : []
const path = (value: unknown, keys: readonly string[]): unknown => keys.reduce<unknown>((current, key) => {
  if (Array.isArray(current) && /^\d+$/.test(key)) return current[Number(key)]
  return record(current)?.[key]
}, value)
const numberAt = (value: unknown, paths: readonly (readonly string[])[]): number | undefined => {
  for (const keys of paths) {
    const candidate = path(value, keys)
    const parsed = typeof candidate === 'number' ? candidate : typeof candidate === 'string' && candidate.trim() ? Number(candidate) : Number.NaN
    if (Number.isFinite(parsed)) return parsed
  }
}
const stringAt = (value: unknown, paths: readonly (readonly string[])[]): string | undefined => {
  for (const keys of paths) {
    const candidate = path(value, keys)
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim()
  }
}
const round = (value: number | undefined, precision = 2) => value === undefined ? undefined : Number(value.toFixed(precision))
const unwrap = (raw: unknown): unknown => record(raw)?.data ?? raw

function extractMatches(raw: unknown): unknown[] {
  const data = unwrap(raw)
  if (Array.isArray(data)) return data
  return list(record(data)?.matches ?? record(data)?.items)
}

function aggregateBy(matches: unknown[], keyPaths: readonly (readonly string[])[], imagePaths: readonly (readonly string[])[] = []): Performance[] {
  const groups = new Map<string, { matches: number; wins: number; kills: number; deaths: number; imageUrl?: string }>()
  for (const match of matches) {
    const name = stringAt(match, keyPaths)
    if (!name) continue
    const current = groups.get(name) ?? { matches: 0, wins: 0, kills: 0, deaths: 0 }
    current.matches += 1
    current.wins += Number(stringAt(match, [['metadata', 'result'], ['result']])?.toLowerCase() === 'victory' || path(match, ['stats', 'won']) === true)
    current.kills += numberAt(match, [['stats', 'kills'], ['segments', '0', 'stats', 'kills', 'value']]) ?? 0
    current.deaths += numberAt(match, [['stats', 'deaths'], ['segments', '0', 'stats', 'deaths', 'value']]) ?? 0
    current.imageUrl ??= stringAt(match, imagePaths)
    groups.set(name, current)
  }
  return [...groups].map(([name, value]) => ({
    name, matches: value.matches, wins: value.wins,
    winRate: round(value.wins / value.matches * 100),
    kd: value.deaths ? round(value.kills / value.deaths) : value.kills || undefined,
    imageUrl: value.imageUrl,
  })).sort((a, b) => b.matches - a.matches)
}

function parseSegments(raw: unknown): Performance[] {
  const data = unwrap(raw)
  const segments = Array.isArray(data) ? data : list(record(data)?.segments)
  return segments.flatMap((segment): Performance[] => {
    const name = stringAt(segment, [['metadata', 'name'], ['metadata', 'agentName'], ['name']])
    if (!name) return []
    const matches = numberAt(segment, [['stats', 'matchesPlayed', 'value'], ['stats', 'matches', 'value'], ['matches']]) ?? 0
    const kills = numberAt(segment, [['stats', 'kills', 'value']])
    const deaths = numberAt(segment, [['stats', 'deaths', 'value']])
    return [{
      name,
      imageUrl: stringAt(segment, [['metadata', 'imageUrl'], ['metadata', 'portraitUrl']]),
      matches: Math.max(0, Math.trunc(matches)),
      wins: numberAt(segment, [['stats', 'matchesWon', 'value'], ['stats', 'wins', 'value']]),
      kd: numberAt(segment, [['stats', 'kDRatio', 'value']]) ?? (kills !== undefined && deaths ? round(kills / deaths) : undefined),
      winRate: numberAt(segment, [['stats', 'matchesWinPct', 'value'], ['stats', 'winRate', 'value']]),
    }]
  }).sort((a, b) => b.matches - a.matches)
}

export function normalizePlayer(payload: ProviderPayload, riotId: RiotId): PlayerStats {
  const matches = extractMatches(payload.matches)
  if (matches.length === 0) throw new AppError('PLAYER_NOT_FOUND', 404, 'No recent competitive matches were found for this player.')
  type Totals = { kills: number; deaths: number; assists: number; firstKills: number; firstDeaths: number; rounds: number }
  const totals = matches.reduce<Totals>((sum, match) => ({
    kills: sum.kills + (numberAt(match, [['stats', 'kills'], ['segments', '0', 'stats', 'kills', 'value']]) ?? 0),
    deaths: sum.deaths + (numberAt(match, [['stats', 'deaths'], ['segments', '0', 'stats', 'deaths', 'value']]) ?? 0),
    assists: sum.assists + (numberAt(match, [['stats', 'assists'], ['segments', '0', 'stats', 'assists', 'value']]) ?? 0),
    firstKills: sum.firstKills + (numberAt(match, [['stats', 'firstKills'], ['segments', '0', 'stats', 'firstKills', 'value']]) ?? 0),
    firstDeaths: sum.firstDeaths + (numberAt(match, [['stats', 'firstDeaths'], ['segments', '0', 'stats', 'firstDeaths', 'value']]) ?? 0),
    rounds: sum.rounds + (numberAt(match, [['segments', '0', 'stats', 'roundsPlayed', 'value'], ['stats', 'roundsPlayed'], ['metadata', 'roundsPlayed']]) ?? ((numberAt(match, [['stats', 'roundsWon']]) ?? 0) + (numberAt(match, [['stats', 'roundsLost']]) ?? 0))),
  }), { kills: 0, deaths: 0, assists: 0, firstKills: 0, firstDeaths: 0, rounds: 0 })
  const wins = matches.filter((match) => stringAt(match, [['metadata', 'result'], ['result']])?.toLowerCase() === 'victory' || path(match, ['stats', 'won']) === true).length
  const average = (paths: readonly (readonly string[])[]) => {
    const values = matches.map((match) => numberAt(match, paths)).filter((value): value is number => value !== undefined)
    return values.length ? round(values.reduce((sum, value) => sum + value, 0) / values.length) : undefined
  }
  const agents = payload.segments ? parseSegments(payload.segments) : aggregateBy(matches, [['metadata', 'agentName'], ['agent', 'name']], [['metadata', 'agentImageUrl']])
  const maps = aggregateBy(matches, [['metadata', 'mapName'], ['map', 'name']])
  const eligibleMaps = maps.filter((map) => map.matches >= 2 && map.winRate !== undefined)
  const base = unwrap(payload.matches)
  return playerStatsSchema.parse({
    riotId: riotId.value, name: riotId.name, tag: riotId.tag,
    avatarUrl: stringAt(base, [['metadata', 'avatarUrl'], ['platformInfo', 'avatarUrl']]),
    rank: stringAt(matches[0], [['segments', '0', 'stats', 'rank', 'metadata', 'tierName'], ['metadata', 'rankName']]),
    rankImageUrl: stringAt(matches[0], [['segments', '0', 'stats', 'rank', 'metadata', 'iconUrl']]),
    matchesPlayed: matches.length, roundsPlayed: totals.rounds || undefined, wins, losses: matches.length - wins,
    kills: totals.kills, deaths: totals.deaths, assists: totals.assists,
    kd: totals.deaths ? round(totals.kills / totals.deaths) : undefined,
    kda: totals.deaths ? round((totals.kills + totals.assists) / totals.deaths) : undefined,
    headshotPercentage: average([['stats', 'headshotsPercentage'], ['segments', '0', 'stats', 'headshotsPercentage', 'value']]),
    kast: average([['stats', 'kast'], ['segments', '0', 'stats', 'kast', 'value']]),
    acs: average([['stats', 'scorePerRound'], ['segments', '0', 'stats', 'scorePerRound', 'value']]),
    adr: average([['stats', 'damagePerRound'], ['segments', '0', 'stats', 'damagePerRound', 'value']]),
    winRate: round(wins / matches.length * 100), firstKills: totals.firstKills, firstDeaths: totals.firstDeaths,
    agents, maps, mainAgent: agents.find((agent) => agent.matches >= 3),
    bestMap: eligibleMaps.toSorted((a, b) => (b.winRate ?? 0) - (a.winRate ?? 0))[0],
    worstMap: eligibleMaps.toSorted((a, b) => (a.winRate ?? 0) - (b.winRate ?? 0))[0],
    lastUpdatedAt: new Date().toISOString(),
  })
}
