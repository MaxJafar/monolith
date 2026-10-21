// SPDX-License-Identifier: 0BSD
/** Add delimited labels in insertion order, keeping existing records unchanged. */
export function appendTags(existing: string[], text: string, limit: number) {
  const result = [...existing]
  const ceiling = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 100
  const seen = new Set(existing)
  for (const part of text.split(/[,\r\n]+/)) {
    const value = part.trim()
    if (!value || seen.has(value) || result.length >= ceiling) continue
    result.push(value)
    seen.add(value)
  }
  return result
}
