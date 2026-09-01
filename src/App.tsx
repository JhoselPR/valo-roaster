import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { parseRiotId } from './domain/riotId'
import { playerResponseSchema, roastResultSchema, type Locale, type PlayerStats, type RoastResult } from './shared/schemas'
import './App.css'

const copy = {
  en: { eyebrow: 'VALORANT GAMEPLAY ROASTER', title: 'Your aim called. It wants a refund.', intro: 'Real match stats. Deterministic analysis. One AI-powered roast—no invented facts.', riotId: 'Riot ID', placeholder: 'Name#TAG', intensity: 'Heat level', submit: 'Roast me', mild: 'Mild', spicy: 'Spicy', brutal: 'Brutal', loadingPlayer: 'Scouting your match history…', loadingRoast: 'Preheating the roast…', retry: 'Try another player', stats: 'Receipts', matches: 'Matches', wins: 'Wins', rank: 'Rank', agent: 'Main agent', kd: 'K/D', hs: 'HS%', wr: 'Win rate', acs: 'ACS', adr: 'ADR', invalid: 'Enter a valid Riot ID in Name#TAG format.', generic: 'The server missed its shot. Try again.', notFound: 'No recent competitive matches were found.', rateLimited: 'The stats provider needs a timeout. Try again shortly.' },
  es: { eyebrow: 'ROASTER DE GAMEPLAY DE VALORANT', title: 'Tu aim llamó. Quiere un reembolso.', intro: 'Estadísticas reales. Análisis determinista. Un roast con IA, sin datos inventados.', riotId: 'Riot ID', placeholder: 'Nombre#TAG', intensity: 'Nivel de fuego', submit: 'Hazme roast', mild: 'Suave', spicy: 'Picante', brutal: 'Brutal', loadingPlayer: 'Revisando tu historial…', loadingRoast: 'Precalentando el roast…', retry: 'Probar otro jugador', stats: 'Las pruebas', matches: 'Partidas', wins: 'Victorias', rank: 'Rango', agent: 'Agente principal', kd: 'K/D', hs: 'HS%', wr: 'Winrate', acs: 'ACS', adr: 'ADR', invalid: 'Escribe un Riot ID válido con formato Nombre#TAG.', generic: 'El servidor falló el disparo. Intenta otra vez.', notFound: 'No encontramos partidas competitivas recientes.', rateLimited: 'El proveedor necesita un descanso. Intenta en un momento.' },
} as const

const formSchema = z.object({ riotId: z.string().refine((value) => parseRiotId(value) !== null), intensity: z.enum(['mild', 'spicy', 'brutal']) })
type FormValues = z.infer<typeof formSchema>
type Status = 'idle' | 'loading-player' | 'loading-roast' | 'success' | 'error'

function preferredLocale(): Locale {
  const saved = localStorage.getItem('valo-roast-locale')
  if (saved === 'en' || saved === 'es') return saved
  return navigator.language.toLowerCase().startsWith('es') ? 'es' : 'en'
}

function Metric({ label, value }: { label: string; value: string | number | undefined }) {
  return value === undefined ? null : <div className="metric"><span>{label}</span><strong>{value}</strong></div>
}

function RoastCard({ stats, roast, locale }: { stats: PlayerStats; roast: RoastResult; locale: Locale }) {
  const t = copy[locale]
  const visual = stats.avatarUrl ?? stats.mainAgent?.imageUrl
  return <article className="roast-card" aria-labelledby="roast-title">
    <div className="card-glow" />
    <header className="player-header">
      {visual ? <img src={visual} alt="" className="player-art" /> : <div className="player-monogram" aria-hidden="true">{stats.name[0]}</div>}
      <div><p className="overline">{t.stats}</p><h2>{stats.riotId}</h2><p>{stats.rank ?? t.rank}</p></div>
      <div className="rating"><strong>{roast.rating}</strong><span>/ 10</span></div>
    </header>
    <div className="metrics"><Metric label={t.rank} value={stats.rank} /><Metric label={t.agent} value={stats.mainAgent?.name} /><Metric label={t.kd} value={stats.kd} /><Metric label={t.hs} value={stats.headshotPercentage === undefined ? undefined : `${stats.headshotPercentage}%`} /><Metric label={t.wr} value={stats.winRate === undefined ? undefined : `${stats.winRate}%`} /><Metric label={t.acs} value={stats.acs} /><Metric label={t.adr} value={stats.adr} /><Metric label={t.matches} value={stats.matchesPlayed} /><Metric label={t.wins} value={stats.wins} /></div>
    <section className="roast-copy"><span>🔥</span><div><h3 id="roast-title">{roast.title}</h3><p>{roast.roast}</p>{roast.secondaryRoast && <small>{roast.secondaryRoast}</small>}</div></section>
  </article>
}

function messageFor(code: string | undefined, locale: Locale): string {
  if (code === 'PLAYER_NOT_FOUND') return copy[locale].notFound
  if (code === 'RATE_LIMITED') return copy[locale].rateLimited
  return copy[locale].generic
}

export default function App() {
  const [locale, setLocale] = useState<Locale>(preferredLocale)
  const [status, setStatus] = useState<Status>('idle')
  const [stats, setStats] = useState<PlayerStats>()
  const [roast, setRoast] = useState<RoastResult>()
  const [error, setError] = useState('')
  const t = copy[locale]
  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: { riotId: '', intensity: 'spicy' } })
  useEffect(() => { localStorage.setItem('valo-roast-locale', locale); document.documentElement.lang = locale }, [locale])

  const submit = handleSubmit(async ({ riotId, intensity }) => {
    setError(''); setStatus('loading-player')
    try {
      const playerRes = await fetch(`/api/player?riotId=${encodeURIComponent(riotId.trim())}`)
      const playerJson = await playerRes.json() as unknown
      if (!playerRes.ok) {
        const value = typeof playerJson === 'object' && playerJson !== null && 'error' in playerJson ? playerJson.error : undefined
        const code = typeof value === 'object' && value !== null && 'code' in value && typeof value.code === 'string' ? value.code : undefined
        throw new Error(code)
      }
      const player = playerResponseSchema.parse(playerJson)
      setStats(player.data); setStatus('loading-roast')
      const roastRes = await fetch('/api/roast', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ snapshot: player.snapshot, intensity, locale }) })
      const roastJson = await roastRes.json() as unknown
      if (!roastRes.ok) throw new Error('AI_PROVIDER_ERROR')
      setRoast(roastResultSchema.parse(roastJson)); setStatus('success')
    } catch (cause) { setError(messageFor(cause instanceof Error ? cause.message : undefined, locale)); setStatus('error') }
  })
  const restart = () => { reset(); setStats(undefined); setRoast(undefined); setStatus('idle'); setError('') }

  return <main>
    <nav aria-label="Language"><button type="button" className={locale === 'en' ? 'active' : ''} onClick={() => setLocale('en')}>EN</button><button type="button" className={locale === 'es' ? 'active' : ''} onClick={() => setLocale('es')}>ES</button></nav>
    <div className="flame flame-one" /><div className="flame flame-two" />
    <section className="hero"><p className="eyebrow">{t.eyebrow}</p><h1>{t.title}</h1><p className="intro">{t.intro}</p>
      {status !== 'success' && <form onSubmit={submit} noValidate><label htmlFor="riot-id">{t.riotId}</label><input id="riot-id" autoComplete="off" placeholder={t.placeholder} {...register('riotId')} aria-invalid={Boolean(errors.riotId)} />{errors.riotId && <p className="field-error">{t.invalid}</p>}<fieldset><legend>{t.intensity}</legend>{(['mild', 'spicy', 'brutal'] as const).map((level) => <label className="heat" key={level}><input type="radio" value={level} {...register('intensity')} /><span>{t[level]}</span></label>)}</fieldset><button className="submit" disabled={status.startsWith('loading')}>{status === 'loading-player' ? t.loadingPlayer : status === 'loading-roast' ? t.loadingRoast : t.submit}</button>{error && <p className="api-error" role="alert">{error}</p>}</form>}
    </section>
    {status === 'success' && stats && roast && <><RoastCard stats={stats} roast={roast} locale={locale} /><button className="retry" type="button" onClick={restart}>{t.retry}</button></>}
  </main>
}
