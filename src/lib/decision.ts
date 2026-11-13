import { DIAGNOSIS_ROWS } from '@/data/facts'
import { averageMark, metricViews } from '@/lib/scores'
import type { AverageBasis, Character, FormatItem, Settings, Video } from '@/types'

export type SealId = 'testar' | 'produzir' | 'ramificar' | 'arquivar' | 'avaliar' | 'nenhum'

export type Finding = {
  symptom: string
  diagnosis: string
  solution: string
}

export type Decision = {
  seal: SealId
  reasons: string[]
  testedFormats: number
  failedFormats: number
  succeededFormats: number
  canJudge: boolean
  resultFalling: boolean | null
  failedNames: string[]
  succeededNames: string[]
}

function daysUntil(iso: string, today: string): number | null {
  const [ay, am, ad] = iso.split('-').map(Number)
  const [by, bm, bd] = today.split('-').map(Number)
  if (!ay || !am || !ad || !by || !bm || !bd) return null
  const a = Date.UTC(ay, am - 1, ad)
  const b = Date.UTC(by, bm - 1, bd)
  return Math.round((a - b) / 86400000)
}

export function latestMetric(videos: Video[], basis: AverageBasis): { video: Video; views: number } | null {
  const withViews = videos
    .map((video) => ({ video, views: metricViews(video, basis) }))
    .filter((item): item is { video: Video; views: number } => item.views != null)
    .sort((a, b) => {
      if (a.video.date !== b.video.date) return a.video.date < b.video.date ? 1 : -1
      return a.video.createdAt < b.video.createdAt ? 1 : -1
    })
  return withViews[0] ?? null
}

export function resultIsFalling(videos: Video[], settings: Settings): boolean | null {
  if (settings.channelAverage == null) return null
  const ordered = videos
    .map((video) => ({ video, views: metricViews(video, settings.averageBasis) }))
    .filter((item): item is { video: Video; views: number } => item.views != null)
    .sort((a, b) => {
      if (a.video.date !== b.video.date) return a.video.date < b.video.date ? -1 : 1
      return a.video.createdAt < b.video.createdAt ? -1 : 1
    })
  if (ordered.length < 2) return null
  const prev = ordered[ordered.length - 2]
  const last = ordered[ordered.length - 1]
  return last.views < prev.views && last.views < settings.channelAverage
}

export function decideCharacter(
  character: Character,
  videos: Video[],
  formats: FormatItem[],
  settings: Settings,
  today: string,
): Decision {
  const own = videos.filter((video) => video.characterId === character.id)
  const byFormat = new Map<string, Video[]>()
  for (const video of own) {
    const list = byFormat.get(video.formatId) ?? []
    list.push(video)
    byFormat.set(video.formatId, list)
  }

  const canJudge = settings.channelAverage != null
  const failedNames: string[] = []
  const succeededNames: string[] = []
  if (canJudge) {
    for (const [formatId, list] of byFormat) {
      const marks = list.map((video) => averageMark(video, settings.channelAverage, settings.averageBasis))
      const comparable = marks.filter((mark) => mark === 'acima' || mark === 'abaixo' || mark === 'na_media')
      if (comparable.length === 0) continue
      const name = formats.find((format) => format.id === formatId)?.name ?? 'Formato'
      if (comparable.some((mark) => mark === 'acima')) succeededNames.push(name)
      else failedNames.push(name)
    }
  }

  const falling = resultIsFalling(own, settings)
  const endDays = character.window === 'sazonal' && character.windowEnd ? daysUntil(character.windowEnd, today) : null
  const windowEnding = character.window === 'sazonal' && endDays != null && endDays <= 7
  const windowOk = character.window === 'evergreen' || (character.window === 'sazonal' && endDays != null && endDays >= 28)
  const internalAbove = typeof character.internal === 'number' && character.internal >= 4
  const externalHigh = character.external != null && character.external >= 4
  const fitOk = character.fit != null && character.fit >= 3

  let seal: SealId = 'avaliar'
  const reasons: string[] = []

  if (failedNames.length >= 3) {
    seal = 'arquivar'
    reasons.push('Falhou em 3 formatos — provavelmente é o personagem; voltar à pesquisa.')
  } else if (windowEnding) {
    seal = 'arquivar'
    reasons.push('Janela sazonal acabando (7 dias ou menos, ou já passou).')
  } else if (character.helmetReady && falling === true) {
    seal = 'ramificar'
    reasons.push('Capacete pronto e o resultado caiu: o vídeo mais recente ficou abaixo do anterior e abaixo da média.')
  } else if (internalAbove && windowOk && fitOk && !character.helmetReady) {
    seal = 'produzir'
    reasons.push('Sinal interno alto, janela evergreen ou com cerca de 4 semanas, e encaixe em 3 ou mais formatos. Produzir o capacete e escalar.')
  } else if (externalHigh && character.internal === 'nao_testado') {
    seal = 'testar'
    reasons.push('Sinal externo alto e sem teste interno. Desenho simples, sem capacete.')
  } else if (
    character.external != null &&
    character.window != null &&
    character.fit != null &&
    !(character.window === 'sazonal' && !character.windowEnd)
  ) {
    seal = 'nenhum'
    reasons.push('Nenhuma das quatro regras fecha com estes dados.')
    if (character.helmetReady && falling === null) {
      reasons.push('O capacete está pronto. Ainda não dá para saber se o resultado está caindo.')
    }
  } else {
    const missing: string[] = []
    if (character.external == null) missing.push('sinal externo')
    if (character.window == null) missing.push('janela')
    if (character.window === 'sazonal' && !character.windowEnd) missing.push('data de fim da janela')
    if (character.fit == null) missing.push('encaixe')
    reasons.push(
      missing.length
        ? `Ainda falta: ${missing.join(', ')}.`
        : 'Ainda não há regra fechada.',
    )
  }

  return {
    seal,
    reasons,
    testedFormats: byFormat.size,
    failedFormats: failedNames.length,
    succeededFormats: succeededNames.length,
    canJudge,
    resultFalling: falling,
    failedNames,
    succeededNames,
  }
}

export function diagnose(video: Video): { findings: Finding[]; unchecked: Finding[] } {
  const findings: Finding[] = []
  if (video.apv != null && video.apv < 50) findings.push(DIAGNOSIS_ROWS[0])

  const views = Math.max(video.views48h ?? 0, video.views7d ?? 0)
  const hasViews = video.views48h != null || video.views7d != null
  if (hasViews && views >= 1000 && video.subscribers != null && video.subscribers / views < 0.005) {
    findings.push(DIAGNOSIS_ROWS[2])
  }
  if (video.searchPct != null && video.searchPct < 30) findings.push(DIAGNOSIS_ROWS[4])

  return {
    findings,
    unchecked: [DIAGNOSIS_ROWS[1], DIAGNOSIS_ROWS[3]],
  }
}

export function branchTargets(currentId: string, formats: FormatItem[]): FormatItem[] {
  return formats
    .filter((format) => format.id !== currentId && format.status === 'catalogo')
    .sort((a, b) => {
      const ar = a.criteria.reaproveitamento ?? -1
      const br = b.criteria.reaproveitamento ?? -1
      if (ar !== br) return br - ar
      return (a.number ?? 99) - (b.number ?? 99)
    })
    .slice(0, 4)
}

export const SEAL_LABEL: Record<SealId, string> = {
  testar: 'Testar barato',
  produzir: 'Produzir capacete',
  ramificar: 'Ramificar',
  arquivar: 'Arquivar',
  avaliar: 'A avaliar',
  nenhum: 'Sem selo',
}

export const MODE_RULES: { id: SealId; text: string }[] = [
  { id: 'testar', text: 'Externo alto, sem teste → desenho simples (teste barato).' },
  {
    id: 'produzir',
    text: 'Interno acima da média + janela de cerca de 4 semanas ou evergreen + encaixe em 3 ou mais formatos → produzir capacete e escalar.',
  },
  { id: 'ramificar', text: 'Capacete pronto e resultado caindo → ramificação.' },
  { id: 'arquivar', text: 'Falhou em 3 formatos ou janela acabando → arquivar.' },
]
