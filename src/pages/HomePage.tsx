import { Link } from 'react-router-dom'
import { TriangleAlert } from 'lucide-react'
import { FORMULA, TEST_HOWTO } from '@/data/facts'
import { formatDecimal, todayISO } from '@/lib/format'
import { formatWeek, weekBalance } from '@/lib/week'
import { criteriaAverage } from '@/lib/scores'
import { decideCharacter } from '@/lib/decision'
import { hasVideoMetrics, rankCharacters } from '@/lib/stats'
import { useApp } from '@/state/store'
import { Card, Portrait, SealBadge, StatusBadge } from '@/components/bits'

export function HomePage() {
  const { state } = useApp()
  const now = new Date()
  const balance = weekBalance(state.videos, now)
  const mode = hasVideoMetrics(state.videos, state.settings.averageBasis) ? 'videos' : 'caderno'
  const top = rankCharacters(state.characters, state.videos, state.settings, mode).slice(0, 3)
  const tests = state.formats.filter((format) => format.status === 'teste').sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99))
  const today = todayISO(now)
  const dateLabel = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(now)

  return (
    <div className="flex flex-col gap-4">
      <header>
        <p className="text-sm text-muted-foreground">{dateLabel}</p>
        <h1 className="mt-1 text-[1.7rem] leading-tight font-semibold">Semana de {formatWeek(now)}</h1>
        <p className="mt-2 text-sm leading-relaxed">{FORMULA}</p>
      </header>

      <Card>
        <p className="text-sm text-muted-foreground">Vídeos registrados nesta semana</p>
        <p className="font-heading text-5xl font-semibold">{balance.total}</p>
        <p className="text-sm text-muted-foreground">Na fase de teste, cerca de 12 por semana.</p>
        {balance.weekVideos.length ? (
          <ul className="mt-3 flex flex-col gap-2">
            {balance.weekVideos.map((video) => (
              <li key={video.id}>
                <Link to={`/videos/${video.id}`} className="block min-h-11 text-sm font-medium underline">
                  {video.title}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm">Nenhum vídeo nesta semana. O placar de 12/nov continua valendo.</p>
        )}
        <Link to="/videos/novo" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold underline">
          Registrar vídeo
        </Link>
      </Card>

      <Balance alert={balance.alert} tests={balance.tests} total={balance.total} />

      <section>
        <h2 className="mb-2 text-lg font-semibold">Topo do placar</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          {mode === 'caderno' ? 'Ordem do caderno de 12/nov.' : 'Ordem pelos vídeos com views.'}
        </p>
        <div className="flex flex-col gap-2">
          {top.map((character, index) => {
            const decision = decideCharacter(character, state.videos, state.formats, state.settings, today)
            return (
              <Link key={character.id} to={`/personagens/${character.id}`} className="flex items-center gap-3 rounded-2xl border bg-card p-3">
                <Portrait image={character.image} icon={character.icon} className="size-12 rounded-xl" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-muted-foreground">{index + 1}</span>
                  <span className="block font-semibold">{character.name}</span>
                  {character.notebookNote ? <span className="block text-sm text-muted-foreground">{character.notebookNote}</span> : null}
                </span>
                <SealBadge seal={decision.seal} />
              </Link>
            )
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Formatos em teste</h2>
        <div className="flex flex-col gap-2">
          {tests.length === 0 ? <p className="text-sm">Nenhum formato em teste.</p> : null}
          {tests.map((format) => {
            const average = criteriaAverage(format.criteria)
            return (
              <Link key={format.id} to={`/formatos/${format.id}`} className="rounded-2xl border bg-card p-4">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">Prioridade {format.priority}</span>
                  <StatusBadge status={format.status} />
                </span>
                <span className="mt-1 block font-semibold">{format.name}</span>
                <span className="mt-1 block text-sm text-muted-foreground">{format.statusNote || format.summary}</span>
                <span className="mt-2 block text-sm">Média {average == null ? 'a avaliar' : formatDecimal(average)}</span>
              </Link>
            )
          })}
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{TEST_HOWTO}</p>
      </section>
    </div>
  )
}

function Balance({ alert, tests, total }: { alert: string; tests: number; total: number }) {
  if (alert === 'vazio') return null
  const share = total === 0 ? 0 : Math.round((tests / total) * 100)
  if (alert === 'ok') {
    return (
      <p className="rounded-2xl border bg-card p-4 text-sm leading-relaxed" role="status">
        Equilíbrio da semana: {tests} de {total} vídeos em teste ({share}%). Não passou de 30%.
      </p>
    )
  }
  const text =
    alert === 'zero'
      ? 'Repetição sem teste. Nenhum vídeo desta semana está num formato em teste. A maior parte fica no que já funciona, e uma parte menor vai para testes — cerca de 2 a 3 por semana.'
      : `Novidade demais. Os testes são ${share}% da semana, acima de 30%. A maior parte fica no que já funciona.`
  return (
    <p className="flex gap-3 rounded-2xl border border-[#E7C7A1] bg-[#FDEEDD] p-4 text-sm leading-relaxed text-[#1C1B19]" role="status">
      <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
      <span>{text}</span>
    </p>
  )
}
