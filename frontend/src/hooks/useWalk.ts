import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../api'
import type { LatLng, TrackResponse } from '../types'

/** Ask the server about a new GPS fix at most this often. */
const TRACK_EVERY_MS = 4000

export interface Walk {
  walking: boolean
  /** Latest GPS fix, null until the first one arrives. */
  position: LatLng | null
  /** Latest answer from /track, null until the first one arrives. */
  tracking: TrackResponse | null
  /** A human message when the location is unavailable, otherwise null. */
  gpsError: string | null
  /** True when /track could not be reached (the last good answer stays on screen). */
  offline: boolean
  start: (geometry: [number, number][]) => void
  stop: () => void
}

const GPS_MESSAGES: Record<number, string> = {
  1: 'Location is blocked. Allow location for this app to follow your walk.',
  2: 'Your location is not available right now.',
  3: 'Finding your location is taking a while. Try moving outside.',
}

/**
 * Follow a walk along a route: watches GPS and keeps progress, remaining time
 * and nearby places up to date. Nothing is stored; the route and position are
 * sent to the API only while a walk is active.
 */
export function useWalk(): Walk {
  const [walking, setWalking] = useState(false)
  const [position, setPosition] = useState<LatLng | null>(null)
  const [tracking, setTracking] = useState<TrackResponse | null>(null)
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)

  const watchId = useRef<number | null>(null)
  const geometry = useRef<[number, number][]>([])
  const lastProgress = useRef<number | null>(null)
  const lastCall = useRef(0)
  const inFlight = useRef(false)
  // Bumped on every start and stop, so answers for a walk that has ended are dropped.
  const session = useRef(0)
  // The newest GPS fix that arrived inside the throttle window, sent once it passes.
  const pending = useRef<LatLng | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const stop = useCallback(() => {
    session.current += 1
    if (watchId.current !== null) navigator.geolocation?.clearWatch(watchId.current)
    watchId.current = null
    if (timer.current !== null) clearTimeout(timer.current)
    timer.current = null
    pending.current = null
    inFlight.current = false
    setWalking(false)
  }, [])

  const askServer = useCallback(
    function ask(point: LatLng) {
      const now = Date.now()
      if (inFlight.current || now - lastCall.current < TRACK_EVERY_MS) {
        // Too soon: keep the newest fix and send it when the window has passed, so a
        // phone that stops reporting does not leave the screen out of date.
        pending.current = point
        if (timer.current === null) {
          const wait = Math.max(250, TRACK_EVERY_MS - (now - lastCall.current))
          timer.current = setTimeout(() => {
            timer.current = null
            const latest = pending.current
            pending.current = null
            if (latest) ask(latest)
          }, wait)
        }
        return
      }
      pending.current = null
      lastCall.current = now
      inFlight.current = true
      const mine = session.current
      api
        .track({
          geometry: geometry.current,
          position: point,
          last_progress_m: lastProgress.current,
        })
        .then((t) => {
          if (mine !== session.current) return
          lastProgress.current = t.progress_m
          setTracking(t)
          setOffline(false)
          // Once you are there there is nothing left to follow.
          if (t.arrived) stop()
        })
        .catch(() => {
          if (mine === session.current) setOffline(true)
        })
        .finally(() => {
          if (mine === session.current) inFlight.current = false
        })
    },
    [stop],
  )

  const start = useCallback(
    (route: [number, number][]) => {
      stop()
      if (!navigator.geolocation) {
        setGpsError('This device cannot share its location.')
        return
      }
      session.current += 1
      geometry.current = route
      lastProgress.current = null
      lastCall.current = 0
      inFlight.current = false
      setTracking(null)
      setPosition(null)
      setGpsError(null)
      setOffline(false)
      setWalking(true)
      watchId.current = navigator.geolocation.watchPosition(
        (pos) => {
          const point = { lat: pos.coords.latitude, lng: pos.coords.longitude }
          setGpsError(null)
          setPosition(point)
          askServer(point)
        },
        (err) => setGpsError(GPS_MESSAGES[err.code] ?? GPS_MESSAGES[2]),
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 },
      )
    },
    [askServer, stop],
  )

  // Stop watching if the screen goes away mid-walk.
  useEffect(() => stop, [stop])

  return { walking, position, tracking, gpsError, offline, start, stop }
}
