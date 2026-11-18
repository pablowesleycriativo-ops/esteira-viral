import { emptyMetrics, parseDuration, parseNumber, plain } from '@/lib/imports'
import type { MetricValues } from '@/types'

type Target = keyof MetricValues | 'swiped'

/** Rótulos que aparecem nos prints do YouTube Studio (app e computador), em inglês e português. */
const LABELS: { key: Target; labels: string[]; exclude?: string[] }[] = [
  { key: 'apv', labels: ['average percentage viewed', 'porcentagem media visualizada', 'percentagem media visualizada', 'porcentagem media assistida', 'percentual medio'] },
  { key: 'avgViewSec', labels: ['average view duration', 'duracao media da visualizacao', 'duracao media de visualizacao', 'duracao media'] },
  { key: 'swiped', labels: ['swiped away', 'deslizaram', 'deslizou', 'deslizados', 'pularam'] },
  { key: 'viewed', labels: ['stayed to watch', 'ficaram para assistir', 'continuaram assistindo', 'assistiram', 'viewed', 'visualizado', 'ficaram'], exclude: ['average', 'media', 'swiped', 'deslizou'] },
  { key: 'ctr', labels: ['click-through rate', 'click through rate', 'taxa de cliques'] },
  { key: 'impressions', labels: ['impressions', 'impressoes'], exclude: ['click', 'cliques', 'taxa'] },
  { key: 'searchPct', labels: ['youtube search', 'pesquisa do youtube', 'busca do youtube'] },
  { key: 'subscribers', labels: ['subscribers', 'inscritos', 'inscricoes'], exclude: ['nao inscritos', 'not subscribed', 'non-subscribers'] },
  { key: 'likes', labels: ['likes', 'marcacoes gostei', 'gostei'], exclude: ['nao gostei', 'dislikes'] },
  { key: 'shares', labels: ['shares', 'compartilhamentos'] },
  { key: 'views', labels: ['engaged views', 'visualizacoes engajadas', 'views', 'visualizacoes'], exclude: ['average', 'media', 'percentage', 'porcentagem', 'per ', 'por '] },
]

const NUMBER = /[+-]?\d[\d.,]*(?:\s?(?:%|k\b|mil\b|mi\b|m\b|b\b|bi\b))?/i
const DURATION = /\b\d{1,2}:\d{2}(?::\d{2})?\b/

export type PrintReading = {
  values: MetricValues
  found: Target[]
}

function valueAfter(text: string, key: Target): string | null {
  if (key === 'avgViewSec') return text.match(DURATION)?.[0] ?? null
  const cleaned = text.replace(DURATION, ' ')
  const match = cleaned.match(NUMBER)
  return match ? match[0] : null
}

/** Lê o texto que o OCR tirou de um print e devolve as métricas que encontrou. */
export function readPrintText(text: string): PrintReading {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  const plainLines = lines.map(plain)
  const values = emptyMetrics()
  const found: Target[] = []
  const used = new Set<number>()
  let swiped: number | null = null

  for (const { key, labels, exclude } of LABELS) {
    let done = false
    for (const label of labels) {
      if (done) break
      for (let i = 0; i < plainLines.length && !done; i += 1) {
        const line = plainLines[i]
        if (used.has(i)) continue
        const at = line.indexOf(label)
        if (at < 0) continue
        if (exclude?.some((word) => line.includes(word))) continue
        // número na mesma linha depois do rótulo, antes dele, ou nas duas linhas seguintes
        const candidates = [lines[i].slice(at + label.length), lines[i].slice(0, at), lines[i + 1] ?? '', lines[i + 2] ?? '']
        for (const candidate of candidates) {
          const raw = valueAfter(candidate, key)
          if (!raw) continue
          const parsed =
            key === 'avgViewSec'
              ? parseDuration(raw)
              : parseNumber(raw, key === 'views' || key === 'subscribers' || key === 'impressions' || key === 'likes' || key === 'shares' ? 'int' : 'dec')
          if (parsed == null) continue
          if (key === 'swiped') swiped = parsed
          else values[key] = parsed
          found.push(key)
          used.add(i)
          done = true
          break
        }
      }
    }
  }

  if (values.viewed == null && swiped != null && swiped >= 0 && swiped <= 100) {
    values.viewed = Math.round((100 - swiped) * 10) / 10
  }
  return { values, found }
}

/** Roda o OCR no navegador. O Tesseract baixa o idioma na primeira vez (precisa de internet). */
export async function ocrImage(file: Blob, onProgress?: (value: number) => void): Promise<string> {
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker(['por', 'eng'], 1, {
    logger: (message: { status: string; progress: number }) => {
      if (message.status === 'recognizing text') onProgress?.(message.progress)
    },
  })
  try {
    const result = await worker.recognize(file)
    return result.data.text
  } finally {
    await worker.terminate()
  }
}
