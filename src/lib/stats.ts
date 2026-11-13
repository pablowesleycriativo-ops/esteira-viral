import { latestMetric } from '@/lib/decision'
import { metricViews } from '@/lib/scores'
import type { Character, Settings, Video } from '@/types'

export function formatPerformance(formatId: string, videos: Video[], settings: Settings) {
  const list = videos.filter((video) => video.formatId === formatId)
  const compared = list.filter((video) => metricViews(video, settings.averageBasis) != null)
  const above =
    settings.channelAverage == null
      ? null
      : compared.filter((video) => (metricViews(video, settings.averageBasis) ?? 0) > (settings.channelAverage ?? 0)).length
  return { total: list.length, compared: compared.length, above }
}

export function rankCharacters(
  characters: Character[],
  videos: Video[],
  settings: Settings,
  mode: 'caderno' | 'videos',
): Character[] {
  const notebook = [...characters].sort((a, b) => a.notebookRank - b.notebookRank || a.name.localeCompare(b.name, 'pt'))
  if (mode === 'caderno') return notebook
  const scored = notebook.map((character) => {
    const own = videos.filter((video) => video.characterId === character.id)
    return { character, views: latestMetric(own, settings.averageBasis)?.views ?? null }
  })
  if (!scored.some((item) => item.views != null)) return notebook
  return scored
    .sort((a, b) => {
      if (a.views == null && b.views == null) return a.character.notebookRank - b.character.notebookRank
      if (a.views == null) return 1
      if (b.views == null) return -1
      if (a.views !== b.views) return b.views - a.views
      return a.character.notebookRank - b.character.notebookRank
    })
    .map((item) => item.character)
}

export function hasVideoMetrics(videos: Video[], basis: Settings['averageBasis']): boolean {
  return videos.some((video) => metricViews(video, basis) != null)
}
