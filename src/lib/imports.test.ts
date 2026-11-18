import { describe, expect, it } from 'vitest'
import { seedState } from '@/data/seed'
import { applyImport, parseDate, parseDuration, parseNumber, readStudioCsv, suggestLinks } from '@/lib/imports'
import { readPrintText } from '@/lib/printText'
import { buildReport, entriesFromImport, retentionGoal } from '@/lib/report'
import type { ImportRecord, Video } from '@/types'

const EN = `Content,Video title,Video publish time,Duration,Stayed to watch (%),Views,Watch time (hours),Subscribers,Average view duration,Average percentage viewed (%),Impressions,Impressions click-through rate (%)
Total,,,,,"1,250,000",1200.5,900,,,"3,000,000",4.1
abcdefghijk,Goku bombado transformation #shorts,"Nov 12, 2026",28,82.4,"1,000,000",900.1,800,0:00:24,86.5,"2,000,000",5.2
lmnopqrstuv,Sonic comendo o desenho,"Nov 13, 2026",45,61.0,"250,000",300.4,100,0:00:20,44.2,"1,000,000",3.0
`

const PT = `﻿Conteúdo;Título do vídeo;Horário de publicação do vídeo;Duração;Visualizações;Inscritos;Duração média da visualização;Porcentagem média visualizada (%)
Total;;;;1.250.000;900;;
abcdefghijk;Goku bombado transformation;12 de nov. de 2026;28;1.000.000;800;0:00:24;86,5
`

const TRAFFIC = `Traffic source,Views,Watch time (hours)
Total,"10,000",50
Shorts feed,"6,000",30
YouTube search,"3,000",15
External,"1,000",5
`

function video(partial: Partial<Video> & Pick<Video, 'id' | 'title'>): Video {
  return {
    createdAt: '2026-11-10T00:00:00Z',
    date: '2026-11-12',
    formatId: 'fmt-1',
    characterId: '',
    durationSec: null,
    views48h: null,
    views7d: null,
    apv: null,
    viewed: null,
    subscribers: null,
    searchPct: null,
    lesson: '',
    formatStatus: 'catalogo',
    youtubeId: null,
    ...partial,
  }
}

describe('números do Studio', () => {
  it('lê milhar e decimal em inglês e português', () => {
    expect(parseNumber('1,234,567', 'int')).toBe(1234567)
    expect(parseNumber('1.234.567', 'int')).toBe(1234567)
    expect(parseNumber('45,3%')).toBe(45.3)
    expect(parseNumber('86.5')).toBe(86.5)
    expect(parseNumber('1,2 mi', 'int')).toBe(1200000)
    expect(parseNumber('345K', 'int')).toBe(345000)
    expect(parseNumber('12,5 mil', 'int')).toBe(12500)
    expect(parseNumber('+1.234', 'int')).toBe(1234)
    expect(parseNumber('—')).toBeNull()
  })
  it('lê duração e data', () => {
    expect(parseDuration('0:00:24')).toBe(24)
    expect(parseDuration('1:05')).toBe(65)
    expect(parseDuration('28')).toBe(28)
    expect(parseDate('Nov 12, 2026')).toBe('2026-11-12')
    expect(parseDate('12 de nov. de 2026')).toBe('2026-11-12')
    expect(parseDate('2026-11-03')).toBe('2026-11-03')
  })
})

describe('CSV do YouTube Studio', () => {
  it('lê a tabela em inglês com totais', () => {
    const parse = readStudioCsv(EN)
    expect(parse.kind).toBe('videos')
    if (parse.kind !== 'videos') return
    expect(parse.rows).toHaveLength(2)
    expect(parse.totals?.views).toBe(1250000)
    const goku = parse.rows[0]
    expect(goku.youtubeId).toBe('abcdefghijk')
    expect(goku.views).toBe(1000000)
    expect(goku.viewed).toBe(82.4)
    expect(goku.apv).toBe(86.5)
    expect(goku.avgViewSec).toBe(24)
    expect(goku.durationSec).toBe(28)
    expect(goku.subscribers).toBe(800)
    expect(goku.ctr).toBe(5.2)
    expect(goku.publishDate).toBe('2026-11-12')
  })
  it('lê a tabela em português com ponto e vírgula', () => {
    const parse = readStudioCsv(PT)
    if (parse.kind !== 'videos') throw new Error(parse.kind)
    expect(parse.rows).toHaveLength(1)
    expect(parse.rows[0].views).toBe(1000000)
    expect(parse.rows[0].apv).toBe(86.5)
    expect(parse.rows[0].publishDate).toBe('2026-11-12')
  })
  it('calcula a % de busca da origem do tráfego', () => {
    const parse = readStudioCsv(TRAFFIC)
    expect(parse).toMatchObject({ kind: 'trafego', searchPct: 30, totalViews: 10000 })
  })
})

describe('vínculo e aplicação', () => {
  it('sugere o vídeo pelo título e preenche as views de 48h', () => {
    const state = { ...seedState(), videos: [video({ id: 'v1', title: 'Goku bombado transformation' })] }
    const parse = readStudioCsv(EN)
    if (parse.kind !== 'videos') throw new Error()
    const rows = suggestLinks(parse.rows, state.videos)
    expect(rows[0].link).toEqual({ kind: 'video', videoId: 'v1' })
    expect(rows[1].link).toEqual({ kind: 'nenhum' })
    const record: ImportRecord = { id: 'i1', createdAt: '2026-11-17T00:00:00Z', source: 'csv', fileName: 'x.csv', window: '48h', note: '', rows, totals: null }
    const next = applyImport(state, record)
    const v1 = next.videos.find((item) => item.id === 'v1')
    expect(v1?.views48h).toBe(1000000)
    expect(v1?.views7d).toBeNull()
    expect(v1?.apv).toBe(86.5)
    expect(v1?.youtubeId).toBe('abcdefghijk')
    expect(next.imports).toHaveLength(1)
  })
  it('"outro período" não mexe nas views do diário', () => {
    const state = { ...seedState(), videos: [video({ id: 'v1', title: 'x', youtubeId: 'abcdefghijk', views48h: 5 })] }
    const parse = readStudioCsv(EN)
    if (parse.kind !== 'videos') throw new Error()
    const rows = suggestLinks(parse.rows, state.videos)
    const next = applyImport(state, { id: 'i', createdAt: '', source: 'csv', fileName: '', window: 'periodo', note: '', rows, totals: null })
    expect(next.videos[0].views48h).toBe(5)
    expect(next.videos[0].viewed).toBe(82.4)
  })
})

describe('print', () => {
  it('acha as métricas no texto do OCR', () => {
    const text = `Visão geral
Visualizações
1,2 mi
Assistiram 78,4%
Deslizaram 21,6%
Duração média da visualização 0:21
Porcentagem média visualizada 92,3%
Inscritos +1.540
Pesquisa do YouTube 12,5%`
    const { values } = readPrintText(text)
    expect(values.views).toBe(1200000)
    expect(values.viewed).toBe(78.4)
    expect(values.apv).toBe(92.3)
    expect(values.avgViewSec).toBe(21)
    expect(values.subscribers).toBe(1540)
    expect(values.searchPct).toBe(12.5)
  })
  it('usa 100 − deslizaram quando não acha "assistiram"', () => {
    const { values } = readPrintText('Viewed vs. swiped away\nSwiped away 30%\nViews 45K')
    expect(values.viewed).toBe(70)
    expect(values.views).toBe(45000)
  })
})

describe('relatório por etapa', () => {
  it('aponta o gargalo na etapa com menor taxa', () => {
    const parse = readStudioCsv(EN)
    if (parse.kind !== 'videos') throw new Error()
    const record: ImportRecord = { id: 'i', createdAt: '', source: 'csv', fileName: '', window: 'periodo', note: '', rows: parse.rows, totals: null }
    const report = buildReport(entriesFromImport(record, []), 500000)
    const gancho = report.stages.find((stage) => stage.id === 'gancho')
    expect(gancho?.hits).toBe(1)
    const retencao = report.stages.find((stage) => stage.id === 'retencao')
    expect(retencao?.checks.map((check) => check.goal)).toEqual([50, 65])
    expect(report.bottleneck?.id).toBe('fidelizacao')
    expect(gancho?.rate).toBe(0.5)
    expect(retentionGoal(null)).toBe(70)
    expect(report.enoughData).toBe(false)
  })
})
