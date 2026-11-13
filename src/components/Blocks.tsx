import type { Block } from '@/data/knowledge'

export function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <div className="flex flex-col gap-4">
      {blocks.map((block, index) => {
        if (block.type === 'p') return <p key={index} className="text-sm leading-relaxed">{block.text}</p>
        if (block.type === 'h') return <h2 key={index} className="pt-2 text-lg font-semibold">{block.text}</h2>
        if (block.type === 'callout') {
          return (
            <p key={index} className="rounded-2xl border bg-card p-4 text-sm leading-relaxed font-medium">
              {block.text}
            </p>
          )
        }
        if (block.type === 'ul' || block.type === 'ol') {
          const Tag = block.type
          return (
            <Tag key={index} className={`flex list-outside flex-col gap-2 pl-5 text-sm leading-relaxed ${block.type === 'ol' ? 'list-decimal' : 'list-disc'}`}>
              {block.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </Tag>
          )
        }
        return (
          <div key={index} className="flex flex-col gap-2">
            {block.rows.map((row) => (
              <article key={row.title} className="rounded-2xl border bg-card p-4">
                <h3 className="text-base font-semibold">{row.title}</h3>
                {row.lines.map((line) => (
                  <p key={line} className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {line}
                  </p>
                ))}
              </article>
            ))}
          </div>
        )
      })}
    </div>
  )
}
