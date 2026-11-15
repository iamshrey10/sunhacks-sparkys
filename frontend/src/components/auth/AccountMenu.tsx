import { LogIn, LogOut, User } from 'lucide-react'
import { useState } from 'react'
import { AUTH_LIVE } from '../../auth/demoAuth'
import { initials, type Profile } from '../../auth/profile'
import { purposeLabel } from '../../auth/purposes'

interface Props {
  profile: Profile | null
  onSignOut: () => void
  /** For a guest: go to the sign-in screen. */
  onSignIn: () => void
}

const METHOD_LABEL = {
  google: 'Signed in with Google',
  phone: 'Signed in with phone',
  guest: 'Using Cool Route as a guest',
} as const

/** The little round button in the header, with name, details and sign out. */
export default function AccountMenu({ profile, onSignOut, onSignIn }: Props) {
  const [open, setOpen] = useState(false)
  const guest = !profile || profile.method === 'guest'
  const name = profile ? `${profile.firstName} ${profile.lastName}`.trim() : ''
  const reason = purposeLabel(profile?.purpose)

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Account"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-periwinkle text-xs font-extrabold text-ink shadow-card"
      >
        {guest || !profile ? <User size={16} aria-hidden="true" /> : initials(profile)}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close account menu"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[1250] cursor-default"
          />
          <div
            role="dialog"
            aria-label="Account"
            className="absolute right-0 top-11 z-[1300] w-64 animate-[step-in_200ms_ease-out_both] rounded-lg bg-white p-4 text-left shadow-pop motion-reduce:animate-none"
          >
            <p className="text-lg font-extrabold leading-tight">{name || 'Guest'}</p>
            <p className="mt-0.5 text-sm text-muted">
              {profile ? METHOD_LABEL[profile.method] : METHOD_LABEL.guest}
            </p>
            {profile?.contact && profile.method === 'phone' && (
              <p className="text-sm tabular-nums text-muted">{profile.contact}</p>
            )}
            {reason && (
              <p className="mt-3 rounded-lg bg-powder px-3 py-2 text-sm">
                <span className="font-semibold">Here for:</span> {reason}
              </p>
            )}
            {!AUTH_LIVE && !guest && (
              <p className="mt-3 text-xs text-muted">
                Demo sign-in: details are saved on this phone only.
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                if (guest) onSignIn()
                else onSignOut()
              }}
              className={`mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-bold ${
                guest
                  ? 'border border-cool bg-periwinkle text-ink'
                  : 'border-2 border-sky bg-white text-ink'
              }`}
            >
              {guest ? (
                <LogIn size={16} aria-hidden="true" />
              ) : (
                <LogOut size={16} aria-hidden="true" />
              )}
              {guest ? 'Sign in' : 'Sign out'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
