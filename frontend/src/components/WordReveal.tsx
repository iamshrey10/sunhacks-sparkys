/** Longest stagger between the first and last word, so long texts do not drag. */
const MAX_DELAY_MS = 1200
const STEP_MS = 40

/**
 * Shows text with its words fading in one after another. The whole text is in
 * the DOM from the first frame, exactly as given (only wrapped in spans), so
 * assistive technology reads it at once and the wording is never altered. The
 * motion is pure CSS and is switched off for reduced motion (index.css).
 */
export default function WordReveal({ text }: { text: string }) {
  // Words and the whitespace between them; whitespace stays plain text.
  const parts = text.split(/(\s+)/)
  const isWord = (p: string) => p !== '' && !/^\s+$/.test(p)
  return (
    <p className="text-sm" aria-live="polite">
      {parts.map((part, i) => {
        if (!isWord(part)) return part
        // How many words come before this one decides its delay.
        const before = parts.slice(0, i).filter(isWord).length
        const delay = Math.min(before * STEP_MS, MAX_DELAY_MS)
        return (
          <span
            key={i}
            className="word-in inline-block"
            style={{ animationDelay: `${delay}ms` }}
          >
            {part}
          </span>
        )
      })}
    </p>
  )
}
