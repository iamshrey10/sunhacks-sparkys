import { useEffect, useRef } from 'react'
import {
  COUNTRIES,
  digitsOnly,
  formatPhone,
  isValidPhone,
  type Country,
} from '../../auth/phone'
import { inputCls, primaryBtn, stepIn, title } from './styles'

interface Props {
  country: Country
  digits: string
  sending: boolean
  error?: string
  onCountry: (c: Country) => void
  onDigits: (digits: string) => void
  onSend: () => void
}

export default function PhoneStep({
  country,
  digits,
  sending,
  error,
  onCountry,
  onDigits,
  onSend,
}: Props) {
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => {
    // After the slide-in, so the keyboard does not fight the animation.
    const id = window.setTimeout(() => input.current?.focus(), 350)
    return () => window.clearTimeout(id)
  }, [])
  const valid = isValidPhone(country, digits)

  return (
    <form
      className={stepIn}
      onSubmit={(e) => {
        e.preventDefault()
        if (valid && !sending) onSend()
      }}
    >
      <h1 className={title}>What is your phone number?</h1>
      <p className="mt-1 text-base text-muted">
        We will text you a 6-digit code to confirm it is you.
      </p>

      <div className="mt-6 flex gap-2">
        <select
          aria-label="Country"
          value={country.code}
          onChange={(e) =>
            onCountry(COUNTRIES.find((c) => c.code === e.target.value) ?? COUNTRIES[0])
          }
          className="min-h-14 rounded-lg border-2 border-sky bg-white px-3 text-base font-semibold text-ink outline-none focus:border-cool"
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} {c.dial}
            </option>
          ))}
        </select>
        <input
          ref={input}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          enterKeyHint="send"
          aria-label="Phone number"
          aria-invalid={!!error}
          placeholder={country.placeholder}
          value={formatPhone(country, digits)}
          onChange={(e) => onDigits(digitsOnly(e.target.value).slice(0, country.length))}
          className={`${inputCls} flex-1 tabular-nums`}
        />
      </div>

      {error && (
        <p role="alert" className="mt-2 text-sm font-semibold text-error-ink">
          {error}
        </p>
      )}

      <button type="submit" disabled={!valid || sending} className={`${primaryBtn} mt-6`}>
        {sending ? 'Sending…' : 'Send code'}
      </button>
    </form>
  )
}
