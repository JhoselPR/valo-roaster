import type { PlayerAnalysis } from './analyzePlayer.js'
import type { Intensity, Locale, RoastResult } from '../shared/schemas.js'

const lines: Record<Locale, Record<string, [string, string]>> = {
  en: {
    LOW_KD: ['Respawn Enthusiast', 'Your K/D is not low; it is calling for help from the bottom of the scoreboard.'],
    LOW_HS: ['Ankle Specialist', 'Your crosshair pays rent at ankle height and visits heads on holidays.'],
    FIRST_DEATH_FAN: ['Fast Pass to Spectator', 'You enter the site so fast the spectator screen loads before the minimap.'],
    EMPTY_FRAGGER: ['Scoreboard Soloist', 'You farm K/D like planting the spike is optional content.'],
    DEFAULT: ['Certified Average', 'You are so average the matchmaking system uses you as a unit of measurement.'],
  },
  es: {
    LOW_KD: ['Fan del respawn', 'Tu K/D no está bajo; está pidiendo ayuda desde el fondo del marcador.'],
    LOW_HS: ['Especialista en tobillos', 'Tu crosshair paga renta en los pies y solo visita la cabeza en vacaciones.'],
    FIRST_DEATH_FAN: ['Pase rápido a espectador', 'Entras al site tan rápido que carga antes el espectador que el minimapa.'],
    EMPTY_FRAGGER: ['Solista del marcador', 'Farmeas K/D como si plantar la spike fuera contenido opcional.'],
    DEFAULT: ['Promedio certificado', 'Eres tan promedio que el matchmaking te usa como unidad de medida.'],
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
    secondaryRoast: intensity === 'mild' ? undefined : locale === 'es' ? 'No te preocupes: el próximo round también necesita una first death.' : 'Relax: the next round needs a first death too.',
    rating: severity,
  }
}
