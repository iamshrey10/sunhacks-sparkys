import { LoaderCircle, Phone } from 'lucide-react'
import { AUTH_LIVE } from '../../auth/demoAuth'
import { LogoMark } from '../Brand'
import GoogleLogo from './GoogleLogo'
import { primaryBtn, stepIn, title } from './styles'

interface Props {
  busy: boolean
  error?: string
  onGoogle: () => void
  onPhone: () => void
  onGuest: () => void
}

export default function SignInStep({ busy, error, onGoogle, onPhone, onGuest }: Props) {
  return (
    <div className={`${stepIn} flex flex-col items-center text-center`}>
      <LogoMark size={72} />
      <h1 className={`${title} mt-4`}>Welcome to Cool Route</h1>
      <p className="mt-1 text-base text-muted">Sign in to personalise your walks.</p>

      <div className="mt-8 w-full space-y-3">
        <button
          type="button"
          onClick={onGoogle}
          disabled={busy}
          className="flex min-h-14 w-full items-center justify-center gap-3 rounded-full border-2 border-sky bg-white text-base font-bold text-ink shadow-card transition active:scale-[0.98] disabled:opacity-70 motion-reduce:transition-none"
        >
          {busy ? (
            <LoaderCircle
              size={20}
              className="animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
          ) : (
            <GoogleLogo />
          )}
          {busy ? 'Signing in…' : 'Continue with Google'}
        </button>
        <button
          type="button"
          onClick={onPhone}
          disabled={busy}
          className={`${primaryBtn} flex items-center justify-center gap-3 text-base`}
        >
          <Phone size={20} aria-hidden="true" />
          Continue with phone
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm font-semibold text-error-ink">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={onGuest}
        disabled={busy}
        className="mt-4 min-h-11 px-4 text-sm font-semibold text-muted underline underline-offset-4"
      >
        Continue as guest
      </button>

      {!AUTH_LIVE && (
        <p
          role="note"
          className="mt-6 rounded-lg bg-lavender px-3 py-2 text-xs font-semibold text-ink"
        >
          Demo mode: sign-in is simulated. Nothing is sent or verified, and nothing
          leaves your phone.
        </p>
      )}
    </div>
  )
}
