import { describe, expect, it } from 'vitest'
import { formatPicture } from '@/data/formatImages'
import { normalizeState } from '@/lib/backup'
import { seedState } from '@/data/seed'
import { decideCharacter, diagnose } from '@/lib/decision'
import { formatDecimal, titleHasDate, wordCount } from '@/lib/format'
import { compareFormats, criteriaAverage } from '@/lib/scores'
import { weekBalance } from '@/lib/week'
import type { Character, Settings, Video } from '@/types'

const ranking = [
  'Personagem Bombado Transformation',
  'Comer o Desenho e Devolver Transformado',
  'Tattoo Fake + Reação do Personagem',
  'Professor vs Aluno — Desenho Simples',
  'Quiz Reaproveitando Desenho Feito',
  'Um Contra o Outro com Personagem em Alta',
  'Trolagem de Rabisco com Reviravolta',
  'Processo Criativo com personagens em cima',
  'Modelando Clay — Processo Criativo',
]

describe('caderno de formatos', () => {
  const state = seedState()

  it('reproduz a média publicada em 7/nov', () => {
    const expected: Record<string, string> = {
      'fmt-1': '4,0',
      'fmt-2': '2,3',
      'fmt-3': '3,3',
      'fmt-4': '3,7',
      'fmt-5': '1,3',
      'fmt-6': '4,0',
      'fmt-7': '3,0',
      'fmt-8': '3,3',
      'fmt-9': '3,0',
    }
    for (const [id, label] of Object.entries(expected)) {
      const format = state.formats.find((item) => item.id === id)
      expect(format).toBeTruthy()
      expect(formatDecimal(criteriaAverage(format!.criteria)!)).toBe(label)
    }
  })

  it('ordena os 9 como o ranking do caderno', () => {
    const nine = state.formats.filter((format) => format.number != null).sort((a, b) => compareFormats(a, b, 'media', 'desc'))
    expect(nine.map((format) => format.name)).toEqual(ranking)
  })

  it('separa catálogo, teste e rebaixados', () => {
    expect(state.formats.filter((format) => format.status === 'catalogo')).toHaveLength(7)
    expect(state.formats.filter((format) => format.status === 'teste')).toHaveLength(3)
    expect(state.formats.filter((format) => format.status === 'rebaixado').map((format) => format.name)).toEqual([
      'Processo Criativo com personagens em cima',
      'Modelando Clay — Processo Criativo',
    ])
  })
})

function video(partial: Partial<Video> & Pick<Video, 'id' | 'formatId' | 'characterId'>): Video {
  return {
    createdAt: partial.createdAt ?? partial.id,
    date: partial.date ?? '2026-11-10',
    title: partial.title ?? partial.id,
    durationSec: null,
    views48h: null,
    views7d: null,
    apv: null,
    viewed: null,
    subscribers: null,
    searchPct: null,
    lesson: '',
    formatStatus: 'catalogo',
    ...partial,
  }
}

const settings = (average: number | null): Settings => ({ channelAverage: average, averageBasis: '48h' })

describe('modo 4', () => {
  const base = seedState().characters[0]

  function character(patch: Partial<Character>): Character {
    return { ...base, ...patch }
  }

  it('pede teste barato quando o externo é alto e não houve teste', () => {
    const decision = decideCharacter(character({ external: 4, internal: 'nao_testado' }), [], [], settings(null), '2026-11-13')
    expect(decision.seal).toBe('testar')
  })

  it('manda produzir capacete com interno alto, evergreen e encaixe', () => {
    const decision = decideCharacter(
      character({ internal: 4, window: 'evergreen', fit: 3, external: 2, helmetCost: 5 }),
      [],
      [],
      settings(null),
      '2026-11-13',
    )
    expect(decision.seal).toBe('produzir')
  })

  it('arquiva no terceiro formato que falha', () => {
    const formats = seedState().formats
    const videos = ['fmt-1', 'fmt-3', 'fmt-4'].map((formatId, index) =>
      video({ id: `v${index}`, formatId, characterId: base.id, views48h: 10, date: `2026-11-1${index}` }),
    )
    const decision = decideCharacter(base, videos, formats, settings(100), '2026-11-13')
    expect(decision.failedFormats).toBe(3)
    expect(decision.seal).toBe('arquivar')
  })

  it('ramifica quando o capacete está pronto e o resultado cai', () => {
    const videos = [
      video({ id: 'a', formatId: 'fmt-1', characterId: base.id, views48h: 200, date: '2026-11-01', createdAt: 'a' }),
      video({ id: 'b', formatId: 'fmt-1', characterId: base.id, views48h: 50, date: '2026-11-08', createdAt: 'b' }),
    ]
    const decision = decideCharacter(
      character({ helmetReady: true, external: 5, internal: 5, window: 'evergreen', fit: 5 }),
      videos,
      seedState().formats,
      settings(100),
      '2026-11-13',
    )
    expect(decision.seal).toBe('ramificar')
  })

  it('deixa a avaliar quando faltam dados', () => {
    const decision = decideCharacter(base, [], [], settings(null), '2026-11-13')
    expect(decision.seal).toBe('avaliar')
  })
})

describe('diagnóstico e semana', () => {
  it('aponta hook falho e busca fraca', () => {
    const result = diagnose(
      video({ id: 'd', formatId: 'fmt-1', characterId: 'chr-harlow', apv: 40, searchPct: 10, views48h: 5000, subscribers: 10 }),
    )
    expect(result.findings.map((item) => item.symptom)).toEqual(['APV abaixo de 50%', 'Muitas views, poucos inscritos', 'Tráfego de busca < 30%'])
  })

  it('não trata semana vazia como zero por cento de teste', () => {
    expect(weekBalance([], new Date(2026, 10, 13)).alert).toBe('vazio')
  })

  it('alerta acima de 30% e em zero', () => {
    const now = new Date(2026, 10, 13)
    const tests = [1, 2].map((n) => video({ id: `t${n}`, formatId: 'fmt-veneno', characterId: 'chr-harlow', date: '2026-11-12', formatStatus: 'teste' }))
    const catalog = video({ id: 'c', formatId: 'fmt-1', characterId: 'chr-harlow', date: '2026-11-11', formatStatus: 'catalogo' })
    expect(weekBalance([...tests, catalog], now).alert).toBe('demais')
    expect(weekBalance([catalog], now).alert).toBe('zero')
    const more = [2, 3].map((n) => video({ id: `c${n}`, formatId: 'fmt-6', characterId: 'chr-sonic', date: '2026-11-10' }))
    expect(weekBalance([tests[0], catalog, ...more], now).alert).toBe('ok')
  })
})

describe('ilustrações', () => {
  it('usa a arte do formato quando não há upload e volta a ela se o upload sai', () => {
    const bombado = seedState().formats.find((format) => format.id === 'fmt-1')!
    expect(bombado.image).toBeNull()
    const builtIn = formatPicture(bombado)
    expect(builtIn).toMatch(/01-bombado/)
    expect(formatPicture({ ...bombado, image: 'data:image/jpeg;base64,abc' })).toBe('data:image/jpeg;base64,abc')
    expect(formatPicture({ ...bombado, image: null })).toBe(builtIn)
    expect(formatPicture({ id: 'fmt-veneno', image: null })).toBeNull()
  })
})

describe('backup', () => {
  it('aceita o caderno de volta', () => {
    const again = normalizeState({ version: 1, ...seedState() })
    expect(again.formats).toHaveLength(12)
    expect(again.characters[0]?.name).toBe('Dr. Harlow')
    expect(again.videos).toHaveLength(0)
  })
})

describe('título', () => {
  it('conta palavras e recusa data', () => {
    expect(wordCount('Dr. Harlow joga o veneno Animation')).toBe(6)
    expect(titleHasDate('Sonic desenho novembro')).toBe(true)
    expect(titleHasDate('Sonic desenho engraçado')).toBe(false)
  })
})
