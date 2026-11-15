import { useCallback, useEffect, useRef, useState } from 'react'
import { LogoMark, Wordmark } from './Brand'

const BASE = import.meta.env.BASE_URL
const prefersReducedMotion = () =>
  !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// A fine grain over the video. The soft gradient background shows faint diagonal
// banding after compression; grain dithers it away.
const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")"

interface Props {
  /** First time on this device: when the video ends, ask the person to get started. */
  firstTime: boolean
  /** Get started was tapped: go to the app. */
  onStart: () => void
  /** Skipped, failed, or finished for someone who has seen it before. */
  onDone: () => void
}

/**
 * The 5-second brand video shown when the app opens. It never traps anyone: it can
 * be skipped, and it moves on by itself if the video is blocked, slow or broken.
 * On first launch the last frame stays on screen with a Get started button, so the
 * logo never jumps. With reduced motion on, a still logo replaces the video.
 */
export default function IntroSplash({ firstTime, onStart, onDone }: Props) {
  const video = useRef<HTMLVideoElement>(null)
  const finished = useRef(false)
  const started = useRef(false)
  const [fading, setFading] = useState(false)
  const [canSkip, setCanSkip] = useState(false)
  const [ended, setEnded] = useState(false)
  const [still] = useState(prefersReducedMotion)

  const finish = useCallback(() => {
    if (finished.current) return
    finished.current = true
    setFading(true)
    window.setTimeout(onDone, 350)
  }, [onDone])

  const onVideoEnded = () => {
    if (firstTime) setEnded(true)
    else finish()
  }

  useEffect(() => {
    const showSkip = window.setTimeout(() => setCanSkip(true), 800)
    // If the video has not started playing after 2.5 s (autoplay blocked, slow
    // load), move on rather than leave a still frame with a play button.
    const notPlaying = window.setTimeout(() => {
      if (!started.current) finish()
    }, 2500)
    // The video is 5 s long. If we are still playing at 8 s, something is wrong.
    const backstop = window.setTimeout(() => {
      if (!finished.current && !video.current?.ended) finish()
    }, still ? 1800 : 8000)
    return () => {
      window.clearTimeout(showSkip)
      window.clearTimeout(notPlaying)
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
        <>
          <video
            ref={video}
            src={`${BASE}brand/intro.mp4`}
            muted
            autoPlay
            playsInline
            preload="auto"
            poster={`${BASE}brand/intro-poster.jpg`}
            onPlaying={() => {
              started.current = true
            }}
            onEnded={onVideoEnded}
            onError={finish}
            aria-hidden="true"
            className="h-full w-full object-cover"
          />
          {ended && (
            // The video's own last frame, so the logo holds perfectly still.
            <img
              src={`${BASE}brand/intro-last-frame.jpg`}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.07] mix-blend-multiply"
            style={{ backgroundImage: GRAIN }}
          />
        </>
      )}

      {canSkip && !ended && (
        <button
          type="button"
          onClick={finish}
          className="absolute right-4 min-h-11 rounded-full bg-white/80 px-5 text-sm font-bold text-ink shadow-card"
          style={{ top: 'max(1rem, env(safe-area-inset-top))' }}
        >
          Skip
        </button>
      )}

      {ended && (
        <div
          className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-sm px-6 animate-[fade-up_500ms_ease-out_both] motion-reduce:animate-none"
          style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
        >
          <button
            type="button"
            onClick={onStart}
            className="min-h-14 w-full rounded-full border border-cool bg-periwinkle text-lg font-bold text-ink shadow-card"
          >
            Get started
          </button>
          <p className="mt-3 text-center text-xs text-muted">
            Sign in to personalise Cool Route, or continue as a guest.
          </p>
        </div>
      )}
    </div>
  )
}
