import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { GRADIENT } from './styles'

interface Props {
  /** Zero-based position in the flow, for the progress dots. */
  step: number
  total: number
  onBack?: () => void
  children: ReactNode
}

/** The full-screen frame around every sign-in step: back button, progress, content. */
export default function AuthShell({ step, total, onBack, children }: Props) {
  return (
    <div
      className="fixed inset-0 z-[2900] overflow-y-auto text-ink"
      style={{
        background: GRADIENT,
        paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
        paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))',
      }}
    >
      <div className="mx-auto flex min-h-full w-full max-w-sm flex-col px-6">
        <div className="flex h-11 items-center justify-between">
          {onBack ? (
            <button
              type="button"
              aria-label="Back"
              onClick={onBack}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/70 shadow-card"
            >
              <ArrowLeft size={20} aria-hidden="true" />
            </button>
          ) : (
            <span className="h-11 w-11" />
          )}
          <div
            role="progressbar"
            aria-label="Sign-in progress"
            aria-valuemin={1}
            aria-valuemax={total}
            aria-valuenow={step + 1}
            className="flex gap-1.5"
          >
            {Array.from({ length: total }, (_, i) => (
              <span
                key={i}
                className={`h-2 rounded-full transition-all duration-300 motion-reduce:transition-none ${
                  i === step ? 'w-6 bg-cool' : 'w-2 bg-sky'
                }`}
              />
            ))}
          </div>
          <span className="h-11 w-11" />
        </div>
        <div className="flex flex-1 flex-col justify-center py-6">{children}</div>
      </div>
    </div>
  )
}
