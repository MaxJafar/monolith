/** Clean tick values (1, 2 or 5 × 10ⁿ) spanning a domain that includes 0. */
export function niceTicks(min: number, max: number, target = 4): number[] {
  const low = Math.min(0, min)
  const high = Math.max(0, max)

  if (low === high) return [0, 1]

  const raw = (high - low) / target
  const power = 10 ** Math.floor(Math.log10(raw))
  const step =
    [1, 2, 2.5, 5, 10]
      .map(factor => factor * power)
      .find(value => value >= raw) ?? raw
  const first = Math.floor(low / step) * step
  const last = Math.ceil(high / step) * step
  const ticks: number[] = []

  for (let value = first; value <= last + step / 2; value += step)
    ticks.push(Math.abs(value) < step / 1e6 ? 0 : value)

  return ticks
}

/** A linear scale from a domain onto [rangeStart, rangeEnd]. */
export function linear([d0, d1]: [number, number], [r0, r1]: [number, number]) {
  const span = d1 - d0 || 1

  return (value: number) => r0 + ((value - d0) / span) * (r1 - r0)
}

/** Keep about `count` evenly spaced labels, always including the last. */
export function labelIndexes(length: number, count = 7): Set<number> {
  if (length <= count) return new Set(Array.from({ length }, (_, i) => i))

  const step = Math.ceil(length / count)
  const result: number[] = []
  const last = length - 1

  for (let index = 0; index < length; index += step) result.push(index)

  if (result[result.length - 1] !== last) {
    // Drop a label that would crowd the final one.
    if (last - result[result.length - 1]! < step / 2) result.pop()
    result.push(last)
  }

  return new Set(result)
}

/** A bar path with rounded data-end corners and a square baseline. */
export function barPath(
  x: number,
  width: number,
  baseline: number,
  end: number,
  radius = 4
): string {
  const height = Math.abs(end - baseline)

  if (height < 0.5) return ''

  const r = Math.min(radius, width / 2, height)

  if (end < baseline)
    return `M${x},${baseline}V${end + r}Q${x},${end} ${x + r},${end}H${x + width - r}Q${x + width},${end} ${x + width},${end + r}V${baseline}Z`

  return `M${x},${baseline}V${end - r}Q${x},${end} ${x + r},${end}H${x + width - r}Q${x + width},${end} ${x + width},${end - r}V${baseline}Z`
}
