import { useCallback, useEffect, useRef, useState } from 'react'
import { LogoMark, Wordmark } from './Brand'

const BASE = import.meta.env.BASE_URL
const prefersReducedMotion = () =>
  !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

interface Props {
  onDone: () => void
}

/**
 * The 5-second brand video shown when the app opens. It never traps anyone: it can
 * be skipped, and it ends by itself if the video is blocked, slow or broken.
 * With reduced motion on, a still logo is shown for a moment instead of the video.
 */
export default function IntroSplash({ onDone }: Props) {
  const video = useRef<HTMLVideoElement>(null)
  const finished = useRef(false)
  const [fading, setFading] = useState(false)
  const [canSkip, setCanSkip] = useState(false)
  const [still] = useState(prefersReducedMotion)

  const finish = useCallback(() => {
    if (finished.current) return
    finished.current = true
    setFading(true)
    window.setTimeout(onDone, 350)
  }, [onDone])

  useEffect(() => {
    const showSkip = window.setTimeout(() => setCanSkip(true), 800)
    // The video is 5 s long. If we are still here at 8 s, something is wrong: move on.
    const backstop = window.setTimeout(finish, still ? 1800 : 8000)
    return () => {
      window.clearTimeout(showSkip)
      window.clearTimeout(backstop)
    }
  }, [finish, still])

  useEffect(() => {
    // Some browsers refuse to autoplay: skip the intro rather than show a frozen frame.
    video.current?.play().catch(finish)
  }, [finish])

  return (
    <div
      role="dialog"
      aria-label="Cool Route"
      className={`fixed inset-0 z-[3000] flex items-center justify-center bg-mist transition-opacity duration-300 motion-reduce:transition-none ${
        fading ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {still ? (
        <div className="flex flex-col items-center">
          <LogoMark size={112} />
          <Wordmark className="mt-4 text-3xl" />
          <p className="mt-1 text-base text-muted">The coolest way to walk.</p>
        </div>
      ) : (
        <video
          ref={video}
          src={`${BASE}brand/intro.mp4`}
          muted
          autoPlay
          playsInline
          preload="auto"
          onEnded={finish}
          onError={finish}
          aria-hidden="true"
          className="h-full w-full object-cover"
        />
      )}
      {canSkip && (
        <button
          type="button"
          onClick={finish}
          className="absolute right-4 min-h-11 rounded-full bg-white/80 px-5 text-sm font-bold text-ink shadow-card"
          style={{ top: 'max(1rem, env(safe-area-inset-top))' }}
        >
          Skip
        </button>
      )}
    </div>
  )
}
