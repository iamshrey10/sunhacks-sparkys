export interface Country {
  code: string
  label: string
  dial: string
  /** Digits in a national number. */
  length: number
  placeholder: string
}

export const COUNTRIES: Country[] = [
  { code: 'US', label: 'United States', dial: '+1', length: 10, placeholder: '(480) 555-0123' },
  { code: 'IN', label: 'India', dial: '+91', length: 10, placeholder: '98765 43210' },
]

export const digitsOnly = (s: string) => s.replace(/\D/g, '')

export const isValidPhone = (c: Country, digits: string) => digits.length === c.length

/** Groups the digits as the person types: (480) 555-0123 or 98765 43210. */
export function formatPhone(c: Country, digits: string): string {
  const d = digits.slice(0, c.length)
  if (c.code === 'US') {
    if (d.length <= 3) return d
    if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
  }
  return d.length <= 5 ? d : `${d.slice(0, 5)} ${d.slice(5)}`
}

/** "+1 ••• ••• 0123": enough to recognise the number, not to read it. */
export const maskPhone = (c: Country, digits: string) =>
  `${c.dial} ••• ••• ${digits.slice(-4)}`
