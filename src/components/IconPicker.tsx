import { useMemo, useState } from 'react'
import { ICON_CHOICES } from '@/data/icons'
import { AppIcon } from '@/data/icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

export function IconPicker({ value, onChange }: { value: string; onChange: (name: string) => void }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const choices = useMemo(() => {
    const text = query.trim().toLowerCase()
    if (!text) return ICON_CHOICES
    return ICON_CHOICES.filter((choice) => choice.label.toLowerCase().includes(text) || choice.name.toLowerCase().includes(text))
  }, [query])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="gap-2">
          <AppIcon name={value} className="size-5" />
          Escolher ícone
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">Ícone de traço</DialogTitle>
        </DialogHeader>
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar, por exemplo capacete" aria-label="Buscar ícone" />
        <div className="grid grid-cols-4 gap-2">
          {choices.map((choice) => (
            <button
              key={choice.name}
              type="button"
              aria-pressed={value === choice.name}
              aria-label={choice.label}
              onClick={() => {
                onChange(choice.name)
                setOpen(false)
              }}
              className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border text-xs ${value === choice.name ? 'border-foreground bg-foreground text-background' : 'bg-card'}`}
            >
              <AppIcon name={choice.name} className="size-5" />
              {choice.label}
            </button>
          ))}
        </div>
        {choices.length === 0 ? <p className="text-sm">Nenhum ícone com esse nome.</p> : null}
      </DialogContent>
    </Dialog>
  )
}
