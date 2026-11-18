import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatInt, formatPct } from '@/lib/format'
import { WINDOW_LABEL } from '@/lib/imports'
import { useApp } from '@/state/store'
import { Card, Field, selectClass } from '@/components/bits'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { ImportLink, ImportRecord, ImportRow, ImportSource, ImportWindow, MetricValues } from '@/types'

const WINDOWS: ImportWindow[] = ['48h', '7d', 'periodo']

export function linkValue(link: ImportLink): string {
  if (link.kind === 'video') return `v:${link.videoId}`
  return link.kind
}

export function ImportReview({
  source,
  fileName,
  rows,
  totals,
  onRowsChange,
}: {
  source: ImportSource
  fileName: string
  rows: ImportRow[]
  totals: MetricValues | null
  onRowsChange: (rows: ImportRow[]) => void
}) {
  const { state, saveImport } = useApp()
  const navigate = useNavigate()
  const [window, setWindow] = useState<ImportWindow>(source === 'print' ? '48h' : 'periodo')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const videos = [...state.videos].sort((a, b) => (a.date < b.date ? 1 : -1))
  const linked = rows.filter((row) => row.link.kind === 'video').length
  const created = rows.filter((row) => row.link.kind === 'novo').length

  function setLink(index: number, link: ImportLink) {
    onRowsChange(rows.map((row, i) => (i === index ? { ...row, link } : row)))
  }

  function save() {
    const incomplete = rows.find((row) => row.link.kind === 'novo' && (!row.link.formatId || !row.link.characterId))
    if (incomplete) {
      setError(`Escolha formato e personagem para "${incomplete.title}" ou mude para "Não vincular".`)
      return
    }
    const record: ImportRecord = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      source,
      fileName,
      window,
      note: note.trim(),
      rows,
      totals,
    }
    saveImport(record)
    navigate(`/metricas/historico/${record.id}`)
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <h2 className="text-lg font-semibold">Esses números são de quando?</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          48h e 7 dias preenchem as views do vídeo no diário. "Outro período" guarda as views só no histórico e atualiza APV, assistiram, inscritos e busca.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {WINDOWS.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={window === item}
              onClick={() => setWindow(item)}
              className={`min-h-11 rounded-xl border px-4 text-left text-sm font-medium ${window === item ? 'border-foreground bg-foreground text-background' : 'bg-card'}`}
            >
              {WINDOW_LABEL[item]}
            </button>
          ))}
        </div>
      </Card>

      <section>
        <h2 className="mb-1 text-lg font-semibold">Vínculo com o diário ({rows.length})</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Sugeri pelo ID do YouTube ou pelo título. Confira antes de salvar. {linked} vinculado(s), {created} novo(s).
        </p>
        <ul className="flex flex-col gap-3">
          {rows.map((row, index) => (
            <li key={`${row.key}-${index}`} className="rounded-2xl border bg-card p-4">
              <p className="font-semibold leading-snug">{row.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{rowSummary(row)}</p>
              <select
                aria-label={`Vínculo de ${row.title}`}
                className={`${selectClass()} mt-3`}
                value={linkValue(row.link)}
                onChange={(event) => {
                  const value = event.target.value
                  if (value === 'nenhum') setLink(index, { kind: 'nenhum' })
                  else if (value === 'novo') setLink(index, { kind: 'novo', formatId: '', characterId: '' })
                  else setLink(index, { kind: 'video', videoId: value.slice(2) })
                }}
              >
                <option value="nenhum">Não vincular (fica só no histórico)</option>
                <option value="novo">Registrar como vídeo novo</option>
                {videos.map((video) => (
                  <option key={video.id} value={`v:${video.id}`}>
                    {video.title}
                  </option>
                ))}
              </select>
              {row.link.kind === 'novo' ? (
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <select
                    aria-label="Formato"
                    className={selectClass()}
                    value={row.link.formatId}
                    onChange={(event) => setLink(index, { ...(row.link as Extract<ImportLink, { kind: 'novo' }>), formatId: event.target.value })}
                  >
                    <option value="">Formato…</option>
                    {state.formats.map((format) => (
                      <option key={format.id} value={format.id}>
                        {format.name}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Personagem"
                    className={selectClass()}
                    value={row.link.characterId}
                    onChange={(event) => setLink(index, { ...(row.link as Extract<ImportLink, { kind: 'novo' }>), characterId: event.target.value })}
                  >
                    <option value="">Personagem…</option>
                    {state.characters.map((character) => (
                      <option key={character.id} value={character.id}>
                        {character.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <Field label="Nota (opcional)" hint="Ex.: export da semana 10–16/nov, só Shorts.">
        <Textarea value={note} onChange={(event) => setNote(event.target.value)} />
      </Field>
      {error ? (
        <p className="text-sm font-medium text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="button" onClick={save} disabled={rows.length === 0}>
        Salvar importação
      </Button>
    </div>
  )
}

export function rowSummary(row: MetricValues & { durationSec?: number | null }): string {
  const parts: string[] = []
  if (row.views != null) parts.push(`${formatInt(row.views)} views`)
  if (row.viewed != null) parts.push(`${formatPct(row.viewed)} assistiram`)
  if (row.apv != null) parts.push(`APV ${formatPct(row.apv)}`)
  if (row.subscribers != null) parts.push(`${formatInt(row.subscribers)} inscritos`)
  if (row.searchPct != null) parts.push(`busca ${formatPct(row.searchPct)}`)
  if (row.durationSec != null) parts.push(`${formatInt(row.durationSec)}s`)
  return parts.join(' · ') || 'Sem métricas reconhecidas'
}
