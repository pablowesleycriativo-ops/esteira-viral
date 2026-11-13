import { createContext, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react'
import { normalizeState } from '@/lib/backup'
import { idbGet, idbSet } from '@/lib/db'
import { seedState } from '@/data/seed'
import type { AppState, Character, CriteriaKey, FormatItem, IdeaDraft, Score, Settings, Step, Video } from '@/types'

type Action =
  | { type: 'hydrate'; state: AppState }
  | { type: 'replace'; state: AppState }
  | { type: 'patch-format'; id: string; patch: Partial<FormatItem> }
  | { type: 'set-criterion'; id: string; key: CriteriaKey; value: Score | null }
  | { type: 'promote'; id: string }
  | { type: 'demote'; id: string }
  | { type: 'patch-character'; id: string; patch: Partial<Character> }
  | { type: 'add-character'; character: Character }
  | { type: 'delete-character'; id: string }
  | { type: 'save-video'; video: Video }
  | { type: 'delete-video'; id: string }
  | { type: 'patch-step'; id: string; patch: Partial<Step> }
  | { type: 'patch-settings'; patch: Partial<Settings> }
  | { type: 'set-idea'; draft: IdeaDraft }

function reducer(state: AppState | null, action: Action): AppState | null {
  if (action.type === 'hydrate' || action.type === 'replace') return action.state
  if (!state) return state
  switch (action.type) {
    case 'patch-format':
      return { ...state, formats: state.formats.map((item) => (item.id === action.id ? { ...item, ...action.patch } : item)) }
    case 'set-criterion':
      return {
        ...state,
        formats: state.formats.map((item) =>
          item.id === action.id ? { ...item, criteria: { ...item.criteria, [action.key]: action.value } } : item,
        ),
      }
    case 'promote': {
      const count = state.videos.filter((video) => video.formatId === action.id).length
      return {
        ...state,
        formats: state.formats.map((item) =>
          item.id === action.id && item.status === 'teste' && count >= 3 ? { ...item, status: 'catalogo' } : item,
        ),
      }
    }
    case 'demote':
      return {
        ...state,
        formats: state.formats.map((item) =>
          item.id === action.id && item.origin === 'teste' ? { ...item, status: 'teste' } : item,
        ),
      }
    case 'patch-character':
      return {
        ...state,
        characters: state.characters.map((item) => (item.id === action.id ? { ...item, ...action.patch } : item)),
      }
    case 'add-character':
      return { ...state, characters: [...state.characters, action.character] }
    case 'delete-character':
      if (state.videos.some((video) => video.characterId === action.id)) return state
      return { ...state, characters: state.characters.filter((item) => item.id !== action.id) }
    case 'save-video': {
      const exists = state.videos.some((video) => video.id === action.video.id)
      return {
        ...state,
        videos: exists
          ? state.videos.map((video) => (video.id === action.video.id ? action.video : video))
          : [action.video, ...state.videos],
      }
    }
    case 'delete-video':
      return { ...state, videos: state.videos.filter((video) => video.id !== action.id) }
    case 'patch-step':
      return { ...state, steps: state.steps.map((item) => (item.id === action.id ? { ...item, ...action.patch } : item)) }
    case 'patch-settings':
      return { ...state, settings: { ...state.settings, ...action.patch } }
    case 'set-idea':
      return { ...state, ideaDraft: action.draft }
    default:
      return state
  }
}

type Api = {
  state: AppState
  error: string | null
  clearError: () => void
  updateFormat: (id: string, patch: Partial<FormatItem>) => void
  setCriterion: (id: string, key: CriteriaKey, value: Score | null) => void
  promoteFormat: (id: string) => void
  demoteFormat: (id: string) => void
  updateCharacter: (id: string, patch: Partial<Character>) => void
  addCharacter: (name: string) => void
  deleteCharacter: (id: string) => boolean
  saveVideo: (video: Video) => void
  deleteVideo: (id: string) => void
  updateStep: (id: string, patch: Partial<Step>) => void
  updateSettings: (patch: Partial<Settings>) => void
  setIdea: (draft: IdeaDraft) => void
  importBackup: (input: unknown) => string | null
}

const Ctx = createContext<Api | null>(null)

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancel = false
    idbGet<unknown>('state')
      .then((saved) => {
        if (cancel) return
        if (saved) {
          try {
            dispatch({ type: 'hydrate', state: normalizeState(saved) })
          } catch {
            dispatch({ type: 'hydrate', state: seedState() })
          }
        } else {
          dispatch({ type: 'hydrate', state: seedState() })
        }
        setReady(true)
      })
      .catch(() => {
        if (cancel) return
        dispatch({ type: 'hydrate', state: seedState() })
        setError('Não consegui abrir os dados deste aparelho. O que você fizer agora pode não ficar salvo.')
        setReady(true)
      })
    return () => {
      cancel = true
    }
  }, [])

  useEffect(() => {
    if (!ready || !state) return
    const timer = window.setTimeout(() => {
      idbSet('state', state).catch(() => setError('Não consegui salvar agora. Tente exportar um backup.'))
    }, 200)
    return () => window.clearTimeout(timer)
  }, [ready, state])

  const api = useMemo<Api | null>(() => {
    if (!state) return null
    return {
      state,
      error,
      clearError: () => setError(null),
      updateFormat: (id, patch) => dispatch({ type: 'patch-format', id, patch }),
      setCriterion: (id, key, value) => dispatch({ type: 'set-criterion', id, key, value }),
      promoteFormat: (id) => dispatch({ type: 'promote', id }),
      demoteFormat: (id) => dispatch({ type: 'demote', id }),
      updateCharacter: (id, patch) => dispatch({ type: 'patch-character', id, patch }),
      addCharacter: (name) => {
        const clean = name.trim()
        if (!clean) return
        const rank = state.characters.reduce((max, item) => Math.max(max, item.notebookRank), 0) + 1
        const character: Character = {
          id: crypto.randomUUID(),
          name: clean,
          fromNotebook: false,
          notebookRank: rank,
          notebookNote: '',
          extraNote: '',
          external: null,
          internal: 'nao_testado',
          window: null,
          windowEnd: null,
          fit: null,
          helmetCost: null,
          helmetReady: false,
          icon: 'User',
          image: null,
        }
        dispatch({ type: 'add-character', character })
      },
      deleteCharacter: (id) => {
        if (state.videos.some((video) => video.characterId === id)) return false
        dispatch({ type: 'delete-character', id })
        return true
      },
      saveVideo: (video) => dispatch({ type: 'save-video', video }),
      deleteVideo: (id) => dispatch({ type: 'delete-video', id }),
      updateStep: (id, patch) => dispatch({ type: 'patch-step', id, patch }),
      updateSettings: (patch) => dispatch({ type: 'patch-settings', patch }),
      setIdea: (draft) => dispatch({ type: 'set-idea', draft }),
      importBackup: (input) => {
        try {
          const next = normalizeState(input)
          dispatch({ type: 'replace', state: next })
          return null
        } catch (cause) {
          return cause instanceof Error ? cause.message : 'Não consegui ler esse arquivo.'
        }
      },
    }
  }, [state, error])

  if (!ready || !api) {
    return (
      <div className="grid min-h-dvh place-items-center bg-background px-6 text-center">
        <p className="font-heading text-2xl font-semibold">Abrindo o caderno…</p>
      </div>
    )
  }

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export function useApp(): Api {
  const value = useContext(Ctx)
  if (!value) throw new Error('Fora do caderno')
  return value
}
