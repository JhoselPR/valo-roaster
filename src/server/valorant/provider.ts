import type { RiotId } from '../../domain/riotId'

export type ProviderPayload = { matches: unknown; profile?: unknown }

export interface StatsProvider {
  getPlayerData(riotId: RiotId): Promise<ProviderPayload>
}
