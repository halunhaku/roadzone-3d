import { defaults } from './zone/calc'
import type { Params } from './zone/types'

const PARAMS_KEY = 'roadzone-3d.params.v1'
const FOLDS_KEY = 'roadzone-3d.folds.v1'

export function loadParams(): Params {
  try {
    const raw = localStorage.getItem(PARAMS_KEY)
    if (!raw) return defaults
    const saved = JSON.parse(raw) as Partial<Params>
    const merged: Params = { ...defaults }
    for (const key of Object.keys(defaults) as (keyof Params)[]) {
      const value = saved[key]
      const base = defaults[key]
      const writable = merged as unknown as Record<string, unknown>
      if (typeof base === 'number' && typeof value === 'number' && Number.isFinite(value)) {
        writable[key] = value
      } else if (typeof base === 'string' && typeof value === 'string') {
        writable[key] = value
      } else if (typeof base === 'boolean' && typeof value === 'boolean') {
        writable[key] = value
      }
    }
    return merged
  } catch {
    return defaults
  }
}

export function saveParams(params: Params) {
  try {
    localStorage.setItem(PARAMS_KEY, JSON.stringify(params))
  } catch {
    /* 存储不可用时静默忽略 */
  }
}

export function loadFold(key: string): boolean {
  try {
    const raw = JSON.parse(localStorage.getItem(FOLDS_KEY) ?? '{}') as Record<string, unknown>
    return typeof raw[key] === 'boolean' ? raw[key] : false
  } catch {
    return false
  }
}

export function saveFold(key: string, value: boolean) {
  try {
    const raw = JSON.parse(localStorage.getItem(FOLDS_KEY) ?? '{}') as Record<string, unknown>
    raw[key] = value
    localStorage.setItem(FOLDS_KEY, JSON.stringify(raw))
  } catch {
    /* 存储不可用时静默忽略 */
  }
}
