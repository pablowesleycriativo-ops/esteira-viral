import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { parseLooseNumber, todayISO } from '@/lib/format'
import { buildBackup, normalizeState } from '@/lib/backup'
import {
  GOOGLE_API_URL,
  GOOGLE_KEY_URL,
  KEY_GUIDE,
  REFERRER_RULE,
  clearApiKey,
  keyLooksValid,
  parseWatchlist,
  readApiKey,
  writeApiKey,
} from '@/lib/radar'
import { browserStorage, loadRadar, saveRadar } from '@/lib/radarStore'
import { useApp } from '@/state/store'
import { Field, PageIntro } from '@/components/bits'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const storage = browserStorage()

export function SettingsPage() {
  const { state, updateSettings, importBackup } = useApp()
  const location = useLocation()
  const [message, setMessage] = useState('')
  const [averageText, setAverageText] = useState(state.settings.channelAverage == null ? '' : String(state.settings.channelAverage).replace('.', ','))
  const [hasKey, setHasKey] = useState(() => (storage ? readApiKey(storage).length > 0 : false))
  const [editingKey, setEditingKey] = useState(false)
  const [keyDraft, setKeyDraft] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [includeRadar, setIncludeRadar] = useState(false)
  const [guideOpen, setGuideOpen] = useState(() => !(storage && readApiKey(storage)))

  useEffect(() => {
    const focus = (location.state as { focus?: string } | null)?.focus
    if (focus === 'youtube') document.getElementById('chave-youtube')?.scrollIntoView()
  }, [location.state])

  async function exportJson() {
    let watchlist: Awaited<ReturnType<typeof loadRadar>>['watchlist'] | null = null
    if (includeRadar) {
      try {
        watchlist = (await loadRadar()).watchlist
      } catch {
        setMessage('Não consegui ler os assuntos do Em alta para o backup.')
        return
      }
    }
    const payload = buildBackup(state, { watchlist })
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `esteira-viral-${todayISO()}.json`
    link.click()
    URL.revokeObjectURL(url)
    setMessage(includeRadar ? 'Backup baixado, com os assuntos do Em alta. A chave do YouTube não entra no arquivo.' : 'Backup baixado. Guarde esse arquivo. A chave do YouTube não entra nele.')
  }

  function saveKey() {
    if (!storage) {
      setMessage('Este navegador não deixa guardar a chave aqui.')
      return
    }
    const clean = keyDraft.trim()
    if (clean.length < 10) {
      setMessage('A chave parece incompleta.')
      return
    }
    writeApiKey(storage, clean)
    setHasKey(true)
    setKeyDraft('')
    setEditingKey(false)
    setShowKey(false)
    setMessage(keyLooksValid(clean) ? 'Chave guardada só neste aparelho.' : 'Chave guardada. Ela não tem o formato comum, que começa com AIza. Se o Google te deu assim, tudo bem.')
  }

  return (
    <div className="flex flex-col gap-4">
      <PageIntro
        title="Ajustes"
        lede="Tudo fica neste aparelho. Exportar o JSON é o backup. Performou = acima da média do canal. O caderno não traz esse número."
      />
      <Field label="Média de views do canal" hint="Deixe vazio se ainda não souber. Sem este número, o selo acima/abaixo fica sem comparação.">
        <Input
          inputMode="decimal"
          value={averageText}
          onChange={(event) => {
            const text = event.target.value
            setAverageText(text)
            if (!text.trim()) {
              updateSettings({ channelAverage: null })
              return
            }
            const value = parseLooseNumber(text)
            if (value != null && value >= 0) updateSettings({ channelAverage: value })
          }}
        />
      </Field>
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Esse número é de</span>
        <button
          type="button"
          aria-pressed={state.settings.averageBasis === '48h'}
          onClick={() => updateSettings({ averageBasis: '48h' })}
          className={choice(state.settings.averageBasis === '48h')}
        >
          Views em 48 horas
        </button>
        <button
          type="button"
          aria-pressed={state.settings.averageBasis === '7d'}
          onClick={() => updateSettings({ averageBasis: '7d' })}
          className={choice(state.settings.averageBasis === '7d')}
        >
          Views em 7 dias
        </button>
      </div>

      <section id="chave-youtube" className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
        <h2 className="text-lg font-semibold">Chave do YouTube</h2>
        <p className="text-sm leading-relaxed">
          O Em alta precisa de uma chave gratuita do Google para ler os vídeos. Ela fica só neste aparelho. Não entra no backup. Quem usar este celular consegue ver a chave se abrir esta tela.
        </p>
        {!storage ? <p className="text-sm">Este navegador não deixa guardar a chave aqui.</p> : null}
        {hasKey && !editingKey ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm">Chave guardada neste aparelho.</p>
            <Button type="button" variant="outline" onClick={() => setEditingKey(true)}>Trocar chave</Button>
            <button
              type="button"
              className="min-h-11 text-left text-sm font-medium underline"
              onClick={() => {
                if (!storage) return
                clearApiKey(storage)
                setHasKey(false)
                setKeyDraft('')
                setMessage('Chave apagada deste aparelho.')
              }}
            >
              Apagar chave
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="youtube-key">Colar a chave</label>
            <Input
              id="youtube-key"
              type={showKey ? 'text' : 'password'}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              value={keyDraft}
              onChange={(event) => setKeyDraft(event.target.value)}
            />
            <button type="button" className="min-h-11 text-left text-sm font-medium underline" onClick={() => setShowKey((value) => !value)}>
              {showKey ? 'Esconder chave' : 'Mostrar chave'}
            </button>
            <Button type="button" onClick={saveKey}>Guardar chave</Button>
            {editingKey ? (
              <button type="button" className="min-h-11 text-left text-sm font-medium underline" onClick={() => { setEditingKey(false); setKeyDraft('') }}>
                Cancelar
              </button>
            ) : null}
          </div>
        )}
        <details open={guideOpen} onToggle={(event) => setGuideOpen(event.currentTarget.open)}>
          <summary className="min-h-11 cursor-pointer text-sm font-medium">Como criar a chave</summary>
          <ol className="flex list-decimal flex-col gap-3 pb-2 pl-5 text-sm leading-relaxed">
            {KEY_GUIDE.map((step) => (
              <li key={step.title}>
                <span className="font-semibold">{step.title}. </span>
                {step.text}
              </li>
            ))}
          </ol>
          <p className="pb-2 text-sm leading-relaxed">
            YouTube Data API v3 é o nome que aparece no site do Google. A restrição de site usa exatamente {REFERRER_RULE}. Assim a chave só funciona no site publicado. No computador, o endereço local não passa nessa restrição: teste no site publicado ou, só enquanto testa, deixe a restrição de site desligada.
          </p>
          <p className="pb-2 text-sm leading-relaxed">
            A cota grátis é de 10.000 unidades por dia. Cada busca de assunto gasta cerca de 100, mais um pouco por canal novo.
          </p>
          <p className="flex flex-col gap-2 pb-2">
            <a className="min-h-11 text-sm font-medium underline" href={GOOGLE_API_URL} target="_blank" rel="noreferrer">Abrir a página da API no Google</a>
            <a className="min-h-11 text-sm font-medium underline" href={GOOGLE_KEY_URL} target="_blank" rel="noreferrer">Abrir a página das chaves</a>
          </p>
        </details>
      </section>

      <p className="text-sm leading-relaxed text-muted-foreground">
        Formatos: estimativa de 7/nov/2026. Placar: parcial de 12/nov/2026. Textos: pacote de 13/nov/2026.
      </p>
      <label className="flex min-h-11 items-start gap-3 text-sm leading-relaxed">
        <input type="checkbox" className="mt-1 size-5" checked={includeRadar} onChange={(event) => setIncludeRadar(event.target.checked)} />
        <span>Incluir assuntos salvos do Em alta. A chave do YouTube nunca entra no arquivo.</span>
      </label>
      <Button type="button" onClick={() => void exportJson()}>Exportar JSON</Button>
      <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border bg-card px-4 text-sm font-medium">
        Importar JSON
        <input
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (!file) return
            if (file.size > 20_000_000) {
              setMessage('Esse arquivo é grande demais.')
              return
            }
            void file.text().then(async (text) => {
              try {
                const parsed = JSON.parse(text)
                const error = importBackup(parsed)
                if (error) {
                  setMessage(error)
                  return
                }
                const next = normalizeState(parsed)
                setAverageText(next.settings.channelAverage == null ? '' : String(next.settings.channelAverage).replace('.', ','))
                const watch = parseWatchlist(parsed)
                if (!watch.present) {
                  setMessage('Backup importado. Os dados deste aparelho foram trocados. Os assuntos do Em alta continuam iguais. A chave não vem no arquivo.')
                  return
                }
                if (!watch.valid) {
                  setMessage('Backup importado. Os assuntos do Em alta neste arquivo não estavam legíveis e foram ignorados.')
                  return
                }
                const current = await loadRadar()
                await saveRadar({ ...current, watchlist: watch.items })
                setMessage(watch.items.length
                  ? 'Backup importado, incluindo os assuntos do Em alta. A chave do YouTube não entra nesse arquivo.'
                  : 'Backup importado. O arquivo trazia a lista do Em alta vazia, então os assuntos salvos deste aparelho foram apagados.')
              } catch {
                setMessage('Não consegui ler esse arquivo.')
              }
            })
          }}
        />
      </label>
      {message ? <p className="text-sm" role="status">{message}</p> : null}
    </div>
  )
}

function choice(active: boolean) {
  return `min-h-11 rounded-xl border px-4 text-left text-sm font-medium ${active ? 'border-foreground bg-foreground text-background' : 'bg-card'}`
}
