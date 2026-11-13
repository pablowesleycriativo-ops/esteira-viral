import { useState } from 'react'
import { Link } from 'react-router-dom'
import { decideCharacter, SEAL_LABEL } from '@/lib/decision'
import { todayISO } from '@/lib/format'
import { hasVideoMetrics, rankCharacters } from '@/lib/stats'
import { useApp } from '@/state/store'
import { PageIntro, Portrait, SealBadge } from '@/components/bits'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

export function CharactersPage() {
  const { state, addCharacter } = useApp()
  const [mode, setMode] = useState<'caderno' | 'videos'>(hasVideoMetrics(state.videos, state.settings.averageBasis) ? 'videos' : 'caderno')
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const today = todayISO()
  const ranked = rankCharacters(state.characters, state.videos, state.settings, mode)
  const basis = state.settings.averageBasis === '48h' ? '48 horas' : '7 dias'

  return (
    <div className="flex flex-col gap-4">
      <PageIntro
        title="Personagens"
        lede="Placar parcial de 12/nov. O selo segue o Modo 4. Sinal, janela, encaixe e custo começam a avaliar — o caderno não trouxe esses números."
      />
      <div className="flex gap-2">
        <button
          type="button"
          aria-pressed={mode === 'caderno'}
          onClick={() => setMode('caderno')}
          className={`min-h-11 flex-1 rounded-full border px-3 text-sm font-medium ${mode === 'caderno' ? 'border-foreground bg-foreground text-background' : 'bg-card'}`}
        >
          Caderno 12/nov
        </button>
        <button
          type="button"
          aria-pressed={mode === 'videos'}
          onClick={() => setMode('videos')}
          className={`min-h-11 flex-1 rounded-full border px-3 text-sm font-medium ${mode === 'videos' ? 'border-foreground bg-foreground text-background' : 'bg-card'}`}
        >
          Pelos vídeos
        </button>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {mode === 'caderno'
          ? 'Ordem do placar de 12/nov.'
          : `Ordem pelo vídeo mais recente que tem views em ${basis}. Quem não tem esse número fica na ordem do caderno.`}
      </p>
      <ol className="flex flex-col gap-3">
        {ranked.map((character, index) => {
          const decision = decideCharacter(character, state.videos, state.formats, state.settings, today)
          return (
            <li key={character.id}>
              <Link to={`/personagens/${character.id}`} className="flex gap-3 rounded-2xl border bg-card p-3">
                <Portrait image={character.image} icon={character.icon} className="size-16 shrink-0 rounded-xl" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="font-heading text-lg font-semibold">{index + 1}</span>
                    {character.fromNotebook && character.notebookRank !== index + 1 ? (
                      <span className="text-xs text-muted-foreground">caderno {character.notebookRank}</span>
                    ) : null}
                  </span>
                  <span className="block font-semibold leading-snug">{character.name}</span>
                  {character.notebookNote ? <span className="block text-sm text-muted-foreground">{character.notebookNote}</span> : null}
                  <span className="mt-2 flex flex-wrap items-center gap-2">
                    <SealBadge seal={decision.seal} />
                    <span className="text-sm">Testado em {decision.testedFormats}</span>
                  </span>
                  <span className="sr-only">{SEAL_LABEL[decision.seal]}</span>
                </span>
              </Link>
            </li>
          )
        })}
      </ol>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" className="w-full">
            Novo personagem
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo personagem</DialogTitle>
          </DialogHeader>
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault()
              if (!name.trim()) return
              addCharacter(name)
              setName('')
              setOpen(false)
            }}
          >
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Nome
              <Input value={name} onChange={(event) => setName(event.target.value)} required />
            </label>
            <Button type="submit">Adicionar ao placar</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
