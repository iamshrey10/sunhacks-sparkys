interface Props {
  message: string
  /** Label and handler for the action button, e.g. "Retry". */
  actionLabel: string
  onAction: () => void
  onDismiss: () => void
  /** Distance from the bottom of the screen, so it floats above the sheet. */
  bottom: number
}

/** A friendly error message that floats above the sheet, with a Retry button. */
export default function Toast({
  message,
  actionLabel,
  onAction,
  onDismiss,
  bottom,
}: Props) {
  return (
    <div
      role="alert"
      className="absolute inset-x-3 z-[1250] flex items-center gap-2 rounded-lg border border-error-ink/30 bg-error p-2 pl-4 text-error-ink shadow-pop"
      style={{ bottom: bottom + 12 }}
    >
      <p className="min-w-0 flex-1 text-sm font-semibold">{message}</p>
      <button
        type="button"
        onClick={onAction}
        className="min-h-11 shrink-0 rounded-md border border-error-ink bg-white px-4 text-sm font-bold text-error-ink"
      >
        {actionLabel}
      </button>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onDismiss}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-xl font-bold leading-none text-error-ink"
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
  )
}
