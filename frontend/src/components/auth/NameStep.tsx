import { useEffect, useRef, useState } from 'react'
import { inputCls, primaryBtn, stepIn, title } from './styles'

// Letters (any language), spaces, apostrophes, dots and hyphens; 1 to 40 characters.
const NAME = /^[\p{L}][\p{L}\s'’.-]{0,39}$/u
const isName = (s: string) => NAME.test(s.trim())

interface Props {
  first: string
  last: string
  onChange: (first: string, last: string) => void
  onNext: () => void
}

export default function NameStep({ first, last, onChange, onNext }: Props) {
  const firstInput = useRef<HTMLInputElement>(null)
  const lastInput = useRef<HTMLInputElement>(null)
  const [touched, setTouched] = useState({ first: false, last: false })
  const firstOk = isName(first)
  const lastOk = isName(last)

  useEffect(() => {
    const id = window.setTimeout(() => firstInput.current?.focus(), 350)
    return () => window.clearTimeout(id)
  }, [])

  const field = (
    id: 'first' | 'last',
    label: string,
    value: string,
    ok: boolean,
    autoComplete: string,
    ref: React.RefObject<HTMLInputElement | null>,
    hint: string,
    enterKeyHint: 'next' | 'done',
  ) => {
    const showError = touched[id] && !ok
    return (
      <div>
        <label htmlFor={`name-${id}`} className="mb-1 block text-sm font-bold">
          {label}
        </label>
        <input
          id={`name-${id}`}
          ref={ref}
          type="text"
          autoComplete={autoComplete}
          enterKeyHint={enterKeyHint}
          maxLength={40}
          value={value}
          aria-invalid={showError}
          aria-describedby={showError ? `name-${id}-err` : undefined}
          onChange={(e) =>
            id === 'first' ? onChange(e.target.value, last) : onChange(first, e.target.value)
          }
          onBlur={() => setTouched((t) => ({ ...t, [id]: true }))}
          className={`${inputCls} ${showError ? 'border-error-ink' : ''}`}
        />
        {showError && (
          <p id={`name-${id}-err`} role="alert" className="mt-1 text-sm font-semibold text-error-ink">
            {hint}
          </p>
        )}
      </div>
    )
  }

  return (
    <form
      className={stepIn}
      onSubmit={(e) => {
        e.preventDefault()
        setTouched({ first: true, last: true })
        if (firstOk && lastOk) onNext()
        // Say what is missing and put the cursor there.
        else if (!firstOk) firstInput.current?.focus()
        else lastInput.current?.focus()
      }}
    >
      <h1 className={title}>What should we call you?</h1>
      <p className="mt-1 text-base text-muted">Your name stays on this phone.</p>

      <div className="mt-6 space-y-4">
        {field('first', 'First name', first, firstOk, 'given-name', firstInput, 'Please enter your first name.', 'next')}
        {field('last', 'Last name', last, lastOk, 'family-name', lastInput, 'Please enter your last name.', 'done')}
      </div>

      <button type="submit" className={`${primaryBtn} mt-6`}>
        Continue
      </button>
    </form>
  )
}
