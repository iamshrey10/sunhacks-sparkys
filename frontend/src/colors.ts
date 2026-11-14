/**
 * Read a palette colour from the design tokens in index.css, so map drawing
 * (which needs real colour strings) uses the same single source as the CSS.
 */
export const token = (name: string): string =>
  getComputedStyle(document.documentElement)
    .getPropertyValue(`--color-${name}`)
    .trim()

/** Route line colours. Fastest is neutral; coolest is the aqua/teal accent. */
export const FASTEST_TOKEN = 'neutral'
export const COOLEST_TOKEN = 'cool'
