import {
  CHART_CACHE_KEY,
  CHART_CHANNEL_CAP,
  CHART_TTL_MS,
  CHANNEL_TTL_MS,
  LIST_UNITS,
  SEARCH_CHANNEL_CAP,
  SEARCH_LIST_UNITS,
  SEARCH_TTL_MS,
  SHORTS_MAX_SECONDS,
  chartRequestUrl,
  channelsRequestUrl,
  chunk,
  classifyYoutubeError,
  describeFindings,
  isFresh,
  isShort,
  parseIsoDuration,
  playlistRequestUrl,
  rememberChannel,
  rememberChart,
  rememberSearch,
  scoreVideos,
  searchCacheKey,
  searchRequestUrl,
  summarizeDemand,
  uploadsPlaylistId,
  videosRequestUrl,
  windowStart,
  youtubeErrorMessage,
  type ChannelBaseline,
  type RadarBundle,
  type RadarLanguage,
  type RadarRegion,
  type RadarWindow,
  type ScoredVideo,
  type StoredChart,
  type StoredSearch,
  type YoutubeErrorKind,
} from '@/lib/radar'

export class YoutubeRequestError extends Error {
  readonly kind: YoutubeErrorKind

  constructor(kind: YoutubeErrorKind, message: string) {
    super(message)
    this.name = 'YoutubeRequestError'
    this.kind = kind
  }
}

export function isYoutubeError(error: unknown): error is YoutubeRequestError {
  return error instanceof YoutubeRequestError || (typeof error === 'object' && error !== null && (error as { name?: string }).name === 'YoutubeRequestError')
}

export function plainError(error: unknown): string {
  if (isYoutubeError(error) && typeof error.message === 'string') return error.message
  return 'Não consegui falar com o YouTube. Tente de novo.'
}

type Ctx = {
  fetchImpl: typeof fetch
  onUnits: (units: number) => void
  onQuotaExhausted: () => void
}

type RunShared = {
  bundle: RadarBundle
  key: string
  now: Date
  fetchImpl?: typeof fetch
  onUnits: (units: number) => void
  onQuotaExhausted: () => void
  onPartial?: (bundle: RadarBundle) => void
}

type VideoDetails = {
  id: string
  title: string
  channelId: string
  channelTitle: string
  publishedAt: string
  thumbnail: string
  views: number
  durationSec: number | null
}

type ChannelInfo = { id: string; subscriberCount: number | null; subscribersHidden: boolean }

export async function runThemeSearch(
  args: RunShared & {
    query: string
    window: RadarWindow
    region: RadarRegion
    language: RadarLanguage
    force?: boolean
  },
): Promise<{ bundle: RadarBundle; result: StoredSearch; fromCache: boolean }> {
  const query = args.query.trim()
  const cacheKey = searchCacheKey(query, args.window, args.region, args.language)
  const cached = args.bundle.searches[cacheKey]
  if (!args.force && cached && isFresh(cached.savedAt, args.now.getTime(), SEARCH_TTL_MS)) {
    return { bundle: args.bundle, result: cached, fromCache: true }
  }
  const ctx = makeCtx(args)
  const holder = { bundle: args.bundle }
  let units = 0
  const spend = (count: number) => {
    units += count
    ctx.onUnits(count)
  }
  try {
    const publishedAfter = windowStart(args.window, args.now)
    const searchBody = await getJson(
      searchRequestUrl({ key: args.key, query, publishedAfter, region: args.region, language: args.language }),
      SEARCH_LIST_UNITS,
      ctx,
      spend,
    )
    const ids = unique(readSearchIds(searchBody)).slice(0, 25)
    const details = ids.length ? await fetchVideos(ids, args.key, ctx, spend) : []
    const shorts = details.filter((video) => isShort(video.durationSec))
    const droppedLong = details.filter((video) => video.durationSec != null && video.durationSec > SHORTS_MAX_SECONDS).length
    if (!shorts.length) {
      const result = storedSearch(args, query, [], units, droppedLong, '')
      holder.bundle = rememberSearch(holder.bundle, cacheKey, result)
      return { bundle: holder.bundle, result, fromCache: false }
    }
    const ranked = rankChannels(shorts).slice(0, SEARCH_CHANNEL_CAP)
    const skipped = new Set(shorts.map((video) => video.channelId)).size - ranked.length
    const loaded = await loadBaselines(holder, shorts, ranked, args.key, args.now, ctx, spend)
    const scored = scoreVideos(shorts.map(asScoreInput), loaded.channels, loaded.baselines, args.now)
    const note = skipped > 0 ? `Comparei ${ranked.length} canais e deixei ${skipped} de fora para poupar cota.` : ''
    const result = storedSearch(args, query, scored, units, droppedLong, note)
    holder.bundle = rememberSearch(holder.bundle, cacheKey, result)
    return { bundle: holder.bundle, result, fromCache: false }
  } catch (error) {
    args.onPartial?.(holder.bundle)
    throw error
  }
}

export async function runPopularChart(
  args: RunShared & { characterNames: string[]; force?: boolean },
): Promise<{ bundle: RadarBundle; result: StoredChart | null; fromCache: boolean; unavailable: string }> {
  const cached = args.bundle.charts[CHART_CACHE_KEY]
  if (!args.force && cached && isFresh(cached.savedAt, args.now.getTime(), CHART_TTL_MS)) {
    return { bundle: args.bundle, result: cached, fromCache: true, unavailable: '' }
  }
  const ctx = makeCtx(args)
  const holder = { bundle: args.bundle }
  let units = 0
  const spend = (count: number) => {
    units += count
    ctx.onUnits(count)
  }
  try {
    const body = await getJson(chartRequestUrl(args.key), LIST_UNITS, ctx, spend)
    const details = readVideos(body)
    const shorts = details.filter((video) => isShort(video.durationSec))
    const ranked = rankChannels(shorts).slice(0, CHART_CHANNEL_CAP)
    const loaded = await loadBaselines(holder, shorts, ranked, args.key, args.now, ctx, spend)
    const scored = scoreVideos(shorts.map(asScoreInput), loaded.channels, loaded.baselines, args.now)
    const findings = describeFindings(scored, args.characterNames)
    const skipped = new Set(shorts.map((video) => video.channelId)).size - ranked.length
    const notes = [`O gráfico de populares trouxe ${details.length} vídeos. Ficaram ${shorts.length} com até 3 minutos.`]
    if (skipped > 0) notes.push(`Comparei ${ranked.length} canais e deixei ${skipped} de fora para poupar cota.`)
    const result: StoredChart = {
      savedAt: args.now.getTime(),
      region: 'BR',
      totalListed: details.length,
      videos: scored,
      terms: findings.terms,
      termSource: findings.termSource,
      characters: findings.characters,
      units,
      note: notes.join(' '),
    }
    holder.bundle = rememberChart(holder.bundle, result)
    return { bundle: holder.bundle, result, fromCache: false, unavailable: '' }
  } catch (error) {
    args.onPartial?.(holder.bundle)
    throw error
  }
}

function storedSearch(
  args: { window: RadarWindow; region: RadarRegion; language: RadarLanguage; now: Date },
  query: string,
  videos: ScoredVideo[],
  units: number,
  droppedLong: number,
  note: string,
): StoredSearch {
  return {
    savedAt: args.now.getTime(),
    query,
    window: args.window,
    region: args.region,
    language: args.language,
    videos,
    summary: summarizeDemand(videos),
    units,
    droppedLong,
    note,
  }
}

function asScoreInput(video: VideoDetails) {
  return {
    id: video.id,
    title: video.title,
    channelId: video.channelId,
    channelTitle: video.channelTitle,
    publishedAt: video.publishedAt,
    thumbnail: video.thumbnail,
    views: video.views,
    durationSec: video.durationSec ?? 0,
  }
}

async function loadBaselines(
  holder: { bundle: RadarBundle },
  videos: VideoDetails[],
  channelIds: string[],
  key: string,
  now: Date,
  ctx: Ctx,
  spend: (units: number) => void,
) {
  const channels = new Map<string, { subscriberCount: number | null; subscribersHidden: boolean }>()
  const baselines = new Map<string, { id: string; publishedAt: string; views: number }[]>()
  const known = new Map<string, { id: string; publishedAt: string; views: number }>()
  for (const video of videos) known.set(video.id, { id: video.id, publishedAt: video.publishedAt, views: video.views })
  if (channelIds.length) {
    const info = await fetchChannels(channelIds, key, ctx, spend)
    for (const channel of info) channels.set(channel.id, channel)
  }
  for (const channelId of channelIds) {
    const existing = holder.bundle.channels[channelId]
    if (existing && isFresh(existing.fetchedAt, now.getTime(), CHANNEL_TTL_MS)) {
      baselines.set(channelId, existing.videos)
      if (!channels.has(channelId)) {
        channels.set(channelId, { subscriberCount: existing.subscriberCount, subscribersHidden: existing.subscribersHidden })
      }
      continue
    }
    const playlistId = uploadsPlaylistId(channelId)
    let baselineVideos: { id: string; publishedAt: string; views: number }[] = []
    if (playlistId) {
      try {
        const body = await getJson(playlistRequestUrl(key, playlistId), LIST_UNITS, ctx, spend)
        const ids = unique(readPlaylistIds(body)).slice(0, 30)
        const missing = ids.filter((id) => !known.has(id))
        const extra = missing.length ? await fetchVideos(missing, key, ctx, spend) : []
        for (const video of extra) known.set(video.id, { id: video.id, publishedAt: video.publishedAt, views: video.views })
        baselineVideos = ids.flatMap((id) => {
          const video = known.get(id)
          return video ? [video] : []
        })
      } catch (error) {
        if (isHard(error)) throw error
        baselineVideos = []
      }
    }
    const info = channels.get(channelId)
    const stored: ChannelBaseline = {
      channelId,
      fetchedAt: now.getTime(),
      subscriberCount: info?.subscriberCount ?? null,
      subscribersHidden: info?.subscribersHidden ?? false,
      videos: baselineVideos,
    }
    baselines.set(channelId, baselineVideos)
    holder.bundle = rememberChannel(holder.bundle, stored)
  }
  return { channels, baselines }
}

function rankChannels(videos: VideoDetails[]): string[] {
  const best = new Map<string, number>()
  for (const video of videos) best.set(video.channelId, Math.max(best.get(video.channelId) ?? 0, video.views))
  return [...best.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id)
}

async function fetchVideos(ids: string[], key: string, ctx: Ctx, spend: (units: number) => void): Promise<VideoDetails[]> {
  const videos: VideoDetails[] = []
  for (const group of chunk(unique(ids), 50)) {
    const body = await getJson(videosRequestUrl(key, group), LIST_UNITS, ctx, spend)
    videos.push(...readVideos(body))
  }
  return videos
}

async function fetchChannels(ids: string[], key: string, ctx: Ctx, spend: (units: number) => void): Promise<ChannelInfo[]> {
  const channels: ChannelInfo[] = []
  for (const group of chunk(unique(ids), 50)) {
    const body = await getJson(channelsRequestUrl(key, group), LIST_UNITS, ctx, spend)
    channels.push(...readChannels(body))
  }
  return channels
}

function makeCtx(args: RunShared): Ctx {
  return {
    fetchImpl: args.fetchImpl ?? fetch,
    onUnits: args.onUnits,
    onQuotaExhausted: args.onQuotaExhausted,
  }
}

async function getJson(url: string, units: number, ctx: Ctx, spend: (units: number) => void): Promise<unknown> {
  if (!url.startsWith('https://www.googleapis.com/youtube/v3/')) {
    throw new YoutubeRequestError('other', 'Consulta bloqueada.')
  }
  let response: Response
  try {
    response = await ctx.fetchImpl(url)
  } catch {
    throw new YoutubeRequestError('offline', youtubeErrorMessage('offline'))
  }
  const text = await response.text()
  let body: unknown = null
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = null
    }
  }
  if (!response.ok) {
    const classified = classifyYoutubeError(response.status, body)
    if (classified.kind === 'quota') ctx.onQuotaExhausted()
    throw new YoutubeRequestError(classified.kind, classified.message)
  }
  spend(units)
  return body
}

function isHard(error: unknown): boolean {
  return isYoutubeError(error) && error.kind !== 'other'
}

function unique(items: string[]): string[] {
  return [...new Set(items.filter(Boolean))]
}

function readSearchIds(body: unknown): string[] {
  const items = asRecord(body)?.items
  if (!Array.isArray(items)) return []
  const ids: string[] = []
  for (const item of items) {
    const record = asRecord(item)
    const id = record?.id
    if (typeof id === 'string' && id) ids.push(id)
    const videoId = asRecord(id)?.videoId
    if (typeof videoId === 'string' && videoId) ids.push(videoId)
  }
  return ids
}

function readVideos(body: unknown): VideoDetails[] {
  const items = asRecord(body)?.items
  if (!Array.isArray(items)) return []
  const videos: VideoDetails[] = []
  for (const item of items) {
    const record = asRecord(item)
    const snippet = asRecord(record?.snippet)
    const statistics = asRecord(record?.statistics)
    const content = asRecord(record?.contentDetails)
    const id = typeof record?.id === 'string' ? record.id : ''
    const views = numberish(statistics?.viewCount)
    if (!id || !snippet || views == null) continue
    const title = typeof snippet.title === 'string' ? snippet.title : ''
    const channelId = typeof snippet.channelId === 'string' ? snippet.channelId : ''
    const channelTitle = typeof snippet.channelTitle === 'string' ? snippet.channelTitle : ''
    const publishedAt = typeof snippet.publishedAt === 'string' ? snippet.publishedAt : ''
    if (!title || !channelId || !publishedAt) continue
    const duration = typeof content?.duration === 'string' ? parseIsoDuration(content.duration) : null
    videos.push({
      id,
      title,
      channelId,
      channelTitle,
      publishedAt,
      thumbnail: thumbnailOf(snippet.thumbnails),
      views,
      durationSec: duration,
    })
  }
  return videos
}

function readChannels(body: unknown): ChannelInfo[] {
  const items = asRecord(body)?.items
  if (!Array.isArray(items)) return []
  const channels: ChannelInfo[] = []
  for (const item of items) {
    const record = asRecord(item)
    const id = typeof record?.id === 'string' ? record.id : ''
    if (!id) continue
    const statistics = asRecord(record?.statistics)
    const hidden = statistics?.hiddenSubscriberCount === true
    channels.push({
      id,
      subscriberCount: hidden ? null : numberish(statistics?.subscriberCount),
      subscribersHidden: hidden,
    })
  }
  return channels
}

function readPlaylistIds(body: unknown): string[] {
  const items = asRecord(body)?.items
  if (!Array.isArray(items)) return []
  const ids: string[] = []
  for (const item of items) {
    const id = asRecord(asRecord(item)?.contentDetails)?.videoId
    if (typeof id === 'string' && id) ids.push(id)
  }
  return ids
}

function thumbnailOf(input: unknown): string {
  const thumbs = asRecord(input)
  for (const size of ['medium', 'high', 'default']) {
    const url = asRecord(thumbs?.[size])?.url
    if (typeof url === 'string' && url.startsWith('https://')) return url
  }
  return ''
}

function numberish(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value)
  return null
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null
  return value as Record<string, unknown>
}
