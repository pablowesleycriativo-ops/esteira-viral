import { useState } from 'react'
import { unzipSync, strFromU8 } from 'fflate'
import { formatInt, formatPct } from '@/lib/format'
import { readStudioCsv, suggestLinks, type CsvParse } from '@/lib/imports'
import { useApp } from '@/state/store'
import { BackLink, Card, PageIntro } from '@/components/bits'
import { ImportReview } from '@/components/ImportReview'
import type { ImportRow, MetricValues } from '@/types'

type FileResult = { name: string; parse: CsvParse }

async function readFiles(files: File[]): Promise<FileResult[]> {
  const out: FileResult[] = []
  for (const file of files) {
    if (/\.zip$/i.test(file.name)) {
      const entries = unzipSync(new Uint8Array(await file.arrayBuffer()))
      for (const [name, data] of Object.entries(entries)) {
        if (!/\.csv$/i.test(name)) continue
        out.push({ name, parse: readStudioCsv(strFromU8(data)) })
      }
    } else {
      out.push({ name: file.name, parse: readStudioCsv(await file.text()) })
    }
  }
  return out
}

export function CsvImportPage() {
  const { state } = useApp()
  const [results, setResults] = useState<FileResult[]>([])
  const [rows, setRows] = useState<ImportRow[]>([])
  const [totals, setTotals] = useState<MetricValues | null>(null)
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onFiles(list: FileList | null) {
    const files = Array.from(list ?? [])
    if (!files.length) return
    setBusy(true)
    setError('')
    try {
      const read = await readFiles(files)
      if (!read.length) throw new Error('Não achei nenhum CSV nesse arquivo.')
      const tables = read.filter((item) => item.parse.kind === 'videos')
      const traffic = read.find((item) => item.parse.kind === 'trafego')
      let nextRows = tables.flatMap((item) => (item.parse.kind === 'videos' ? item.parse.rows : []))
      const tableTotals = tables.map((item) => (item.parse.kind === 'videos' ? item.parse.totals : null)).find(Boolean) ?? null
      // origem do tráfego de um único vídeo: aplica a % de busca nele
      if (traffic && traffic.parse.kind === 'trafego' && nextRows.length === 1 && nextRows[0].searchPct == null) {
        nextRows = [{ ...nextRows[0], searchPct: traffic.parse.searchPct }]
      }
      setResults(read)
      setRows(suggestLinks(nextRows, state.videos))
      setTotals(tableTotals && traffic?.parse.kind === 'trafego' ? { ...tableTotals, searchPct: traffic.parse.searchPct } : tableTotals)
      setFileName(files.map((file) => file.name).join(', '))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não consegui ler esse arquivo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <BackLink to="/metricas">Métricas</BackLink>
      <PageIntro
        title="Ler CSV do YouTube Studio"
        lede="No Studio: Análises → Modo avançado → aba Conteúdo, filtre Shorts e o período, depois Exportar → CSV. Pode mandar o .zip inteiro."
      />
      <label className="inline-flex min-h-14 cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed bg-card px-4 text-base font-semibold">
        {busy ? 'Lendo…' : 'Escolher CSV ou .zip'}
        <input
          type="file"
          multiple
          accept=".csv,.zip,text/csv,application/zip"
          className="sr-only"
          onChange={(event) => {
            onFiles(event.target.files)
            event.target.value = ''
          }}
        />
      </label>
      {error ? (
        <p className="text-sm font-medium text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {results.length ? (
        <Card>
          <h2 className="text-lg font-semibold">Arquivos lidos</h2>
          <ul className="mt-2 flex flex-col gap-2 text-sm">
            {results.map((item) => (
              <li key={item.name}>
                <span className="font-medium">{item.name}</span> — {describe(item.parse)}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {rows.length ? (
        <ImportReview source="csv" fileName={fileName} rows={rows} totals={totals} onRowsChange={setRows} />
      ) : results.length ? (
        <p className="text-sm">Nenhuma linha de vídeo para importar. Exporte a tabela da aba Conteúdo.</p>
      ) : null}
    </div>
  )
}

function describe(parse: CsvParse): string {
  if (parse.kind === 'videos') return `${parse.rows.length} vídeo(s)${parse.totals ? ' + totais' : ''}.`
  if (parse.kind === 'trafego')
    return `origem do tráfego: ${parse.totalViews == null ? '—' : formatInt(parse.totalViews)} views, busca ${parse.searchPct == null ? '—' : formatPct(parse.searchPct)}.`
  return parse.reason
}
