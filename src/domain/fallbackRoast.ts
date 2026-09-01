import type { PlayerAnalysis } from './analyzePlayer'
import type { Intensity, Locale, RoastResult } from '../shared/schemas'

const lines: Record<Locale, Record<string, [string, string]>> = {
  en: {
    LOW_KD: ['Respawn Enthusiast', 'Your K/D treats every duel like a donation drive.'],
    LOW_HS: ['Outline Inspector', 'Your crosshair knows every part of the enemy except the head.'],
    FIRST_DEATH_FAN: ['First Class Entry', 'You enter every site first—mostly into the spectator screen.'],
    EMPTY_FRAGGER: ['Scoreboard Soloist', 'Great K/D. Shame the victory screen keeps dodging you.'],
    DEFAULT: ['Certified Average', 'The matchmaking algorithm looked at your stats and whispered: perfectly balanced.'],
  },
  es: {
    LOW_KD: ['Fan del respawn', 'Tu K/D trata cada duelo como una campaña de donaciones.'],
    LOW_HS: ['Inspector de siluetas', 'Tu mira conoce todo el rival excepto su cabeza.'],
    FIRST_DEATH_FAN: ['Entrada de primera', 'Entras primero al site y también a la pantalla de espectador.'],
    EMPTY_FRAGGER: ['Solista del marcador', 'Gran K/D. Lástima que la victoria siga esquivándote.'],
    DEFAULT: ['Promedio certificado', 'El matchmaking vio tus estadísticas y susurró: equilibrio perfecto.'],
  },
}

export function generateFallbackRoast(analysis: PlayerAnalysis, intensity: Intensity, locale: Locale): RoastResult {
  const candidates = [...analysis.archetypes, ...analysis.roastableFacts]
  const selected = candidates.find((candidate) => lines[locale][candidate.code])
  const [title, base] = lines[locale][selected?.code ?? 'DEFAULT'] ?? lines[locale].DEFAULT
  const suffix = intensity === 'brutal' ? (locale === 'es' ? ' Eso sí que quema.' : ' That one burns.') : ''
  const severity = Math.min(10, Math.max(1, 3 + analysis.weaknesses.length * 2 + analysis.roastableFacts.length))
  return {
    title,
    roast: `${base}${suffix}`.slice(0, 180),
    secondaryRoast: intensity === 'mild' ? undefined : locale === 'es' ? 'Al menos el próximo round siempre trae esperanza.' : 'At least the next round always brings hope.',
    rating: severity,
  }
}
