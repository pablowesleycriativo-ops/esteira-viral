import { useState } from 'react'
import { ELEMENTS, KEYWORD_GROUPS, PHASES } from '@/data/facts'
import { formatDecimal, titleHasDate, toHashtag, wordCount } from '@/lib/format'
import { criteriaAverage } from '@/lib/scores'
import { decideCharacter } from '@/lib/decision'
import { todayISO } from '@/lib/format'
import { useApp } from '@/state/store'
import type { ElementId, ElementMark, IdeaDraft } from '@/types'
import { BackLink, Card, PageIntro, SealBadge, selectClass } from '@/components/bits'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const MARKS: { id: ElementMark; label: string }[] = [
  { id: 'ok', label: 'Ok' },
  { id: 'warn', label: 'Atenção' },
  { id: 'bad', label: 'Falta' },
]

export function IdeaPage() {
  const { state, setIdea } = useApp()
  const draft = state.ideaDraft
  const [copied, setCopied] = useState('')
  const format = state.formats.find((item) => item.id === draft.formatId)
  const character = state.characters.find((item) => item.id === draft.characterId)
  const auto = [character?.name, draft.action.trim(), draft.keyword.trim()].filter(Boolean).join(' ')
  const title = draft.titleTouched ? draft.title : auto
  const count = wordCount(title)
  const tags = draft.hashtags.map(toHashtag).filter(Boolean)
  const total = draft.phases.reduce((sum, phase) => sum + (Number(phase.seconds.replace(',', '.')) || 0), 0)
  const longScene = draft.phases.some((phase) => Number(phase.seconds.replace(',', '.')) > 3)
  const problems = ELEMENTS.filter((element) => draft.elements[element.id] === 'bad' || draft.elements[element.id] === 'warn').sort(
    (a, b) => (draft.elements[a.id] === 'bad' ? 0 : 1) - (draft.elements[b.id] === 'bad' ? 0 : 1),
  )

  function patch(partial: Partial<IdeaDraft>) {
    setIdea({ ...draft, ...partial })
  }

  function setMark(id: ElementId, mark: ElementMark) {
    patch({ elements: { ...draft.elements, [id]: draft.elements[id] === mark ? null : mark } })
  }

  function setPhase(index: number, key: 'scene' | 'seconds', value: string) {
    const phases = draft.phases.map((phase, phaseIndex) => (phaseIndex === index ? { ...phase, [key]: value } : phase))
    patch({ phases })
  }

  function fillTag(word: string) {
    const next = [...draft.hashtags] as [string, string, string]
    const empty = next.findIndex((tag) => !tag.trim())
    if (empty === -1) return
    next[empty] = word
    patch({ hashtags: next })
  }

  const packageText = [`Título: ${title || '—'}`, tags.join(' ')].filter(Boolean).join('\n')

  return (
    <div className="flex flex-col gap-4">
      <BackLink to="/">Início</BackLink>
      <PageIntro
        title="Analisar ideia"
        lede="Nada disto é regra fixa. É direção para não se dispersar. Menos esforço + mais resultado vence qualquer regra."
      />

      <Card className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">6 elementos</h2>
        {ELEMENTS.map((element) => (
          <div key={element.id} className="border-t pt-3 first:border-t-0 first:pt-0">
            <h3 className="font-semibold">{element.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{element.text}</p>
            {element.note ? <p className="mt-1 text-sm leading-relaxed">{element.note}</p> : null}
            <div className="mt-2 flex gap-2">
              {MARKS.map((mark) => (
                <button
                  key={mark.id}
                  type="button"
                  aria-pressed={draft.elements[element.id] === mark.id}
                  onClick={() => setMark(element.id, mark.id)}
                  className={`min-h-11 flex-1 rounded-xl border text-sm font-semibold ${draft.elements[element.id] === mark.id ? 'border-foreground bg-foreground text-background' : 'bg-card'}`}
                >
                  {mark.label}
                </button>
              ))}
            </div>
          </div>
        ))}
        {problems.length ? (
          <div>
            <h3 className="font-semibold">O que pesa mais</h3>
            <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm">
              {problems.map((element) => (
                <li key={element.id}>
                  {draft.elements[element.id] === 'bad' ? 'Falta' : 'Atenção'}: {element.title}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-sm leading-relaxed">A base diz para corrigir antes de postar. Novembro lembra: é direção, não regra fixa.</p>
          </div>
        ) : ELEMENTS.every((element) => draft.elements[element.id] === 'ok') ? (
          <p className="text-sm">Os 6 elementos estão marcados como ok.</p>
        ) : (
          <p className="text-sm">Marque os 6 elementos.</p>
        )}
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Formato e personagem</h2>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Formato
          <select className={selectClass()} value={draft.formatId} onChange={(event) => patch({ formatId: event.target.value })}>
            <option value="">Escolher</option>
            {state.formats.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </label>
        {format ? (
          <p className="text-sm">
            Média {criteriaAverage(format.criteria) == null ? 'a avaliar' : formatDecimal(criteriaAverage(format.criteria) ?? 0)}
            {format.statusNote ? ` · ${format.statusNote}` : ''}
            {format.status === 'rebaixado' ? ' · Rebaixado' : ''}
          </p>
        ) : null}
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Personagem
          <select className={selectClass()} value={draft.characterId} onChange={(event) => patch({ characterId: event.target.value })}>
            <option value="">Escolher</option>
            {[...state.characters].sort((a, b) => a.notebookRank - b.notebookRank).map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </label>
        {character ? <SealBadge seal={decideCharacter(character, state.videos, state.formats, state.settings, todayISO()).seal} /> : null}
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">6 fases</h2>
        <p className="text-sm leading-relaxed">A revelação é a última cena. Nenhuma cena dura mais de 2–3 segundos.</p>
        {PHASES.map((phase, index) => (
          <div key={phase.id} className="flex flex-col gap-2 border-t pt-3">
            <h3 className="font-semibold">{index + 1}. {phase.title}</h3>
            <p className="text-sm text-muted-foreground">{phase.text}</p>
            <Textarea
              aria-label={`Cena de ${phase.title}`}
              value={draft.phases[index]?.scene ?? ''}
              onChange={(event) => setPhase(index, 'scene', event.target.value)}
              placeholder="Cena"
            />
            <label className="text-sm font-medium">
              Tempo (segundos)
              <Input
                className="mt-1"
                inputMode="decimal"
                value={draft.phases[index]?.seconds ?? ''}
                onChange={(event) => setPhase(index, 'seconds', event.target.value)}
              />
            </label>
          </div>
        ))}
        <p className="text-sm">Tempo somado: {total || 0}s.</p>
        {longScene ? <p className="text-sm">Foge do padrão: alguma cena passou de 3 segundos.</p> : null}
        {total > 0 && total <= 8 ? <p className="text-sm">Perto da revelação em loop (6s).</p> : null}
        {total >= 15 && total <= 30 ? <p className="text-sm">Dentro da narrativa de 15–30s (Dr. Harlow, Níveis).</p> : null}
        {total > 30 && total <= 90 ? <p className="text-sm">Faixa em exploração (30–90s), meta de retenção 50%+.</p> : null}
        {total > 90 ? <p className="text-sm">Passou de 90s. Vídeo longo, no caderno, começa por compilação dos Shorts vencedores.</p> : null}
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Pacote de publicação</h2>
        <p className="text-sm leading-relaxed">Título = personagem + ação + keyword. 4 a 7 palavras. Sem data. 3 hashtags.</p>
        <label className="text-sm font-medium">
          Ação chamativa
          <Input className="mt-1" value={draft.action} onChange={(event) => patch({ action: event.target.value })} />
        </label>
        <label className="text-sm font-medium">
          Keyword
          <select className={`${selectClass()} mt-1`} value={draft.keyword} onChange={(event) => patch({ keyword: event.target.value })}>
            <option value="">Escolher</option>
            {KEYWORD_GROUPS.map((group) => (
              <optgroup key={group.category} label={group.category}>
                {group.words.map((word) => (
                  <option key={word} value={word}>{word}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Título
          <Input
            className="mt-1"
            value={title}
            onChange={(event) => patch({ title: event.target.value, titleTouched: true })}
          />
        </label>
        {draft.titleTouched ? (
          <button type="button" className="min-h-11 text-left text-sm font-medium underline" onClick={() => patch({ titleTouched: false, title: '' })}>
            Voltar ao título montado
          </button>
        ) : null}
        <p className="text-sm">{count} {count === 1 ? 'palavra' : 'palavras'}.</p>
        {title && (count < 4 || count > 7) ? <p className="text-sm">Foge do padrão: a direção é 4 a 7 palavras.</p> : null}
        {titleHasDate(title) ? <p className="text-sm">Foge do padrão: o título tem data. Datas envelhecem o vídeo.</p> : null}
        <p className="text-sm text-muted-foreground">Números aumentam CTR. A descrição com keywords fica por sua conta — o caderno não traz um texto pronto.</p>
        <div>
          <p className="text-sm font-medium">3 hashtags</p>
          <div className="mt-2 flex flex-col gap-2">
            {draft.hashtags.map((tag, index) => (
              <Input
                key={index}
                aria-label={`Hashtag ${index + 1}`}
                value={tag}
                onChange={(event) => {
                  const hashtags = [...draft.hashtags] as [string, string, string]
                  hashtags[index] = event.target.value
                  patch({ hashtags })
                }}
              />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {KEYWORD_GROUPS.flatMap((group) => group.words).map((word) => (
              <button key={word} type="button" onClick={() => fillTag(word)} className="min-h-11 rounded-full border bg-card px-3 text-sm">
                {word}
              </button>
            ))}
          </div>
          {tags.length !== 3 ? <p className="mt-2 text-sm">O ideal é 3 hashtags. Há {tags.length}.</p> : null}
        </div>
        <div className="rounded-xl border p-3">
          <p className="text-sm font-semibold">Pacote</p>
          <p className="mt-2 text-base font-semibold">{title || 'Título ainda sem peças.'}</p>
          <p className="mt-1 text-sm">{tags.length ? tags.join(' ') : 'Hashtags ainda vazias.'}</p>
        </div>
        <Button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(packageText).then(
              () => setCopied('Copiado.'),
              () => setCopied('Não consegui copiar. Selecione o texto acima.'),
            )
          }}
        >
          Copiar pacote
        </Button>
        {copied ? <p className="text-sm" role="status">{copied}</p> : null}
      </Card>
    </div>
  )
}
