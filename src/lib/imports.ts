import { todayISO } from '@/lib/format'
import type { AppState, ImportLink, ImportRecord, ImportRow, ImportSource, ImportWindow, MetricValues, Video } from '@/types'

/* ------------------------------------------------------------------ números */

export type NumberKind = 'int' | 'dec'

/** Texto sem acento, minúsculo, espaços simples. */
export function plain(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

const SUFFIX: [RegExp, number][] = [
  [/^(b|bi|bilhoes|bilhao)\.?$/, 1e9],
  [/^(m|mi|mm|mil?hoes|milhao|mln)\.?$/, 1e6],
  [/^(k|mil)\.?$/, 1e3],
]

/**
 * Lê números como o YouTube Studio escreve em português ou inglês:
 * "1,234,567", "1.234.567", "45,3%", "12.5", "1,2 mi", "345K", "+1.234".
 * Em contagens (int), ponto e vírgula seguidos de 3 dígitos são milhar.
 */
export function parseNumber(raw: string | null | undefined, kind: NumberKind = 'dec'): number | null {
  if (raw == null) return null
  let text = String(raw).trim().replace(/\u00a0/g, ' ')
  if (!text || text === '—' || text === '-' || text === '–') return null
  text = text.replace(/%/g, '').replace(/^\+/, '').trim()
  const match = text.match(/^(-?[\d.,\s]*\d)\s*([a-zA-Z.]*)$/)
  if (!match) return null
  let digits = match[1].replace(/\s/g, '')
  const suffixText = plain(match[2])
  let mult = 1
  if (suffixText) {
    const found = SUFFIX.find(([re]) => re.test(suffixText))
    if (!found) return null
    mult = found[1]
  }
  const lastDot = digits.lastIndexOf('.')
  const lastComma = digits.lastIndexOf(',')
  if (lastDot >= 0 && lastComma >= 0) {
    const decimal = lastDot > lastComma ? '.' : ','
    const thousand = decimal === '.' ? ',' : '.'
    digits = digits.split(thousand).join('').replace(decimal, '.')
  } else if (lastDot >= 0 || lastComma >= 0) {
    const sep = lastDot >= 0 ? '.' : ','
    const parts = digits.split(sep)
    const groupsOfThree = parts.length > 1 && parts.slice(1).every((part) => part.length === 3)
    const thousands = mult === 1 && groupsOfThree && (kind === 'int' || parts.length > 2)
    digits = thousands ? parts.join('') : parts.length === 2 ? `${parts[0]}.${parts[1]}` : parts.join('')
  }
  const value = Number(digits)
  if (!Number.isFinite(value)) return null
  const result = value * mult
  return kind === 'int' ? Math.round(result) : Math.round(result * 100) / 100
}

/** "0:00:28", "0:28", "28" ou "28s" → segundos. */
export function parseDuration(raw: string | null | undefined): number | null {
  if (raw == null) return null
  const text = String(raw).trim().replace(/s$/i, '')
  if (!text) return null
  if (text.includes(':')) {
    const parts = text.split(':').map((part) => Number(part))
    if (parts.some((part) => !Number.isFinite(part))) return null
    return Math.round(parts.reduce((sum, part) => sum * 60 + part, 0))
  }
  return parseNumber(text, 'dec')
}

const MONTH_KEYS: [string, number][] = [
  ['jan', 1], ['fev', 2], ['feb', 2], ['mar', 3], ['abr', 4], ['apr', 4], ['mai', 5], ['may', 5],
  ['jun', 6], ['jul', 7], ['ago', 8], ['aug', 8], ['set', 9], ['sep', 9], ['out', 10], ['oct', 10],
  ['nov', 11], ['dez', 12], ['dec', 12],
]

function iso(y: number, m: number, d: number): string | null {
  if (!y || !m || !d || m > 12 || d > 31) return null
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** "Nov 12, 2026", "12 de nov. de 2026", "2026-11-12", "12/11/2026" → AAAA-MM-DD. */
export function parseDate(raw: string | null | undefined): string | null {
  if (!raw) return null
  const text = plain(String(raw))
  let m = text.match(/(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m) return iso(+m[1], +m[2], +m[3])
  m = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (m) return iso(+m[3], +m[2], +m[1])
  const year = text.match(/\b(\d{4})\b/)
  const month = MONTH_KEYS.find(([key]) => new RegExp(`\\b${key}`).test(text))
  if (!year || !month) return null
  const day = text.replace(year[1], ' ').match(/\b(\d{1,2})\b/)
  return day ? iso(+year[1], month[1], +day[1]) : null
}

/* -------------------------------------------------------------------- CSV */

export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^\ufeff/, '')
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? ''
  const counts = { ',': 0, ';': 0, '\t': 0 } as Record<string, number>
  let quoted = false
  for (const char of firstLine) {
    if (char === '"') quoted = !quoted
    else if (!quoted && char in counts) counts[char] += 1
  }
  const delimiter = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][1] > 0
    ? Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
    : ','

  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false
  for (let i = 0; i < clean.length; i += 1) {
    const char = clean[i]
    if (inQuotes) {
      if (char === '"' && clean[i + 1] === '"') {
        cell += '"'
        i += 1
      } else if (char === '"') inQuotes = false
      else cell += char
    } else if (char === '"') inQuotes = true
    else if (char === delimiter) {
      row.push(cell)
      cell = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && clean[i + 1] === '\n') i += 1
      row.push(cell)
      if (row.some((value) => value.trim() !== '')) rows.push(row)
      row = []
      cell = ''
    } else cell += char
  }
  row.push(cell)
  if (row.some((value) => value.trim() !== '')) rows.push(row)
  return rows
}

type ColumnKey =
  | 'youtubeId'
  | 'title'
  | 'publishDate'
  | 'durationSec'
  | 'trafficSource'
  | keyof MetricValues

/** Nomes de coluna do YouTube Studio em inglês e português, sem acento e minúsculos. */
const COLUMNS: Record<ColumnKey, string[]> = {
  youtubeId: ['content', 'conteudo', 'video id', 'id do video'],
  title: ['video title', 'titulo do video', 'titulo'],
  publishDate: [
    'video publish time',
    'horario de publicacao do video',
    'data de publicacao do video',
    'hora de publicacao do video',
    'publicacao do video',
    'publish time',
  ],
  durationSec: ['duration', 'duracao'],
  trafficSource: ['traffic source', 'origem do trafego', 'fonte de trafego', 'traffic source type', 'tipo de origem de trafego'],
  views: ['views', 'visualizacoes', 'engaged views', 'visualizacoes engajadas'],
  apv: [
    'average percentage viewed (%)',
    'average percentage viewed',
    'porcentagem media visualizada (%)',
    'porcentagem media visualizada',
    'percentagem media visualizada (%)',
    'porcentagem media assistida (%)',
    'percentual medio visualizado (%)',
  ],
  avgViewSec: ['average view duration', 'duracao media da visualizacao', 'duracao media de visualizacao'],
  viewed: [
    'stayed to watch (%)',
    'stayed to watch',
    'viewed (%)',
    'ficaram para assistir (%)',
    'ficaram para assistir',
    'continuaram assistindo (%)',
    'assistiram (%)',
    'visualizados (%)',
    'nao deslizaram (%)',
  ],
  subscribers: ['subscribers', 'inscritos', 'subscribers gained', 'inscritos ganhos', 'net subscribers'],
  impressions: ['impressions', 'impressoes'],
  ctr: [
    'impressions click-through rate (%)',
    'impressions click-through rate',
    'taxa de cliques de impressoes (%)',
    'taxa de cliques das impressoes (%)',
    'taxa de cliques de impressoes',
    'ctr (%)',
  ],
  searchPct: ['youtube search (%)', 'pesquisa do youtube (%)', 'busca do youtube (%)'],
  likes: ['likes', 'marcacoes gostei', "marcacoes 'gostei'", 'gostei'],
  shares: ['shares', 'compartilhamentos'],
}

export function mapColumns(header: string[]): Partial<Record<ColumnKey, number>> {
  const names = header.map((cell) => plain(cell))
  const found: Partial<Record<ColumnKey, number>> = {}
  const taken = new Set<number>()
  // exatos primeiro, depois "começa com"
  for (const pass of ['exact', 'prefix'] as const) {
    for (const key of Object.keys(COLUMNS) as ColumnKey[]) {
      if (found[key] != null) continue
      for (const alias of COLUMNS[key]) {
        const index = names.findIndex(
          (name, i) => !taken.has(i) && (pass === 'exact' ? name === alias : name.startsWith(alias)),
        )
        if (index >= 0) {
          found[key] = index
          taken.add(index)
          break
        }
      }
    }
  }
  return found
}

export function emptyMetrics(): MetricValues {
  return {
    views: null,
    apv: null,
    avgViewSec: null,
    viewed: null,
    subscribers: null,
    impressions: null,
    ctr: null,
    searchPct: null,
    likes: null,
    shares: null,
  }
}

const INT_KEYS: (keyof MetricValues)[] = ['views', 'subscribers', 'impressions', 'likes', 'shares']

function isSearch(name: string): boolean {
  const text = plain(name)
  return text.includes('youtube search') || text.includes('pesquisa do youtube') || text.includes('busca do youtube')
}

export type CsvParse =
  | { kind: 'videos'; rows: ImportRow[]; totals: MetricValues | null; columns: string[] }
  | { kind: 'trafego'; searchPct: number | null; totalViews: number | null; sources: { name: string; views: number }[] }
  | { kind: 'grafico'; reason: string }
  | { kind: 'desconhecido'; reason: string }

/** Lê um CSV exportado do YouTube Studio (tabela de vídeos, totais ou origem do tráfego). */
export function readStudioCsv(text: string): CsvParse {
  const table = parseCsv(text)
  if (table.length < 2) return { kind: 'desconhecido', reason: 'O arquivo não tem linhas suficientes.' }
  const header = table[0]
  const cols = mapColumns(header)
  const body = table.slice(1)
  const cell = (row: string[], key: ColumnKey) => (cols[key] == null ? undefined : row[cols[key] as number])

  if (cols.trafficSource != null && cols.views != null) {
    const sources = body
      .map((row) => ({ name: (cell(row, 'trafficSource') ?? '').trim(), views: parseNumber(cell(row, 'views'), 'int') ?? 0 }))
      .filter((item) => item.name && plain(item.name) !== 'total')
    const totalRow = body.find((row) => plain(cell(row, 'trafficSource') ?? '') === 'total')
    const total = totalRow ? parseNumber(cell(totalRow, 'views'), 'int') : sources.reduce((sum, item) => sum + item.views, 0)
    const search = sources.filter((item) => isSearch(item.name)).reduce((sum, item) => sum + item.views, 0)
    return {
      kind: 'trafego',
      sources,
      totalViews: total ?? null,
      searchPct: total ? Math.round((search / total) * 1000) / 10 : null,
    }
  }

  const firstName = plain(header[0] ?? '')
  if ((firstName === 'date' || firstName === 'data') && cols.title == null) {
    return { kind: 'grafico', reason: 'Este é o "Dados do gráfico" (dia a dia). Use o "Dados da tabela" para ler vídeo por vídeo.' }
  }

  if (cols.title == null && cols.youtubeId == null && cols.views == null) {
    return { kind: 'desconhecido', reason: 'Não reconheci as colunas. Exporte pelo modo avançado do YouTube Studio, aba Conteúdo.' }
  }

  let totals: MetricValues | null = null
  const rows: ImportRow[] = []
  body.forEach((row, index) => {
    const id = (cell(row, 'youtubeId') ?? '').trim()
    const title = (cell(row, 'title') ?? '').trim()
    const metrics = emptyMetrics()
    for (const key of Object.keys(metrics) as (keyof MetricValues)[]) {
      const raw = cell(row, key)
      if (key === 'avgViewSec') metrics.avgViewSec = parseDuration(raw)
      else metrics[key] = parseNumber(raw, INT_KEYS.includes(key) ? 'int' : 'dec')
    }
    if (plain(id) === 'total' || plain(title) === 'total') {
      totals = metrics
      return
    }
    if (!id && !title) return
    rows.push({
      ...metrics,
      key: id || `linha-${index}`,
      youtubeId: /^[\w-]{11}$/.test(id) ? id : null,
      title: title || id,
      publishDate: parseDate(cell(row, 'publishDate')),
      durationSec: parseDuration(cell(row, 'durationSec')),
      link: { kind: 'nenhum' },
    })
  })

  return { kind: 'videos', rows, totals, columns: header }
}

/* ---------------------------------------------------------------- vínculo */

function tokens(text: string): Set<string> {
  return new Set(
    plain(text)
      .replace(/#\S+/g, ' ')
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .split(' ')
      .filter((word) => word.length > 1),
  )
}

export function titleSimilarity(a: string, b: string): number {
  const ta = tokens(a)
  const tb = tokens(b)
  if (!ta.size || !tb.size) return 0
  let common = 0
  for (const word of ta) if (tb.has(word)) common += 1
  return common / (ta.size + tb.size - common)
}

/** Sugere o vídeo do diário para cada linha: primeiro pelo ID do YouTube, depois pelo título. */
export function suggestLinks(rows: ImportRow[], videos: Video[]): ImportRow[] {
  const used = new Set<string>()
  return rows.map((row) => {
    let match = row.youtubeId ? videos.find((video) => video.youtubeId === row.youtubeId) : undefined
    if (!match) {
      let best: { video: Video; score: number } | null = null
      for (const video of videos) {
        if (used.has(video.id)) continue
        const score = titleSimilarity(row.title, video.title)
        if (score >= 0.6 && (!best || score > best.score)) best = { video, score }
      }
      match = best?.video
    }
    if (match) used.add(match.id)
    const link: ImportLink = match ? { kind: 'video', videoId: match.id } : { kind: 'nenhum' }
    return { ...row, link }
  })
}

/* -------------------------------------------------------------- aplicação */

export function applyRowToVideo(video: Video, row: ImportRow, window: ImportWindow): Video {
  const next: Video = { ...video }
  if (row.views != null) {
    if (window === '48h') next.views48h = row.views
    if (window === '7d') next.views7d = row.views
  }
  if (row.apv != null) next.apv = row.apv
  if (row.viewed != null) next.viewed = row.viewed
  if (row.subscribers != null) next.subscribers = row.subscribers
  if (row.searchPct != null) next.searchPct = row.searchPct
  if (row.durationSec != null && next.durationSec == null) next.durationSec = row.durationSec
  if (row.youtubeId && !next.youtubeId) next.youtubeId = row.youtubeId
  return next
}

/** Salva a importação no histórico e preenche os vídeos vinculados. */
export function applyImport(state: AppState, record: ImportRecord): AppState {
  let videos = [...state.videos]
  const rows = record.rows.map((row) => {
    if (row.link.kind === 'video') {
      const videoId = row.link.videoId
      videos = videos.map((video) => (video.id === videoId ? applyRowToVideo(video, row, record.window) : video))
      return row
    }
    if (row.link.kind === 'novo' && row.link.formatId && row.link.characterId) {
      const format = state.formats.find((item) => item.id === (row.link as { formatId: string }).formatId)
      const base: Video = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        date: row.publishDate ?? todayISO(),
        title: row.title,
        formatId: row.link.formatId,
        characterId: row.link.characterId,
        durationSec: null,
        views48h: null,
        views7d: null,
        apv: null,
        viewed: null,
        subscribers: null,
        searchPct: null,
        lesson: '',
        formatStatus: format?.status ?? 'catalogo',
        youtubeId: null,
      }
      const created = applyRowToVideo(base, row, record.window)
      videos = [created, ...videos]
      const link: ImportLink = { kind: 'video', videoId: created.id }
      return { ...row, link }
    }
    return row
  })
  const saved: ImportRecord = { ...record, rows }
  const others = state.imports.filter((item) => item.id !== record.id)
  return { ...state, videos, imports: [saved, ...others] }
}

/* ----------------------------------------------------------- normalização */

const num = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : null)

function metricsOf(raw: unknown): MetricValues {
  const value = (raw ?? {}) as Partial<MetricValues>
  const out = emptyMetrics()
  for (const key of Object.keys(out) as (keyof MetricValues)[]) out[key] = num(value[key])
  return out
}

function linkOf(raw: unknown): ImportLink {
  const value = (raw ?? {}) as Partial<{ kind: string; videoId: string; formatId: string; characterId: string }>
  if (value.kind === 'video' && typeof value.videoId === 'string') return { kind: 'video', videoId: value.videoId }
  return { kind: 'nenhum' }
}

export function normalizeImports(input: unknown): ImportRecord[] {
  if (!Array.isArray(input)) return []
  return input
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && typeof (item as { id?: unknown }).id === 'string')
    .map((item) => {
      const source: ImportSource = item.source === 'print' ? 'print' : 'csv'
      const window: ImportWindow = item.window === '48h' || item.window === '7d' ? item.window : 'periodo'
      const rows = Array.isArray(item.rows)
        ? item.rows
            .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object')
            .map((row, index) => ({
              ...metricsOf(row),
              key: typeof row.key === 'string' ? row.key : `linha-${index}`,
              youtubeId: typeof row.youtubeId === 'string' ? row.youtubeId : null,
              title: typeof row.title === 'string' ? row.title : 'Sem título',
              publishDate: typeof row.publishDate === 'string' ? row.publishDate : null,
              durationSec: num(row.durationSec),
              link: linkOf(row.link),
            }))
        : []
      return {
        id: item.id as string,
        createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
        source,
        fileName: typeof item.fileName === 'string' ? item.fileName : '',
        window,
        note: typeof item.note === 'string' ? item.note : '',
        rows,
        totals: item.totals ? metricsOf(item.totals) : null,
      }
    })
}

export const WINDOW_LABEL: Record<ImportWindow, string> = {
  '48h': '48 horas após postar',
  '7d': '7 dias após postar',
  periodo: 'Outro período',
}
