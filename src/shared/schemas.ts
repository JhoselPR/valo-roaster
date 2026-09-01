import { z } from 'zod'

export const localeSchema = z.enum(['en', 'es'])
export const intensitySchema = z.enum(['mild', 'spicy', 'brutal'])

const metricSchema = z.number().finite().nonnegative()

export const performanceSchema = z.object({
  name: z.string().min(1).max(80),
  imageUrl: z.url().optional(),
  matches: z.number().int().nonnegative(),
  wins: z.number().int().nonnegative().optional(),
  kd: metricSchema.optional(),
  winRate: z.number().min(0).max(100).optional(),
})

export const playerStatsSchema = z.object({
  riotId: z.string().min(3).max(101),
  name: z.string().min(1).max(80),
  tag: z.string().min(1).max(20),
  avatarUrl: z.url().optional(),
  rank: z.string().min(1).max(60).optional(),
  rankImageUrl: z.url().optional(),
  rr: z.number().int().optional(),
  matchesPlayed: z.number().int().nonnegative(),
  roundsPlayed: z.number().int().nonnegative().optional(),
  wins: z.number().int().nonnegative(),
  losses: z.number().int().nonnegative(),
  kills: z.number().int().nonnegative().optional(),
  deaths: z.number().int().nonnegative().optional(),
  assists: z.number().int().nonnegative().optional(),
  kd: metricSchema.optional(),
  kda: metricSchema.optional(),
  headshotPercentage: z.number().min(0).max(100).optional(),
  kast: z.number().min(0).max(100).optional(),
  winRate: z.number().min(0).max(100).optional(),
  acs: metricSchema.optional(),
  adr: metricSchema.optional(),
  firstKills: z.number().int().nonnegative().optional(),
  firstDeaths: z.number().int().nonnegative().optional(),
  agents: z.array(performanceSchema).max(50).default([]),
  maps: z.array(performanceSchema).max(50).default([]),
  mainAgent: performanceSchema.optional(),
  bestMap: performanceSchema.optional(),
  worstMap: performanceSchema.optional(),
  lastUpdatedAt: z.iso.datetime().optional(),
})

export const roastResultSchema = z.object({
  title: z.string().min(1).max(40),
  roast: z.string().min(1).max(180),
  secondaryRoast: z.string().min(1).max(140).optional(),
  rating: z.number().int().min(1).max(10),
})

export const playerResponseSchema = z.object({
  data: playerStatsSchema,
  snapshot: z.string().min(20).max(50_000),
})

export const roastRequestSchema = z.object({
  snapshot: z.string().min(20).max(50_000),
  intensity: intensitySchema,
  locale: localeSchema,
})

export const errorCodeSchema = z.enum([
  'INVALID_RIOT_ID',
  'PLAYER_NOT_FOUND',
  'RATE_LIMITED',
  'STATS_PROVIDER_ERROR',
  'AI_PROVIDER_ERROR',
])

export type Locale = z.infer<typeof localeSchema>
export type Intensity = z.infer<typeof intensitySchema>
export type PlayerStats = z.infer<typeof playerStatsSchema>
export type Performance = z.infer<typeof performanceSchema>
export type RoastResult = z.infer<typeof roastResultSchema>
export type ErrorCode = z.infer<typeof errorCodeSchema>
