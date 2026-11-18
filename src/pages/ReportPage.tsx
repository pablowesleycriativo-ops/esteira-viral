import { Link, useSearchParams } from 'react-router-dom'
import { TriangleAlert } from 'lucide-react'
import { formatDate, formatDecimal, formatInt, formatPct } from '@/lib/format'
import { WINDOW_LABEL } from '@/lib/imports'
import { buildReport, entriesFromImport, entriesFromVideos, type GroupRow, type StageResult } from '@/lib/report'
import { useApp } from '@/state/store'
import { BackLink, Card, PageIntro, selectClass } from '@/components/bits'

function fmt(value: number | null, unit: StageResult['unit']): string {
  if (value == null) return '—'
  if (unit === '%') return formatPct(value)
  if (unit === 'por mil') return `${formatDecimal(value)}/mil`
  return formatInt(value)
}

export function ReportPage() {
  const { state } = useApp()
  const [params, setParams] = useSearchParams()
  const source = params.get('fonte') ?? 'diario'
  const record = source === 'diario' ? null : state.imports.find((item) => item.id === source) ?? null
  const entries = record ? entriesFromImport(record, state.videos) : entriesFromVideos(state.videos, state.settings.averageBasis)
  const report = buildReport(entries, state.settings.channelAverage)
  const formatName = (id: string) => state.formats.find((item) => item.id === id)?.name ?? 'Sem vínculo'
  const characterName = (id: string) => state.characters.find((item) => item.id === id)?.name ?? 'Sem vínculo'

  return (
    <div className="flex flex-col gap-4">
      <BackLink to="/metricas">Métricas</BackLink>
      <PageIntro
        title="Relatório por etapa"
        lede="Cada métrica do YouTube aponta para uma etapa da esteira. A etapa com menos vídeos batendo a meta é onde mexer primeiro."
      />
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Dados</span>
        <select className={selectClass()} value={record ? record.id : 'diario'} onChange={(event) => setParams({ fonte: event.target.value })}>
          <option value="diario">Diário de vídeos ({state.videos.length})</option>
          {state.imports.map((item) => (
            <option key={item.id} value={item.id}>
              Importação {formatDate(item.createdAt.slice(0, 10))} · {item.source === 'csv' ? 'CSV' : 'print'} · {item.rows.length} linha(s)
            </option>
          ))}
        </select>
      </label>
      <p className="text-sm text-muted-foreground">
        {record ? `Views de: ${WINDOW_LABEL[record.window]}. ` : `Views em ${state.settings.averageBasis === '48h' ? '48 horas' : '7 dias'}. `}
        {report.averageSource === 'canal'
          ? `Média do canal: ${formatInt(report.average ?? 0)}.`
          : report.averageSource === 'mediana'
            ? `Sem média do canal em Ajustes — usei a mediana destes vídeos (${formatInt(report.average ?? 0)}).`
            : 'Sem views para comparar.'}
      </p>

      {report.total === 0 ? (
        <Card>
          <p className="text-sm">Ainda não há vídeos com números. Importe um CSV ou print em Métricas.</p>
        </Card>
      ) : null}

      {report.total > 0 && !report.enoughData ? (
        <p className="flex gap-2 rounded-2xl border bg-card p-3 text-sm leading-relaxed">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {report.total} vídeo(s). Padrões ficam confiáveis com 20–30 vídeos; até lá, trate como hipótese.
        </p>
      ) : null}

      {report.bottleneck ? (
        <Card className="border-2 border-foreground">
          <p className="text-sm font-medium text-muted-foreground">Onde a esteira mais vaza</p>
          <p className="mt-1 text-xl font-semibold leading-snug">{report.bottleneck.step}</p>
          <p className="mt-2 text-sm">
            {report.bottleneck.hits} de {report.bottleneck.checks.length} vídeos bateram a meta ({report.bottleneck.goalLabel}).
          </p>
          <p className="mt-2 text-sm"><span className="font-semibold">Diagnóstico:</span> {report.bottleneck.diagnosis}.</p>
          <p className="mt-1 text-sm"><span className="font-semibold">Ajuste:</span> {report.bottleneck.solution}.</p>
        </Card>
      ) : null}

      <section className="flex flex-col gap-3">
        {report.stages.map((stage) => (
          <StageCard key={stage.id} stage={stage} />
        ))}
      </section>

      {report.loops.length ? (
        <Card>
          <h2 className="text-lg font-semibold">Loops (APV acima de 100%)</h2>
          <p className="mt-1 text-sm text-muted-foreground">Assistidos mais de uma vez — estrutura para repetir.</p>
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {report.loops.map((entry) => (
              <li key={entry.id}>
                {entry.title} — {formatPct(entry.apv ?? 0)}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <GroupTable title="Por formato" rows={report.byFormat} name={formatName} average={report.average} />
      <GroupTable title="Por personagem" rows={report.byCharacter} name={characterName} average={report.average} />
      <p className="text-sm text-muted-foreground">
        Personagem abaixo em um formato e acima em outro: o problema era o formato. Abaixo em 3 formatos ou mais: provavelmente é o personagem.
      </p>
    </div>
  )
}

function StageCard({ stage }: { stage: StageResult }) {
  const pct = stage.rate == null ? null : Math.round(stage.rate * 100)
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{stage.step}</p>
          <h2 className="mt-0.5 text-lg font-semibold leading-snug">{stage.question}</h2>
        </div>
        <span className="shrink-0 font-heading text-2xl font-semibold tabular-nums">{pct == null ? '—' : `${pct}%`}</span>
      </div>
      <p className="mt-1 text-sm">
        {stage.metric} · meta {stage.goalLabel}
      </p>
      {stage.checks.length ? (
        <>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${stage.hits} de ${stage.checks.length} bateram a meta`}>
            <div className="h-full rounded-full bg-[#1E7A45]" style={{ width: `${pct ?? 0}%` }} />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {stage.hits} de {stage.checks.length} bateram · mediana {fmt(stage.median, stage.unit)}
          </p>
          {stage.checks.some((check) => !check.hit) ? (
            <details className="mt-2 text-sm">
              <summary className="min-h-11 cursor-pointer py-2 font-medium">Abaixo da meta ({stage.checks.filter((c) => !c.hit).length})</summary>
              <ul className="flex flex-col gap-1.5">
                {stage.checks
                  .filter((check) => !check.hit)
                  .map((check) => (
                    <li key={check.entry.id}>
                      {check.entry.videoId ? (
                        <Link className="underline" to={`/videos/${check.entry.videoId}`}>
                          {check.entry.title}
                        </Link>
                      ) : (
                        check.entry.title
                      )}{' '}
                      — {fmt(check.value, stage.unit)}
                    </li>
                  ))}
              </ul>
              <p className="mt-2"><span className="font-semibold">Ajuste:</span> {stage.solution}.</p>
            </details>
          ) : null}
        </>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">Sem dados desta métrica ainda.</p>
      )}
    </Card>
  )
}

function GroupTable({ title, rows, name, average }: { title: string; rows: GroupRow[]; name: (id: string) => string; average: number | null }) {
  if (!rows.length) return null
  return (
    <Card>
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[30rem] text-left text-sm">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="py-2 pr-2 font-medium">Nome</th>
              <th className="py-2 pr-2 font-medium tabular-nums">Vídeos</th>
              <th className="py-2 pr-2 font-medium">Views (mediana)</th>
              {average != null ? <th className="py-2 pr-2 font-medium">Acima</th> : null}
              <th className="py-2 pr-2 font-medium">Assistiram</th>
              <th className="py-2 font-medium">APV</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id || 'none'} className="border-b last:border-0">
                <td className="py-2 pr-2 font-medium">{name(row.id)}</td>
                <td className="py-2 pr-2 tabular-nums">{row.total}</td>
                <td className="py-2 pr-2 tabular-nums">{row.medianViews == null ? '—' : formatInt(row.medianViews)}</td>
                {average != null ? <td className="py-2 pr-2 tabular-nums">{row.above ?? '—'}</td> : null}
                <td className="py-2 pr-2 tabular-nums">{row.medianViewed == null ? '—' : formatPct(row.medianViewed)}</td>
                <td className="py-2 tabular-nums">{row.medianApv == null ? '—' : formatPct(row.medianApv)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
