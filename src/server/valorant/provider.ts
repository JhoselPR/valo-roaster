import type { RiotId } from '../../domain/riotId'

export type ProviderPayload = { matches: unknown; segments?: unknown }

export interface StatsProvider {
  getPlayerData(riotId: RiotId): Promise<ProviderPayload>
}
