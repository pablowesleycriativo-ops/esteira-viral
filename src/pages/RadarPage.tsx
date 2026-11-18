import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { KEYWORD_GROUPS } from '@/data/facts'
import { formatInt } from '@/lib/format'
import {
  CHART_CACHE_KEY,
  CHART_CHANNEL_CAP,
  CHART_TTL_MS,
  SEARCH_CHANNEL_CAP,
  SEARCH_MIN_UNITS,
  SEARCH_TTL_MS,
  TREND_LABEL,
  addQuota,
  ageHours,
  describeFindings,
  estimateChartUnits,
  estimateSearchUnits,
  exhaustQuota,
  ideaFromSubject,
  looksLikeKey,
  needsQuotaConfirm,
  isFresh,
  quotaRemaining,
  readApiKey,
  readQuota,
  searchCacheKey,
  removeSubject,
  saveSubject,
  snapshotFromSummary,
  watchTrend,
  youtubeErrorMessage,
  type RadarLanguage,
  type RadarRegion,
  type RadarWindow,
  type StoredChart,
  type StoredSearch,
  type TermCount,
  type WatchItem,
} from '@/lib/radar'
import { browserStorage, loadRadar, saveRadar } from '@/lib/radarStore'
import { plainError, runPopularChart, runThemeSearch } from '@/lib/youtube'
import { useApp } from '@/state/store'
import { ChoiceButton, DemandCard, FilterLine, TrendBadge, VerdictBadge, VideoCard } from '@/components/RadarBits'
import { PageIntro } from '@/components/bits'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Mode = 'buscar' | 'descobrir' | 'salvos'
type Job =
  | { kind: 'search'; force: boolean }
  | { kind: 'chart'; force: boolean }
  | { kind: 'sweep'; force: boolean }
  | { kind: 'recheck'; id: string }

const storage = browserStorage()

export function RadarPage() {
  const { state, setIdea } = useApp()
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('buscar')
  const [key] = useState(() => (storage ? readApiKey(storage) : ''))
  const [quotaUsed, setQuotaUsed] = useState(() => (storage ? readUsed() : 0))
  const [bundle, setBundle] = useState<Awaited<ReturnType<typeof loadRadar>> | null>(null)
  const [online, setOnline] = useState(() => navigator.onLine)
  const [query, setQuery] = useState('')
  const [windowKind, setWindowKind] = useState<RadarWindow>('7d')
  const [region, setRegion] = useState<RadarRegion>('BR')
  const [language, setLanguage] = useState<RadarLanguage>('pt')
  const [result, setResult] = useState<StoredSearch | null>(null)
  const [resultCached, setResultCached] = useState(false)
  const [sweep, setSweep] = useState<StoredSearch | null>(null)
  const [sweepCached, setSweepCached] = useState(false)
  const [chart, setChart] = useState<StoredChart | null>(null)
  const [chartCached, setChartCached] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState<Job['kind'] | null>(null)
  const [pending, setPending] = useState<Job | null>(null)
  const [dropId, setDropId] = useState<string | null>(null)
  const alive = useRef(true)
  const busy = useRef(false)

  useEffect(() => {
    alive.current = true
    loadRadar()
      .then((next) => {
        if (alive.current) setBundle(next)
      })
      .catch(() => {
        if (alive.current) setError('Não consegui abrir os assuntos salvos neste aparelho.')
      })
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      alive.current = false
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  useEffect(() => {
    if (!bundle || chart) return
    const saved = bundle.charts[CHART_CACHE_KEY]
    if (!saved) return
    setChart(saved)
    setChartCached(true)
  }, [bundle, chart])

  const remaining = quotaRemaining(quotaUsed)
  const names = state.characters.map((character) => character.name)

  function spend(units: number) {
    if (!storage) return
    setQuotaUsed(addQuota(storage, units, new Date()).used)
  }

  function exhaust() {
    if (!storage) return
    setQuotaUsed(exhaustQuota(storage, new Date()).used)
  }

  async function persist(next: Awaited<ReturnType<typeof loadRadar>>) {
    setBundle(next)
    try {
      await saveRadar(next)
    } catch {
      if (alive.current) setError('Não consegui guardar os dados do Em alta neste aparelho.')
    }
  }

  function hasFreshCache(job: Job): boolean {
    if (!bundle || job.kind === 'recheck' || job.force) return false
    const nowMs = Date.now()
    if (job.kind === 'chart') {
      const saved = bundle.charts[CHART_CACHE_KEY]
      return Boolean(saved && isFresh(saved.savedAt, nowMs, CHART_TTL_MS))
    }
    const filters = job.kind === 'sweep'
      ? { query: '#shorts', window: '7d' as const, region, language }
      : { query: query.trim(), window: windowKind, region, language }
    const saved = bundle.searches[searchCacheKey(filters.query, filters.window, filters.region, filters.language)]
    return Boolean(saved && isFresh(saved.savedAt, nowMs, SEARCH_TTL_MS))
  }

  function ask(job: Job) {
    setError('')
    if (!storage) {
      setError('Este navegador não deixa guardar a chave aqui.')
      return
    }
    if (!key) return
    if (!bundle) {
      setError('Um instante, estou abrindo os dados deste aparelho.')
      return
    }
    if (job.kind === 'search') {
      const clean = query.trim()
      if (clean.length < 2) {
        setError('Escreva pelo menos duas letras.')
        return
      }
      if (clean.length > 80) {
        setError('Use um nome mais curto.')
        return
      }
      if (looksLikeKey(clean)) {
        setError('Isso parece uma chave, não um assunto. Não vou buscar nem salvar.')
        return
      }
    }
    if (hasFreshCache(job)) {
      void perform(job)
      return
    }
    if (!online) {
      setError(youtubeErrorMessage('offline'))
      return
    }
    const left = quotaRemaining(quotaUsed)
    if (left < costMin(job) || needsQuotaConfirm(left, costMin(job))) {
      setPending(job)
      return
    }
    void perform(job)
  }

  async function perform(job: Job) {
    if (busy.current || !storage || !bundle || !key) return
    if (job.kind === 'recheck' && !bundle.watchlist.some((item) => item.id === job.id)) {
      setError('Não achei esse assunto salvo.')
      return
    }
    busy.current = true
    setPending(null)
    setLoading(job.kind)
    setError('')
    const now = new Date()
    const partial = { current: null as Awaited<ReturnType<typeof loadRadar>> | null }
    const shared = {
      bundle,
      key,
      now,
      onUnits: (units: number) => {
        if (alive.current) spend(units)
      },
      onQuotaExhausted: () => {
        if (alive.current) exhaust()
      },
      onPartial: (next: Awaited<ReturnType<typeof loadRadar>>) => {
        partial.current = next
      },
    }
    try {
      if (job.kind === 'chart') {
        const outcome = await runPopularChart({ ...shared, characterNames: names, force: job.force })
        if (!alive.current || !outcome.result) return
        await persist(outcome.bundle)
        setChart(outcome.result)
        setChartCached(outcome.fromCache)
        setStatus(outcome.fromCache ? 'Mostrei o topo guardado neste aparelho.' : 'Topo do Brasil pronto.')
        return
      }
      const subject = job.kind === 'recheck' ? bundle.watchlist.find((item) => item.id === job.id) : null
      const filters = subject
        ? { query: subject.query, window: subject.window, region: subject.region, language: subject.language }
        : job.kind === 'sweep'
          ? { query: '#shorts', window: '7d' as const, region, language }
          : { query: query.trim(), window: windowKind, region, language }
      const outcome = await runThemeSearch({ ...shared, ...filters, force: job.kind === 'recheck' ? true : job.force })
      if (!alive.current) return
      let next = outcome.bundle
      if (job.kind === 'recheck' && subject) {
        const snapshot = snapshotFromSummary(outcome.result.summary, subject, new Date(outcome.result.savedAt).toISOString())
        next = { ...next, watchlist: saveSubject(next.watchlist, { ...subject, snapshots: [snapshot] }) }
      }
      await persist(next)
      if (job.kind === 'sweep') {
        setSweep(outcome.result)
        setSweepCached(outcome.fromCache)
        setMode('descobrir')
      } else if (job.kind === 'search') {
        setResult(outcome.result)
        setResultCached(outcome.fromCache)
        requestAnimationFrame(() => document.getElementById('resultado-busca')?.scrollIntoView({ block: 'start' }))
      }
      setStatus(outcome.fromCache ? 'Mostrei a busca guardada neste aparelho. Não gastei cota agora.' : 'Consulta pronta.')
    } catch (cause) {
      if (partial.current) await persist(partial.current)
      if (alive.current) setError(plainError(cause))
    } finally {
      busy.current = false
      if (alive.current) setLoading(null)
    }
  }

  function saveCurrent() {
    if (!bundle || !result || looksLikeKey(result.query)) return
    const draft: WatchItem = {
      id: crypto.randomUUID(),
      query: result.query,
      window: result.window,
      region: result.region,
      language: result.language,
      savedAt: new Date(result.savedAt).toISOString(),
      snapshots: [snapshotFromSummary(result.summary, result, new Date(result.savedAt).toISOString())],
    }
    void persist({ ...bundle, watchlist: saveSubject(bundle.watchlist, draft) })
    setStatus('Assunto salvo neste aparelho.')
    setMode('salvos')
  }

  function toIdea(subject: string) {
    const words = KEYWORD_GROUPS.flatMap((group) => [...group.words])
    setIdea(ideaFromSubject(state.ideaDraft, subject, state.characters, words))
    navigate('/ideia', { state: { radarSubject: subject } })
  }

  function useTerm(term: string) {
    setQuery(term)
    setMode('buscar')
    setStatus(`"${term}" está na busca. Toque em Buscar para medir. Isso gasta cota.`)
  }

  return (
    <div className="flex flex-col gap-4">
      <PageIntro
        title="Em alta"
        lede="Veja temas e personagens que estão rendendo acima do normal em vídeos curtos, de até 3 minutos. A conta usa os números que o YouTube entrega. Não é o volume oficial de busca."
      />
      {status ? <p className="text-sm leading-relaxed" role="status">{status}</p> : null}
      {!online ? (
        <p className="rounded-2xl border bg-card p-4 text-sm leading-relaxed" role="status">
          Sem conexão. O Em alta precisa de internet. O resto do app continua funcionando. O que já foi salvo neste aparelho continua aqui.
        </p>
      ) : null}
      {!storage ? <p className="text-sm">Este navegador não deixa guardar a chave aqui.</p> : null}
      {!key ? (
        <section className="rounded-2xl border bg-card p-4">
          <h2 className="text-lg font-semibold">Falta a chave do YouTube</h2>
          <p className="mt-2 text-sm leading-relaxed">
            Sem essa chave eu não leio o YouTube e não invento números. A chave fica só neste aparelho.
          </p>
          <Link to="/ajustes" state={{ focus: 'youtube' }} className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold underline">
            Criar a chave em Ajustes
          </Link>
        </section>
      ) : (
        <p className="text-sm leading-relaxed text-muted-foreground">
          Conta deste aparelho: {formatInt(quotaUsed)} de 10.000 unidades usadas hoje. É uma estimativa. O Google pode contar diferente, e a conta zera à meia-noite da Califórnia.
        </p>
      )}
      {error ? <p className="rounded-2xl border border-[#E7C7A1] bg-[#FDEEDD] p-4 text-sm leading-relaxed text-[#1C1B19]" role="alert">{error}</p> : null}
      <div role="tablist" aria-label="Partes do Em alta" className="grid grid-cols-3 gap-2">
        <TabButton selected={mode === 'buscar'} onClick={() => setMode('buscar')}>Buscar</TabButton>
        <TabButton selected={mode === 'descobrir'} onClick={() => setMode('descobrir')}>Descobrir</TabButton>
        <TabButton selected={mode === 'salvos'} onClick={() => setMode('salvos')}>Salvos</TabButton>
      </div>

      {mode !== 'salvos' ? (
        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-medium">Onde olhar</legend>
          <div className="grid grid-cols-2 gap-2">
            <ChoiceButton pressed={region === 'BR'} onClick={() => setRegion('BR')}>Brasil</ChoiceButton>
            <ChoiceButton pressed={region === 'WORLD'} onClick={() => setRegion('WORLD')}>Mundial</ChoiceButton>
            <ChoiceButton pressed={language === 'pt'} onClick={() => setLanguage('pt')}>Português</ChoiceButton>
            <ChoiceButton pressed={language === 'any'} onClick={() => setLanguage('any')}>Qualquer idioma</ChoiceButton>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">Português pede vídeos relevantes nesse idioma. Não é uma garantia. Mundial tira o filtro de país.</p>
        </fieldset>
      ) : null}

      {pending ? (
        <section className="rounded-2xl border bg-card p-4">
          <h2 className="text-lg font-semibold">Antes de gastar cota</h2>
          <p className="mt-2 text-sm leading-relaxed">
            {quotaRemaining(quotaUsed) < costMin(pending)
              ? 'Pela conta deste aparelho, a cota de hoje não cobre esta consulta. O Google pode contar diferente.'
              : `Esta consulta começa em ${formatInt(costMin(pending))} unidades e pode chegar a ${formatInt(costMax(pending))}. Restam cerca de ${formatInt(remaining)}.`}
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <Button type="button" disabled={loading != null} onClick={() => void perform(pending)}>
              {quotaRemaining(quotaUsed) < costMin(pending) ? 'Tentar mesmo assim' : 'Continuar'}
            </Button>
            <button type="button" className="min-h-11 text-sm font-medium underline" onClick={() => setPending(null)}>Cancelar</button>
          </div>
        </section>
      ) : null}

      {mode === 'buscar' ? (
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            ask({ kind: 'search', force: false })
          }}
        >
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Tema ou personagem
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ex.: Sonic" autoComplete="off" />
          </label>
          <div>
            <p className="text-sm font-medium">Atalhos do seu caderno</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {state.characters.map((character) => (
                <button key={character.id} type="button" className="min-h-11 rounded-full border bg-card px-3 text-sm" onClick={() => setQuery(character.name)}>
                  {character.name}
                </button>
              ))}
            </div>
          </div>
          <details className="rounded-2xl border bg-card px-4 py-2">
            <summary className="min-h-11 cursor-pointer text-sm font-medium">Formatos do app</summary>
            <div className="flex flex-col gap-2 pb-3">
              {state.formats.map((format) => (
                <button key={format.id} type="button" className="min-h-11 rounded-xl border px-3 text-left text-sm" onClick={() => setQuery(format.name)}>
                  {format.name}
                </button>
              ))}
            </div>
          </details>
          <fieldset>
            <legend className="text-sm font-medium">Período</legend>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <ChoiceButton pressed={windowKind === '24h'} onClick={() => setWindowKind('24h')}>24 horas</ChoiceButton>
              <ChoiceButton pressed={windowKind === '7d'} onClick={() => setWindowKind('7d')}>7 dias</ChoiceButton>
              <ChoiceButton pressed={windowKind === '30d'} onClick={() => setWindowKind('30d')}>30 dias</ChoiceButton>
            </div>
          </fieldset>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Uma busca começa em 100 unidades. Com canais novos, pode chegar a {formatInt(estimateSearchUnits(SEARCH_CHANNEL_CAP))}. Canais lidos nas últimas 12 horas não gastam de novo. O resultado fica neste aparelho por 6 horas.
          </p>
          <Button type="submit" disabled={!key || loading != null || !online}>
            {loading === 'search' ? 'Lendo o YouTube…' : 'Buscar'}
          </Button>
        </form>
      ) : null}

      {mode === 'buscar' && result ? (
        <div id="resultado-busca" className="flex flex-col gap-3">
          <div>
            <h2 className="text-lg font-semibold">{result.query}</h2>
            <FilterLine window={result.window} region={result.region} language={result.language} />
          </div>
          <DemandCard
            summary={result.summary}
            droppedLong={result.droppedLong}
            note={result.note}
            young={youngCount(result)}
            cachedLabel={resultCached ? `Resultado guardado neste aparelho em ${formatWhen(result.savedAt)}. Não gastei cota agora.` : null}
            spent={resultCached ? null : result.units}
          />
          <MathNote />
          <p className="text-sm leading-relaxed text-muted-foreground">Amostra de até 25 vídeos, na ordem de views do YouTube. A lista abaixo está reordenada: primeiro os que mais fugiram do normal do canal.</p>
          <VideoList videos={result.videos} measuredAt={result.savedAt} />
          <Button type="button" onClick={saveCurrent}>Salvar assunto</Button>
          <Button type="button" variant="outline" disabled={!online || loading != null} onClick={() => ask({ kind: 'search', force: true })}>
            {loading === 'search' ? 'Lendo o YouTube…' : 'Atualizar do YouTube'}
          </Button>
          <button type="button" className="min-h-11 text-left text-sm font-semibold underline" onClick={() => toIdea(result.query)}>
            Levar este assunto para uma ideia
          </button>
        </div>
      ) : null}

      {mode === 'descobrir' ? (
        <div className="flex flex-col gap-4">
          <section className="rounded-2xl border bg-card p-4">
            <h2 className="text-lg font-semibold">Topo do YouTube</h2>
            <p className="mt-2 text-sm leading-relaxed">
              O gráfico de populares é sempre do Brasil. Ele custa 1 unidade, mais um pouco se eu precisar ler o normal dos canais (até {formatInt(estimateChartUnits(CHART_CHANNEL_CAP))}). Eu mostro só os vídeos de até 3 minutos. Não existe um topo mundial, então eu não invento um.
            </p>
            <Button type="button" className="mt-3 w-full" disabled={!key || loading != null || !online} onClick={() => ask({ kind: 'chart', force: false })}>
              {loading === 'chart' ? 'Lendo o YouTube…' : 'Ver o topo do Brasil'}
            </Button>
            {chart ? (
              <div className="mt-4 flex flex-col gap-3">
                {chartCached ? <p className="text-sm">Topo guardado neste aparelho em {formatWhen(chart.savedAt)}. Não gastei cota agora.</p> : <p className="text-sm">Esta consulta gastou {formatInt(chart.units)} unidades.</p>}
                <p className="text-sm leading-relaxed">{chart.note}</p>
                <TermList title={chart.termSource === 'outliers' ? 'Palavras que se repetem nos vídeos fora do normal' : 'Palavras que se repetem nesta amostra'} terms={chart.terms} onPick={useTerm} />
                <TermList title="Personagens seus que aparecem nos títulos" terms={chart.characters} onPick={useTerm} />
                <VideoList videos={chart.videos} measuredAt={chart.savedAt} />
                <Button type="button" variant="outline" disabled={!online || loading != null} onClick={() => ask({ kind: 'chart', force: true })}>Atualizar o topo</Button>
              </div>
            ) : null}
          </section>
          <section className="rounded-2xl border bg-card p-4">
            <h2 className="text-lg font-semibold">Shorts recentes com muitas views</h2>
            <p className="mt-2 text-sm leading-relaxed">
              Procuro a palavra Shorts nos últimos 7 dias, fico só com vídeos de até 3 minutos e marco os que passaram do normal do canal. País e idioma são os escolhidos acima. Começa em 100 unidades e pode chegar a {formatInt(estimateSearchUnits(SEARCH_CHANNEL_CAP))}.
            </p>
            <Button type="button" className="mt-3 w-full" disabled={!key || loading != null || !online} onClick={() => ask({ kind: 'sweep', force: false })}>
              {loading === 'sweep' ? 'Lendo o YouTube…' : 'Varrer Shorts'}
            </Button>
          </section>
          {sweep ? (
            <div className="flex flex-col gap-3">
              <DemandCard
                summary={sweep.summary}
                droppedLong={sweep.droppedLong}
                note={sweep.note}
                young={youngCount(sweep)}
                cachedLabel={sweepCached ? `Varredura guardada neste aparelho em ${formatWhen(sweep.savedAt)}. Não gastei cota agora.` : null}
                spent={sweepCached ? null : sweep.units}
              />
              <SweepTerms result={sweep} names={names} onPick={useTerm} />
              <VideoList videos={sweep.videos} measuredAt={sweep.savedAt} />
              <Button type="button" variant="outline" disabled={!online || loading != null} onClick={() => ask({ kind: 'sweep', force: true })}>Atualizar a varredura</Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {mode === 'salvos' ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Subindo ou caindo quer dizer que as views por dia mudaram 15% ou mais entre as duas últimas medições. A lista fica neste aparelho.
          </p>
          {!bundle ? <p className="text-sm">Abrindo os assuntos salvos…</p> : null}
          {bundle && bundle.watchlist.length === 0 ? <p className="text-sm">Nenhum assunto salvo. Busque um tema e toque em Salvar assunto.</p> : null}
          {bundle?.watchlist.map((item) => {
            const last = item.snapshots[item.snapshots.length - 1]
            const trend = watchTrend(item)
            return (
              <section key={item.id} className="rounded-2xl border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold">{item.query}</h2>
                  {last ? <VerdictBadge verdict={last.verdict} /> : null}
                </div>
                <FilterLine window={item.window} region={item.region} language={item.language} />
                <p className="mt-2"><TrendBadge trend={trend} /></p>
                <p className="mt-1 text-sm leading-relaxed">{trend === 'sem_comparacao' ? 'Meça de novo mais tarde para ver se sobe ou cai.' : `${TREND_LABEL[trend]} desde a medição anterior.`}</p>
                {last ? (
                  <p className="mt-2 text-sm">
                    Última medição: {last.videoCount} vídeos, {last.outlierCount} fora do normal
                    {last.medianMultiplier == null ? '' : `, mediana ${formatMultiplier(last.medianMultiplier)}`}
                    {last.medianViewsPerDay == null ? '' : `, ${formatCompactPage(last.medianViewsPerDay)} views por dia`}.
                  </p>
                ) : <p className="mt-2 text-sm">Ainda sem medição guardada.</p>}
                {item.snapshots.length ? (
                  <ol className="mt-3 flex list-none flex-col gap-1 p-0 text-sm">
                    {[...item.snapshots].reverse().slice(0, 8).map((snap) => (
                      <li key={snap.at}>
                        {formatWhen(Date.parse(snap.at))} · {snap.verdict === 'alta' ? 'demanda alta' : snap.verdict === 'media' ? 'demanda média' : snap.verdict === 'baixa' ? 'demanda baixa' : snap.verdict === 'incerta' ? 'amostra pequena' : 'nada encontrado'}
                        {snap.medianViewsPerDay == null ? '' : ` · ${formatCompactPage(snap.medianViewsPerDay)} views/dia`}
                      </li>
                    ))}
                  </ol>
                ) : null}
                <div className="mt-3 flex flex-col gap-2">
                  <Button type="button" disabled={!key || !online || loading != null} onClick={() => ask({ kind: 'recheck', id: item.id })}>
                    {loading === 'recheck' ? 'Lendo o YouTube…' : 'Medir de novo'}
                  </Button>
                  <button type="button" className="min-h-11 text-left text-sm font-semibold underline" onClick={() => toIdea(item.query)}>
                    Levar para uma ideia
                  </button>
                  {dropId === item.id ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="min-h-11 flex-1 rounded-xl border text-sm font-medium"
                        onClick={() => {
                          if (!bundle) return
                          void persist({ ...bundle, watchlist: removeSubject(bundle.watchlist, item.id) })
                          setDropId(null)
                        }}
                      >
                        Tirar dos salvos
                      </button>
                      <button type="button" className="min-h-11 flex-1 rounded-xl border text-sm font-medium" onClick={() => setDropId(null)}>Cancelar</button>
                    </div>
                  ) : (
                    <button type="button" className="min-h-11 text-left text-sm underline" onClick={() => setDropId(item.id)}>Tirar dos salvos</button>
                  )}
                </div>
              </section>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

function TabButton({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: string }) {
  return (
    <button type="button" role="tab" aria-selected={selected} onClick={onClick} className={`min-h-11 rounded-xl border text-sm font-semibold ${selected ? 'border-foreground bg-foreground text-background' : 'bg-card'}`}>
      {children}
    </button>
  )
}

function MathNote() {
  return (
    <details className="rounded-2xl border bg-card px-4 py-2">
      <summary className="min-h-11 cursor-pointer text-sm font-medium">Como eu conto estes números</summary>
      <p className="pb-3 text-sm leading-relaxed">
        O multiplicador é as views do vídeo divididas pela mediana dos vídeos do canal com mais de 2 dias. Mediana é o valor do meio. O dobro ou mais, com pelo menos 3 vídeos nessa base, eu marco como fora do normal. A demanda olha quantos Shorts recentes apareceram, quantos estão fora do normal e o multiplicador do meio. O ritmo é views dividido pelo tempo desde a publicação.
      </p>
    </details>
  )
}

function VideoList({ videos, measuredAt }: { videos: StoredSearch['videos']; measuredAt: number }) {
  if (!videos.length) return <p className="text-sm">Nenhum Shorts nesta amostra.</p>
  return (
    <ol className="flex list-none flex-col gap-3 p-0">
      {videos.map((video) => <VideoCard key={video.id} video={video} measuredAt={measuredAt} />)}
    </ol>
  )
}

function TermList({ title, terms, onPick }: { title: string; terms: TermCount[]; onPick: (term: string) => void }) {
  if (!terms.length) return null
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-2 flex flex-wrap gap-2">
        {terms.map((term) => (
          <button key={term.term} type="button" className="min-h-11 rounded-full border px-3 text-sm" onClick={() => onPick(term.term)}>
            {term.term} · {term.count}
          </button>
        ))}
      </div>
    </div>
  )
}

function SweepTerms({ result, names, onPick }: { result: StoredSearch; names: string[]; onPick: (term: string) => void }) {
  const findings = describeFindings(result.videos, names)
  return (
    <>
      <TermList title={findings.termSource === 'outliers' ? 'Palavras que se repetem nos vídeos fora do normal' : 'Palavras que se repetem nesta amostra'} terms={findings.terms} onPick={onPick} />
      <TermList title="Personagens seus que aparecem nos títulos" terms={findings.characters} onPick={onPick} />
    </>
  )
}

function youngCount(result: StoredSearch): number {
  return result.videos.filter((video) => {
    const age = ageHours(video.publishedAt, new Date(result.savedAt))
    return age != null && age >= 0 && age < 3
  }).length
}

function formatWhen(ms: number): string {
  if (!Number.isFinite(ms)) return 'data sem número'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(ms))
}

function formatMultiplier(value: number): string {
  return `${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value)}×`
}

function formatCompactPage(value: number): string {
  return new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

function costMin(job: Job): number {
  return job.kind === 'chart' ? 1 : SEARCH_MIN_UNITS
}

function costMax(job: Job): number {
  return job.kind === 'chart' ? estimateChartUnits(CHART_CHANNEL_CAP) : estimateSearchUnits(SEARCH_CHANNEL_CAP)
}

function readUsed(): number {
  if (!storage) return 0
  return readQuota(storage, new Date()).used
}
