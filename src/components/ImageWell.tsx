import { useState } from 'react'
import { readImageFile } from '@/lib/image'
import { Button } from '@/components/ui/button'

export function ImageWell({
  image,
  fallback = null,
  onImage,
  aspect = 'aspect-[3/4]',
}: {
  image: string | null
  fallback?: string | null
  onImage: (value: string | null) => void
  aspect?: string
}) {
  const [error, setError] = useState<string | null>(null)
  const shown = image || fallback

  return (
    <div className="flex flex-col gap-2">
      {shown ? (
        <img src={shown} alt="" className={`${aspect} w-full rounded-2xl bg-[#F7F5F0] object-contain`} />
      ) : (
        <div className={`grid ${aspect} place-items-center rounded-2xl border border-dashed text-sm text-muted-foreground`}>Sem imagem</div>
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
      {fallback && !image ? (
        <p className="text-sm leading-snug text-muted-foreground">Ilustração do formato. Uma imagem sua entra no lugar. Se você apagar a sua, esta volta.</p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
