import { Check } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { PurposeId } from '../../auth/profile'
import { PURPOSES } from '../../auth/purposes'
import { primaryBtn, stepIn, title } from './styles'

interface Props {
  firstName: string
  /** Called after the short "all set" moment. */
  onFinish: (purpose: PurposeId) => void
}

export default function PurposeStep({ firstName, onFinish }: Props) {
  const [picked, setPicked] = useState<PurposeId | null>(null)
  const [done, setDone] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const finish = () => {
    if (!picked) return
    setDone(true)
    timer.current = window.setTimeout(() => onFinish(picked), 1100)
  }

  if (done) {
    return (
      <div className={`${stepIn} flex flex-col items-center text-center`} aria-live="polite">
        <span className="flex h-20 w-20 animate-[pop_450ms_ease-out_both] items-center justify-center rounded-full bg-mint text-cool motion-reduce:animate-none">
          <Check size={40} strokeWidth={3} aria-hidden="true" />
        </span>
        <h1 className={`${title} mt-5`}>You are all set{firstName ? `, ${firstName}` : ''}!</h1>
        <p className="mt-1 text-base text-muted">Opening Cool Route…</p>
      </div>
    )
  }

  return (
    <div className={stepIn}>
      <h1 className={title}>What brings you here today?</h1>
      <p className="mt-1 text-base text-muted">Pick the one that fits best.</p>

      <div role="radiogroup" aria-label="What brings you here today" className="mt-6 grid grid-cols-2 gap-3">
        {PURPOSES.map(({ id, label, icon: Icon }) => {
          const on = picked === id
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setPicked(id)}
              className={`relative flex min-h-28 flex-col items-start justify-between rounded-lg border-2 p-3 text-left shadow-card transition active:scale-[0.98] motion-reduce:transition-none ${
                on ? 'border-cool bg-mint' : 'border-sky bg-white'
              }`}
            >
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-full ${
                  on ? 'bg-white text-cool' : 'bg-powder text-cool'
                }`}
              >
                <Icon size={20} aria-hidden="true" />
              </span>
              <span className="text-sm font-bold leading-snug">{label}</span>
              {on && (
                <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-cool text-white">
                  <Check size={14} strokeWidth={3} aria-hidden="true" />
                </span>
              )}
            </button>
          )
        })}
      </div>

      <p className="mt-3 min-h-5 text-xs font-semibold text-muted" aria-live="polite">
        {picked === 'heat-safety' && 'We will start you on High heat sensitivity.'}
      </p>

      <button type="button" disabled={!picked} onClick={finish} className={`${primaryBtn} mt-3`}>
        Finish
      </button>
    </div>
  )
}
