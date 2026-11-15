import { useState } from 'react'
import { sendCode, signInWithGoogle, verifyCode } from '../../auth/demoAuth'
import { COUNTRIES, maskPhone } from '../../auth/phone'
import { saveProfile, type Profile, type PurposeId, type SignInMethod } from '../../auth/profile'
import AuthShell from './AuthShell'
import NameStep from './NameStep'
import OtpStep from './OtpStep'
import PhoneStep from './PhoneStep'
import PurposeStep from './PurposeStep'
import SignInStep from './SignInStep'

type Step = 'signin' | 'phone' | 'otp' | 'name' | 'purpose'

// Sign in (with the phone and code screens), then name, then purpose.
const POSITION: Record<Step, number> = { signin: 0, phone: 0, otp: 0, name: 1, purpose: 2 }

interface Props {
  onComplete: (profile: Profile) => void
}

/** Sign in, then ask for a name and what brings the person here. */
export default function AuthFlow({ onComplete }: Props) {
  const [step, setStep] = useState<Step>('signin')
  const [googleBusy, setGoogleBusy] = useState(false)
  const [signInError, setSignInError] = useState<string>()
  const [country, setCountry] = useState(COUNTRIES[0])
  const [digits, setDigits] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string>()
  const [method, setMethod] = useState<SignInMethod>('guest')
  const [contact, setContact] = useState<string>()
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')

  const phone = `${country.dial}${digits}`

  const google = async () => {
    setGoogleBusy(true)
    setSignInError(undefined)
    try {
      await signInWithGoogle()
      setMethod('google')
      setContact('Google (demo)')
      setStep('name')
    } catch {
      setSignInError('Google sign-in did not work. Try again, or continue as a guest.')
    } finally {
      setGoogleBusy(false)
    }
  }

  const send = async () => {
    setSending(true)
    setSendError(undefined)
    try {
      await sendCode(phone)
      setStep('otp')
    } catch {
      setSendError('We could not send a code. Check the number and try again.')
    } finally {
      setSending(false)
    }
  }

  const verify = async (code: string) => {
    const ok = await verifyCode(phone, code)
    if (ok) {
      setMethod('phone')
      setContact(maskPhone(country, digits))
      // Let the "Verified" moment show before moving on.
      window.setTimeout(() => setStep('name'), 700)
    }
    return ok
  }

  const guest = () => {
    const profile: Profile = { method: 'guest', firstName: '', lastName: '', createdAt: Date.now() }
    saveProfile(profile)
    onComplete(profile)
  }

  const finish = (purpose: PurposeId) => {
    const profile: Profile = {
      method,
      contact,
      firstName: first.trim(),
      lastName: last.trim(),
      purpose,
      createdAt: Date.now(),
    }
    saveProfile(profile)
    onComplete(profile)
  }

  const back =
    step === 'phone'
      ? () => setStep('signin')
      : step === 'otp'
        ? () => setStep('phone')
        : step === 'purpose'
          ? () => setStep('name')
          : undefined

  return (
    <AuthShell step={POSITION[step]} total={3} onBack={back}>
      {step === 'signin' && (
        <SignInStep
          busy={googleBusy}
          error={signInError}
          onGoogle={() => void google()}
          onPhone={() => setStep('phone')}
          onGuest={guest}
        />
      )}
      {step === 'phone' && (
        <PhoneStep
          country={country}
          digits={digits}
          sending={sending}
          error={sendError}
          onCountry={(c) => {
            setCountry(c)
            setDigits('')
          }}
          onDigits={setDigits}
          onSend={() => void send()}
        />
      )}
      {step === 'otp' && (
        <OtpStep
          phoneLabel={maskPhone(country, digits)}
          onVerify={verify}
          onResend={() => sendCode(phone)}
        />
      )}
      {step === 'name' && (
        <NameStep
          first={first}
          last={last}
          onChange={(f, l) => {
            setFirst(f)
            setLast(l)
          }}
          onNext={() => setStep('purpose')}
        />
      )}
      {step === 'purpose' && <PurposeStep firstName={first.trim()} onFinish={finish} />}
    </AuthShell>
  )
}
