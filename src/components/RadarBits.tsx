import { useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { formatDecimal, formatInt } from '@/lib/format'
import {
  VERDICT_LABEL,
  VERDICT_TEXT,
  ageHours,
  ageLabel,
  languageLabel,
  regionLabel,
  windowLabel,
  type DemandSummary,
  type DemandVerdict,
  type RadarLanguage,
  type RadarRegion,
  type RadarWindow,
  type ScoredVideo,
  type Trend,
  TREND_LABEL,
} from '@/lib/radar'

const VERDICT_STYLE: Record<DemandVerdict, string> = {
  alta: 'bg-[#E5F4EA] text-[#0E5C32]',
  media: 'bg-[#FDEEDD] text-[#8A3E0B]',
  baixa: 'bg-[#EFEBE3] text-[#1C1B19]',
  incerta: 'bg-[#E7F0FA] text-[#1A3E66]',
  sem_amostra: 'bg-[#EFEBE3] text-[#1C1B19]',
}

const TREND_STYLE: Record<Trend, string> = {
  subindo: 'bg-[#E5F4EA] text-[#0E5C32]',
  caindo: 'bg-[#F8E6E4] text-[#8C241C]',
  estavel: 'bg-[#EFEBE3] text-[#1C1B19]',
  sem_comparacao: 'bg-[#E7F0FA] text-[#1A3E66]',
}

export function ChoiceButton({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`min-h-11 rounded-xl border px-3 text-sm font-medium ${pressed ? 'border-foreground bg-foreground text-background' : 'bg-card'}`}
    >
      {children}
    </button>
  )
}

export function VerdictBadge({ verdict }: { verdict: DemandVerdict }) {
  return <span className={`inline-flex min-h-7 items-center rounded-full px-2.5 text-xs font-semibold ${VERDICT_STYLE[verdict]}`}>{VERDICT_LABEL[verdict]}</span>
}

export function TrendBadge({ trend }: { trend: Trend }) {
  return <span className={`inline-flex min-h-7 items-center rounded-full px-2.5 text-xs font-semibold ${TREND_STYLE[trend]}`}>{TREND_LABEL[trend]}</span>
}

export function DemandCard({
  summary,
  droppedLong,
  note,
  young,
  cachedLabel,
  spent,
}: {
  summary: DemandSummary
  droppedLong: number
  note: string
  young: number
  cachedLabel: string | null
  spent: number | null
}) {
  return (
    <section className="rounded-2xl border bg-card p-4" aria-labelledby="demanda-titulo">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="demanda-titulo" className="text-lg font-semibold">Demanda deste assunto</h2>
        <VerdictBadge verdict={summary.verdict} />
      </div>
      <p className="mt-2 text-sm leading-relaxed">{VERDICT_TEXT[summary.verdict]}</p>
      <p className={summary.medianMultiplier == null ? 'mt-3 text-lg font-semibold' : 'mt-3 font-heading text-4xl font-semibold tabular-nums'}>
        {summary.medianMultiplier == null ? 'sem mediana' : `${formatDecimal(summary.medianMultiplier)}×`}
      </p>
      <p className="text-sm text-muted-foreground">multiplicador mediano. É o meio da amostra, não uma promessa.</p>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-muted-foreground">Vídeos curtos</dt>
          <dd className="font-heading text-2xl font-semibold tabular-nums">{summary.videoCount}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Fora do normal</dt>
          <dd className="font-heading text-2xl font-semibold tabular-nums">{summary.outlierCount}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-muted-foreground">Ritmo mediano</dt>
          <dd className="text-base font-semibold">{summary.medianViewsPerDay == null ? 'sem ritmo calculado' : `${formatCompact(summary.medianViewsPerDay)} views por dia`}</dd>
          {summary.medianViewsPerHour != null ? <dd className="text-muted-foreground">{formatRate(summary.medianViewsPerHour)} views por hora</dd> : null}
        </div>
      </dl>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Estimativa desta amostra. O YouTube não informa quantas pessoas buscaram a palavra.</p>
      {droppedLong > 0 ? <p className="mt-2 text-sm leading-relaxed">Tirei {droppedLong} {droppedLong === 1 ? 'vídeo' : 'vídeos'} com mais de 3 minutos.</p> : null}
      {young > 0 ? <p className="mt-2 text-sm leading-relaxed">{young === 1 ? '1 vídeo tem' : `${young} vídeos têm`} menos de 3 horas. O ritmo por dia ainda pode mudar.</p> : null}
      {note ? <p className="mt-2 text-sm leading-relaxed">{note}</p> : null}
      {cachedLabel ? <p className="mt-2 text-sm leading-relaxed">{cachedLabel}</p> : null}
      {spent != null ? <p className="mt-2 text-sm leading-relaxed">Esta consulta gastou {formatInt(spent)} unidades da cota.</p> : null}
    </section>
  )
}

export function VideoCard({ video, measuredAt }: { video: ScoredVideo; measuredAt: number }) {
  const measured = new Date(measuredAt)
  const age = ageHours(video.publishedAt, measured)
  const young = age != null && age >= 0 && age < 3
  return (
    <li className="rounded-2xl border bg-card p-3">
      <a href={`https://www.youtube.com/shorts/${video.id}`} target="_blank" rel="noreferrer" className="flex gap-3">
        <Thumb src={video.thumbnail} />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold leading-snug">{video.title}</span>
          <span className="mt-1 block text-sm text-muted-foreground">{video.channelTitle} · {subsLabel(video)}</span>
          <span className="mt-2 inline-flex items-center gap-1 text-sm font-medium underline">
            Abrir no YouTube
            <ExternalLink className="size-4" aria-hidden />
          </span>
        </span>
      </a>
      <p className="mt-3 text-sm">{formatInt(video.views)} views · {ageLabel(video.publishedAt, measured)}</p>
      <p className="mt-1 text-sm leading-relaxed">{multiplierLabel(video)}</p>
      {video.reliable && video.baselineSample > 0 ? <p className="text-sm text-muted-foreground">Comparei com {video.baselineSample} vídeos desse canal.</p> : null}
      {video.viewsPerHour != null ? <p className="mt-1 text-sm">{formatRate(video.viewsPerHour)} views por hora · {video.viewsPerDay == null ? '' : `${formatRate(video.viewsPerDay)} por dia`}</p> : null}
      {young ? <p className="mt-1 text-sm">Muito novo: o ritmo ainda pode mudar.</p> : null}
      {video.outlier ? <p className="mt-2"><span className="inline-flex min-h-7 items-center rounded-full bg-[#E5F4EA] px-2.5 text-xs font-semibold text-[#0E5C32]">Fora do normal</span></p> : null}
    </li>
  )
}

export function FilterLine({ window, region, language }: { window: RadarWindow; region: RadarRegion; language: RadarLanguage }) {
  return <p className="text-sm text-muted-foreground">{windowLabel(window)} · {regionLabel(region)} · {languageLabel(language)}</p>
}

function Thumb({ src }: { src: string }) {
  const [broken, setBroken] = useState(false)
  if (!src || broken) {
    return <span className="grid h-16 w-28 shrink-0 place-items-center rounded-lg bg-muted text-xs">sem capa</span>
  }
  return <img src={src} alt="" className="h-16 w-28 shrink-0 rounded-lg bg-muted object-cover" onError={() => setBroken(true)} />
}

function subsLabel(video: ScoredVideo): string {
  if (video.subscribersHidden) return 'inscritos ocultos'
  if (video.subscriberCount == null) return 'tamanho do canal sem número'
  return `${formatCompact(video.subscriberCount)} inscritos`
}

function multiplierLabel(video: ScoredVideo): string {
  if (video.multiplier == null || video.typicalViews == null) return 'Sem o normal deste canal para comparar.'
  const value = `${formatDecimal(video.multiplier)}×`
  if (!video.reliable && video.freshBaseline) return `${value}, mas a base é fraca: o canal só tem vídeos novos.`
  if (!video.reliable) return `${value}, mas a base é fraca (menos de 3 vídeos antigos).`
  return `${value} o normal do canal`
}

function formatCompact(value: number): string {
  return new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

function formatRate(value: number): string {
  if (value >= 1000) return formatCompact(value)
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(value)
}
