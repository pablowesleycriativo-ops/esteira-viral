import { Link } from 'react-router-dom'
import { formatDate } from '@/lib/format'
import { averageMark } from '@/lib/scores'
import { useApp } from '@/state/store'
import { AverageBadge, PageIntro } from '@/components/bits'
import { Button } from '@/components/ui/button'

export function VideosPage() {
  const { state } = useApp()
  const videos = [...state.videos].sort((a, b) => (a.date === b.date ? (a.createdAt < b.createdAt ? 1 : -1) : a.date < b.date ? 1 : -1))

  return (
    <div className="flex flex-col gap-4">
      <PageIntro
        title="Vídeos"
        lede="Diário do que foi publicado. Ao salvar, o placar e a conta do formato são recalculados. O caderno de 13/nov não trazia vídeos com números."
      />
      <Button asChild>
        <Link to="/videos/novo">Registrar vídeo</Link>
      </Button>
      {videos.length === 0 ? (
        <p className="rounded-2xl border bg-card p-4 text-sm leading-relaxed">
          O diário está vazio. O placar de 12/nov continua valendo até entrar um vídeo com views.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {videos.map((video) => {
            const format = state.formats.find((item) => item.id === video.formatId)
            const character = state.characters.find((item) => item.id === video.characterId)
            return (
              <li key={video.id}>
                <Link to={`/videos/${video.id}`} className="block rounded-2xl border bg-card p-4">
                  <span className="text-sm text-muted-foreground">{formatDate(video.date)}</span>
                  <span className="mt-1 block text-lg font-semibold leading-snug">{video.title}</span>
                  <span className="mt-1 block text-sm">
                    {format?.name ?? 'Formato'} · {character?.name ?? 'Personagem'}
                  </span>
                  <span className="mt-2 inline-flex">
                    <AverageBadge mark={averageMark(video, state.settings.channelAverage, state.settings.averageBasis)} />
                  </span>
                  {video.lesson ? <span className="mt-2 block text-sm leading-relaxed">{video.lesson}</span> : null}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
