import type { AverageBasis, Criteria, FormatItem, Score, SortKey, Video } from '@/types'

export function criteriaAverage(criteria: Criteria): number | null {
  const nums = Object.values(criteria).filter((value): value is Score => value != null)
  if (nums.length === 0) return null
  return nums.reduce((sum, value) => sum + value, 0) / nums.length
}

export function metricViews(video: Video, basis: AverageBasis): number | null {
  return basis === '48h' ? video.views48h : video.views7d
}

export function sortValue(format: FormatItem, key: SortKey): number | null {
  if (key === 'media') return criteriaAverage(format.criteria)
  return format.criteria[key]
}

export function compareFormats(a: FormatItem, b: FormatItem, key: SortKey, direction: 'asc' | 'desc'): number {
  const av = sortValue(a, key)
  const bv = sortValue(b, key)
  if (av == null && bv == null) return tie(a, b)
  if (av == null) return 1
  if (bv == null) return -1
  if (av !== bv) return direction === 'desc' ? bv - av : av - bv
  return tie(a, b)
}

function tie(a: FormatItem, b: FormatItem): number {
  const ar = a.criteria.resultado ?? -1
  const br = b.criteria.resultado ?? -1
  if (ar !== br) return br - ar
  const an = a.number ?? 100 + (a.priority ?? 99)
  const bn = b.number ?? 100 + (b.priority ?? 99)
  return an - bn
}

export type AverageMark = 'acima' | 'abaixo' | 'na_media' | 'sem_views' | 'sem_media'

export function averageMark(video: Video, average: number | null, basis: AverageBasis): AverageMark {
  if (average == null) return 'sem_media'
  const views = metricViews(video, basis)
  if (views == null) return 'sem_views'
  if (views > average) return 'acima'
  if (views < average) return 'abaixo'
  return 'na_media'
}

export const SCORE_FILL: Record<number, string> = {
  1: '#C0392E',
  2: '#D4651A',
  3: '#C4960A',
  4: '#6AAA45',
  5: '#1E7A45',
}
