export type RiotId = { name: string; tag: string; value: string }

const CONTROL_CHARACTERS = /[\p{Cc}\p{Cf}]/u

export function parseRiotId(input: string): RiotId | null {
  const trimmed = input.trim()
  if (trimmed.length < 3 || trimmed.length > 101 || CONTROL_CHARACTERS.test(trimmed)) return null
  const separator = trimmed.lastIndexOf('#')
  if (separator <= 0 || separator === trimmed.length - 1) return null
  const name = trimmed.slice(0, separator).trim()
  const tag = trimmed.slice(separator + 1).trim()
  if (!name || !tag || name.length > 80 || tag.length > 20 || name.includes('#') || tag.includes('#')) return null
  return { name, tag, value: `${name}#${tag}` }
}
