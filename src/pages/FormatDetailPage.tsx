import { Link, useParams } from 'react-router-dom'
import { CRITERIA, PHASES } from '@/data/facts'
import { formatDate, formatDecimal } from '@/lib/format'
import { criteriaAverage } from '@/lib/scores'
import { formatPerformance } from '@/lib/stats'
import { useApp } from '@/state/store'
import { AverageBadge, BackLink, Card, PageIntro, ScoreEditor, StatusBadge } from '@/components/bits'
import { IconPicker } from '@/components/IconPicker'
import { ImageWell } from '@/components/ImageWell'
import { Button } from '@/components/ui/button'
import { averageMark } from '@/lib/scores'

export function FormatDetailPage() {
  const { id } = useParams()
  const { state, updateFormat, setCriterion, promoteFormat, demoteFormat } = useApp()
  const format = state.formats.find((item) => item.id === id)
  if (!format) {
    return (
      <div>
        <BackLink to="/formatos">Formatos</BackLink>
        <p>Esse formato não está no caderno.</p>
      </div>
    )
  }

  const average = criteriaAverage(format.criteria)
  const videos = state.videos
    .filter((video) => video.formatId === format.id)
    .sort((a, b) => (a.date === b.date ? (a.createdAt < b.createdAt ? 1 : -1) : a.date < b.date ? 1 : -1))
  const stats = formatPerformance(format.id, state.videos, state.settings)
  const count = stats.total

  return (
    <div className="flex flex-col gap-4">
      <BackLink to="/formatos">Formatos</BackLink>
      <div className="flex items-center gap-2">
        <StatusBadge status={format.status} />
        {format.number != null ? <span className="text-sm font-semibold">#{format.number}</span> : null}
        {format.priority != null ? <span className="text-sm font-semibold">Prioridade {format.priority}</span> : null}
      </div>
      <PageIntro title={format.name} />
      <ImageWell image={format.image} onImage={(image) => updateFormat(format.id, { image })} />
      <IconPicker value={format.icon} onChange={(icon) => updateFormat(format.id, { icon })} />
      <Card>
        <h2 className="text-lg font-semibold">Descrição</h2>
        <p className="mt-2 text-sm leading-relaxed">{format.detail || format.summary || 'Sem descrição no caderno.'}</p>
        {format.statusNote ? <p className="mt-2 text-sm font-medium">{format.statusNote}</p> : null}
        <p className="mt-3 text-sm">
          Média dos critérios com nota:{' '}
          <span className="font-heading text-2xl font-semibold">{average == null ? 'a avaliar' : formatDecimal(average)}</span>
        </p>
      </Card>
      <Card className="flex flex-col gap-5">
        <h2 className="text-lg font-semibold">Notas</h2>
        {CRITERIA.map((item) => (
          <ScoreEditor
            key={item.key}
            label={item.label}
            hint={item.hint}
            value={format.criteria[item.key]}
            onChange={(value) => setCriterion(format.id, item.key, value)}
          />
        ))}
      </Card>
      <Card>
        <h2 className="text-lg font-semibold">Roteiro-modelo nas 6 fases</h2>
        {format.sequence ? (
          <p className="mt-2 text-sm leading-relaxed">{format.sequence}</p>
        ) : (
          <p className="mt-2 text-sm leading-relaxed">O caderno não traz a sequência deste formato.</p>
        )}
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          O arquivo não divide este formato nas 6 fases. As cenas ficam a avaliar. A revelação é a última cena. Nenhuma cena dura mais de 2–3 segundos.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {PHASES.map((phase) => (
            <div key={phase.id} className="rounded-xl border p-3">
              <h3 className="font-semibold">{phase.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{phase.text}</p>
              <p className="mt-1 text-sm">Cena: a avaliar</p>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold">Nota real</h2>
        <p className="mt-2 text-sm leading-relaxed">Vídeos registrados neste formato: {count}.</p>
        {count < 3 ? (
          <p className="mt-2 text-sm leading-relaxed">
            Nota real: a avaliar. O caderno manda ajustar a nota com 3 ou mais registros.
          </p>
        ) : state.settings.channelAverage == null ? (
          <p className="mt-2 text-sm leading-relaxed">
            Nota real: a avaliar. Já há {count} vídeos, mas a média do canal não está em Ajustes.
          </p>
        ) : (
          <p className="mt-2 text-sm leading-relaxed">
            Nota real em 1 a 5: a avaliar. O caderno não define a conta. {stats.above} de {stats.compared} vídeos com views ficaram acima da média. Ajuste Resultado na mão se quiser.
          </p>
        )}
        <p className="mt-2 text-sm text-muted-foreground">Esta conta muda sozinha quando um vídeo é salvo.</p>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold">Vídeos neste formato</h2>
        {videos.length === 0 ? (
          <p className="mt-2 text-sm">Nenhum vídeo registrado.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {videos.map((video) => {
              const character = state.characters.find((item) => item.id === video.characterId)
              return (
                <li key={video.id}>
                  <Link to={`/videos/${video.id}`} className="flex min-h-11 flex-col rounded-xl border p-3">
                    <span className="font-medium">{video.title}</span>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(video.date)} · {character?.name ?? 'Personagem'}
                    </span>
                    <span className="mt-1">
                      <AverageBadge mark={averageMark(video, state.settings.channelAverage, state.settings.averageBasis)} />
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
      {format.status === 'teste' ? (
        <Card>
          <h2 className="text-lg font-semibold">Promover para o catálogo</h2>
          <p className="mt-2 text-sm leading-relaxed">
            O botão libera com 3 vídeos. O caderno pede 2–3 testes antes de julgar. Há {count}.
          </p>
          <Button type="button" className="mt-3 w-full" disabled={count < 3} onClick={() => promoteFormat(format.id)}>
            Promover para o catálogo
          </Button>
        </Card>
      ) : null}
      {format.origin === 'teste' && format.status === 'catalogo' ? (
        <Button type="button" variant="outline" onClick={() => demoteFormat(format.id)}>
          Devolver para teste
        </Button>
      ) : null}
    </div>
  )
}
