import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CRITERIA, TEST_HOWTO } from '@/data/facts'
import { formatPicture } from '@/data/formatImages'
import { formatDecimal } from '@/lib/format'
import { compareFormats, criteriaAverage } from '@/lib/scores'
import { useApp } from '@/state/store'
import type { FormatFilter, SortKey } from '@/types'
import { Card, PageIntro, Portrait, ScoreBar, StatusBadge } from '@/components/bits'

const FILTERS: { id: FormatFilter; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'catalogo', label: 'No catálogo' },
  { id: 'teste', label: 'Em teste' },
  { id: 'rebaixado', label: 'Rebaixados' },
]

const SORTS: { id: SortKey; label: string }[] = [
  { id: 'media', label: 'Média' },
  { id: 'resultado', label: 'Resultado' },
  { id: 'reaproveitamento', label: 'Reaproveitamento' },
  { id: 'dificuldade', label: 'Dificuldade' },
]

export function FormatsPage() {
  const { state } = useApp()
  const [filter, setFilter] = useState<FormatFilter>('todos')
  const [sort, setSort] = useState<SortKey>('media')
  const [direction, setDirection] = useState<'asc' | 'desc'>('desc')

  const visible = useMemo(() => {
    const list = state.formats.filter((format) => (filter === 'todos' ? true : format.status === filter))
    return [...list].sort((a, b) => compareFormats(a, b, sort, direction))
  }, [state.formats, filter, sort, direction])

  return (
    <div className="flex flex-col gap-4">
      <PageIntro
        title="Formatos"
        lede="Nove formatos do caderno de 7/nov e três candidatos ao nº 10. A média usa só os critérios que têm nota. Materiais, tempo e validação começam a avaliar."
      />
      <p className="text-sm leading-relaxed text-muted-foreground">{TEST_HOWTO}</p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((item) => {
          const count = state.formats.filter((format) => (item.id === 'todos' ? true : format.status === item.id)).length
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={filter === item.id}
              onClick={() => setFilter(item.id)}
              className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium ${filter === item.id ? 'border-foreground bg-foreground text-background' : 'bg-card'}`}
            >
              {item.label} {count}
            </button>
          )
        })}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {SORTS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={sort === item.id}
            onClick={() => setSort(item.id)}
            className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium ${sort === item.id ? 'border-foreground bg-foreground text-background' : 'bg-card'}`}
          >
            {item.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setDirection((value) => (value === 'desc' ? 'asc' : 'desc'))}
          className="min-h-11 shrink-0 rounded-full border bg-card px-4 text-sm font-medium"
        >
          {direction === 'desc' ? 'Melhor primeiro' : 'Pior primeiro'}
        </button>
      </div>
      <p className="text-sm text-muted-foreground">
        5 é a barra cheia e verde (muito bom). 1 é a barra curta e vermelha (muito ruim). Em dificuldade, 5 = muito fácil. O número ao lado repete a nota.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {visible.map((format) => {
          const average = criteriaAverage(format.criteria)
          const picture = formatPicture(format)
          const open = CRITERIA.filter((item) => format.criteria[item.key] == null).map((item) => item.label)
          return (
            <Link key={format.id} to={`/formatos/${format.id}`} className="block rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
              <Card className="h-full">
                <Portrait
                  image={picture}
                  icon={format.icon}
                  className={picture ? 'mb-3 aspect-[3/4] w-full rounded-xl bg-[#F7F5F0] object-contain' : 'mb-3 aspect-[2/1] w-full rounded-xl'}
                />
                <div className="mb-2 flex items-start justify-between gap-2">
                  <p className="font-heading text-sm font-semibold">
                    {format.number != null ? `#${format.number}` : `Teste ${format.priority ?? ''}`}
                  </p>
                  <StatusBadge status={format.status} />
                </div>
                <h2 className="text-lg leading-snug font-semibold">{format.name}</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {format.summary || 'Sem descrição no caderno.'}
                </p>
                {format.statusNote ? <p className="mt-1 text-sm">{format.statusNote}</p> : null}
                <p className="mt-3 text-sm">
                  Média <span className="font-heading text-xl font-semibold">{average == null ? 'a avaliar' : formatDecimal(average)}</span>
                </p>
                <div className="mt-3 flex flex-col gap-2">
                  {CRITERIA.filter((item) => format.criteria[item.key] != null).map((item) => (
                    <div key={item.key} className="flex items-center justify-between gap-3 text-sm">
                      <span>{item.label}</span>
                      <ScoreBar value={format.criteria[item.key]} label={item.label} />
                    </div>
                  ))}
                  {open.length ? <p className="text-sm">{open.join(', ')}: a avaliar</p> : null}
                </div>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
