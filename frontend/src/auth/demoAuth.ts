// DEMO sign-in. No account is created, no text message is sent and nothing is
// verified by Google or a phone carrier. It exists so the whole sign-in and
// onboarding flow can be shown and tested.
//
// To go live, replace these three functions with a real provider (for example
// Firebase Authentication: phone sign-in with SMS, and native Google sign-in) and set
// AUTH_LIVE to true. The screens do not need to change.

export const AUTH_LIVE = false

/** The only code the demo accepts. */
export const DEMO_CODE = '123456'

const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms))

/** "Send" a code to this phone number. Demo: pretends, after a short pause. */
export async function sendCode(_phone: string): Promise<void> {
  await wait(900)
}

/** Check a code. Demo: accepts DEMO_CODE only. */
export async function verifyCode(_phone: string, code: string): Promise<boolean> {
  await wait(700)
  return code === DEMO_CODE
}

/** Sign in with Google. Demo: pretends, after a short pause. */
export async function signInWithGoogle(): Promise<void> {
  await wait(900)
}
