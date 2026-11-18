import { DIAGNOSIS_ROWS } from '@/data/facts'
import { metricViews } from '@/lib/scores'
import type { AverageBasis, ImportRecord, Video } from '@/types'

export type ReportEntry = {
  id: string
  title: string
  videoId: string | null
  formatId: string
  characterId: string
  durationSec: number | null
  views: number | null
  apv: number | null
  viewed: number | null
  subscribers: number | null
  searchPct: number | null
  ctr: number | null
  impressions: number | null
}

export function entriesFromVideos(videos: Video[], basis: AverageBasis): ReportEntry[] {
  return videos.map((video) => ({
    id: video.id,
    title: video.title,
    videoId: video.id,
    formatId: video.formatId,
    characterId: video.characterId,
    durationSec: video.durationSec,
    views: metricViews(video, basis) ?? (basis === '48h' ? video.views7d : video.views48h),
    apv: video.apv,
    viewed: video.viewed,
    subscribers: video.subscribers,
    searchPct: video.searchPct,
    ctr: null,
    impressions: null,
  }))
}

export function entriesFromImport(record: ImportRecord, videos: Video[]): ReportEntry[] {
  return record.rows.map((row) => {
    const video = row.link.kind === 'video' ? videos.find((item) => item.id === (row.link as { videoId: string }).videoId) : undefined
    return {
      id: row.key,
      title: row.title,
      videoId: video?.id ?? null,
      formatId: video?.formatId ?? '',
      characterId: video?.characterId ?? '',
      durationSec: row.durationSec ?? video?.durationSec ?? null,
      views: row.views,
      apv: row.apv,
      viewed: row.viewed,
      subscribers: row.subscribers,
      searchPct: row.searchPct,
      ctr: row.ctr,
      impressions: row.impressions,
    }
  })
}

export function median(values: (number | null)[]): number | null {
  const list = values.filter((value): value is number => value != null).sort((a, b) => a - b)
  if (!list.length) return null
  const mid = Math.floor(list.length / 2)
  return list.length % 2 ? list[mid] : (list[mid - 1] + list[mid]) / 2
}

export type StageId = 'alcance' | 'gancho' | 'retencao' | 'postagem' | 'fidelizacao'

export type StageCheck = {
  entry: ReportEntry
  value: number
  goal: number
  hit: boolean
}

export type StageResult = {
  id: StageId
  step: string
  question: string
  metric: string
  goalLabel: string
  unit: '%' | 'views' | 'por mil'
  checks: StageCheck[]
  hits: number
  rate: number | null
  median: number | null
  diagnosis: string
  solution: string
}

type StageDef = {
  id: StageId
  step: string
  question: string
  metric: string
  goalLabel: string
  unit: StageResult['unit']
  diagnosis: string
  solution: string
  measure: (entry: ReportEntry, ctx: { average: number | null }) => { value: number; goal: number } | null
}

/** APV mínimo para passar do pool de teste, pela duração (tabela de metas 2026). */
export function retentionGoal(durationSec: number | null): number {
  if (durationSec == null) return 70
  return durationSec > 30 ? 50 : 65
}

const STAGES: StageDef[] = [
  {
    id: 'alcance',
    step: '1. Pesquisa — personagem e tema',
    question: 'O personagem/tema puxou views acima da média?',
    metric: 'Views',
    goalLabel: 'Acima da média do canal',
    unit: 'views',
    diagnosis: 'Personagem ou tema sem hype suficiente',
    solution: 'Voltar à pesquisa; ramificar a ideia em outro formato antes de descartar o personagem',
    measure: (entry, ctx) => (entry.views == null || ctx.average == null ? null : { value: entry.views, goal: ctx.average }),
  },
  {
    id: 'gancho',
    step: '7. Edição — primeiros 3 segundos',
    question: 'Quem viu o Short ficou ou deslizou?',
    metric: 'Assistiram (vs. deslizaram)',
    goalLabel: '80%+ é excelente',
    unit: '%',
    diagnosis: 'Gancho fraco — o viewer desliza antes de entender',
    solution: 'Reconstruir a abertura: personagem e promessa da revelação no 1º segundo',
    measure: (entry) => (entry.viewed == null ? null : { value: entry.viewed, goal: 80 }),
  },
  {
    id: 'retencao',
    step: '7. Edição — ritmo e revelação',
    question: 'Quem ficou assistiu até a revelação?',
    metric: 'APV (% médio assistido)',
    goalLabel: '65%+ até 30s · 50%+ de 30–60s',
    unit: '%',
    diagnosis: DIAGNOSIS_ROWS[0].diagnosis,
    solution: 'Cortes de 2–3s, revelação só na última cena, loop no fim',
    measure: (entry) => (entry.apv == null ? null : { value: entry.apv, goal: retentionGoal(entry.durationSec) }),
  },
  {
    id: 'postagem',
    step: '8. Postagem — título e keywords',
    question: 'A busca trouxe parte das views?',
    metric: 'Tráfego de busca',
    goalLabel: 'Busca 30%+',
    unit: '%',
    diagnosis: DIAGNOSIS_ROWS[4].diagnosis,
    solution: DIAGNOSIS_ROWS[4].solution,
    measure: (entry) => (entry.searchPct == null ? null : { value: entry.searchPct, goal: 30 }),
  },
  {
    id: 'fidelizacao',
    step: '9. Aprimoramento — fidelizar',
    question: 'As views viraram inscritos?',
    metric: 'Inscritos por mil views',
    goalLabel: '5+ por mil (0,5%)',
    unit: 'por mil',
    diagnosis: DIAGNOSIS_ROWS[2].diagnosis,
    solution: DIAGNOSIS_ROWS[2].solution,
    measure: (entry) =>
      entry.subscribers == null || entry.views == null || entry.views < 1000
        ? null
        : { value: Math.round((entry.subscribers / entry.views) * 10000) / 10, goal: 5 },
  },
]

export type GroupRow = {
  id: string
  total: number
  medianViews: number | null
  above: number | null
  medianApv: number | null
  medianViewed: number | null
}

export type Report = {
  total: number
  average: number | null
  averageSource: 'canal' | 'mediana' | null
  stages: StageResult[]
  bottleneck: StageResult | null
  byFormat: GroupRow[]
  byCharacter: GroupRow[]
  loops: ReportEntry[]
  enoughData: boolean
}

function groupBy(entries: ReportEntry[], key: 'formatId' | 'characterId', average: number | null): GroupRow[] {
  const map = new Map<string, ReportEntry[]>()
  for (const entry of entries) {
    const id = entry[key] || ''
    map.set(id, [...(map.get(id) ?? []), entry])
  }
  return [...map.entries()]
    .map(([id, list]) => ({
      id,
      total: list.length,
      medianViews: median(list.map((entry) => entry.views)),
      above: average == null ? null : list.filter((entry) => entry.views != null && entry.views > average).length,
      medianApv: median(list.map((entry) => entry.apv)),
      medianViewed: median(list.map((entry) => entry.viewed)),
    }))
    .sort((a, b) => (b.medianViews ?? -1) - (a.medianViews ?? -1))
}

/**
 * Relatório por etapa da esteira: para cada etapa, quantos vídeos bateram a meta.
 * A etapa com a menor taxa (com pelo menos 2 vídeos medidos) é o gargalo.
 */
export function buildReport(entries: ReportEntry[], channelAverage: number | null): Report {
  const fallback = median(entries.map((entry) => entry.views))
  const average = channelAverage ?? fallback
  const averageSource = channelAverage != null ? 'canal' : fallback != null ? 'mediana' : null
  const stages: StageResult[] = STAGES.map((stage) => {
    const checks: StageCheck[] = []
    for (const entry of entries) {
      const measured = stage.measure(entry, { average })
      if (!measured) continue
      checks.push({ entry, ...measured, hit: measured.value >= measured.goal && !(stage.id === 'alcance' && measured.value === measured.goal) })
    }
    checks.sort((a, b) => a.value / (a.goal || 1) - b.value / (b.goal || 1))
    const hits = checks.filter((check) => check.hit).length
    return {
      id: stage.id,
      step: stage.step,
      question: stage.question,
      metric: stage.metric,
      goalLabel: stage.goalLabel,
      unit: stage.unit,
      checks,
      hits,
      rate: checks.length ? hits / checks.length : null,
      median: median(checks.map((check) => check.value)),
      diagnosis: stage.diagnosis,
      solution: stage.solution,
    }
  })
  const bottleneck =
    stages
      .filter((stage) => stage.rate != null && stage.checks.length >= 2 && stage.id !== 'alcance')
      .sort((a, b) => (a.rate ?? 1) - (b.rate ?? 1))[0] ?? null

  return {
    total: entries.length,
    average,
    averageSource,
    stages,
    bottleneck: bottleneck && (bottleneck.rate ?? 1) < 1 ? bottleneck : null,
    byFormat: groupBy(entries, 'formatId', average),
    byCharacter: groupBy(entries, 'characterId', average),
    loops: entries.filter((entry) => entry.apv != null && entry.apv > 100),
    enoughData: entries.length >= 20,
  }
}

export type ImportSummary = {
  rows: number
  medianViews: number | null
  medianApv: number | null
  medianViewed: number | null
  medianSearch: number | null
  subsPerThousand: number | null
}

export function summarizeImport(record: ImportRecord): ImportSummary {
  const views = record.rows.reduce((sum, row) => sum + (row.views ?? 0), 0)
  const subs = record.rows.reduce((sum, row) => sum + (row.subscribers ?? 0), 0)
  const hasSubs = record.rows.some((row) => row.subscribers != null)
  return {
    rows: record.rows.length,
    medianViews: median(record.rows.map((row) => row.views)),
    medianApv: median(record.rows.map((row) => row.apv)),
    medianViewed: median(record.rows.map((row) => row.viewed)),
    medianSearch: median(record.rows.map((row) => row.searchPct)),
    subsPerThousand: hasSubs && views > 0 ? Math.round((subs / views) * 10000) / 10 : null,
  }
}
