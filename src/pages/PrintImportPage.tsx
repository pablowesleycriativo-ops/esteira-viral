import { useState } from 'react'
import { formatPct } from '@/lib/format'
import { emptyMetrics, parseDuration, parseNumber, suggestLinks } from '@/lib/imports'
import { ocrImage, readPrintText } from '@/lib/printText'
import { useApp } from '@/state/store'
import { BackLink, Card, Field, PageIntro } from '@/components/bits'
import { ImportReview } from '@/components/ImportReview'
import { Input } from '@/components/ui/input'
import type { ImportRow, MetricValues } from '@/types'

type Shot = { name: string; url: string; text: string; progress: number; done: boolean }

const FIELDS: { key: keyof MetricValues | 'durationSec'; label: string; pct?: boolean; duration?: boolean }[] = [
  { key: 'views', label: 'Views' },
  { key: 'viewed', label: 'Assistiram (vs. deslizaram) %', pct: true },
  { key: 'apv', label: 'APV — % médio assistido', pct: true },
  { key: 'avgViewSec', label: 'Duração média da visualização (s)', duration: true },
  { key: 'durationSec', label: 'Duração do Short (s)', duration: true },
  { key: 'subscribers', label: 'Inscritos ganhos' },
  { key: 'searchPct', label: 'Tráfego de busca %', pct: true },
  { key: 'impressions', label: 'Impressões' },
  { key: 'ctr', label: 'CTR das impressões %', pct: true },
  { key: 'likes', label: 'Gostei' },
  { key: 'shares', label: 'Compartilhamentos' },
]

type Draft = Record<(typeof FIELDS)[number]['key'], string>

function emptyDraft(): Draft {
  return Object.fromEntries(FIELDS.map((field) => [field.key, ''])) as Draft
}

function show(value: number | null): string {
  return value == null ? '' : String(value).replace('.', ',')
}

export function PrintImportPage() {
  const { state } = useApp()
  const [shots, setShots] = useState<Shot[]>([])
  const [draft, setDraft] = useState<Draft>(emptyDraft())
  const [title, setTitle] = useState('')
  const [rows, setRows] = useState<ImportRow[] | null>(null)
  const [error, setError] = useState('')
  const busy = shots.some((shot) => !shot.done)

  async function onFiles(list: FileList | null) {
    const files = Array.from(list ?? []).filter((file) => file.type.startsWith('image/'))
    if (!files.length) return
    setError('')
    setRows(null)
    const start: Shot[] = files.map((file) => ({ name: file.name, url: URL.createObjectURL(file), text: '', progress: 0, done: false }))
    setShots(start)
    const merged = emptyMetrics()
    for (const [index, file] of files.entries()) {
      try {
        const text = await ocrImage(file, (progress) =>
          setShots((current) => current.map((shot, i) => (i === index ? { ...shot, progress } : shot))),
        )
        const reading = readPrintText(text)
        for (const key of Object.keys(merged) as (keyof MetricValues)[]) {
          if (merged[key] == null && reading.values[key] != null) merged[key] = reading.values[key]
        }
        setShots((current) => current.map((shot, i) => (i === index ? { ...shot, text, progress: 1, done: true } : shot)))
      } catch {
        setError('O OCR falhou. Na primeira vez ele precisa de internet para baixar o idioma.')
        setShots((current) => current.map((shot, i) => (i === index ? { ...shot, done: true } : shot)))
      }
    }
    setDraft((current) => {
      const next = { ...current }
      for (const field of FIELDS) {
        if (field.key === 'durationSec') continue
        const value = merged[field.key]
        if (value != null) next[field.key] = show(value)
      }
      return next
    })
  }

  function review() {
    const values = emptyMetrics()
    let durationSec: number | null = null
    for (const field of FIELDS) {
      const raw = draft[field.key].trim()
      if (!raw) continue
      const value = field.duration ? parseDuration(raw) : parseNumber(raw, field.pct ? 'dec' : 'int')
      if (value == null) {
        setError(`"${field.label}" não é um número.`)
        return
      }
      if (field.pct && (value < 0 || value > 1000)) {
        setError(`"${field.label}" parece errado: ${formatPct(value)}.`)
        return
      }
      if (field.key === 'durationSec') durationSec = value
      else values[field.key] = value
    }
    setError('')
    const row: ImportRow = {
      ...values,
      key: `print-${Date.now()}`,
      youtubeId: null,
      title: title.trim() || 'Short do print',
      publishDate: null,
      durationSec,
      link: { kind: 'nenhum' },
    }
    setRows(suggestLinks([row], state.videos))
  }

  return (
    <div className="flex flex-col gap-4">
      <BackLink to="/metricas">Métricas</BackLink>
      <PageIntro
        title="Ler print"
        lede="Escolha um ou mais prints do mesmo Short (visão geral, assistiram vs. deslizaram, retenção, origem do tráfego). O texto é lido no navegador e você confere cada número antes de salvar."
      />
      <label className="inline-flex min-h-14 cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed bg-card px-4 text-base font-semibold">
        {busy ? 'Lendo prints…' : 'Escolher prints'}
        <input
          type="file"
          multiple
          accept="image/*"
          className="sr-only"
          disabled={busy}
          onChange={(event) => {
            onFiles(event.target.files)
            event.target.value = ''
          }}
        />
      </label>

      {shots.length ? (
        <ul className="grid grid-cols-3 gap-2">
          {shots.map((shot) => (
            <li key={shot.url} className="overflow-hidden rounded-xl border bg-card">
              <img src={shot.url} alt={shot.name} className="aspect-[9/16] w-full object-cover" />
              <p className="p-1.5 text-xs">{shot.done ? 'lido' : `${Math.round(shot.progress * 100)}%`}</p>
            </li>
          ))}
        </ul>
      ) : null}

      {shots.length && !busy ? (
        <Card>
          <h2 className="text-lg font-semibold">Confira os números</h2>
          <p className="mt-1 text-sm text-muted-foreground">Campos vazios não foram achados no print. Corrija o que o OCR leu errado.</p>
          <div className="mt-3 flex flex-col gap-3">
            <Field label="Título do Short" hint="Ajuda a achar o vídeo no diário.">
              <Input value={title} onChange={(event) => setTitle(event.target.value)} />
            </Field>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {FIELDS.map((field) => (
                <Field key={field.key} label={field.label}>
                  <Input
                    inputMode={field.duration ? 'text' : 'decimal'}
                    value={draft[field.key]}
                    onChange={(event) => setDraft((current) => ({ ...current, [field.key]: event.target.value }))}
                  />
                </Field>
              ))}
            </div>
          </div>
          <details className="mt-3 text-sm">
            <summary className="min-h-11 cursor-pointer py-2 font-medium">Texto que o OCR leu</summary>
            {shots.map((shot) => (
              <pre key={shot.url} className="mt-2 max-h-48 overflow-auto rounded-lg bg-muted p-2 text-xs whitespace-pre-wrap">
                {shot.text || '(nada)'}
              </pre>
            ))}
          </details>
          <button type="button" onClick={review} className="mt-3 min-h-11 w-full rounded-xl bg-foreground px-4 text-base font-semibold text-background">
            Continuar
          </button>
        </Card>
      ) : null}

      {error ? (
        <p className="text-sm font-medium text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {rows ? (
        <ImportReview source="print" fileName={shots.map((shot) => shot.name).join(', ')} rows={rows} totals={null} onRowsChange={setRows} />
      ) : null}
    </div>
  )
}
