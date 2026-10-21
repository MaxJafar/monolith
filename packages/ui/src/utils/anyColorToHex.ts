// SPDX-License-Identifier: 0BSD
import { converter, formatHex } from 'culori'

const toRgb = converter('rgb')

export default function anyColorToHex(input: string): string | undefined {
  const value = toRgb(input.trim())
  if (!value || ![value.r, value.g, value.b].every(Number.isFinite))
    return undefined
  return formatHex({
    ...value,
    r: Math.min(1, Math.max(0, value.r)),
    g: Math.min(1, Math.max(0, value.g)),
    b: Math.min(1, Math.max(0, value.b))
  })
}
