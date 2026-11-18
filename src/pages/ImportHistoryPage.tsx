import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { formatDate, formatDecimal, formatInt, formatPct } from '@/lib/format'
import { WINDOW_LABEL } from '@/lib/imports'
import { summarizeImport, type ImportSummary } from '@/lib/report'
import { useApp } from '@/state/store'
import { BackLink, Card, PageIntro } from '@/components/bits'
import { rowSummary } from '@/components/ImportReview'
import { Button } from '@/components/ui/button'
import type { ImportRecord } from '@/types'

function dateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date)
}

type MetricKey = Exclude<keyof ImportSummary, 'rows'>

const SUMMARY: { key: MetricKey; label: string; show: (value: number) => string }[] = [
  { key: 'medianViews', label: 'Views (mediana)', show: formatInt },
  { key: 'medianViewed', label: 'Assistiram', show: formatPct },
  { key: 'medianApv', label: 'APV', show: formatPct },
  { key: 'medianSearch', label: 'Busca', show: formatPct },
  { key: 'subsPerThousand', label: 'Inscritos/mil', show: formatDecimal },
]

function Delta({ now, before, show }: { now: number | null; before: number | null; show: (value: number) => string }) {
  if (now == null || before == null || before === 0) return null
  const diff = ((now - before) / Math.abs(before)) * 100
  if (Math.abs(diff) < 0.5) return <span className="text-xs text-muted-foreground"> =</span>
  const up = diff > 0
  return (
    <span className={`text-xs font-semibold ${up ? 'text-[#0E5C32]' : 'text-[#8C241C]'}`} title={`antes: ${show(before)}`}>
      {' '}
      {up ? '▲' : '▼'} {formatDecimal(Math.abs(diff))}%
    </span>
  )
}

function SummaryGrid({ record, previous }: { record: ImportRecord; previous: ImportRecord | null }) {
  const now = summarizeImport(record)
  const before = previous ? summarizeImport(previous) : null
  return (
    <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
      {SUMMARY.map((item) => (
        <div key={item.key}>
          <dt className="text-muted-foreground">{item.label}</dt>
          <dd className="font-semibold tabular-nums">
            {now[item.key] == null ? '—' : item.show(now[item.key] as number)}
            <Delta now={now[item.key]} before={before?.[item.key] ?? null} show={item.show} />
          </dd>
        </div>
      ))}
    </dl>
  )
}

export function ImportHistoryPage() {
  const { state } = useApp()
  const list = [...state.imports].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  return (
    <div className="flex flex-col gap-4">
      <BackLink to="/metricas">Métricas</BackLink>
      <PageIntro title="Histórico de importações" lede="As setas comparam com a importação anterior do mesmo tipo (CSV com CSV, print com print)." />
      {list.length === 0 ? (
        <Card>
          <p className="text-sm">Nenhuma importação ainda.</p>
          <Link to="/metricas/csv" className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold underline">
            Ler um CSV
          </Link>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((record, index) => {
            const previous = list.slice(index + 1).find((item) => item.source === record.source) ?? null
            return (
              <li key={record.id}>
                <Link to={`/metricas/historico/${record.id}`} className="block rounded-2xl border bg-card p-4">
                  <span className="text-sm text-muted-foreground">{dateTime(record.createdAt)}</span>
                  <span className="mt-1 block font-semibold leading-snug">
                    {record.source === 'csv' ? 'CSV' : 'Print'} · {record.rows.length} vídeo(s) · {WINDOW_LABEL[record.window]}
                  </span>
                  {record.note ? <span className="mt-1 block text-sm">{record.note}</span> : null}
                  <SummaryGrid record={record} previous={previous} />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export function ImportDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { state, deleteImport } = useApp()
  const [confirm, setConfirm] = useState(false)
  const record = state.imports.find((item) => item.id === id)
  if (!record) {
    return (
      <div>
        <BackLink to="/metricas/historico">Histórico</BackLink>
        <p>Essa importação não está mais no histórico.</p>
      </div>
    )
  }
  const sorted = [...state.imports].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  const previous = sorted.slice(sorted.findIndex((item) => item.id === record.id) + 1).find((item) => item.source === record.source) ?? null

  return (
    <div className="flex flex-col gap-4">
      <BackLink to="/metricas/historico">Histórico</BackLink>
      <p className="text-sm text-muted-foreground">{dateTime(record.createdAt)}</p>
      <h1 className="text-[1.7rem] leading-tight font-semibold">
        {record.source === 'csv' ? 'Importação de CSV' : 'Importação de print'}
      </h1>
      <p className="text-sm">
        {WINDOW_LABEL[record.window]} · {record.fileName || 'sem nome de arquivo'}
      </p>
      {record.note ? <p className="text-sm">{record.note}</p> : null}
      <Card>
        <h2 className="text-lg font-semibold">Resumo</h2>
        <SummaryGrid record={record} previous={previous} />
        {previous ? <p className="mt-2 text-xs text-muted-foreground">Comparado com {formatDate(previous.createdAt.slice(0, 10))}.</p> : null}
      </Card>
      <Button asChild>
        <Link to={`/metricas/relatorio?fonte=${record.id}`}>Ver relatório por etapa</Link>
      </Button>
      <section>
        <h2 className="mb-2 text-lg font-semibold">Vídeos ({record.rows.length})</h2>
        <ul className="flex flex-col gap-2">
          {record.rows.map((row) => {
            const video = row.link.kind === 'video' ? state.videos.find((item) => item.id === (row.link as { videoId: string }).videoId) : undefined
            return (
              <li key={row.key} className="rounded-2xl border bg-card p-3">
                <p className="font-medium leading-snug">{row.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{rowSummary(row)}</p>
                {video ? (
                  <Link to={`/videos/${video.id}`} className="mt-1 inline-flex min-h-11 items-center text-sm underline">
                    No diário: {video.title}
                  </Link>
                ) : (
                  <p className="mt-1 text-sm">Não vinculado</p>
                )}
              </li>
            )
          })}
        </ul>
      </section>
      {confirm ? (
        <Card>
          <p className="text-sm">Apagar só do histórico. Os números que já foram para os vídeos continuam lá.</p>
          <div className="mt-3 flex gap-2">
            <Button
              variant="destructive"
              onClick={() => {
                deleteImport(record.id)
                navigate('/metricas/historico')
              }}
            >
              Apagar
            </Button>
            <Button variant="outline" onClick={() => setConfirm(false)}>
              Cancelar
            </Button>
          </div>
        </Card>
      ) : (
        <Button variant="outline" onClick={() => setConfirm(true)}>
          Apagar importação
        </Button>
      )}
    </div>
  )
}
