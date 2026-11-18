import type { IdeaDraft } from '@/types'

export type RadarWindow = '24h' | '7d' | '30d'
export type RadarRegion = 'BR' | 'WORLD'
export type RadarLanguage = 'pt' | 'any'
export type DemandVerdict = 'alta' | 'media' | 'baixa' | 'incerta' | 'sem_amostra'
export type Trend = 'subindo' | 'caindo' | 'estavel' | 'sem_comparacao'
export type YoutubeErrorKind = 'quota' | 'rate' | 'key' | 'referrer' | 'disabled' | 'offline' | 'other'
export type TermSource = 'outliers' | 'amostra'

export const DAILY_QUOTA = 10_000
export const SEARCH_LIST_UNITS = 100
export const LIST_UNITS = 1
export const SEARCH_MIN_UNITS = 100
export const BASELINE_FETCH = 30
export const SEARCH_CHANNEL_CAP = 20
export const CHART_CHANNEL_CAP = 12
export const SHORTS_MAX_SECONDS = 180
export const OUTLIER_MULTIPLIER = 2
export const BASELINE_MIN_AGE_MS = 48 * 60 * 60 * 1000
export const SEARCH_TTL_MS = 6 * 60 * 60 * 1000
export const CHANNEL_TTL_MS = 12 * 60 * 60 * 1000
export const CHART_TTL_MS = 3 * 60 * 60 * 1000
export const MIN_AGE_HOURS = 1 / 6
export const YOUTUBE_KEY_STORAGE = 'esteira-viral.youtubeKey'
export const QUOTA_STORAGE = 'esteira-viral.youtubeQuota'
export const CHART_CACHE_KEY = 'chart|BR'
export const REFERRER_RULE = 'pablowesleycriativo-ops.github.io/*'
export const GOOGLE_API_URL = 'https://console.cloud.google.com/apis/library/youtube.googleapis.com'
export const GOOGLE_KEY_URL = 'https://console.cloud.google.com/apis/credentials'

const WINDOW_HOURS: Record<RadarWindow, number> = { '24h': 24, '7d': 24 * 7, '30d': 24 * 30 }

const STOP = new Set([
  'de', 'da', 'do', 'das', 'dos', 'uma', 'uns', 'umas', 'para', 'pra', 'com', 'sem', 'nos', 'nas', 'em', 'que', 'se', 'por',
  'mais', 'mas', 'como', 'ja', 'ou', 'ao', 'aos', 'the', 'and', 'to', 'in', 'for', 'on', 'at', 'by', 'from', 'with', 'this',
  'that', 'you', 'your', 'are', 'was', 'not', 'via', 'shorts', 'short', 'youtube', 'video', 'videos', 'oficial', 'official',
  'novo', 'nova', 'new', 'meu', 'minha', 'episodio', 'parte', 'assistir', 'inscreva', 'canal', 'how', 'draw', 'sobre',
  'entre', 'quando', 'porque', 'what', 'just', 'into', 'out', 'all', 'its', 'nao', 'num', 'numa', 'pelo', 'pela', 'pelos',
  'pelas', 'seu', 'sua', 'seus', 'suas', 'ele', 'ela', 'eles', 'isso', 'isto', 'aquele', 'muito', 'muita', 'nosso', 'essa',
  'esse', 'esta', 'este', 'foi', 'ser', 'tem', 'vai', 'vou', 'the', 'and', 'com', 'que', 'dos', 'das', 'para', 'uma',
])

export const VERDICT_LABEL: Record<DemandVerdict, string> = {
  alta: 'Demanda alta',
  media: 'Demanda média',
  baixa: 'Demanda baixa',
  incerta: 'Amostra pequena',
  sem_amostra: 'Nada encontrado',
}

export const VERDICT_TEXT: Record<DemandVerdict, string> = {
  alta: 'Vários canais estão com bem mais views do que o normal deles neste assunto.',
  media: 'Tem algum sinal acima do normal, sem ser um pico claro.',
  baixa: 'Os vídeos desta amostra estão perto ou abaixo do que esses canais já costumam ter.',
  incerta: 'Achei poucos vídeos, ou poucos canais com histórico, para cravar a demanda.',
  sem_amostra: 'Nada de Shorts neste prazo. Tente outro nome ou uma janela maior.',
}

export const TREND_LABEL: Record<Trend, string> = {
  subindo: 'Subindo',
  caindo: 'Caindo',
  estavel: 'Estável',
  sem_comparacao: 'Ainda sem comparação',
}

export const KEY_GUIDE: { title: string; text: string }[] = [
  {
    title: 'Abra o Google Cloud',
    text: 'Entre em console.cloud.google.com com a sua conta Google.',
  },
  {
    title: 'Crie um projeto',
    text: 'Pode chamar de Esteira Viral. Se já tiver um projeto, use ele.',
  },
  {
    title: 'Ative a API',
    text: 'Procure YouTube Data API v3 e clique em Ativar.',
  },
  {
    title: 'Crie a chave',
    text: 'Vá em Credenciais, depois Criar credenciais, depois Chave de API. Copie a chave.',
  },
  {
    title: 'Restrinja a chave',
    text: `Em sites, coloque o referenciador ${REFERRER_RULE}. Em restrição de API, escolha só a YouTube Data API v3.`,
  },
]

const ERROR_TEXT: Record<YoutubeErrorKind, string> = {
  quota: 'A cota diária do YouTube acabou. Ela volta à meia-noite na Califórnia (de manhã no Brasil).',
  rate: 'Muitas consultas em pouco tempo. Espere um minuto e tente de novo.',
  key: 'Essa chave não foi aceita. Confira se copiou a chave inteira e se a YouTube Data API v3 está ativada no projeto.',
  referrer: `O YouTube bloqueou a chave neste endereço. Na restrição de sites, inclua ${REFERRER_RULE}. No computador, o endereço local não passa nessa restrição.`,
  disabled: 'Ative a YouTube Data API v3 no projeto dessa chave, no Google Cloud Console.',
  offline: 'Sem conexão. O Em alta precisa de internet. O resto do app continua funcionando.',
  other: 'O YouTube não respondeu como esperado. Tente de novo em alguns minutos.',
}

export type KeyValue = {
  get(key: string): string | null
  set(key: string, value: string): void
  remove(key: string): void
}

export type QuotaState = { date: string; used: number }

export type BaselineVideo = { id: string; publishedAt: string; views: number }

export type ScoredVideo = {
  id: string
  title: string
  channelId: string
  channelTitle: string
  publishedAt: string
  thumbnail: string
  views: number
  durationSec: number
  subscriberCount: number | null
  subscribersHidden: boolean
  typicalViews: number | null
  baselineSample: number
  freshBaseline: boolean
  reliable: boolean
  multiplier: number | null
  viewsPerHour: number | null
  viewsPerDay: number | null
  outlier: boolean
}

export type DemandSummary = {
  videoCount: number
  outlierCount: number
  withBaseline: number
  medianMultiplier: number | null
  medianViewsPerHour: number | null
  medianViewsPerDay: number | null
  verdict: DemandVerdict
}

export type TermCount = { term: string; count: number }

export type RadarSnapshot = {
  at: string
  window: RadarWindow
  region: RadarRegion
  language: RadarLanguage
  videoCount: number
  outlierCount: number
  medianMultiplier: number | null
  medianViewsPerDay: number | null
  verdict: DemandVerdict
}

export type WatchItem = {
  id: string
  query: string
  window: RadarWindow
  region: RadarRegion
  language: RadarLanguage
  savedAt: string
  snapshots: RadarSnapshot[]
}

export type ChannelBaseline = {
  channelId: string
  fetchedAt: number
  subscriberCount: number | null
  subscribersHidden: boolean
  videos: BaselineVideo[]
}

export type StoredSearch = {
  savedAt: number
  query: string
  window: RadarWindow
  region: RadarRegion
  language: RadarLanguage
  videos: ScoredVideo[]
  summary: DemandSummary
  units: number
  droppedLong: number
  note: string
}

export type StoredChart = {
  savedAt: number
  region: 'BR'
  totalListed: number
  videos: ScoredVideo[]
  terms: TermCount[]
  termSource: TermSource
  characters: TermCount[]
  units: number
  note: string
}

export type RadarBundle = {
  watchlist: WatchItem[]
  searches: Record<string, StoredSearch>
  channels: Record<string, ChannelBaseline>
  charts: Record<string, StoredChart>
}

export function emptyRadar(): RadarBundle {
  return { watchlist: [], searches: {}, channels: {}, charts: {} }
}

export function fold(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export function windowStart(window: RadarWindow, now: Date): string {
  return new Date(now.getTime() - WINDOW_HOURS[window] * 3_600_000).toISOString()
}

export function windowLabel(window: RadarWindow): string {
  if (window === '24h') return '24 horas'
  if (window === '7d') return '7 dias'
  return '30 dias'
}

export function regionLabel(region: RadarRegion): string {
  return region === 'BR' ? 'Brasil' : 'Mundial'
}

export function languageLabel(language: RadarLanguage): string {
  return language === 'pt' ? 'Português' : 'Qualquer idioma'
}

export function parseIsoDuration(iso: string): number | null {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso)
  if (!match || (!match[1] && !match[2] && !match[3])) return null
  return Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0)
}

export function isShort(seconds: number | null): boolean {
  return seconds != null && seconds > 0 && seconds <= SHORTS_MAX_SECONDS
}

export function median(values: number[]): number | null {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[mid]
  return (sorted[mid - 1] + sorted[mid]) / 2
}

export function channelTypicalViews(videos: BaselineVideo[], now: Date, excludeIds: ReadonlySet<string>) {
  const usable = videos.filter((video) => {
    return !excludeIds.has(video.id) && Number.isFinite(video.views) && video.views >= 0 && Number.isFinite(Date.parse(video.publishedAt))
  })
  const cutoff = now.getTime() - BASELINE_MIN_AGE_MS
  const mature = usable.filter((video) => Date.parse(video.publishedAt) <= cutoff)
  const freshOnly = mature.length < 3
  const pool = freshOnly ? usable : mature
  return {
    typical: median(pool.map((video) => video.views)),
    sample: pool.length,
    freshOnly: freshOnly && pool.length > 0,
  }
}

export function ageHours(publishedAt: string, now: Date): number | null {
  const published = Date.parse(publishedAt)
  if (!Number.isFinite(published)) return null
  const age = (now.getTime() - published) / 3_600_000
  return Number.isFinite(age) ? age : null
}

export function ageLabel(publishedAt: string, now: Date): string {
  const hours = ageHours(publishedAt, now)
  if (hours == null || hours < 0) return 'data de publicação sem número'
  if (hours < 1) return 'publicado há menos de 1 hora'
  if (hours < 48) {
    const rounded = Math.max(1, Math.round(hours))
    return `publicado há ${rounded} ${rounded === 1 ? 'hora' : 'horas'}`
  }
  const days = Math.max(1, Math.round(hours / 24))
  return `publicado há ${days} ${days === 1 ? 'dia' : 'dias'}`
}

export function viewsPerHour(views: number, publishedAt: string, now: Date): number | null {
  const age = ageHours(publishedAt, now)
  if (age == null || age < 0 || !Number.isFinite(views) || views < 0) return null
  return views / Math.max(age, MIN_AGE_HOURS)
}

export function outlierMultiplier(views: number, typical: number | null): number | null {
  if (typical == null || !(typical > 0) || !Number.isFinite(views)) return null
  return views / typical
}

export function scoreVideos(
  videos: Array<Omit<ScoredVideo, 'typicalViews' | 'baselineSample' | 'freshBaseline' | 'reliable' | 'multiplier' | 'viewsPerHour' | 'viewsPerDay' | 'outlier' | 'subscriberCount' | 'subscribersHidden'> & { durationSec: number }>,
  channels: ReadonlyMap<string, { subscriberCount: number | null; subscribersHidden: boolean }>,
  baselines: ReadonlyMap<string, BaselineVideo[]>,
  now: Date,
): ScoredVideo[] {
  const scored = videos.map((video) => {
    const info = channels.get(video.channelId)
    const typical = channelTypicalViews(baselines.get(video.channelId) ?? [], now, new Set([video.id]))
    const multiplier = outlierMultiplier(video.views, typical.typical)
    const perHour = viewsPerHour(video.views, video.publishedAt, now)
    const reliable = typical.typical != null && typical.typical > 0 && typical.sample >= 3 && !typical.freshOnly
    return {
      ...video,
      subscriberCount: info?.subscriberCount ?? null,
      subscribersHidden: info?.subscribersHidden ?? false,
      typicalViews: typical.typical != null && typical.typical > 0 ? typical.typical : null,
      baselineSample: typical.sample,
      freshBaseline: typical.freshOnly,
      reliable,
      multiplier: typical.typical != null && typical.typical > 0 ? multiplier : null,
      viewsPerHour: perHour,
      viewsPerDay: perHour == null ? null : perHour * 24,
      outlier: Boolean(reliable && multiplier != null && multiplier >= OUTLIER_MULTIPLIER),
    }
  })
  return sortByOutlier(scored)
}

export function sortByOutlier(videos: ScoredVideo[]): ScoredVideo[] {
  return [...videos].sort((a, b) => {
    if (a.multiplier == null && b.multiplier == null) return (b.viewsPerDay ?? 0) - (a.viewsPerDay ?? 0)
    if (a.multiplier == null) return 1
    if (b.multiplier == null) return -1
    if (b.multiplier !== a.multiplier) return b.multiplier - a.multiplier
    return (b.viewsPerDay ?? 0) - (a.viewsPerDay ?? 0)
  })
}

export function verdictOf(input: {
  videoCount: number
  outlierCount: number
  withBaseline: number
  medianMultiplier: number | null
}): DemandVerdict {
  if (input.videoCount === 0) return 'sem_amostra'
  if (input.videoCount < 3 || input.withBaseline < 3) return 'incerta'
  const mult = input.medianMultiplier
  if (mult == null) return 'incerta'
  if (input.outlierCount >= 3 && mult >= 2) return 'alta'
  if (input.outlierCount >= 2 && mult >= 1.5) return 'alta'
  if (input.outlierCount >= 1 && mult >= 1.2) return 'media'
  if (mult >= 2) return 'media'
  return 'baixa'
}

export function summarizeDemand(videos: ScoredVideo[]): DemandSummary {
  const reliable = videos.filter((video) => video.reliable && video.multiplier != null)
  const perHour = videos.map((video) => video.viewsPerHour).filter((value): value is number => value != null)
  const perDay = videos.map((video) => video.viewsPerDay).filter((value): value is number => value != null)
  const summary = {
    videoCount: videos.length,
    outlierCount: videos.filter((video) => video.outlier).length,
    withBaseline: reliable.length,
    medianMultiplier: median(reliable.map((video) => video.multiplier as number)),
    medianViewsPerHour: median(perHour),
    medianViewsPerDay: median(perDay),
    verdict: 'baixa' as DemandVerdict,
  }
  summary.verdict = verdictOf(summary)
  return summary
}

export function trendBetween(
  previous: { medianViewsPerDay: number | null; medianMultiplier: number | null } | null,
  next: { medianViewsPerDay: number | null; medianMultiplier: number | null } | null,
): Trend {
  if (!previous || !next) return 'sem_comparacao'
  const speed = relativeChange(previous.medianViewsPerDay, next.medianViewsPerDay)
  const change = speed ?? relativeChange(previous.medianMultiplier, next.medianMultiplier)
  if (change == null) return 'sem_comparacao'
  if (change >= 0.15) return 'subindo'
  if (change <= -0.15) return 'caindo'
  return 'estavel'
}

function relativeChange(previous: number | null, next: number | null): number | null {
  if (previous == null || next == null || !Number.isFinite(previous) || !Number.isFinite(next)) return null
  if (previous === 0) return next === 0 ? 0 : 1
  return (next - previous) / previous
}

export function estimateSearchUnits(uncachedChannels: number): number {
  const channels = Math.min(SEARCH_CHANNEL_CAP, Math.max(0, Math.floor(uncachedChannels)))
  const batches = channels === 0 ? 0 : Math.ceil((channels * BASELINE_FETCH) / 50)
  return SEARCH_LIST_UNITS + 2 * LIST_UNITS + channels * LIST_UNITS + batches * LIST_UNITS
}

export function estimateChartUnits(uncachedChannels: number): number {
  const channels = Math.min(CHART_CHANNEL_CAP, Math.max(0, Math.floor(uncachedChannels)))
  const batches = channels === 0 ? 0 : Math.ceil((channels * BASELINE_FETCH) / 50)
  const channelList = channels === 0 ? 0 : LIST_UNITS
  return LIST_UNITS + channelList + channels * LIST_UNITS + batches * LIST_UNITS
}

export function needsQuotaConfirm(remaining: number, minCost: number): boolean {
  return remaining < 2000 || remaining - minCost < 500
}

export function quotaRemaining(used: number): number {
  if (!Number.isFinite(used) || used <= 0) return DAILY_QUOTA
  return Math.max(0, DAILY_QUOTA - used)
}

export function pacificQuotaDate(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const year = parts.find((part) => part.type === 'year')?.value ?? '0000'
  const month = parts.find((part) => part.type === 'month')?.value ?? '01'
  const day = parts.find((part) => part.type === 'day')?.value ?? '01'
  return `${year}-${month}-${day}`
}

export function classifyYoutubeError(status: number, body: unknown): { kind: YoutubeErrorKind; message: string } {
  const reason = extractReason(body).toLowerCase()
  const raw = extractMessage(body).toLowerCase()
  const blob = `${reason} ${raw}`
  let kind: YoutubeErrorKind = 'other'
  if (reason === 'quotaexceeded' || reason === 'dailylimitexceeded' || blob.includes('exceeded your quota')) kind = 'quota'
  else if (reason === 'ratelimitexceeded' || status === 429) kind = 'rate'
  else if (blob.includes('referer') || blob.includes('referrer')) kind = 'referrer'
  else if (
    reason === 'accessnotconfigured' ||
    reason === 'api_key_service_blocked' ||
    blob.includes('has not been used') ||
    blob.includes('is disabled')
  ) {
    kind = 'disabled'
  } else if (
    reason === 'keyinvalid' ||
    blob.includes('api key not valid') ||
    blob.includes('invalid api key') ||
    status === 401 ||
    (status === 400 && blob.includes('api key'))
  ) {
    kind = 'key'
  }
  return { kind, message: ERROR_TEXT[kind] }
}

export function youtubeErrorMessage(kind: YoutubeErrorKind): string {
  return ERROR_TEXT[kind]
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let index = 0; index < items.length; index += size) out.push(items.slice(index, index + size))
  return out
}

export function uploadsPlaylistId(channelId: string): string | null {
  if (!/^UC[\w-]{10,}$/.test(channelId)) return null
  return `UU${channelId.slice(2)}`
}

export function searchCacheKey(query: string, window: RadarWindow, region: RadarRegion, language: RadarLanguage): string {
  return `${fold(query.trim())}|${window}|${region}|${language}`
}

export function isFresh(savedAt: number, now: number, ttl: number): boolean {
  return now >= savedAt && now - savedAt < ttl
}

export function youtubeUrl(pathname: string, params: Record<string, string>): string {
  const url = new URL(pathname, 'https://www.googleapis.com')
  if (url.origin !== 'https://www.googleapis.com') throw new Error('Consulta fora do YouTube.')
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  return url.toString()
}

export function searchRequestUrl(input: {
  key: string
  query: string
  publishedAfter: string
  region: RadarRegion
  language: RadarLanguage
}): string {
  const params: Record<string, string> = {
    part: 'snippet',
    type: 'video',
    videoDuration: 'short',
    order: 'viewCount',
    maxResults: '25',
    q: input.query,
    publishedAfter: input.publishedAfter,
    key: input.key,
  }
  if (input.region === 'BR') params.regionCode = 'BR'
  if (input.language === 'pt') params.relevanceLanguage = 'pt'
  return youtubeUrl('/youtube/v3/search', params)
}

export function videosRequestUrl(key: string, ids: string[]): string {
  if (ids.length === 0 || ids.length > 50) throw new Error('Lote de vídeos inválido.')
  return youtubeUrl('/youtube/v3/videos', {
    part: 'snippet,statistics,contentDetails',
    id: ids.join(','),
    key,
  })
}

export function channelsRequestUrl(key: string, ids: string[]): string {
  if (ids.length === 0 || ids.length > 50) throw new Error('Lote de canais inválido.')
  return youtubeUrl('/youtube/v3/channels', {
    part: 'snippet,statistics',
    id: ids.join(','),
    key,
  })
}

export function playlistRequestUrl(key: string, playlistId: string): string {
  return youtubeUrl('/youtube/v3/playlistItems', {
    part: 'contentDetails',
    playlistId,
    maxResults: String(BASELINE_FETCH),
    key,
  })
}

export function chartRequestUrl(key: string): string {
  return youtubeUrl('/youtube/v3/videos', {
    part: 'snippet,statistics,contentDetails',
    chart: 'mostPopular',
    regionCode: 'BR',
    maxResults: '50',
    key,
  })
}

export function repeatedTerms(titles: string[], limit = 8): TermCount[] {
  const counts = new Map<string, TermCount>()
  for (const title of titles) {
    const seen = new Set<string>()
    for (const raw of title.split(/[^0-9A-Za-zÀ-ÿ]+/)) {
      const key = fold(raw)
      if (key.length < 3 || STOP.has(key) || /^\d+$/.test(key) || seen.has(key)) continue
      seen.add(key)
      const current = counts.get(key)
      if (current) current.count += 1
      else counts.set(key, { term: raw, count: 1 })
    }
  }
  return [...counts.values()]
    .filter((item) => item.count >= 2)
    .sort((a, b) => b.count - a.count || a.term.localeCompare(b.term, 'pt'))
    .slice(0, limit)
}

export function titleHasPhrase(title: string, phrase: string): boolean {
  const hay = ` ${fold(title).replace(/[^a-z0-9]+/g, ' ').trim()} `
  const needle = fold(phrase).replace(/[^a-z0-9]+/g, ' ').trim()
  if (needle.length < 3) return false
  return hay.includes(` ${needle} `)
}

export function mentionedPhrases(titles: string[], phrases: string[]): TermCount[] {
  return phrases
    .map((phrase) => ({ term: phrase, count: titles.filter((title) => titleHasPhrase(title, phrase)).length }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count || a.term.localeCompare(b.term, 'pt'))
}

export function describeFindings(videos: ScoredVideo[], characterNames: string[]) {
  const outliers = videos.filter((video) => video.outlier)
  const termSource: TermSource = outliers.length >= 4 ? 'outliers' : 'amostra'
  const termTitles = (termSource === 'outliers' ? outliers : videos).map((video) => video.title)
  const known = new Set(characterNames.map((name) => fold(name)))
  const terms = repeatedTerms(termTitles).filter((term) => !known.has(fold(term.term)))
  const characters = mentionedPhrases(
    videos.map((video) => video.title),
    characterNames,
  )
  return { terms, termSource, characters }
}

export function matchCharacter(subject: string, characters: { id: string; name: string }[]): string | null {
  const foldedSubject = fold(subject).replace(/[^a-z0-9]+/g, ' ').trim()
  if (foldedSubject.length < 2) return null
  let best: { id: string; score: number } | null = null
  for (const character of characters) {
    const name = fold(character.name).replace(/[^a-z0-9]+/g, ' ').trim()
    if (name.length < 3) continue
    let score = 0
    if (name === foldedSubject) score = 1000 + name.length
    else if (phraseInside(foldedSubject, name)) score = 500 + name.length
    else if (foldedSubject.length >= 4 && phraseInside(name, foldedSubject)) score = 100 + foldedSubject.length
    if (score > 0 && (!best || score > best.score)) best = { id: character.id, score }
  }
  return best?.id ?? null
}

function phraseInside(hay: string, needle: string): boolean {
  return ` ${hay} `.includes(` ${needle} `)
}

export function matchKeyword(subject: string, words: readonly string[]): string {
  const folded = fold(subject.trim())
  return words.find((word) => fold(word) === folded) ?? ''
}

export function ideaFromSubject(
  draft: IdeaDraft,
  subject: string,
  characters: { id: string; name: string }[],
  keywords: readonly string[],
): IdeaDraft {
  const title = subject.trim()
  const keyword = matchKeyword(title, keywords)
  return {
    ...draft,
    title,
    titleTouched: true,
    characterId: matchCharacter(title, characters) ?? '',
    keyword: keyword || draft.keyword,
  }
}

export function readApiKey(storage: KeyValue): string {
  return (storage.get(YOUTUBE_KEY_STORAGE) ?? '').trim()
}

export function writeApiKey(storage: KeyValue, key: string): void {
  storage.set(YOUTUBE_KEY_STORAGE, key.trim())
}

export function clearApiKey(storage: KeyValue): void {
  storage.remove(YOUTUBE_KEY_STORAGE)
}

export function keyLooksValid(key: string): boolean {
  return /^AIza[0-9A-Za-z\-_]{20,}$/.test(key.trim())
}

export function looksLikeKey(text: string): boolean {
  return keyLooksValid(text) || text.includes('AIza')
}

export function readQuota(storage: KeyValue, now: Date): QuotaState {
  const date = pacificQuotaDate(now)
  const raw = storage.get(QUOTA_STORAGE)
  if (!raw) return { date, used: 0 }
  try {
    const parsed = JSON.parse(raw) as Partial<QuotaState>
    if (parsed.date !== date || typeof parsed.used !== 'number' || !Number.isFinite(parsed.used) || parsed.used < 0) {
      return { date, used: 0 }
    }
    return { date, used: parsed.used }
  } catch {
    return { date, used: 0 }
  }
}

export function addQuota(storage: KeyValue, units: number, now: Date): QuotaState {
  const current = readQuota(storage, now)
  const next = { date: current.date, used: current.used + Math.max(0, units) }
  storage.set(QUOTA_STORAGE, JSON.stringify(next))
  return next
}

export function exhaustQuota(storage: KeyValue, now: Date): QuotaState {
  const next = { date: pacificQuotaDate(now), used: DAILY_QUOTA }
  storage.set(QUOTA_STORAGE, JSON.stringify(next))
  return next
}

export function sameSubject(
  a: Pick<WatchItem, 'query' | 'window' | 'region' | 'language'>,
  b: Pick<WatchItem, 'query' | 'window' | 'region' | 'language'>,
): boolean {
  return fold(a.query.trim()) === fold(b.query.trim()) && a.window === b.window && a.region === b.region && a.language === b.language
}

export function snapshotFromSummary(
  summary: DemandSummary,
  filters: Pick<WatchItem, 'window' | 'region' | 'language'>,
  at: string,
): RadarSnapshot {
  return {
    at,
    window: filters.window,
    region: filters.region,
    language: filters.language,
    videoCount: summary.videoCount,
    outlierCount: summary.outlierCount,
    medianMultiplier: summary.medianMultiplier,
    medianViewsPerDay: summary.medianViewsPerDay,
    verdict: summary.verdict,
  }
}

export function saveSubject(list: WatchItem[], draft: WatchItem): WatchItem[] {
  const index = list.findIndex((item) => sameSubject(item, draft))
  if (index === -1) return [draft, ...list].slice(0, 40)
  const previous = list[index]
  const incoming = draft.snapshots[0]
  const last = previous.snapshots[previous.snapshots.length - 1]
  const snapshots = last && incoming && last.at === incoming.at ? previous.snapshots : [...previous.snapshots, ...draft.snapshots].slice(-30)
  const merged = { ...previous, snapshots }
  const next = list.filter((item) => item.id !== previous.id)
  return [merged, ...next].slice(0, 40)
}

export function removeSubject(list: WatchItem[], id: string): WatchItem[] {
  return list.filter((item) => item.id !== id)
}

export function watchTrend(item: WatchItem): Trend {
  if (item.snapshots.length < 2) return 'sem_comparacao'
  return trendBetween(item.snapshots[item.snapshots.length - 2], item.snapshots[item.snapshots.length - 1])
}

export function rememberSearch(bundle: RadarBundle, key: string, result: StoredSearch): RadarBundle {
  const searches = { ...bundle.searches, [key]: result }
  const entries = Object.entries(searches)
    .sort((a, b) => b[1].savedAt - a[1].savedAt)
    .slice(0, 30)
  return { ...bundle, searches: Object.fromEntries(entries) }
}

export function rememberChannel(bundle: RadarBundle, channel: ChannelBaseline): RadarBundle {
  const channels = { ...bundle.channels, [channel.channelId]: channel }
  const entries = Object.entries(channels)
    .sort((a, b) => b[1].fetchedAt - a[1].fetchedAt)
    .slice(0, 80)
  return { ...bundle, channels: Object.fromEntries(entries) }
}

export function rememberChart(bundle: RadarBundle, result: StoredChart): RadarBundle {
  const charts = { ...bundle.charts, [CHART_CACHE_KEY]: result }
  return { ...bundle, charts }
}

export function parseWatchlist(input: unknown): { present: boolean; valid: boolean; items: WatchItem[] } {
  if (!input || typeof input !== 'object' || !('radarWatchlist' in input)) return { present: false, valid: true, items: [] }
  const raw = (input as { radarWatchlist?: unknown }).radarWatchlist
  if (!Array.isArray(raw)) return { present: true, valid: false, items: [] }
  return { present: true, valid: true, items: raw.map(parseWatchItem).filter((item): item is WatchItem => item != null).slice(0, 40) }
}

export function sanitizeRadar(input: unknown, now = Date.now()): RadarBundle {
  if (!input || typeof input !== 'object') return emptyRadar()
  const raw = input as Partial<RadarBundle>
  const bundle: RadarBundle = {
    watchlist: Array.isArray(raw.watchlist) ? raw.watchlist.map(parseWatchItem).filter((item): item is WatchItem => item != null).slice(0, 40) : [],
    searches: {},
    channels: {},
    charts: {},
  }
  if (raw.searches && typeof raw.searches === 'object') {
    for (const [key, value] of Object.entries(raw.searches)) {
      const search = parseStoredSearch(value)
      if (search) bundle.searches[key] = search
    }
  }
  if (raw.channels && typeof raw.channels === 'object') {
    for (const [key, value] of Object.entries(raw.channels)) {
      const channel = parseChannel(value)
      if (channel) bundle.channels[key] = channel
    }
  }
  if (raw.charts && typeof raw.charts === 'object') {
    const chart = parseChart(raw.charts[CHART_CACHE_KEY])
    if (chart) bundle.charts[CHART_CACHE_KEY] = chart
  }
  return pruneRadar(bundle, now)
}

export function pruneRadar(bundle: RadarBundle, now: number): RadarBundle {
  const week = 7 * 24 * 60 * 60 * 1000
  return {
    watchlist: bundle.watchlist,
    searches: Object.fromEntries(Object.entries(bundle.searches).filter(([, value]) => now - value.savedAt < week)),
    channels: Object.fromEntries(Object.entries(bundle.channels).filter(([, value]) => now - value.fetchedAt < week)),
    charts: Object.fromEntries(Object.entries(bundle.charts).filter(([, value]) => now - value.savedAt < week)),
  }
}

function parseWatchItem(input: unknown): WatchItem | null {
  const item = asRecord(input)
  if (!item || typeof item.id !== 'string' || typeof item.query !== 'string') return null
  const query = item.query.trim()
  if (!query || query.length > 80 || looksLikeKey(query)) return null
  if (!isWindow(item.window) || !isRegion(item.region) || !isLanguage(item.language)) return null
  const snapshots = Array.isArray(item.snapshots) ? item.snapshots.map(parseSnapshot).filter((snap): snap is RadarSnapshot => snap != null).slice(-30) : []
  return {
    id: item.id,
    query,
    window: item.window,
    region: item.region,
    language: item.language,
    savedAt: typeof item.savedAt === 'string' ? item.savedAt : new Date(0).toISOString(),
    snapshots,
  }
}

function parseSnapshot(input: unknown): RadarSnapshot | null {
  const snap = asRecord(input)
  if (!snap || typeof snap.at !== 'string' || !isWindow(snap.window) || !isRegion(snap.region) || !isLanguage(snap.language)) return null
  if (!isVerdict(snap.verdict)) return null
  return {
    at: snap.at,
    window: snap.window,
    region: snap.region,
    language: snap.language,
    videoCount: finite(snap.videoCount) ?? 0,
    outlierCount: finite(snap.outlierCount) ?? 0,
    medianMultiplier: finite(snap.medianMultiplier),
    medianViewsPerDay: finite(snap.medianViewsPerDay),
    verdict: snap.verdict,
  }
}

function parseStoredSearch(input: unknown): StoredSearch | null {
  const item = asRecord(input)
  if (!item || typeof item.query !== 'string' || typeof item.savedAt !== 'number') return null
  if (!isWindow(item.window) || !isRegion(item.region) || !isLanguage(item.language)) return null
  const summary = parseSummary(item.summary)
  if (!summary) return null
  const videos = Array.isArray(item.videos) ? item.videos.map(parseScored).filter((video): video is ScoredVideo => video != null) : []
  return {
    savedAt: item.savedAt,
    query: item.query,
    window: item.window,
    region: item.region,
    language: item.language,
    videos,
    summary,
    units: finite(item.units) ?? 0,
    droppedLong: finite(item.droppedLong) ?? 0,
    note: typeof item.note === 'string' ? item.note : '',
  }
}

function parseSummary(input: unknown): DemandSummary | null {
  const item = asRecord(input)
  if (!item || !isVerdict(item.verdict)) return null
  return {
    videoCount: finite(item.videoCount) ?? 0,
    outlierCount: finite(item.outlierCount) ?? 0,
    withBaseline: finite(item.withBaseline) ?? 0,
    medianMultiplier: finite(item.medianMultiplier),
    medianViewsPerHour: finite(item.medianViewsPerHour),
    medianViewsPerDay: finite(item.medianViewsPerDay),
    verdict: item.verdict,
  }
}

function parseScored(input: unknown): ScoredVideo | null {
  const item = asRecord(input)
  if (!item || typeof item.id !== 'string' || typeof item.title !== 'string' || typeof item.channelId !== 'string') return null
  const views = finite(item.views)
  if (views == null) return null
  return {
    id: item.id,
    title: item.title,
    channelId: item.channelId,
    channelTitle: typeof item.channelTitle === 'string' ? item.channelTitle : '',
    publishedAt: typeof item.publishedAt === 'string' ? item.publishedAt : '',
    thumbnail: typeof item.thumbnail === 'string' ? item.thumbnail : '',
    views,
    durationSec: finite(item.durationSec) ?? 0,
    subscriberCount: finite(item.subscriberCount),
    subscribersHidden: item.subscribersHidden === true,
    typicalViews: finite(item.typicalViews),
    baselineSample: finite(item.baselineSample) ?? 0,
    freshBaseline: item.freshBaseline === true,
    reliable: item.reliable === true,
    multiplier: finite(item.multiplier),
    viewsPerHour: finite(item.viewsPerHour),
    viewsPerDay: finite(item.viewsPerDay),
    outlier: item.outlier === true,
  }
}

function parseChannel(input: unknown): ChannelBaseline | null {
  const item = asRecord(input)
  if (!item || typeof item.channelId !== 'string' || typeof item.fetchedAt !== 'number') return null
  const videos = Array.isArray(item.videos)
    ? item.videos
        .map((video) => {
          const row = asRecord(video)
          if (!row || typeof row.id !== 'string' || typeof row.publishedAt !== 'string') return null
          const views = finite(row.views)
          if (views == null) return null
          return { id: row.id, publishedAt: row.publishedAt, views }
        })
        .filter((video): video is BaselineVideo => video != null)
    : []
  return {
    channelId: item.channelId,
    fetchedAt: item.fetchedAt,
    subscriberCount: finite(item.subscriberCount),
    subscribersHidden: item.subscribersHidden === true,
    videos,
  }
}

function parseChart(input: unknown): StoredChart | null {
  const item = asRecord(input)
  if (!item || item.region !== 'BR' || typeof item.savedAt !== 'number') return null
  const videos = Array.isArray(item.videos) ? item.videos.map(parseScored).filter((video): video is ScoredVideo => video != null) : []
  return {
    savedAt: item.savedAt,
    region: 'BR',
    totalListed: finite(item.totalListed) ?? videos.length,
    videos,
    terms: parseTerms(item.terms),
    termSource: item.termSource === 'outliers' ? 'outliers' : 'amostra',
    characters: parseTerms(item.characters),
    units: finite(item.units) ?? 0,
    note: typeof item.note === 'string' ? item.note : '',
  }
}

function parseTerms(input: unknown): TermCount[] {
  if (!Array.isArray(input)) return []
  return input
    .map((item) => {
      const row = asRecord(item)
      const count = row ? finite(row.count) : null
      if (!row || typeof row.term !== 'string' || count == null) return null
      return { term: row.term, count }
    })
    .filter((item): item is TermCount => item != null)
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null
  return value as Record<string, unknown>
}

function finite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function extractReason(body: unknown): string {
  const errors = asRecord(asRecord(body)?.error)?.errors
  if (!Array.isArray(errors) || !errors.length) return ''
  const reason = asRecord(errors[0])?.reason
  return typeof reason === 'string' ? reason : ''
}

function extractMessage(body: unknown): string {
  const message = asRecord(asRecord(body)?.error)?.message
  return typeof message === 'string' ? message : ''
}

function isWindow(value: unknown): value is RadarWindow {
  return value === '24h' || value === '7d' || value === '30d'
}

function isRegion(value: unknown): value is RadarRegion {
  return value === 'BR' || value === 'WORLD'
}

function isLanguage(value: unknown): value is RadarLanguage {
  return value === 'pt' || value === 'any'
}

function isVerdict(value: unknown): value is DemandVerdict {
  return value === 'alta' || value === 'media' || value === 'baixa' || value === 'incerta' || value === 'sem_amostra'
}
