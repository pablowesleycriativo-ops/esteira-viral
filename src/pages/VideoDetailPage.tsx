import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { branchTargets, diagnose } from '@/lib/decision'
import { formatDate, formatInt, formatPct } from '@/lib/format'
import { averageMark } from '@/lib/scores'
import { useApp } from '@/state/store'
import { AverageBadge, BackLink, Card } from '@/components/bits'
import { Button } from '@/components/ui/button'

export function VideoDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { state, deleteVideo } = useApp()
  const [confirm, setConfirm] = useState(false)
  const video = state.videos.find((item) => item.id === id)
  if (!video) {
    return (
      <div>
        <BackLink to="/videos">Vídeos</BackLink>
        <p>Esse vídeo não está no diário.</p>
      </div>
    )
  }

  const format = state.formats.find((item) => item.id === video.formatId)
  const character = state.characters.find((item) => item.id === video.characterId)
  const mark = averageMark(video, state.settings.channelAverage, state.settings.averageBasis)
  const basis = state.settings.averageBasis === '48h' ? '48 horas' : '7 dias'
  const { findings, unchecked } = diagnose(video)
  const views = Math.max(video.views48h ?? 0, video.views7d ?? 0)
  const hasViews = video.views48h != null || video.views7d != null
  const targets = format ? branchTargets(format.id, state.formats) : []
  const suggest = mark === 'abaixo' || mark === 'na_media'

  return (
    <div className="flex flex-col gap-4">
      <BackLink to="/videos">Vídeos</BackLink>
      <p className="text-sm text-muted-foreground">{formatDate(video.date)}</p>
      <h1 className="text-[1.7rem] leading-tight font-semibold">{video.title}</h1>
      <p className="text-sm">
        {format ? <Link className="underline" to={`/formatos/${format.id}`}>{format.name}</Link> : 'Formato'}
        {' · '}
        {character ? <Link className="underline" to={`/personagens/${character.id}`}>{character.name}</Link> : 'Personagem'}
      </p>
      <AverageBadge mark={mark} />
      <p className="text-sm text-muted-foreground">
        A comparação usa views em {basis}
        {state.settings.channelAverage == null ? '. Defina a média em Ajustes.' : `: média ${formatInt(state.settings.channelAverage)}.`}
      </p>

      <Card>
        <h2 className="text-lg font-semibold">Números</h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <Metric label="Duração" value={video.durationSec == null ? '—' : `${formatInt(video.durationSec)}s`} />
          <Metric label="Views 48h" value={video.views48h == null ? '—' : formatInt(video.views48h)} />
          <Metric label="Views 7 dias" value={video.views7d == null ? '—' : formatInt(video.views7d)} />
          <Metric label="APV" value={video.apv == null ? '—' : formatPct(video.apv)} />
          <Metric label="Viewed vs swiped" value={video.viewed == null ? '—' : formatPct(video.viewed)} />
          <Metric label="Inscritos" value={video.subscribers == null ? '—' : formatInt(video.subscribers)} />
          <Metric label="% de busca" value={video.searchPct == null ? '—' : formatPct(video.searchPct)} />
        </dl>
        {video.durationSec != null && video.durationSec > 30 ? (
          <p className="mt-3 text-sm leading-relaxed">Raramente passa de 30s. 30–90s está em exploração, com meta de retenção 50%+.</p>
        ) : null}
      </Card>

      <Card>
        <h2 className="text-lg font-semibold">Vs metas</h2>
        <ul className="mt-2 flex flex-col gap-2 text-sm">
          <li>APV 70%+: {flag(video.apv, (value) => value >= 70)}{video.apv != null && video.apv > 100 ? ' Loop.' : ''}</li>
          <li>Viewed 80%+ é excelente: {flag(video.viewed, (value) => value >= 80)}</li>
          <li>Busca 30%+: {flag(video.searchPct, (value) => value >= 30)}</li>
          <li>
            Inscritos 0,5%+ por 1.000 views:{' '}
            {!hasViews || video.subscribers == null
              ? 'sem número'
              : views < 1000
                ? 'amostra abaixo de 1.000 views'
                : video.subscribers / views >= 0.005
                  ? 'bateu'
                  : 'não bateu'}
          </li>
        </ul>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold">Diagnóstico</h2>
        {findings.length === 0 ? (
          <p className="mt-2 text-sm">Nenhum sintoma da tabela com os números preenchidos.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {findings.map((item) => (
              <li key={item.symptom} className="rounded-xl border p-3 text-sm leading-relaxed">
                <p className="font-semibold">{item.symptom}</p>
                <p className="mt-1">{item.diagnosis}</p>
                <p className="mt-1">{item.solution}</p>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          O caderno também olha estes casos, mas o formulário não pede os dados: {unchecked.map((item) => item.symptom).join('; ')}.
        </p>
      </Card>

      {suggest && format ? (
        <Card>
          <h2 className="text-lg font-semibold">Ramificação</h2>
          <p className="mt-2 text-sm leading-relaxed">
            Não performou → a mesma ideia em outro formato, priorizando os de maior reaproveitamento.
          </p>
          <ul className="mt-2 flex flex-col gap-2">
            {targets.map((item) => (
              <li key={item.id}>
                <Link to={`/formatos/${item.id}`} className="flex min-h-11 items-center justify-between rounded-xl border px-3 text-sm">
                  <span>{item.name}</span>
                  <span>Reapr. {item.criteria.reaproveitamento ?? '—'}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card>
        <h2 className="text-lg font-semibold">Lição</h2>
        <p className="mt-2 text-sm leading-relaxed">{video.lesson || 'Sem lição.'}</p>
      </Card>

      <Button asChild>
        <Link to={`/videos/${video.id}/editar`}>Editar</Link>
      </Button>
      {confirm ? (
        <Card>
          <p className="text-sm">Apagar este vídeo do diário?</p>
          <div className="mt-3 flex gap-2">
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                deleteVideo(video.id)
                navigate('/videos')
              }}
            >
              Apagar
            </Button>
            <Button type="button" variant="outline" onClick={() => setConfirm(false)}>
              Cancelar
            </Button>
          </div>
        </Card>
      ) : (
        <Button type="button" variant="outline" onClick={() => setConfirm(true)}>
          Apagar vídeo
        </Button>
      )}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  )
}

function flag(value: number | null, ok: (value: number) => boolean) {
  if (value == null) return 'sem número'
  return ok(value) ? 'bateu' : 'não bateu'
}
