import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { MODE_RULES, decideCharacter } from '@/lib/decision'
import { formatDate, todayISO } from '@/lib/format'
import { averageMark } from '@/lib/scores'
import { useApp } from '@/state/store'
import type { Score } from '@/types'
import { AverageBadge, BackLink, Card, Field, PageIntro, Portrait, ScoreEditor, SealBadge, selectClass } from '@/components/bits'
import { IconPicker } from '@/components/IconPicker'
import { ImageWell } from '@/components/ImageWell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function CharacterDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { state, updateCharacter, deleteCharacter } = useApp()
  const character = state.characters.find((item) => item.id === id)
  const [blocked, setBlocked] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  if (!character) {
    return (
      <div>
        <BackLink to="/personagens">Personagens</BackLink>
        <p>Esse personagem não está no placar.</p>
      </div>
    )
  }

  const today = todayISO()
  const decision = decideCharacter(character, state.videos, state.formats, state.settings, today)
  const videos = state.videos
    .filter((video) => video.characterId === character.id)
    .sort((a, b) => (a.date === b.date ? (a.createdAt < b.createdAt ? 1 : -1) : a.date < b.date ? 1 : -1))

  return (
    <div className="flex flex-col gap-4">
      <BackLink to="/personagens">Personagens</BackLink>
      <div className="flex items-center gap-3">
        <Portrait image={character.image} icon={character.icon} className="size-16 rounded-2xl" />
        <SealBadge seal={decision.seal} />
      </div>
      <PageIntro title={character.name} />
      <Field label="Nome">
        <Input value={character.name} onChange={(event) => updateCharacter(character.id, { name: event.target.value })} />
      </Field>
      {character.fromNotebook ? (
        <p className="text-sm">
          Placar de 12/nov, posição {character.notebookRank}
          {character.notebookNote ? ` — ${character.notebookNote}` : ''}.
        </p>
      ) : (
        <p className="text-sm">Fora do placar de 12/nov.</p>
      )}
      {character.extraNote ? <p className="text-sm leading-relaxed">{character.extraNote}</p> : null}
      <ImageWell image={character.image} onImage={(image) => updateCharacter(character.id, { image })} />
      <IconPicker value={character.icon} onChange={(icon) => updateCharacter(character.id, { icon })} />

      <Card>
        <h2 className="text-lg font-semibold">Decisão</h2>
        {decision.reasons.map((reason) => (
          <p key={reason} className="mt-2 text-sm leading-relaxed">
            {reason}
          </p>
        ))}
        <ol className="mt-4 flex flex-col gap-2">
          {MODE_RULES.map((rule, index) => (
            <li
              key={rule.id}
              className={`rounded-xl border p-3 text-sm leading-relaxed ${decision.seal === rule.id ? 'border-foreground bg-foreground text-background' : ''}`}
            >
              <span className="font-semibold">{index + 1}. </span>
              {rule.text}
            </li>
          ))}
        </ol>
        <details className="mt-3 text-sm leading-relaxed">
          <summary className="min-h-11 cursor-pointer font-medium">Como estas regras foram lidas</summary>
          <p className="mt-2 text-muted-foreground">
            Externo alto = nota 4 ou 5. Interno acima da média = nota 4 ou 5. Janela de cerca de 4 semanas = fim daqui a 28 dias ou mais, ou evergreen. Janela acabando = fim em 7 dias ou menos. Resultado caindo = o vídeo mais recente com views ficou abaixo do anterior e abaixo da média do canal. O custo do capacete aparece aqui, mas as quatro frases do caderno não usam esse número. No custo, 5 = barra cheia = custo baixo.
          </p>
        </details>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold">Ramificação</h2>
        <p className="mt-2 text-sm">Testado em {decision.testedFormats} {decision.testedFormats === 1 ? 'formato' : 'formatos'}.</p>
        {decision.canJudge ? (
          <p className="mt-1 text-sm">Falhou em {decision.failedFormats}. Funcionou em {decision.succeededFormats}.</p>
        ) : (
          <p className="mt-1 text-sm">Sem a média do canal, ainda não dá para contar falha.</p>
        )}
        {decision.failedNames.length ? <p className="mt-2 text-sm">Falhou em: {decision.failedNames.join(', ')}.</p> : null}
        {decision.succeededNames.length ? <p className="mt-1 text-sm">Acima da média em: {decision.succeededNames.join(', ')}.</p> : null}
        {decision.failedFormats >= 3 ? (
          <p className="mt-3 rounded-xl bg-[#F8E6E4] p-3 text-sm font-medium text-[#8C241C]" role="status">
            Falhou em 3 formatos — provavelmente é o personagem; voltar à pesquisa.
          </p>
        ) : null}
        {decision.failedFormats > 0 && decision.succeededFormats > 0 ? (
          <p className="mt-3 text-sm">Funcionou em outro formato — o problema era o formato; esforço recuperado.</p>
        ) : null}
      </Card>

      <Card className="flex flex-col gap-5">
        <h2 className="text-lg font-semibold">Modo 4</h2>
        <ScoreEditor
          label="Sinal externo"
          hint="Shorts recentes, outliers, volume de busca, atualizações. O caderno não trouxe a nota."
          value={character.external}
          onChange={(external) => updateCharacter(character.id, { external })}
        />
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">Sinal interno</span>
            <span className="text-sm font-medium">{character.internal === 'nao_testado' ? 'não testado' : `nota ${character.internal}`}</span>
          </div>
          <p className="text-sm text-muted-foreground">Desenho simples comparado com a média do canal.</p>
          <div className="flex flex-wrap gap-2">
            {([1, 2, 3, 4, 5] as Score[]).map((score) => (
              <button
                key={score}
                type="button"
                aria-pressed={character.internal === score}
                onClick={() => updateCharacter(character.id, { internal: score })}
                className={`min-h-11 min-w-11 rounded-xl border text-base font-semibold ${character.internal === score ? 'border-foreground bg-foreground text-background' : 'bg-card'}`}
              >
                {score}
              </button>
            ))}
            <button
              type="button"
              aria-pressed={character.internal === 'nao_testado'}
              onClick={() => updateCharacter(character.id, { internal: 'nao_testado' })}
              className={`min-h-11 rounded-xl border px-3 text-sm font-medium ${character.internal === 'nao_testado' ? 'border-foreground bg-foreground text-background' : 'bg-card'}`}
            >
              não testado
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Janela</span>
          <div className="flex flex-wrap gap-2">
            <button type="button" aria-pressed={character.window === 'evergreen'} className={choice(character.window === 'evergreen')} onClick={() => updateCharacter(character.id, { window: 'evergreen' })}>
              Evergreen
            </button>
            <button type="button" aria-pressed={character.window === 'sazonal'} className={choice(character.window === 'sazonal')} onClick={() => updateCharacter(character.id, { window: 'sazonal' })}>
              Sazonal
            </button>
            <button type="button" aria-pressed={character.window == null} className={choice(character.window == null)} onClick={() => updateCharacter(character.id, { window: null, windowEnd: null })}>
              a avaliar
            </button>
          </div>
          {character.window === 'sazonal' ? (
            <Field label="Data estimada de fim" hint="Sazonal = usar dentro da janela. O caderno não trouxe a data.">
              <Input type="date" value={character.windowEnd ?? ''} onChange={(event) => updateCharacter(character.id, { windowEnd: event.target.value || null })} />
            </Field>
          ) : null}
        </div>
        <Field label="Encaixe" hint="Quantos dos 9 formatos. O caderno não trouxe o número.">
          <Input
            className={selectClass()}
            inputMode="numeric"
            value={character.fit ?? ''}
            onChange={(event) => {
              const raw = event.target.value.trim()
              if (!raw) {
                updateCharacter(character.id, { fit: null })
                return
              }
              const value = Number(raw)
              if (Number.isInteger(value) && value >= 0 && value <= 9) updateCharacter(character.id, { fit: value })
            }}
          />
        </Field>
        <ScoreEditor
          label="Custo do capacete"
          hint="5 = barra cheia = custo baixo. O caderno pede a nota de 1 a 5, mas não diz o sentido. O selo não usa este número."
          value={character.helmetCost}
          onChange={(helmetCost) => updateCharacter(character.id, { helmetCost })}
        />
        <button
          type="button"
          aria-pressed={character.helmetReady}
          onClick={() => updateCharacter(character.id, { helmetReady: !character.helmetReady })}
          className={`min-h-11 rounded-xl border px-4 text-sm font-semibold ${character.helmetReady ? 'border-foreground bg-foreground text-background' : 'bg-card'}`}
        >
          {character.helmetReady ? 'Capacete pronto' : 'Marcar capacete pronto'}
        </button>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold">Vídeos</h2>
        {videos.length === 0 ? (
          <p className="mt-2 text-sm">Nenhum vídeo registrado. O “1 vídeo forte” do Veneno do Dr. Harlow está no formato, sem números no caderno.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {videos.map((video) => {
              const format = state.formats.find((item) => item.id === video.formatId)
              return (
                <li key={video.id}>
                  <Link to={`/videos/${video.id}`} className="block rounded-xl border p-3">
                    <span className="font-medium">{video.title}</span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      {formatDate(video.date)} · {format?.name ?? 'Formato'}
                    </span>
                    <span className="mt-2 inline-flex">
                      <AverageBadge mark={averageMark(video, state.settings.channelAverage, state.settings.averageBasis)} />
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      {confirmDelete ? (
        <Card>
          <p className="text-sm">Tirar {character.name} do placar?</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                const ok = deleteCharacter(character.id)
                if (!ok) {
                  setBlocked(true)
                  setConfirmDelete(false)
                } else navigate('/personagens')
              }}
            >
              Tirar do placar
            </Button>
            <Button type="button" variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </Button>
          </div>
        </Card>
      ) : (
        <Button type="button" variant="outline" onClick={() => setConfirmDelete(true)}>
          Tirar do placar
        </Button>
      )}
      {blocked ? <p className="text-sm">Este personagem tem vídeos registrados.</p> : null}
    </div>
  )
}

function choice(active: boolean) {
  return `min-h-11 rounded-xl border px-3 text-sm font-medium ${active ? 'border-foreground bg-foreground text-background' : 'bg-card'}`
}
