const KEY = 'coolroute.welcomed'

/** True once the person has tapped Get started on this device. */
export function hasSeenWelcome(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function markWelcomeSeen(): void {
  try {
    localStorage.setItem(KEY, '1')
  } catch {
    /* private mode: the welcome simply shows again next time */
  }
}
