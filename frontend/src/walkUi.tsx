import {
  ArrowUp,
  ArrowUpLeft,
  ArrowUpRight,
  Beer,
  Coffee,
  CornerUpLeft,
  CornerUpRight,
  Flag,
  Footprints,
  Landmark,
  Undo2,
  Utensils,
  type LucideIcon,
} from 'lucide-react'
import type { Maneuver, PlaceGroup } from './types'

const MANEUVER_ICON: Record<Maneuver, LucideIcon> = {
  depart: ArrowUp,
  continue: ArrowUp,
  slight_left: ArrowUpLeft,
  slight_right: ArrowUpRight,
  left: CornerUpLeft,
  right: CornerUpRight,
  sharp_left: CornerUpLeft,
  sharp_right: CornerUpRight,
  u_turn: Undo2,
  stairs: Footprints,
  arrive: Flag,
}

export function ManeuverIcon({ maneuver }: { maneuver: Maneuver }) {
  const Icon = MANEUVER_ICON[maneuver]
  return <Icon size={22} aria-hidden="true" />
}

const GROUP: Record<PlaceGroup, { icon: LucideIcon; label: string }> = {
  food: { icon: Utensils, label: 'Food' },
  cafe: { icon: Coffee, label: 'Cafe' },
  drinks: { icon: Beer, label: 'Drinks' },
  sight: { icon: Landmark, label: 'Sight' },
}

export function PlaceIcon({ group, size = 18 }: { group: PlaceGroup; size?: number }) {
  const Icon = GROUP[group].icon
  return <Icon size={size} aria-hidden="true" />
}
