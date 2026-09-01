export const STAT_THRESHOLDS = {
  // Common community baseline: below 20% signals inconsistent crosshair placement.
  headshot: { low: 20, high: 30 },
  // K/D below one means the player loses more duels than they win.
  kd: { low: 1, high: 1.25 },
  // KAST measures round participation; 70–75% brackets weak and strong impact.
  kast: { low: 70, high: 75 },
  // ACS provides broad combat impact, with 180/240 as readable low/high bands.
  acs: { low: 180, high: 240 },
  // ADR below 130 is low pressure; 160+ indicates reliable damage.
  adr: { low: 130, high: 160 },
  // These win-rate bands avoid overreacting to results near 50%.
  winRate: { low: 45, high: 55 },
  // First-death analysis needs a minimum rate to avoid flagging a single bad round.
  firstDeathPerRound: 0.1,
  minAgentMatches: 3,
  minMapMatches: 2,
} as const
