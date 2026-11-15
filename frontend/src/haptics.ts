/**
 * A very light tap on devices that support vibration. It is silently ignored
 * where the browser (or a WebView without the permission) does not offer it.
 */
export function tap(ms = 10): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(ms)
    }
  } catch {
    /* vibration is not available: nothing to do */
  }
}
