import { useId } from 'react'

const SUN = { x: 636, y: 316 }
// Eight rays, every 30 degrees; the ones that would fall behind the pin are left out.
// Radii 173 to 219 plus the round caps (13 each end) match the original artwork.
const RAYS = [-150, -120, -90, -60, -30, 0, 30, 60].map((deg) => {
  const a = (deg * Math.PI) / 180
  return {
    x1: SUN.x + 173 * Math.cos(a),
    y1: SUN.y + 173 * Math.sin(a),
    x2: SUN.x + 219 * Math.cos(a),
    y2: SUN.y + 219 * Math.sin(a),
  }
})

/** The Cool Route mark (a map pin with a route, in front of the sun), as crisp SVG. */
export function LogoMark({ size = 96, className }: { size?: number; className?: string }) {
  const id = useId()
  return (
    <svg
      viewBox="150 60 740 880"
      width={size}
      height={(size * 880) / 740}
      role="img"
      aria-label="Cool Route logo"
      className={className}
    >
      <defs>
        <linearGradient id={`${id}-pin`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1bbfa6" />
          <stop offset="1" stopColor="#0c7f6d" />
        </linearGradient>
        <linearGradient id={`${id}-sun`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fcc43d" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <circle cx={SUN.x} cy={SUN.y} r="130" fill={`url(#${id}-sun)`} />
      {RAYS.map((r, i) => (
        <line
          key={i}
          {...r}
          stroke="#f59e0b"
          strokeWidth="26"
          strokeLinecap="round"
        />
      ))}
      <path
        d="M414 918C330 830 178 660 178 495A236 236 0 0 1 650 495C650 660 498 830 414 918Z"
        fill={`url(#${id}-pin)`}
      />
      <path
        d="M330 578C345 520 400 498 452 472C492 452 506 432 509 410"
        fill="none"
        stroke="#fff"
        strokeWidth="38"
        strokeLinecap="round"
      />
      <circle cx="318" cy="600" r="38" fill="#fff" />
      <circle cx="318" cy="600" r="16" fill="#0c7f6d" />
      <circle cx="510" cy="392" r="48" fill="#fff" />
      <circle cx="510" cy="392" r="20" fill="#f59e0b" />
    </svg>
  )
}

/** "Cool Route" in the brand colours. Set the size with a text-* class. */
export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <p className={`font-extrabold tracking-tight ${className}`}>
      <span className="text-cool">Cool</span> <span className="text-ink">Route</span>
    </p>
  )
}
