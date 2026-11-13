import { useParams } from 'react-router-dom'
import { sectionBySlug } from '@/data/knowledge'
import { useApp } from '@/state/store'
import { BackLink, PageIntro } from '@/components/bits'
import { Blocks } from '@/components/Blocks'
import { IconPicker } from '@/components/IconPicker'
import { ImageWell } from '@/components/ImageWell'
import { AppIcon } from '@/data/icons'

export function SystemSectionPage() {
  const { slug } = useParams()
  const section = slug ? sectionBySlug(slug) : undefined
  const { state, updateStep } = useApp()
  if (!section) {
    return (
      <div>
        <BackLink to="/sistema">Sistema</BackLink>
        <p>Essa página não está no caderno.</p>
      </div>
    )
  }

  const steps = [...state.steps].sort((a, b) => a.order - b.order)

  return (
    <div className="flex flex-col gap-4">
      <BackLink to="/sistema">Sistema</BackLink>
      <PageIntro title={section.title} lede={section.lede} />
      <Blocks blocks={section.blocks} />
      {section.custom === 'esteira' ? (
        <ol className="flex flex-col gap-3">
          {steps.map((step) => (
            <li key={step.id} className="rounded-2xl border bg-card p-4">
              <div className="mb-3 flex items-center gap-3">
                <span className="grid size-12 place-items-center rounded-xl bg-muted">
                  {step.image ? <img src={step.image} alt="" className="size-12 rounded-xl object-cover" /> : <AppIcon name={step.icon} className="size-6" />}
                </span>
                <span>
                  <span className="block text-sm text-muted-foreground">{step.order}</span>
                  <span className="block font-semibold">{step.title}</span>
                </span>
              </div>
              <p className="text-sm leading-relaxed">{step.detail}</p>
              <div className="mt-3 flex flex-col gap-3">
                <ImageWell image={step.image} onImage={(image) => updateStep(step.id, { image })} />
                <IconPicker value={step.icon} onChange={(icon) => updateStep(step.id, { icon })} />
              </div>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  )
}
