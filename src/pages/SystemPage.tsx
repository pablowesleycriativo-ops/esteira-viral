import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { sections } from '@/data/knowledge'
import { PageIntro } from '@/components/bits'

export function SystemPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageIntro title="Sistema" lede="O caderno de 13/nov, para consultar no dia a dia. Quando julho e novembro discordam, novembro vale." />
      <ul className="flex flex-col gap-2">
        {sections.map((section) => (
          <li key={section.slug}>
            <Link to={`/sistema/${section.slug}`} className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border bg-card px-4 py-3">
              <span>
                <span className="block font-semibold">{section.title}</span>
                <span className="block text-sm text-muted-foreground">{section.lede}</span>
              </span>
              <ChevronRight className="size-5 shrink-0" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
