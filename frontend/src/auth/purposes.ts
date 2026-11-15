import {
  Compass,
  GraduationCap,
  HardHat,
  ShoppingBag,
  Sparkles,
  ThermometerSun,
  type LucideIcon,
} from 'lucide-react'
import type { PurposeId } from './profile'

export interface Purpose {
  id: PurposeId
  label: string
  icon: LucideIcon
}

export const PURPOSES: Purpose[] = [
  { id: 'class', label: 'Walking to class', icon: GraduationCap },
  { id: 'errands', label: 'Running errands', icon: ShoppingBag },
  { id: 'explore', label: 'Exploring Tempe', icon: Compass },
  { id: 'outdoor-work', label: 'Working outdoors', icon: HardHat },
  { id: 'heat-safety', label: 'Staying safe in the heat', icon: ThermometerSun },
  { id: 'curious', label: 'Just curious', icon: Sparkles },
]

export const purposeLabel = (id?: PurposeId) =>
  PURPOSES.find((p) => p.id === id)?.label
