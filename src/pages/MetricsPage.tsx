import { Link } from 'react-router-dom'
import { FileSpreadsheet, History, Image, ListChecks } from 'lucide-react'
import { formatDate } from '@/lib/format'
import { WINDOW_LABEL } from '@/lib/imports'
import { buildReport, entriesFromVideos } from '@/lib/report'
import { useApp } from '@/state/store'
import { Card, PageIntro } from '@/components/bits'

const ITEMS = [
  { to: '/metricas/csv', icon: FileSpreadsheet, title: 'Ler CSV do YouTube Studio', text: 'Arquivo .csv ou o .zip do export (modo avançado → Exportar).' },
  { to: '/metricas/print', icon: Image, title: 'Ler print', text: 'Prints da tela de um Short: views, assistiram vs. deslizaram, APV, inscritos, busca.' },
  { to: '/metricas/relatorio', icon: ListChecks, title: 'Relatório por etapa', text: 'Onde a esteira vaza: pesquisa, gancho, retenção, postagem ou fidelização.' },
  { to: '/metricas/historico', icon: History, title: 'Histórico de importações', text: 'Cada importação fica guardada com data para comparar semanas.' },
]

export function MetricsPage() {
  const { state } = useApp()
  const report = buildReport(entriesFromVideos(state.videos, state.settings.averageBasis), state.settings.channelAverage)
  const last = state.imports[0]

  return (
    <div className="flex flex-col gap-4">
      <PageIntro
        title="Métricas"
        lede="Leia o que o YouTube Studio entrega e transforme em ajuste na esteira. Nada sai deste aparelho: o CSV é lido aqui e o print passa por OCR no navegador."
      />
      {report.bottleneck ? (
        <Card className="border-foreground">
          <p className="text-sm text-muted-foreground">Gargalo atual no diário</p>
          <p className="mt-1 text-lg font-semibold leading-snug">{report.bottleneck.step}</p>
          <p className="mt-1 text-sm">{report.bottleneck.solution}.</p>
        </Card>
      ) : null}
      <ul className="flex flex-col gap-3">
        {ITEMS.map((item) => (
          <li key={item.to}>
            <Link to={item.to} className="flex items-start gap-3 rounded-2xl border bg-card p-4">
              <item.icon className="mt-0.5 size-6 shrink-0" aria-hidden />
              <span>
                <span className="block text-lg font-semibold leading-snug">{item.title}</span>
                <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">{item.text}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {last ? (
        <p className="text-sm text-muted-foreground">
          Última importação: {formatDate(last.createdAt.slice(0, 10))} · {last.source === 'csv' ? 'CSV' : 'print'} · {WINDOW_LABEL[last.window]}
        </p>
      ) : null}
    </div>
  )
}
