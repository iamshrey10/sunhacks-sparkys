import { Check } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { AUTH_LIVE, DEMO_CODE } from '../../auth/demoAuth'
import { stepIn, title } from './styles'

const LENGTH = 6
const RESEND_SECONDS = 30
const empty = () => Array<string>(LENGTH).fill('')

type Status = 'idle' | 'checking' | 'error' | 'ok'

interface Props {
  /** The masked number the code was sent to. */
  phoneLabel: string
  /** Resolves true when the code is right. */
  onVerify: (code: string) => Promise<boolean>
  onResend: () => Promise<void>
}

export default function OtpStep({ phoneLabel, onVerify, onResend }: Props) {
  const [digits, setDigits] = useState<string[]>(empty)
  const [status, setStatus] = useState<Status>('idle')
  const [errors, setErrors] = useState(0)
  const [seconds, setSeconds] = useState(RESEND_SECONDS)
  const [resent, setResent] = useState(false)
  const boxes = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    const id = window.setTimeout(() => boxes.current[0]?.focus(), 350)
    return () => window.clearTimeout(id)
  }, [])

  useEffect(() => {
    if (seconds <= 0) return
    const id = window.setTimeout(() => setSeconds((s) => s - 1), 1000)
    return () => window.clearTimeout(id)
  }, [seconds])

  const submit = async (code: string) => {
    setStatus('checking')
    const ok = await onVerify(code)
    if (ok) {
      setStatus('ok')
      return
    }
    setStatus('error')
    setErrors((n) => n + 1)
    setDigits(empty())
    window.setTimeout(() => boxes.current[0]?.focus(), 60)
  }

  const onChange = (index: number, raw: string) => {
    if (status === 'checking' || status === 'ok') return
    const typed = raw.replace(/\D/g, '')
    const next = [...digits]
    if (!typed) {
      next[index] = ''
      setDigits(next)
      return
    }
    // Several digits at once: a paste or an autofilled code.
    let i = index
    for (const ch of typed) {
      if (i >= LENGTH) break
      next[i] = ch
      i += 1
    }
    setDigits(next)
    setStatus('idle')
    boxes.current[Math.min(i, LENGTH - 1)]?.focus()
    if (next.every(Boolean)) void submit(next.join(''))
  }

  const onKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      boxes.current[index - 1]?.focus()
    }
  }

  const resend = async () => {
    setResent(false)
    await onResend()
    setSeconds(RESEND_SECONDS)
    setResent(true)
    setDigits(empty())
    setStatus('idle')
    boxes.current[0]?.focus()
  }

  const ring =
    status === 'error'
      ? 'border-error-ink'
      : status === 'ok'
        ? 'border-cool bg-mint'
        : 'border-sky focus:border-cool'

  return (
    <div className={stepIn}>
      <h1 className={title}>Enter the code</h1>
      <p className="mt-1 text-base text-muted">
        We sent a 6-digit code to <span className="font-semibold text-ink">{phoneLabel}</span>.
      </p>

      <div
        key={errors}
        role="group"
        aria-label="Verification code"
        className={`mt-6 flex justify-between gap-2 ${
          errors > 0 ? 'animate-[shake_400ms_ease-in-out] motion-reduce:animate-none' : ''
        }`}
      >
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              boxes.current[i] = el
            }}
            type="text"
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            aria-label={`Digit ${i + 1} of ${LENGTH}`}
            aria-invalid={status === 'error'}
            value={d}
            onChange={(e) => onChange(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            onFocus={(e) => e.target.select()}
            disabled={status === 'checking' || status === 'ok'}
            className={`h-14 w-12 rounded-lg border-2 bg-white text-center text-xl font-bold tabular-nums text-ink outline-none transition-colors motion-reduce:transition-none ${ring}`}
          />
        ))}
      </div>

      <div className="mt-3 min-h-6 text-sm font-semibold" aria-live="polite">
        {status === 'checking' && <span className="text-muted">Checking…</span>}
        {status === 'error' && (
          <span role="alert" className="text-error-ink">
            That code is not right. Try again.
          </span>
        )}
        {status === 'ok' && (
          <span className="inline-flex items-center gap-1.5 text-ink">
            <Check size={16} className="text-cool" aria-hidden="true" /> Verified
          </span>
        )}
        {status === 'idle' && resent && <span className="text-muted">A new code is on its way.</span>}
      </div>

      <div className="mt-2">
        {seconds > 0 ? (
          <p className="text-sm text-muted tabular-nums">Resend code in {seconds}s</p>
        ) : (
          <button
            type="button"
            onClick={() => void resend()}
            className="min-h-11 text-sm font-bold text-ink underline underline-offset-4"
          >
            Resend code
          </button>
        )}
      </div>

      {!AUTH_LIVE && (
        <p
          role="note"
          className="mt-6 rounded-lg bg-lavender px-3 py-2 text-xs font-semibold text-ink"
        >
          Demo mode: no text message is sent. Enter{' '}
          <span className="tabular-nums">{DEMO_CODE}</span>.
        </p>
      )}
    </div>
  )
}
