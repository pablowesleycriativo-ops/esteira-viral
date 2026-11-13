import { useState } from 'react'
import { parseLooseNumber, todayISO } from '@/lib/format'
import { normalizeState } from '@/lib/backup'
import { useApp } from '@/state/store'
import { Field, PageIntro } from '@/components/bits'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function SettingsPage() {
  const { state, updateSettings, importBackup } = useApp()
  const [message, setMessage] = useState('')
  const [averageText, setAverageText] = useState(state.settings.channelAverage == null ? '' : String(state.settings.channelAverage).replace('.', ','))

  function exportJson() {
    const payload = { version: 1, exportedAt: new Date().toISOString(), ...state }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `esteira-viral-${todayISO()}.json`
    link.click()
    URL.revokeObjectURL(url)
    setMessage('Backup baixado. Guarde esse arquivo.')
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
      <p className="text-sm leading-relaxed text-muted-foreground">
        Formatos: estimativa de 7/nov/2026. Placar: parcial de 12/nov/2026. Textos: pacote de 13/nov/2026.
      </p>
      <Button type="button" onClick={exportJson}>Exportar JSON</Button>
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
            file.text().then((text) => {
              try {
                const error = importBackup(JSON.parse(text))
                if (error) setMessage(error)
                else {
                  const next = normalizeState(JSON.parse(text))
                  setAverageText(next.settings.channelAverage == null ? '' : String(next.settings.channelAverage).replace('.', ','))
                  setMessage('Backup importado. Os dados deste aparelho foram trocados.')
                }
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
