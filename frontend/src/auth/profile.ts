// The signed-in person and what they told us. Stored only on this device
// (localStorage); nothing here is sent to a server.

export type SignInMethod = 'google' | 'phone' | 'guest'

export type PurposeId =
  | 'class'
  | 'errands'
  | 'explore'
  | 'outdoor-work'
  | 'heat-safety'
  | 'curious'

export interface Profile {
  method: SignInMethod
  /** A masked phone number, or a label such as "Google (demo)". */
  contact?: string
  firstName: string
  lastName: string
  purpose?: PurposeId
  createdAt: number
}

const KEY = 'coolroute.profile'
const METHODS: SignInMethod[] = ['google', 'phone', 'guest']

let cache: Profile | null | undefined
const listeners = new Set<() => void>()

function parse(raw: string | null): Profile | null {
  if (!raw) return null
  try {
    const p = JSON.parse(raw)
    if (
      p &&
      METHODS.includes(p.method) &&
      typeof p.firstName === 'string' &&
      typeof p.lastName === 'string' &&
      typeof p.createdAt === 'number'
    ) {
      return p as Profile
    }
  } catch {
    /* fall through */
  }
  return null
}

/** The saved profile, or null when nobody is signed in. Safe if storage is blocked. */
export function getProfile(): Profile | null {
  if (cache !== undefined) return cache
  try {
    cache = parse(localStorage.getItem(KEY))
  } catch {
    cache = null
  }
  return cache
}

export function saveProfile(profile: Profile): void {
  cache = profile
  try {
    localStorage.setItem(KEY, JSON.stringify(profile))
  } catch {
    /* private mode: the profile lasts for this session */
  }
  listeners.forEach((l) => l())
}

export function clearProfile(): void {
  cache = null
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* nothing saved */
  }
  listeners.forEach((l) => l())
}

export function subscribeProfile(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function initials(p: Profile): string {
  const a = p.firstName.trim()[0] ?? ''
  const b = p.lastName.trim()[0] ?? ''
  return (a + b).toUpperCase()
}
