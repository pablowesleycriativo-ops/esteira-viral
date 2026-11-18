import { describe, expect, it } from 'vitest'
import { buildBackup } from '@/lib/backup'
import { seedState } from '@/data/seed'
import {
  KEY_GUIDE,
  addQuota,
  channelTypicalViews,
  chunk,
  classifyYoutubeError,
  describeFindings,
  estimateChartUnits,
  estimateSearchUnits,
  exhaustQuota,
  ideaFromSubject,
  keyLooksValid,
  matchCharacter,
  median,
  pacificQuotaDate,
  parseIsoDuration,
  parseWatchlist,
  quotaRemaining,
  readApiKey,
  readQuota,
  repeatedTerms,
  sanitizeRadar,
  saveSubject,
  scoreVideos,
  searchRequestUrl,
  summarizeDemand,
  titleHasPhrase,
  trendBetween,
  uploadsPlaylistId,
  videosRequestUrl,
  watchTrend,
  windowStart,
  writeApiKey,
  type KeyValue,
  type ScoredVideo,
  type WatchItem,
} from '@/lib/radar'
import { emptyIdea } from '@/data/seed'

function memory(): KeyValue {
  const data = new Map<string, string>()
  return {
    get: (key) => data.get(key) ?? null,
    set: (key, value) => {
      data.set(key, value)
    },
    remove: (key) => {
      data.delete(key)
    },
  }
}

function video(partial: Partial<ScoredVideo> & Pick<ScoredVideo, 'id' | 'views'>): ScoredVideo {
  return {
    title: partial.id,
    channelId: 'UCchannelchannelchan',
    channelTitle: 'Canal',
    publishedAt: '2026-11-18T02:00:00.000Z',
    thumbnail: '',
    durationSec: 40,
    subscriberCount: 1000,
    subscribersHidden: false,
    typicalViews: 1000,
    baselineSample: 5,
    freshBaseline: false,
    reliable: true,
    multiplier: partial.views / 1000,
    viewsPerHour: partial.views / 10,
    viewsPerDay: (partial.views / 10) * 24,
    outlier: partial.views / 1000 >= 2,
    ...partial,
  }
}

describe('duração e mediana', () => {
  it('lê duração ISO e rejeita o que não é Shorts', () => {
    expect(parseIsoDuration('PT45S')).toBe(45)
    expect(parseIsoDuration('PT1M2S')).toBe(62)
    expect(parseIsoDuration('PT3M')).toBe(180)
    expect(parseIsoDuration('PT10M')).toBe(600)
    expect(parseIsoDuration('P1DT1S')).toBeNull()
  })

  it('calcula a mediana', () => {
    expect(median([])).toBeNull()
    expect(median([4, 1, 9])).toBe(4)
    expect(median([1, 1.1, 4, 5])).toBeCloseTo(2.55)
  })
})

describe('normal do canal', () => {
  const now = new Date('2026-11-18T12:00:00.000Z')
  const old = '2026-10-01T00:00:00.000Z'
  const fresh = '2026-11-18T10:00:00.000Z'

  it('ignora o próprio vídeo e os publicados há menos de 2 dias', () => {
    const typical = channelTypicalViews(
      [
        { id: 'self', publishedAt: old, views: 9_000 },
        { id: 'a', publishedAt: old, views: 800 },
        { id: 'b', publishedAt: old, views: 1_000 },
        { id: 'c', publishedAt: old, views: 1_200 },
        { id: 'new', publishedAt: fresh, views: 20 },
      ],
      now,
      new Set(['self']),
    )
    expect(typical.typical).toBe(1_000)
    expect(typical.sample).toBe(3)
    expect(typical.freshOnly).toBe(false)
  })

  it('não marca fora do normal quando a base só tem vídeos novos', () => {
    const scored = scoreVideos(
      [
        {
          id: 'hot',
          title: 'Hot',
          channelId: 'UCchannelchannelchan',
          channelTitle: 'Canal',
          publishedAt: fresh,
          thumbnail: '',
          views: 10_000,
          durationSec: 30,
        },
      ],
      new Map(),
      new Map([
        [
          'UCchannelchannelchan',
          [
            { id: 'a', publishedAt: fresh, views: 10 },
            { id: 'b', publishedAt: fresh, views: 12 },
            { id: 'c', publishedAt: fresh, views: 11 },
          ],
        ],
      ]),
      now,
    )
    expect(scored[0].freshBaseline).toBe(true)
    expect(scored[0].outlier).toBe(false)
    expect(scored[0].multiplier).toBeGreaterThan(2)
  })
})

describe('demanda', () => {
  it('chama de alta quando dois ou mais passam de 1,5× e a mediana acompanha', () => {
    const summary = summarizeDemand([
      video({ id: 'a', views: 5_000, multiplier: 5, outlier: true }),
      video({ id: 'b', views: 1_100, multiplier: 1.1, outlier: false }),
      video({ id: 'c', views: 4_000, multiplier: 4, outlier: true }),
      video({ id: 'd', views: 1_000, multiplier: 1, outlier: false }),
    ])
    expect(summary.outlierCount).toBe(2)
    expect(summary.medianMultiplier).toBeCloseTo(2.55)
    expect(summary.verdict).toBe('alta')
  })

  it('fica incerto com menos de 3 vídeos e baixo quando ninguém foge do normal', () => {
    expect(summarizeDemand([video({ id: 'a', views: 1000, multiplier: 1, outlier: false })]).verdict).toBe('incerta')
    const low = summarizeDemand([
      video({ id: 'a', views: 900, multiplier: 0.9, outlier: false }),
      video({ id: 'b', views: 1000, multiplier: 1, outlier: false }),
      video({ id: 'c', views: 1100, multiplier: 1.1, outlier: false }),
    ])
    expect(low.verdict).toBe('baixa')
  })

  it('ordena pelo maior multiplicador', () => {
    const sorted = summarizeDemand([
      video({ id: 'baixo', views: 1000, multiplier: 1, outlier: false }),
      video({ id: 'alto', views: 4000, multiplier: 4, outlier: true }),
    ])
    expect(sorted.videoCount).toBe(2)
  })
})

describe('tendência e cota', () => {
  it('sobe ou cai quando as views por dia mudam 15%', () => {
    expect(trendBetween({ medianViewsPerDay: 100, medianMultiplier: 1 }, { medianViewsPerDay: 114, medianMultiplier: 9 })).toBe('estavel')
    expect(trendBetween({ medianViewsPerDay: 100, medianMultiplier: 1 }, { medianViewsPerDay: 115, medianMultiplier: 1 })).toBe('subindo')
    expect(trendBetween({ medianViewsPerDay: 100, medianMultiplier: 1 }, { medianViewsPerDay: 85, medianMultiplier: 4 })).toBe('caindo')
    expect(trendBetween({ medianViewsPerDay: null, medianMultiplier: 1 }, { medianViewsPerDay: null, medianMultiplier: 1.2 })).toBe('subindo')
    expect(trendBetween(null, { medianViewsPerDay: 1, medianMultiplier: 1 })).toBe('sem_comparacao')
  })

  it('zera a conta local na virada do dia da Califórnia', () => {
    expect(pacificQuotaDate(new Date('2026-11-18T07:30:00.000Z'))).toBe('2026-11-17')
    expect(pacificQuotaDate(new Date('2026-11-18T08:30:00.000Z'))).toBe('2026-11-18')
    const storage = memory()
    storage.set('esteira-viral.youtubeQuota', JSON.stringify({ date: '2026-11-17', used: 500 }))
    const next = addQuota(storage, 10, new Date('2026-11-18T08:30:00.000Z'))
    expect(next).toEqual({ date: '2026-11-18', used: 10 })
    expect(quotaRemaining(exhaustQuota(storage, new Date('2026-11-18T08:30:00.000Z')).used)).toBe(0)
    expect(readQuota(storage, new Date('2026-11-18T08:30:00.000Z')).used).toBe(10_000)
  })

  it('estima o gasto de uma busca e do gráfico', () => {
    expect(estimateSearchUnits(0)).toBe(102)
    expect(estimateSearchUnits(20)).toBe(134)
    expect(estimateChartUnits(0)).toBe(1)
    expect(estimateChartUnits(12)).toBe(22)
  })
})

describe('textos que vêm dos títulos', () => {
  it('repete só palavras que aparecem de verdade e reconhece personagem do app', () => {
    const titles = ['Sonic desenha rápido', 'Sonic desenha de novo', 'Goku corre']
    expect(repeatedTerms(titles).map((term) => term.term)).toContain('Sonic')
    expect(titleHasPhrase('Gorilla Boss (Steal an Egg) fight', 'Steal an Egg')).toBe(true)
    const findings = describeFindings(
      [
        video({ id: 'a', title: 'Sonic desenha rápido', views: 1000, outlier: false }),
        video({ id: 'b', title: 'Sonic desenha de novo', views: 1000, outlier: false }),
      ],
      ['Sonic'],
    )
    expect(findings.termSource).toBe('amostra')
    expect(findings.characters).toEqual([{ term: 'Sonic', count: 2 }])
    expect(findings.terms.map((term) => term.term)).not.toContain('Sonic')
  })
})

describe('chave, backup e ideia', () => {
  it('guarda a chave fora do backup', () => {
    const storage = memory()
    writeApiKey(storage, '  AIzaSyTesteChaveLocal123456  ')
    expect(readApiKey(storage)).toBe('AIzaSyTesteChaveLocal123456')
    expect(keyLooksValid(readApiKey(storage))).toBe(true)
    const item: WatchItem = {
      id: 'w1',
      query: 'Sonic',
      window: '7d',
      region: 'BR',
      language: 'pt',
      savedAt: '2026-11-18T12:00:00.000Z',
      snapshots: [],
    }
    const payload = buildBackup(seedState(), { exportedAt: '2026-11-18T00:00:00.000Z', watchlist: [item] })
    const serialized = JSON.stringify(payload)
    expect(serialized).not.toContain('youtubeKey')
    expect(serialized).not.toContain('AIza')
    expect(serialized).toContain('Sonic')
    expect(Object.keys(buildBackup(seedState(), { exportedAt: '2026-11-18T00:00:00.000Z' }))).toEqual([
      'version',
      'exportedAt',
      'formats',
      'characters',
      'videos',
      'steps',
      'settings',
      'ideaDraft',
      'imports',
    ])
    expect(parseWatchlist(payload)).toMatchObject({ present: true, valid: true, items: [item] })
    expect(parseWatchlist({ radarWatchlist: [{ id: 'x', query: 'AIzaSyTesteChaveLocal123456', window: '7d', region: 'BR', language: 'pt' }] }).items).toEqual([])
  })

  it('explica a chave em português e aponta o site publicado', () => {
    const text = KEY_GUIDE.map((step) => `${step.title} ${step.text}`).join(' ')
    expect(text).toContain('YouTube Data API v3')
    expect(text).toContain('pablowesleycriativo-ops.github.io/*')
  })

  it('leva o assunto para a ideia e marca o personagem quando o nome bate', () => {
    const characters = seedState().characters
    const sonic = ideaFromSubject(emptyIdea(), 'desenho do Sonic', characters, ['ASMR', 'Art'])
    expect(sonic.characterId).toBe('chr-sonic')
    expect(sonic.title).toBe('desenho do Sonic')
    expect(sonic.titleTouched).toBe(true)
    const asmr = ideaFromSubject(emptyIdea(), 'ASMR', characters, ['ASMR', 'Art'])
    expect(asmr.keyword).toBe('ASMR')
    expect(asmr.characterId).toBe('')
    expect(matchCharacter('vs', characters)).toBeNull()
  })
})

describe('pedido ao YouTube', () => {
  const now = new Date('2026-11-18T12:00:00.000Z')

  it('monta a busca de Shorts com Brasil e português, e omite o país no modo mundial', () => {
    const brazil = new URL(searchRequestUrl({ key: 'AIzaSyTesteChaveLocal123456', query: 'Sonic', publishedAfter: windowStart('7d', now), region: 'BR', language: 'pt' }))
    expect(brazil.origin + brazil.pathname).toBe('https://www.googleapis.com/youtube/v3/search')
    expect(brazil.searchParams.get('videoDuration')).toBe('short')
    expect(brazil.searchParams.get('order')).toBe('viewCount')
    expect(brazil.searchParams.get('type')).toBe('video')
    expect(brazil.searchParams.get('regionCode')).toBe('BR')
    expect(brazil.searchParams.get('relevanceLanguage')).toBe('pt')
    expect(brazil.searchParams.get('publishedAfter')).toBe('2026-11-11T12:00:00.000Z')
    const world = new URL(searchRequestUrl({ key: 'AIzaSyTesteChaveLocal123456', query: 'Sonic', publishedAfter: windowStart('24h', now), region: 'WORLD', language: 'any' }))
    expect(world.searchParams.has('regionCode')).toBe(false)
    expect(world.searchParams.has('relevanceLanguage')).toBe(false)
  })

  it('não monta lote com mais de 50 vídeos', () => {
    expect(chunk([1, 2, 3], 2)).toEqual([[1, 2], [3]])
    expect(() => videosRequestUrl('key', Array.from({ length: 51 }, (_, index) => String(index)))).toThrow()
    expect(uploadsPlaylistId('UCA1111111111111111111')).toBe('UUA1111111111111111111')
    expect(uploadsPlaylistId('sem-uc')).toBeNull()
  })
})

describe('erros da API', () => {
  it('traduz cota, chave, site e API desligada', () => {
    expect(classifyYoutubeError(403, { error: { errors: [{ reason: 'quotaExceeded' }], message: 'exceeded your quota' } }).kind).toBe('quota')
    expect(classifyYoutubeError(400, { error: { message: 'API key not valid. Please pass a valid API key.', errors: [{ reason: 'badRequest' }] } }).kind).toBe('key')
    const referrer = classifyYoutubeError(403, { error: { errors: [{ reason: 'API_KEY_HTTP_REFERRER_BLOCKED' }], message: 'Requests from referer are blocked.' } })
    expect(referrer.kind).toBe('referrer')
    expect(referrer.message).toContain('pablowesleycriativo-ops.github.io/*')
    expect(classifyYoutubeError(403, { error: { errors: [{ reason: 'accessNotConfigured' }], message: 'has not been used' } }).kind).toBe('disabled')
    expect(classifyYoutubeError(403, { error: { message: 'nope' } }).message).not.toContain('nope')
  })
})

describe('assuntos salvos', () => {
  it('não duplica a mesma medição e compara a última com a anterior', () => {
    const base: WatchItem = {
      id: 'w1',
      query: 'Sonic',
      window: '7d',
      region: 'BR',
      language: 'pt',
      savedAt: '2026-11-17T00:00:00.000Z',
      snapshots: [
        {
          at: '2026-11-17T00:00:00.000Z',
          window: '7d',
          region: 'BR',
          language: 'pt',
          videoCount: 4,
          outlierCount: 1,
          medianMultiplier: 1.2,
          medianViewsPerDay: 1000,
          verdict: 'media',
        },
      ],
    }
    const again = saveSubject(saveSubject([], base), base)
    expect(again).toHaveLength(1)
    expect(again[0].snapshots).toHaveLength(1)
    const later: WatchItem = {
      ...base,
      id: 'w2',
      snapshots: [
        {
          ...base.snapshots[0],
          at: '2026-11-18T00:00:00.000Z',
          medianViewsPerDay: 2000,
          verdict: 'alta',
        },
      ],
    }
    const saved = saveSubject(again, later)
    expect(saved[0].snapshots).toHaveLength(2)
    expect(watchTrend(saved[0])).toBe('subindo')
    const dirty = sanitizeRadar({ watchlist: [{ id: 'x', query: 'AIzaSyTesteChaveLocal123456', window: '7d', region: 'BR', language: 'pt' }], searches: { old: { savedAt: 1, query: 'Sonic', window: '7d', region: 'BR', language: 'pt', videos: [], summary: { videoCount: 0, outlierCount: 0, withBaseline: 0, medianMultiplier: null, medianViewsPerHour: null, medianViewsPerDay: null, verdict: 'sem_amostra' }, units: 0, droppedLong: 0, note: '' } } }, Date.now())
    expect(dirty.watchlist).toEqual([])
    expect(dirty.searches).toEqual({})
  })
})
