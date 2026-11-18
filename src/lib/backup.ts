import { PHASES } from '@/data/facts'
import { normalizeImports } from '@/lib/imports'
import { emptyIdea, seedSteps } from '@/data/seed'
import type { WatchItem } from '@/lib/radar'
import type {
  AppState,
  AverageBasis,
  Character,
  Criteria,
  ElementId,
  ElementMark,
  FormatItem,
  FormatStatus,
  IdeaDraft,
  Score,
  Step,
  Video,
} from '@/types'

const ELEMENT_IDS: ElementId[] = ['segundos', 'personagem', 'musica', 'frames', 'capa', 'parada']

function markOf(value: unknown): ElementMark {
  return value === 'ok' || value === 'warn' || value === 'bad' ? value : null
}

function normalizeIdea(value: unknown): IdeaDraft {
  const base = emptyIdea()
  if (!value || typeof value !== 'object') return base
  const idea = value as Partial<IdeaDraft>
  const elements = { ...base.elements }
  if (idea.elements) {
    for (const id of ELEMENT_IDS) elements[id] = markOf(idea.elements[id])
  }
  const phases = PHASES.map((_, index) => {
    const phase = Array.isArray(idea.phases) ? idea.phases[index] : undefined
    return {
      scene: typeof phase?.scene === 'string' ? phase.scene : '',
      seconds: typeof phase?.seconds === 'string' ? phase.seconds : '',
    }
  })
  const tags = Array.isArray(idea.hashtags) ? idea.hashtags : []
  return {
    elements,
    formatId: typeof idea.formatId === 'string' ? idea.formatId : '',
    characterId: typeof idea.characterId === 'string' ? idea.characterId : '',
    phases,
    action: typeof idea.action === 'string' ? idea.action : '',
    keyword: typeof idea.keyword === 'string' ? idea.keyword : '',
    title: typeof idea.title === 'string' ? idea.title : '',
    titleTouched: Boolean(idea.titleTouched),
    hashtags: [
      typeof tags[0] === 'string' ? tags[0] : '',
      typeof tags[1] === 'string' ? tags[1] : '',
      typeof tags[2] === 'string' ? tags[2] : '',
    ],
  }
}

const STATUSES: FormatStatus[] = ['catalogo', 'teste', 'rebaixado']
const SCORES = [1, 2, 3, 4, 5]

function isScore(value: unknown): value is Score | null {
  return value == null || (typeof value === 'number' && SCORES.includes(value))
}

function criteriaOf(value: unknown): Criteria {
  const raw = (value ?? {}) as Partial<Criteria>
  const pick = (key: keyof Criteria) => (isScore(raw[key]) ? raw[key] : null)
  return {
    dificuldade: pick('dificuldade'),
    materiais: pick('materiais'),
    tempo: pick('tempo'),
    resultado: pick('resultado'),
    reaproveitamento: pick('reaproveitamento'),
    validacao: pick('validacao'),
  }
}

function statusOf(value: unknown): FormatStatus {
  return STATUSES.includes(value as FormatStatus) ? (value as FormatStatus) : 'catalogo'
}

export function normalizeState(input: unknown): AppState {
  if (!input || typeof input !== 'object') throw new Error('O arquivo não é um backup da Esteira Viral.')
  const raw = input as Partial<AppState>
  if (!Array.isArray(raw.formats) || !Array.isArray(raw.characters) || !Array.isArray(raw.videos)) {
    throw new Error('O arquivo não tem formatos, personagens e vídeos.')
  }

  const formats: FormatItem[] = raw.formats.map((item) => {
    const format = item as Partial<FormatItem>
    if (!format || typeof format.id !== 'string' || typeof format.name !== 'string') {
      throw new Error('Um formato do backup está incompleto.')
    }
    const status = statusOf(format.status)
    return {
      id: format.id,
      number: typeof format.number === 'number' ? format.number : null,
      priority: typeof format.priority === 'number' ? format.priority : null,
      name: format.name,
      summary: typeof format.summary === 'string' ? format.summary : '',
      detail: typeof format.detail === 'string' ? format.detail : '',
      sequence: typeof format.sequence === 'string' ? format.sequence : '',
      status,
      origin: statusOf(format.origin ?? status),
      statusNote: typeof format.statusNote === 'string' ? format.statusNote : '',
      criteria: criteriaOf(format.criteria),
      icon: typeof format.icon === 'string' ? format.icon : 'CircleDot',
      image: typeof format.image === 'string' ? format.image : null,
    }
  })

  const characters: Character[] = raw.characters.map((item) => {
    const character = item as Partial<Character>
    if (!character || typeof character.id !== 'string' || typeof character.name !== 'string') {
      throw new Error('Um personagem do backup está incompleto.')
    }
    const internal = character.internal === 'nao_testado' || isScore(character.internal) ? character.internal : 'nao_testado'
    return {
      id: character.id,
      name: character.name,
      fromNotebook: Boolean(character.fromNotebook),
      notebookRank: typeof character.notebookRank === 'number' ? character.notebookRank : 99,
      notebookNote: typeof character.notebookNote === 'string' ? character.notebookNote : '',
      extraNote: typeof character.extraNote === 'string' ? character.extraNote : '',
      external: isScore(character.external) ? character.external : null,
      internal: internal ?? 'nao_testado',
      window: character.window === 'evergreen' || character.window === 'sazonal' ? character.window : null,
      windowEnd: typeof character.windowEnd === 'string' ? character.windowEnd : null,
      fit: typeof character.fit === 'number' ? character.fit : null,
      helmetCost: isScore(character.helmetCost) ? character.helmetCost : null,
      helmetReady: Boolean(character.helmetReady),
      icon: typeof character.icon === 'string' ? character.icon : 'User',
      image: typeof character.image === 'string' ? character.image : null,
    }
  })

  const videos: Video[] = raw.videos.map((item) => {
    const video = item as Partial<Video>
    if (!video || typeof video.id !== 'string' || typeof video.title !== 'string') {
      throw new Error('Um vídeo do backup está incompleto.')
    }
    const num = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : null)
    return {
      id: video.id,
      createdAt: typeof video.createdAt === 'string' ? video.createdAt : new Date().toISOString(),
      date: typeof video.date === 'string' ? video.date : '',
      title: video.title,
      formatId: typeof video.formatId === 'string' ? video.formatId : '',
      characterId: typeof video.characterId === 'string' ? video.characterId : '',
      durationSec: num(video.durationSec),
      views48h: num(video.views48h),
      views7d: num(video.views7d),
      apv: num(video.apv),
      viewed: num(video.viewed),
      subscribers: num(video.subscribers),
      searchPct: num(video.searchPct),
      lesson: typeof video.lesson === 'string' ? video.lesson : '',
      formatStatus: statusOf(video.formatStatus),
      youtubeId: typeof video.youtubeId === 'string' && video.youtubeId ? video.youtubeId : null,
    }
  })

  const steps: Step[] = Array.isArray(raw.steps)
    ? raw.steps.map((item, index) => {
        const step = item as Partial<Step>
        const fallback = seedSteps[index]
        return {
          id: typeof step?.id === 'string' ? step.id : fallback?.id ?? `step-${index}`,
          order: typeof step?.order === 'number' ? step.order : index + 1,
          title: typeof step?.title === 'string' ? step.title : fallback?.title ?? 'Etapa',
          detail: typeof step?.detail === 'string' ? step.detail : fallback?.detail ?? '',
          icon: typeof step?.icon === 'string' ? step.icon : fallback?.icon ?? 'CircleDot',
          image: typeof step?.image === 'string' ? step.image : null,
        }
      })
    : seedSteps

  const basis: AverageBasis = raw.settings?.averageBasis === '7d' ? '7d' : '48h'
  const average = raw.settings?.channelAverage
  const ideaDraft = normalizeIdea(raw.ideaDraft)

  return {
    formats,
    characters,
    videos,
    steps,
    settings: {
      channelAverage: typeof average === 'number' && Number.isFinite(average) ? average : null,
      averageBasis: basis,
    },
    ideaDraft,
    imports: normalizeImports(raw.imports),
  }
}

export function buildBackup(state: AppState, options?: { exportedAt?: string; watchlist?: WatchItem[] | null }) {
  const payload: Record<string, unknown> = {
    version: 1,
    exportedAt: options?.exportedAt ?? new Date().toISOString(),
    formats: state.formats,
    characters: state.characters,
    videos: state.videos,
    steps: state.steps,
    settings: state.settings,
    ideaDraft: state.ideaDraft,
    imports: state.imports,
  }
  if (options?.watchlist?.length) payload.radarWatchlist = options.watchlist
  return payload
}
