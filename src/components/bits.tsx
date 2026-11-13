import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { SCORE_FILL } from '@/lib/scores'
import type { FormatStatus, Score } from '@/types'
import type { AverageMark } from '@/lib/scores'
import { SEAL_LABEL, type SealId } from '@/lib/decision'
import { AppIcon } from '@/data/icons'
import { cn } from '@/lib/utils'

export function BackLink({ to, children }: { to: string; children: string }) {
  return (
    <Link to={to} className="mb-3 inline-flex min-h-11 items-center gap-1 text-sm font-medium">
      <ChevronLeft className="size-5" aria-hidden />
      {children}
    </Link>
  )
}

export function PageIntro({ title, lede }: { title: string; lede?: string }) {
  return (
    <header className="mb-4">
      <h1 className="text-[1.7rem] leading-tight font-semibold tracking-tight">{title}</h1>
      {lede ? <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{lede}</p> : null}
    </header>
  )
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn('rounded-2xl border bg-card p-4', className)}>{children}</section>
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint ? <span className="text-sm leading-snug text-muted-foreground">{hint}</span> : null}
    </label>
  )
}

export function ScoreBar({ value, label }: { value: number | null; label?: string }) {
  if (value == null) {
    return <span className="text-sm font-medium">a avaliar</span>
  }
  const color = SCORE_FILL[value] ?? '#1C1B19'
  return (
    <span className="inline-flex items-center gap-2" role="img" aria-label={`${label ? `${label}: ` : ''}nota ${value} de 5`}>
      <span className="inline-flex gap-1" aria-hidden>
        {[1, 2, 3, 4, 5].map((step) => (
          <span
            key={step}
            className="h-3 w-5 rounded-sm"
            style={{ background: step <= value ? color : '#E4DFD4' }}
          />
        ))}
      </span>
      <span className="min-w-4 text-base font-semibold tabular-nums">{value}</span>
    </span>
  )
}

export function ScoreEditor({
  label,
  hint,
  value,
  onChange,
  clearLabel = 'a avaliar',
}: {
  label: string
  hint?: string
  value: Score | null
  onChange: (value: Score | null) => void
  clearLabel?: string
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">{label}</span>
        <ScoreBar value={value} label={label} />
      </div>
      {hint ? <p className="text-sm leading-snug text-muted-foreground">{hint}</p> : null}
      <div role="group" aria-label={label} className="flex flex-wrap gap-2">
        {([1, 2, 3, 4, 5] as Score[]).map((score) => (
          <button
            key={score}
            type="button"
            aria-pressed={value === score}
            onClick={() => onChange(score)}
            className={`min-h-11 min-w-11 rounded-xl border text-base font-semibold ${value === score ? 'border-foreground bg-foreground text-background' : 'bg-card'}`}
          >
            {score}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={value == null}
          onClick={() => onChange(null)}
          className={`min-h-11 rounded-xl border px-3 text-sm font-medium ${value == null ? 'border-foreground bg-foreground text-background' : 'bg-card'}`}
        >
          {clearLabel}
        </button>
      </div>
    </div>
  )
}

const STATUS_LABEL: Record<FormatStatus, string> = {
  catalogo: 'No catálogo',
  teste: 'Em teste',
  rebaixado: 'Rebaixado',
}

export function StatusBadge({ status }: { status: FormatStatus }) {
  return (
    <span className="inline-flex min-h-7 items-center rounded-full border px-2.5 text-xs font-semibold">
      {STATUS_LABEL[status]}
    </span>
  )
}

const SEAL_STYLE: Record<SealId, string> = {
  testar: 'bg-[#E7F0FA] text-[#1A3E66]',
  produzir: 'bg-[#E5F4EA] text-[#0E5C32]',
  ramificar: 'bg-[#FDEEDD] text-[#8A3E0B]',
  arquivar: 'bg-[#F8E6E4] text-[#8C241C]',
  avaliar: 'bg-[#EFEBE3] text-[#1C1B19]',
  nenhum: 'bg-[#EFEBE3] text-[#1C1B19]',
}

export function SealBadge({ seal }: { seal: SealId }) {
  return (
    <span className={`inline-flex min-h-7 items-center rounded-full px-2.5 text-xs font-semibold ${SEAL_STYLE[seal]}`}>
      {SEAL_LABEL[seal]}
    </span>
  )
}

const MARK_STYLE: Record<AverageMark, string> = {
  acima: 'bg-[#E5F4EA] text-[#0E5C32]',
  abaixo: 'bg-[#F8E6E4] text-[#8C241C]',
  na_media: 'bg-[#EFEBE3] text-[#1C1B19]',
  sem_views: 'bg-[#EFEBE3] text-[#1C1B19]',
  sem_media: 'bg-[#EFEBE3] text-[#1C1B19]',
}

const MARK_LABEL: Record<AverageMark, string> = {
  acima: 'Acima da média',
  abaixo: 'Abaixo da média',
  na_media: 'Na média',
  sem_views: 'Sem views nesse prazo',
  sem_media: 'Média não configurada',
}

export function AverageBadge({ mark }: { mark: AverageMark }) {
  return <span className={`inline-flex min-h-7 items-center rounded-full px-2.5 text-xs font-semibold ${MARK_STYLE[mark]}`}>{MARK_LABEL[mark]}</span>
}

export function Portrait({ image, icon, className }: { image: string | null; icon: string; className?: string }) {
  if (image) return <img src={image} alt="" className={cn('object-cover', className)} />
  return (
    <span className={cn('grid place-items-center bg-muted text-foreground', className)}>
      <AppIcon name={icon} className="size-7" />
    </span>
  )
}

export function selectClass() {
  return 'h-11 min-h-11 w-full rounded-xl border border-input bg-card px-3 text-base'
}
