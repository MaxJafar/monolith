export type ChartPoint = {
  label: string
  value: number | null
  /** A numeric horizontal position, for example a civil-date timestamp. */
  position?: number
  detail?: string
  /** A CSS color from a theme variable or the source data. */
  color?: string
}

export const isChartValue = (value: number | null): value is number =>
  value !== null && Number.isFinite(value)

export function progressRatio(value: number, max: number) {
  return Number.isFinite(value) && Number.isFinite(max) && max > 0
    ? Math.min(1, Math.max(0, value / max))
    : 0
}

export function barMaximum(points: ChartPoint[], max?: number) {
  return Math.max(
    1,
    max !== undefined && Number.isFinite(max) ? max : 0,
    ...points.map(point => (isChartValue(point.value) ? point.value : 0))
  )
}

/** Keep date labels apart without dropping any underlying chart points. */
export function axisTickIndexes(positions: number[]) {
  const unique = new Map<number, number>()

  positions.forEach((position, index) => {
    if (Number.isFinite(position) && !unique.has(position))
      unique.set(position, index)
  })

  const ordered = [...unique]
    .map(([position, index]) => ({ position, index }))
    .sort((a, b) => a.position - b.position)
  const first = ordered[0]
  const last = ordered[ordered.length - 1]

  if (!first || !last) return []
  if (first.position === last.position) return [first.index]

  const span = last.position - first.position
  const midpoint = first.position + span / 2
  const middle = ordered
    .slice(1, -1)
    .reduce<typeof first | null>(
      (closest, point) =>
        !closest ||
        Math.abs(point.position - midpoint) <
          Math.abs(closest.position - midpoint)
          ? point
          : closest,
      null
    )

  return middle &&
    middle.position - first.position >= span * 0.34 &&
    last.position - middle.position >= span * 0.34
    ? [first.index, middle.index, last.index]
    : [first.index, last.index]
}

export function lineLayout(
  source: ChartPoint[],
  domain?: [number, number],
  invert = false,
  reference?: number
) {
  const values = source.map(point => point.value).filter(isChartValue)

  if (reference !== undefined && Number.isFinite(reference))
    values.push(reference)

  let min = values.length ? Math.min(...values) : 0
  let max = values.length ? Math.max(...values) : 1

  if (domain && domain.every(Number.isFinite) && domain[1] > domain[0]) {
    ;[min, max] = domain
  } else {
    const padding =
      max === min ? Math.max(Math.abs(max) * 0.05, 1) : (max - min) * 0.1
    min -= padding
    max += padding
  }

  const positions = source.map((point, index) =>
    point.position !== undefined && Number.isFinite(point.position)
      ? point.position
      : index
  )
  const start = positions.length ? Math.min(...positions) : 0
  const end = positions.length ? Math.max(...positions) : 1
  const x = (position: number) =>
    end === start ? 344 : 64 + ((position - start) / (end - start)) * 560
  const y = (value: number) => {
    const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)))

    return invert ? 18 + ratio * 158 : 176 - ratio * 158
  }
  const points = source.flatMap((point, index) =>
    isChartValue(point.value)
      ? [
          {
            ...point,
            value: point.value,
            index,
            x: x(positions[index]!),
            y: y(point.value)
          }
        ]
      : []
  )
  const segments: (typeof points)[] = []

  for (const point of points) {
    const previous = segments.at(-1)?.at(-1)

    if (!previous || point.index !== previous.index + 1) segments.push([point])
    else segments.at(-1)!.push(point)
  }

  return { min, max, x, y, positions, points, segments }
}
