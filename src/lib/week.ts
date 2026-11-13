import type { Video } from '@/types'

export function weekRange(now = new Date()): { start: Date; end: Date } {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const day = start.getDay()
  const diff = day === 0 ? -6 : 1 - day
  start.setDate(start.getDate() + diff)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

export function parseISODate(iso: string): Date | null {
  const [year, month, day] = iso.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

export function inWeek(iso: string, now = new Date()): boolean {
  const date = parseISODate(iso)
  if (!date) return false
  const { start, end } = weekRange(now)
  return date >= start && date <= end
}

export function formatWeek(now = new Date()): string {
  const { start, end } = weekRange(now)
  const day = new Intl.DateTimeFormat('pt-BR', { day: 'numeric' })
  const month = new Intl.DateTimeFormat('pt-BR', { month: 'short' })
  const year = end.getFullYear()
  if (start.getMonth() === end.getMonth()) {
    return `${day.format(start)}–${day.format(end)} de ${month.format(end)} de ${year}`
  }
  return `${day.format(start)} de ${month.format(start)} – ${day.format(end)} de ${month.format(end)} de ${year}`
}

export type WeekAlert = 'vazio' | 'zero' | 'demais' | 'ok'

export function weekBalance(videos: Video[], now = new Date()) {
  const weekVideos = videos.filter((video) => inWeek(video.date, now))
  const tests = weekVideos.filter((video) => video.formatStatus === 'teste')
  const total = weekVideos.length
  const pct = total === 0 ? null : tests.length / total
  let alert: WeekAlert = 'vazio'
  if (total === 0) alert = 'vazio'
  else if (tests.length === 0) alert = 'zero'
  else if (pct != null && pct > 0.3) alert = 'demais'
  else alert = 'ok'
  return { total, tests: tests.length, pct, alert, weekVideos }
}
