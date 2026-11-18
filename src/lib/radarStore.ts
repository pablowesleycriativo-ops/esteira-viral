import { idbGet, idbSet } from '@/lib/db'
import { sanitizeRadar, type KeyValue, type RadarBundle } from '@/lib/radar'

const KEY = 'radar'

export async function loadRadar(now = Date.now()): Promise<RadarBundle> {
  const saved = await idbGet<unknown>(KEY)
  return sanitizeRadar(saved, now)
}

export async function saveRadar(bundle: RadarBundle): Promise<void> {
  await idbSet(KEY, bundle)
}

export function browserStorage(): KeyValue | null {
  try {
    if (typeof localStorage === 'undefined') return null
    const probe = 'esteira-viral.probe'
    localStorage.setItem(probe, '1')
    localStorage.removeItem(probe)
    return {
      get: (key) => localStorage.getItem(key),
      set: (key, value) => localStorage.setItem(key, value),
      remove: (key) => localStorage.removeItem(key),
    }
  } catch {
    return null
  }
}
