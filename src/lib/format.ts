export function formatDecimal(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value)
}

export function formatInt(value: number): string {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(value)
}

export function formatPct(value: number): string {
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value)}%`
}

export function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  if (!year || !month || !day) return iso
  return new Intl.DateTimeFormat('pt-BR').format(new Date(year, month - 1, day))
}

export function todayISO(now = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

const MONTHS = [
  'janeiro',
  'fevereiro',
  'março',
  'marco',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
]

export function titleHasDate(title: string): boolean {
  const text = title.toLowerCase()
  if (/\b(19|20)\d{2}\b/.test(text)) return true
  if (/\b\d{1,2}[/.-]\d{1,2}([/.-]\d{2,4})?\b/.test(text)) return true
  return MONTHS.some((month) => new RegExp(`\\b${month}\\b`, 'i').test(text))
}

export function toHashtag(raw: string): string {
  const clean = raw.trim().replace(/^#+/, '').replace(/\s+/g, '')
  return clean ? `#${clean}` : ''
}

export function parseLooseNumber(raw: string): number | null {
  const text = raw.trim().replace(',', '.')
  if (!text) return null
  const value = Number(text)
  if (!Number.isFinite(value)) return null
  return value
}
