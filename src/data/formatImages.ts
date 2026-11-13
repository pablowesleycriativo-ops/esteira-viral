import bombado from '@/assets/formats/01-bombado.webp'
import processo from '@/assets/formats/02-processo-criativo.webp'
import professor from '@/assets/formats/03-professor-aluno.webp'
import tattoo from '@/assets/formats/04-tattoo-fake.webp'
import clay from '@/assets/formats/05-clay.webp'
import comer from '@/assets/formats/06-comer-desenho.webp'
import trolagem from '@/assets/formats/07-trolagem-rabisco.webp'
import quiz from '@/assets/formats/08-quiz.webp'
import contra from '@/assets/formats/09-um-contra-outro.webp'

const DEFAULTS: Record<string, string> = {
  'fmt-1': bombado,
  'fmt-2': processo,
  'fmt-3': professor,
  'fmt-4': tattoo,
  'fmt-5': clay,
  'fmt-6': comer,
  'fmt-7': trolagem,
  'fmt-8': quiz,
  'fmt-9': contra,
}

export function defaultFormatImage(id: string): string | null {
  return DEFAULTS[id] ?? null
}

export function formatPicture(format: { id: string; image: string | null }): string | null {
  return format.image || defaultFormatImage(format.id)
}
