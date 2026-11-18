import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { parseLooseNumber, todayISO } from '@/lib/format'
import { useApp } from '@/state/store'
import type { Video } from '@/types'
import { BackLink, Field, PageIntro, selectClass } from '@/components/bits'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

type Draft = {
  date: string
  title: string
  formatId: string
  characterId: string
  durationSec: string
  views48h: string
  views7d: string
  apv: string
  viewed: string
  subscribers: string
  searchPct: string
  lesson: string
}

function blank(): Draft {
  return {
    date: todayISO(),
    title: '',
    formatId: '',
    characterId: '',
    durationSec: '',
    views48h: '',
    views7d: '',
    apv: '',
    viewed: '',
    subscribers: '',
    searchPct: '',
    lesson: '',
  }
}

function fromVideo(video: Video): Draft {
  const text = (value: number | null) => (value == null ? '' : String(value).replace('.', ','))
  return {
    date: video.date,
    title: video.title,
    formatId: video.formatId,
    characterId: video.characterId,
    durationSec: text(video.durationSec),
    views48h: text(video.views48h),
    views7d: text(video.views7d),
    apv: text(video.apv),
    viewed: text(video.viewed),
    subscribers: text(video.subscribers),
    searchPct: text(video.searchPct),
    lesson: video.lesson,
  }
}

export function VideoFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { state, saveVideo } = useApp()
  const existing = id ? state.videos.find((video) => video.id === id) : undefined
  const [draft, setDraft] = useState<Draft>(() => (existing ? fromVideo(existing) : blank()))
  const [error, setError] = useState('')

  useEffect(() => {
    const current = id ? state.videos.find((video) => video.id === id) : undefined
    setDraft(current ? fromVideo(current) : blank())
    setError('')
    // Só reabre o formulário quando muda o vídeo, não a cada tecla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (id && !existing) {
    return (
      <div>
        <BackLink to="/videos">Vídeos</BackLink>
        <p>Esse vídeo não está no diário.</p>
      </div>
    )
  }

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function readNumber(raw: string, label: string): number | null {
    const value = parseLooseNumber(raw)
    if (raw.trim() && (value == null || value < 0)) {
      throw new Error(`${label} precisa ser um número zero ou maior.`)
    }
    return raw.trim() ? value : null
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        if (!draft.date || !draft.title.trim() || !draft.formatId || !draft.characterId) {
          setError('Preencha data, título, formato e personagem.')
          return
        }
        try {
          const format = state.formats.find((item) => item.id === draft.formatId)
          if (!format) {
            setError('Escolha um formato.')
            return
          }
          const video: Video = {
            id: existing?.id ?? crypto.randomUUID(),
            createdAt: existing?.createdAt ?? new Date().toISOString(),
            date: draft.date,
            title: draft.title.trim(),
            formatId: draft.formatId,
            characterId: draft.characterId,
            durationSec: readNumber(draft.durationSec, 'Duração'),
            views48h: readNumber(draft.views48h, 'Views em 48h'),
            views7d: readNumber(draft.views7d, 'Views em 7 dias'),
            apv: readNumber(draft.apv, 'APV'),
            viewed: readNumber(draft.viewed, 'Viewed vs swiped'),
            subscribers: readNumber(draft.subscribers, 'Inscritos'),
            searchPct: readNumber(draft.searchPct, 'Busca'),
            lesson: draft.lesson.trim(),
            formatStatus: existing && existing.formatId === draft.formatId ? existing.formatStatus : format.status,
            youtubeId: existing?.youtubeId ?? null,
          }
          saveVideo(video)
          navigate(`/videos/${video.id}`)
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : 'Não consegui salvar.')
        }
      }}
    >
      <BackLink to={existing ? `/videos/${existing.id}` : '/videos'}>Vídeos</BackLink>
      <PageIntro title={existing ? 'Editar vídeo' : 'Registrar vídeo'} lede="O que der para preencher agora já entra. O resto pode ficar vazio." />
      <Field label="Data (obrigatório)">
        <Input type="date" required value={draft.date} onChange={(event) => set('date', event.target.value)} />
      </Field>
      <Field label="Título (obrigatório)">
        <Input required value={draft.title} onChange={(event) => set('title', event.target.value)} />
      </Field>
      <Field label="Formato (obrigatório)">
        <select className={selectClass()} required value={draft.formatId} onChange={(event) => set('formatId', event.target.value)}>
          <option value="">Escolher</option>
          <optgroup label="No catálogo">
            {state.formats.filter((format) => format.status === 'catalogo').map((format) => (
              <option key={format.id} value={format.id}>{format.name}</option>
            ))}
          </optgroup>
          <optgroup label="Em teste">
            {state.formats.filter((format) => format.status === 'teste').map((format) => (
              <option key={format.id} value={format.id}>{format.name}</option>
            ))}
          </optgroup>
          <optgroup label="Rebaixados">
            {state.formats.filter((format) => format.status === 'rebaixado').map((format) => (
              <option key={format.id} value={format.id}>{format.name}</option>
            ))}
          </optgroup>
        </select>
      </Field>
      <Field label="Personagem (obrigatório)">
        <select className={selectClass()} required value={draft.characterId} onChange={(event) => set('characterId', event.target.value)}>
          <option value="">Escolher</option>
          {[...state.characters].sort((a, b) => a.notebookRank - b.notebookRank).map((character) => (
            <option key={character.id} value={character.id}>{character.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Duração (segundos)" hint="6s para loop. 15–30s para narrativa. Raramente passa de 30s.">
        <Input inputMode="decimal" value={draft.durationSec} onChange={(event) => set('durationSec', event.target.value)} />
      </Field>
      <Field label="Views em 48h">
        <Input inputMode="decimal" value={draft.views48h} onChange={(event) => set('views48h', event.target.value)} />
      </Field>
      <Field label="Views em 7 dias">
        <Input inputMode="decimal" value={draft.views7d} onChange={(event) => set('views7d', event.target.value)} />
      </Field>
      <Field label="APV (%)" hint="Meta 70%+. Abaixo de 50% o caderno chama de hook falho. Acima de 100% é loop.">
        <Input inputMode="decimal" value={draft.apv} onChange={(event) => set('apv', event.target.value)} />
      </Field>
      <Field label="Viewed vs swiped (%)" hint="Quem ficou. 80%+ é excelente.">
        <Input inputMode="decimal" value={draft.viewed} onChange={(event) => set('viewed', event.target.value)} />
      </Field>
      <Field label="Inscritos" hint="Meta: 0,5%+ por 1.000 views.">
        <Input inputMode="decimal" value={draft.subscribers} onChange={(event) => set('subscribers', event.target.value)} />
      </Field>
      <Field label="% de busca" hint="Meta: 30%+ do tráfego.">
        <Input inputMode="decimal" value={draft.searchPct} onChange={(event) => set('searchPct', event.target.value)} />
      </Field>
      <Field label="Lição" hint="Uma frase generalizável.">
        <Textarea value={draft.lesson} onChange={(event) => set('lesson', event.target.value)} placeholder="Uma frase sobre o que este vídeo mostrou." />
      </Field>
      {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
      <Button type="submit">Salvar vídeo</Button>
      <Button type="button" variant="outline" asChild>
        <Link to={existing ? `/videos/${existing.id}` : '/videos'}>Cancelar</Link>
      </Button>
    </form>
  )
}
