import { useState } from 'react'
import { api, ApiError } from '../api'
import type { ParseResponse } from '../types'

interface Props {
  onParsed: (parsed: ParseResponse) => void
  /** Look up a destination the person mentioned; returns the place name, or null. */
  onDestination: (text: string) => Promise<string | null>
}

export default function AskBox({ onParsed, onDestination }: Props) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  )

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    setBusy(true)
    setMessage(null)
    try {
      const parsed = await api.parse(text.trim())
      onParsed(parsed)
      const found = parsed.destination_text
        ? await onDestination(parsed.destination_text)
        : null
      setMessage({
        ok: true,
        text: found
          ? `Filled in the form and set your end point to ${found}.`
          : parsed.destination_text
            ? `Filled in the form. We could not find "${parsed.destination_text}": search for it above or tap the map to set your end point.`
            : 'Filled in the form below. Check it, then find your route.',
      })
    } catch (err) {
      const unavailable =
        err instanceof ApiError && (err.status === 501 || err.status === 502)
      setMessage({
        ok: false,
        text: unavailable
          ? 'Plain-English input is not available right now. Please use the form below.'
          : 'We could not read that. Please use the form below.',
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="mb-3">
      <label htmlFor="ask-text" className="font-semibold">
        Or just say it
      </label>
      <div className="mt-1 flex gap-2">
        <input
          id="ask-text"
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. 3 PM, avoid stairs"
          className="min-h-11 min-w-0 flex-1 rounded-md border-2 border-neutral bg-white px-3 text-base"
        />
        <button
          type="submit"
          disabled={busy || !text.trim()}
          className="min-h-11 rounded-md bg-periwinkle px-4 font-bold text-ink disabled:bg-sky"
        >
          {busy ? 'Reading…' : 'Fill form'}
        </button>
      </div>
      {message && (
        <p
          role={message.ok ? 'status' : 'alert'}
          className={`mt-1 text-sm font-medium ${message.ok ? 'text-ink' : 'text-error-ink'}`}
        >
          {message.text}
        </p>
      )}
    </form>
  )
}
