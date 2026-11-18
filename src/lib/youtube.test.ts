import { describe, expect, it } from 'vitest'
import { emptyRadar, rememberChannel, searchCacheKey, windowStart } from '@/lib/radar'
import { plainError, runPopularChart, runThemeSearch } from '@/lib/youtube'

const now = new Date('2026-11-18T12:00:00.000Z')
const published = '2026-11-18T02:00:00.000Z'
const old = '2026-10-01T00:00:00.000Z'
const channelA = 'UCA1111111111111111111'
const channelB = 'UCB2222222222222222222'
const key = 'AIzaSyTesteChaveLocal123456'

function item(id: string, channelId: string, title: string, views: number, duration: string, publishedAt: string) {
  return {
    id,
    snippet: {
      title,
      channelId,
      channelTitle: channelId === channelA ? 'Canal A' : 'Canal B',
      publishedAt,
      thumbnails: { medium: { url: `https://i.ytimg.com/vi/${id}/mqdefault.jpg` } },
    },
    statistics: { viewCount: String(views) },
    contentDetails: { duration },
  }
}

const catalog: Record<string, ReturnType<typeof item>> = {
  v1: item('v1', channelA, 'Sonic desenha rapido', 5000, 'PT50S', published),
  v2: item('v2', channelA, 'Sonic cafe', 1100, 'PT40S', published),
  v3: item('v3', channelB, 'Goku desenha rapido', 8000, 'PT55S', published),
  v4: item('v4', channelB, 'Goku corrida', 2000, 'PT30S', published),
  vlong: item('vlong', channelA, 'Sonic longo', 99999, 'PT10M', published),
  a1: item('a1', channelA, 'antigo a1', 800, 'PT40S', old),
  a2: item('a2', channelA, 'antigo a2', 1000, 'PT40S', old),
  a3: item('a3', channelA, 'antigo a3', 1200, 'PT40S', old),
  b1: item('b1', channelB, 'antigo b1', 1500, 'PT40S', old),
  b2: item('b2', channelB, 'antigo b2', 2000, 'PT40S', old),
  b3: item('b3', channelB, 'antigo b3', 2500, 'PT40S', old),
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

function mockApi(overrides?: { fail?: 'quota' | 'referrer' | 'offline' }) {
  const calls: URL[] = []
  const fetchImpl: typeof fetch = async (input) => {
    const url = new URL(String(input))
    calls.push(url)
    if (overrides?.fail === 'offline') throw new Error(`network ${url.toString()}`)
    if (overrides?.fail && url.pathname.endsWith('/search')) {
      const reason = overrides.fail === 'quota' ? 'quotaExceeded' : 'API_KEY_HTTP_REFERRER_BLOCKED'
      const message = overrides.fail === 'quota' ? 'exceeded your quota' : 'Requests from referer are blocked.'
      return json({ error: { message, errors: [{ reason }] } }, 403)
    }
    if (url.pathname.endsWith('/search')) {
      return json({ items: ['v1', 'v2', 'v3', 'v4', 'vlong'].map((videoId) => ({ id: { videoId } })) })
    }
    if (url.pathname.endsWith('/playlistItems')) {
      const playlist = url.searchParams.get('playlistId')
      const ids = playlist?.startsWith('UUA') ? ['a1', 'a2', 'a3', 'v1'] : ['b1', 'b2', 'b3']
      return json({ items: ids.map((videoId) => ({ contentDetails: { videoId } })) })
    }
    if (url.pathname.endsWith('/channels')) {
      const ids = (url.searchParams.get('id') ?? '').split(',').filter(Boolean)
      return json({
        items: ids.map((id) => ({
          id,
          statistics: { subscriberCount: id === channelA ? '120000' : '50000', hiddenSubscriberCount: false },
        })),
      })
    }
    if (url.pathname.endsWith('/videos')) {
      if (url.searchParams.get('chart') === 'mostPopular') {
        return json({ items: [catalog.v1, catalog.vlong] })
      }
      const ids = (url.searchParams.get('id') ?? '').split(',').filter(Boolean)
      expect(ids.length).toBeLessThanOrEqual(50)
      return json({ items: ids.map((id) => catalog[id]) })
    }
    return json({ error: { message: 'unexpected' } }, 500)
  }
  return { fetchImpl, calls }
}

function track() {
  const spent: number[] = []
  return {
    spent,
    onUnits: (units: number) => spent.push(units),
    onQuotaExhausted: () => spent.push(-1),
  }
}

describe('busca de assunto', () => {
  it('mede o multiplicador com a API simulada e não gasta cota de novo na cópia local', async () => {
    const api = mockApi()
    const usage = track()
    const first = await runThemeSearch({
      bundle: emptyRadar(),
      key,
      query: 'Sonic',
      window: '7d',
      region: 'BR',
      language: 'pt',
      now,
      fetchImpl: api.fetchImpl,
      onUnits: usage.onUnits,
      onQuotaExhausted: usage.onQuotaExhausted,
    })
    expect(first.fromCache).toBe(false)
    expect(first.result.droppedLong).toBe(1)
    expect(first.result.videos.map((video) => video.id)).toEqual(['v1', 'v3', 'v2', 'v4'])
    expect(first.result.videos[0].multiplier).toBe(5)
    expect(first.result.videos[0].subscriberCount).toBe(120_000)
    expect(first.result.videos[0].outlier).toBe(true)
    expect(first.result.videos[0].thumbnail.startsWith('https://i.ytimg.com/')).toBe(true)
    expect(first.result.summary.outlierCount).toBe(2)
    expect(first.result.summary.medianMultiplier).toBeCloseTo(2.55)
    expect(first.result.summary.medianViewsPerDay).toBe(8400)
    expect(first.result.summary.verdict).toBe('alta')
    expect(first.result.units).toBe(106)
    expect(usage.spent.reduce((sum, value) => sum + value, 0)).toBe(106)
    const searchUrl = api.calls[0]
    expect(searchUrl.searchParams.get('regionCode')).toBe('BR')
    expect(searchUrl.searchParams.get('publishedAfter')).toBe(windowStart('7d', now))
    expect(api.calls.every((url) => url.origin === 'https://www.googleapis.com')).toBe(true)
    const before = api.calls.length
    const second = await runThemeSearch({
      bundle: first.bundle,
      key,
      query: 'sonic',
      window: '7d',
      region: 'BR',
      language: 'pt',
      now,
      fetchImpl: api.fetchImpl,
      onUnits: usage.onUnits,
      onQuotaExhausted: usage.onQuotaExhausted,
    })
    expect(second.fromCache).toBe(true)
    expect(api.calls.length).toBe(before)
    expect(second.result.summary.verdict).toBe('alta')
    expect(searchCacheKey('Sonic', '7d', 'BR', 'pt') in first.bundle.searches).toBe(true)
  })

  it('pula a leitura do canal quando ela já está neste aparelho', async () => {
    const api = mockApi()
    const usage = track()
    let bundle = emptyRadar()
    bundle = rememberChannel(bundle, {
      channelId: channelA,
      fetchedAt: now.getTime(),
      subscriberCount: 120_000,
      subscribersHidden: false,
      videos: [
        { id: 'a1', publishedAt: old, views: 800 },
        { id: 'a2', publishedAt: old, views: 1000 },
        { id: 'a3', publishedAt: old, views: 1200 },
      ],
    })
    bundle = rememberChannel(bundle, {
      channelId: channelB,
      fetchedAt: now.getTime(),
      subscriberCount: 50_000,
      subscribersHidden: false,
      videos: [
        { id: 'b1', publishedAt: old, views: 1500 },
        { id: 'b2', publishedAt: old, views: 2000 },
        { id: 'b3', publishedAt: old, views: 2500 },
      ],
    })
    const result = await runThemeSearch({
      bundle,
      key,
      query: 'Sonic',
      window: '7d',
      region: 'BR',
      language: 'pt',
      now,
      fetchImpl: api.fetchImpl,
      onUnits: usage.onUnits,
      onQuotaExhausted: usage.onQuotaExhausted,
    })
    expect(api.calls.some((url) => url.pathname.endsWith('/playlistItems'))).toBe(false)
    expect(result.result.units).toBe(102)
    expect(result.result.videos[0].multiplier).toBe(5)
  })

  it('traduz cota, site bloqueado e falta de internet sem mostrar a chave', async () => {
    for (const fail of ['quota', 'referrer', 'offline'] as const) {
      const api = mockApi({ fail })
      let exhausted = 0
      const spent: number[] = []
      const promise = runThemeSearch({
        bundle: emptyRadar(),
        key,
        query: 'Sonic',
        window: '24h',
        region: 'WORLD',
        language: 'any',
        now,
        fetchImpl: api.fetchImpl,
        onUnits: (units) => spent.push(units),
        onQuotaExhausted: () => {
          exhausted += 1
        },
      })
      await expect(promise).rejects.toThrow()
      try {
        await promise
      } catch (error) {
        const message = plainError(error)
        expect(message).not.toContain(key)
        expect(message).not.toContain('AIza')
        if (fail === 'quota') expect(message).toContain('cota')
        if (fail === 'referrer') expect(message).toContain('pablowesleycriativo-ops.github.io/*')
        if (fail === 'offline') expect(message).toContain('internet')
      }
      expect(spent).toEqual([])
      expect(exhausted).toBe(fail === 'quota' ? 1 : 0)
    }
  })
})

describe('topo do Brasil', () => {
  it('fica só com Shorts e aponta personagem que está no título', async () => {
    const api = mockApi()
    const usage = track()
    const outcome = await runPopularChart({
      bundle: emptyRadar(),
      key,
      now,
      characterNames: ['Sonic', 'Dr. Harlow'],
      fetchImpl: api.fetchImpl,
      onUnits: usage.onUnits,
      onQuotaExhausted: usage.onQuotaExhausted,
    })
    expect(outcome.result?.totalListed).toBe(2)
    expect(outcome.result?.videos.map((video) => video.id)).toEqual(['v1'])
    expect(outcome.result?.characters).toEqual([{ term: 'Sonic', count: 1 }])
    expect(outcome.result?.note).toContain('2 vídeos')
    expect(outcome.result?.note).toContain('1')
    expect(api.calls[0].searchParams.get('chart')).toBe('mostPopular')
    expect(api.calls[0].searchParams.get('regionCode')).toBe('BR')
  })
})
