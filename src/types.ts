export type Score = 1 | 2 | 3 | 4 | 5

export type CriteriaKey =
  | 'dificuldade'
  | 'materiais'
  | 'tempo'
  | 'resultado'
  | 'reaproveitamento'
  | 'validacao'

export type Criteria = Record<CriteriaKey, Score | null>

export type FormatStatus = 'catalogo' | 'teste' | 'rebaixado'

export type FormatItem = {
  id: string
  number: number | null
  priority: number | null
  name: string
  summary: string
  detail: string
  sequence: string
  status: FormatStatus
  origin: FormatStatus
  statusNote: string
  criteria: Criteria
  icon: string
  image: string | null
}

export type WindowKind = 'evergreen' | 'sazonal'

export type Character = {
  id: string
  name: string
  fromNotebook: boolean
  notebookRank: number
  notebookNote: string
  extraNote: string
  external: Score | null
  internal: Score | 'nao_testado'
  window: WindowKind | null
  windowEnd: string | null
  fit: number | null
  helmetCost: Score | null
  helmetReady: boolean
  icon: string
  image: string | null
}

export type Video = {
  id: string
  createdAt: string
  date: string
  title: string
  formatId: string
  characterId: string
  durationSec: number | null
  views48h: number | null
  views7d: number | null
  apv: number | null
  viewed: number | null
  subscribers: number | null
  searchPct: number | null
  lesson: string
  formatStatus: FormatStatus
  youtubeId: string | null
}

export type Step = {
  id: string
  order: number
  title: string
  detail: string
  icon: string
  image: string | null
}

export type AverageBasis = '48h' | '7d'

export type Settings = {
  channelAverage: number | null
  averageBasis: AverageBasis
}

export type ElementId = 'segundos' | 'personagem' | 'musica' | 'frames' | 'capa' | 'parada'

export type ElementMark = 'ok' | 'warn' | 'bad' | null

export type IdeaPhase = {
  scene: string
  seconds: string
}

export type IdeaDraft = {
  elements: Record<ElementId, ElementMark>
  formatId: string
  characterId: string
  phases: IdeaPhase[]
  action: string
  keyword: string
  title: string
  titleTouched: boolean
  hashtags: [string, string, string]
}

export type AppState = {
  formats: FormatItem[]
  characters: Character[]
  videos: Video[]
  steps: Step[]
  settings: Settings
  ideaDraft: IdeaDraft
  imports: ImportRecord[]
}

export type ImportSource = 'csv' | 'print'

/** Prazo que os números do export representam. */
export type ImportWindow = '48h' | '7d' | 'periodo'

export type MetricValues = {
  views: number | null
  apv: number | null
  avgViewSec: number | null
  viewed: number | null
  subscribers: number | null
  impressions: number | null
  ctr: number | null
  searchPct: number | null
  likes: number | null
  shares: number | null
}

export type ImportLink =
  | { kind: 'video'; videoId: string }
  | { kind: 'novo'; formatId: string; characterId: string }
  | { kind: 'nenhum' }

export type ImportRow = MetricValues & {
  key: string
  youtubeId: string | null
  title: string
  publishDate: string | null
  durationSec: number | null
  link: ImportLink
}

export type ImportRecord = {
  id: string
  createdAt: string
  source: ImportSource
  fileName: string
  window: ImportWindow
  note: string
  rows: ImportRow[]
  totals: MetricValues | null
}

export type SortKey = 'media' | 'resultado' | 'reaproveitamento' | 'dificuldade'

export type FormatFilter = 'todos' | 'catalogo' | 'teste' | 'rebaixado'
