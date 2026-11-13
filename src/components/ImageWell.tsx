import { useState } from 'react'
import { readImageFile } from '@/lib/image'
import { Button } from '@/components/ui/button'

export function ImageWell({
  image,
  onImage,
}: {
  image: string | null
  onImage: (value: string | null) => void
}) {
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-2">
      {image ? (
        <img src={image} alt="" className="aspect-video w-full rounded-2xl object-cover" />
      ) : (
        <div className="grid aspect-[2/1] place-items-center rounded-2xl border border-dashed text-sm text-muted-foreground">Sem imagem</div>
      )}
      <div className="flex flex-wrap gap-2">
        <label className="inline-flex min-h-11 cursor-pointer items-center rounded-xl border bg-card px-4 text-sm font-medium">
          Enviar imagem
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (!file) return
              readImageFile(file)
                .then((url) => {
                  onImage(url)
                  setError(null)
                })
                .catch(() => setError('Não consegui ler essa imagem.'))
            }}
          />
        </label>
        {image ? (
          <Button type="button" variant="outline" onClick={() => onImage(null)}>
            Remover imagem
          </Button>
        ) : null}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
