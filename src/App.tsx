import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Shell } from '@/components/Shell'
import { AppStateProvider } from '@/state/store'
import { CharacterDetailPage } from '@/pages/CharacterDetailPage'
import { CharactersPage } from '@/pages/CharactersPage'
import { FormatDetailPage } from '@/pages/FormatDetailPage'
import { FormatsPage } from '@/pages/FormatsPage'
import { HomePage } from '@/pages/HomePage'
import { RadarPage } from '@/pages/RadarPage'
import { IdeaPage } from '@/pages/IdeaPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { SystemPage } from '@/pages/SystemPage'
import { SystemSectionPage } from '@/pages/SystemSectionPage'
import { VideoDetailPage } from '@/pages/VideoDetailPage'
import { VideoFormPage } from '@/pages/VideoFormPage'
import { VideosPage } from '@/pages/VideosPage'
import { MetricsPage } from '@/pages/MetricsPage'
import { CsvImportPage } from '@/pages/CsvImportPage'
import { PrintImportPage } from '@/pages/PrintImportPage'
import { ReportPage } from '@/pages/ReportPage'
import { ImportDetailPage, ImportHistoryPage } from '@/pages/ImportHistoryPage'

export default function App() {
  return (
    <AppStateProvider>
      <HashRouter>
        <Routes>
          <Route element={<Shell />}>
            <Route index element={<HomePage />} />
            <Route path="formatos" element={<FormatsPage />} />
            <Route path="formatos/:id" element={<FormatDetailPage />} />
            <Route path="personagens" element={<CharactersPage />} />
            <Route path="personagens/:id" element={<CharacterDetailPage />} />
            <Route path="videos" element={<VideosPage />} />
            <Route path="videos/novo" element={<VideoFormPage />} />
            <Route path="videos/:id" element={<VideoDetailPage />} />
            <Route path="videos/:id/editar" element={<VideoFormPage />} />
            <Route path="sistema" element={<SystemPage />} />
            <Route path="sistema/:slug" element={<SystemSectionPage />} />
            <Route path="em-alta" element={<RadarPage />} />
            <Route path="ideia" element={<IdeaPage />} />
            <Route path="ajustes" element={<SettingsPage />} />
            <Route path="metricas" element={<MetricsPage />} />
            <Route path="metricas/csv" element={<CsvImportPage />} />
            <Route path="metricas/print" element={<PrintImportPage />} />
            <Route path="metricas/relatorio" element={<ReportPage />} />
            <Route path="metricas/historico" element={<ImportHistoryPage />} />
            <Route path="metricas/historico/:id" element={<ImportDetailPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </AppStateProvider>
  )
}
