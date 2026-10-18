import type { Element, Vector, VectorNode } from './shared'

type Point = { x: number; y: number }

const uid = () => crypto.randomUUID()
const node = (p: Point): VectorNode => ({
  id: uid(),
  ...p,
  mode: 'corner',
  in: null,
  out: null
})
const mix = (a: Point, b: Point, t: number): Point => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t
})
const reflect = (p: Point, c: Point): Point => ({
  x: c.x * 2 - p.x,
  y: c.y * 2 - p.y
})
const same = (a: Point, b: Point) =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y) < 0.00001

/** SVG endpoint arcs converted to cubic segments of at most 90 degrees. */
function arc(
  a: Point,
  b: Point,
  rx: number,
  ry: number,
  degrees: number,
  large: number,
  sweep: number
) {
  rx = Math.abs(rx)
  ry = Math.abs(ry)
  if (!rx || !ry || same(a, b)) return []

  const phi = (degrees * Math.PI) / 180,
    c = Math.cos(phi),
    s = Math.sin(phi)
  const x = (c * (a.x - b.x)) / 2 + (s * (a.y - b.y)) / 2
  const y = (-s * (a.x - b.x)) / 2 + (c * (a.y - b.y)) / 2
  const scale = Math.sqrt((x * x) / (rx * rx) + (y * y) / (ry * ry))

  if (scale > 1) {
    rx *= scale
    ry *= scale
  }

  const factor =
    (large === sweep ? -1 : 1) *
    Math.sqrt(
      Math.max(
        0,
        (rx * rx * ry * ry - rx * rx * y * y - ry * ry * x * x) /
          (rx * rx * y * y + ry * ry * x * x)
      )
    )
  const cx = (factor * rx * y) / ry,
    cy = (-factor * ry * x) / rx
  const center = {
    x: c * cx - s * cy + (a.x + b.x) / 2,
    y: s * cx + c * cy + (a.y + b.y) / 2
  }
  const theta = Math.atan2((y - cy) / ry, (x - cx) / rx)

  let delta = Math.atan2((-y - cy) / ry, (-x - cx) / rx) - theta
  if (!sweep && delta > 0) delta -= 2 * Math.PI
  if (sweep && delta < 0) delta += 2 * Math.PI

  const count = Math.ceil(Math.abs(delta) / (Math.PI / 2)),
    step = delta / count
  const at = (t: number): Point => ({
    x: center.x + c * rx * Math.cos(t) - s * ry * Math.sin(t),
    y: center.y + s * rx * Math.cos(t) + c * ry * Math.sin(t)
  })
  const tangent = (t: number): Point => ({
    x: -c * rx * Math.sin(t) - s * ry * Math.cos(t),
    y: -s * rx * Math.sin(t) + c * ry * Math.cos(t)
  })

  return Array.from({ length: count }, (_, i) => {
    const t = theta + step * i,
      u = t + step,
      k = (4 / 3) * Math.tan(step / 4)
    const p = at(t),
      q = at(u),
      d = tangent(t),
      e = tangent(u)

    return [
      { x: p.x + d.x * k, y: p.y + d.y * k },
      { x: q.x - e.x * k, y: q.y - e.y * k },
      i === count - 1 ? b : q
    ] as const
  })
}

/** Parses all SVG path commands without evaluating imported code. */
export function parsePath(path: string): Vector {
  if (path.length > 200000 || /[^MmLlHhVvCcSsQqTtAaZz0-9eE+.,\s-]/.test(path))
    throw Error('Invalid path')

  const tokens =
    path.match(
      /[MmLlHhVvCcSsQqTtAaZz]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g
    ) ?? []
  const contours: Vector = []

  let i = 0,
    command = '',
    previous = '',
    p: Point = { x: 0, y: 0 },
    quadratic: Point | null = null,
    cubic: Point | null = null,
    total = 0

  const number = () => {
    const value = Number(tokens[i++])

    if (!Number.isFinite(value)) throw Error('Invalid path')

    return value
  }
  const add = (end: Point, c1?: Point, c2?: Point) => {
    if (++total > 2000) throw Error('Path node limit exceeded')

    const contour = contours[contours.length - 1]

    if (!contour) throw Error('Path must start with a move')
    if (c1) contour.nodes[contour.nodes.length - 1]!.out = c1
    contour.nodes.push({ ...node(end), in: c2 ?? null })
    p = end
  }

  while (i < tokens.length) {
    if (/^[a-z]$/i.test(tokens[i]!)) command = tokens[i++]!

    const kind = command.toUpperCase(),
      relative = command !== kind
    const point = (): Point => ({
      x: number() + (relative ? p.x : 0),
      y: number() + (relative ? p.y : 0)
    })

    if (kind === 'Z') {
      const contour = contours[contours.length - 1]

      if (!contour) throw Error('Invalid close')
      contour.closed = true
      const first = contour.nodes[0]!,
        last = contour.nodes[contour.nodes.length - 1]!

      if (contour.nodes.length > 1 && same(first, last)) {
        first.in = last.in
        contour.nodes.pop()
      }
      p = { x: first.x, y: first.y }
      command = ''
    } else if (kind === 'M') {
      p = point()
      contours.push({ id: uid(), closed: false, nodes: [node(p)] })
      if (contours.length > 100) throw Error('Path contour limit exceeded')
      command = relative ? 'l' : 'L'
    } else if (kind === 'L') add(point())
    else if (kind === 'H') add({ x: number() + (relative ? p.x : 0), y: p.y })
    else if (kind === 'V') add({ x: p.x, y: number() + (relative ? p.y : 0) })
    else if (kind === 'C' || kind === 'S') {
      const a =
        kind === 'C'
          ? point()
          : cubic && ['C', 'S'].includes(previous)
            ? reflect(cubic, p)
            : p
      const b = point(),
        end = point()
      add(end, a, b)
      cubic = b
    } else if (kind === 'Q' || kind === 'T') {
      const control: Point =
        kind === 'Q'
          ? point()
          : quadratic && ['Q', 'T'].includes(previous)
            ? reflect(quadratic, p)
            : p
      const end = point()
      add(end, mix(p, control, 2 / 3), mix(end, control, 2 / 3))
      quadratic = control
    } else if (kind === 'A') {
      const rx = number(),
        ry = number(),
        rotation = number(),
        large = number(),
        sweep = number(),
        end = point()

      if (![0, 1].includes(large) || ![0, 1].includes(sweep))
        throw Error('Invalid arc flags')

      const segments = arc(p, end, rx, ry, rotation, large, sweep)

      if (segments.length) for (const [a, b, q] of segments) add(q, a, b)
      else if (!same(p, end)) add(end)
    } else throw Error('Invalid path command')
    previous = kind
  }
  if (!contours.length) throw Error('Empty path')
  for (const contour of contours)
    for (const n of contour.nodes)
      for (const v of [n, n.in, n.out])
        if (
          v &&
          (!Number.isFinite(v.x) ||
            !Number.isFinite(v.y) ||
            Math.abs(v.x) > 100000 ||
            Math.abs(v.y) > 100000)
        )
          throw Error('Path coordinates exceed bounds')

  return contours
}

export function vectorPath(vector: Vector): string {
  const point = (p: Point) => `${p.x} ${p.y}`

  return vector
    .map(c => {
      let path = `M ${point(c.nodes[0]!)}`

      const count = c.nodes.length + (c.closed ? 1 : 0)

      for (let i = 1; i < count; i++) {
        const a = c.nodes[(i - 1) % c.nodes.length]!,
          b = c.nodes[i % c.nodes.length]!
        path +=
          a.out || b.in
            ? ` C ${point(a.out ?? a)} ${point(b.in ?? b)} ${point(b)}`
            : ` L ${point(b)}`
      }

      return path + (c.closed ? ' Z' : '')
    })
    .join(' ')
}

export function toVector(element: Element): Element {
  if (element.vector) return element

  const w = element.width,
    h = element.height

  let path = element.pathData

  if (!path) {
    if (element.kind === 'ellipse')
      path = `M ${w / 2} 0 A ${w / 2} ${h / 2} 0 1 1 ${w / 2} ${h} A ${w / 2} ${h / 2} 0 1 1 ${w / 2} 0 Z`
    else if (element.kind === 'diamond')
      path = `M ${w / 2} 0 L ${w} ${h / 2} L ${w / 2} ${h} L 0 ${h / 2} Z`
    else if (element.kind === 'path')
      path = element.points
        .map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`)
        .join(' ')
    else {
      const r = Math.min(element.radius, w / 2, h / 2)
      path = r
        ? `M ${r} 0 H ${w - r} Q ${w} 0 ${w} ${r} V ${h - r} Q ${w} ${h} ${w - r} ${h} H ${r} Q 0 ${h} 0 ${h - r} V ${r} Q 0 0 ${r} 0 Z`
        : `M 0 0 H ${w} V ${h} H 0 Z`
    }
  }

  return {
    ...element,
    kind: 'path',
    vector: parsePath(path),
    pathData: undefined,
    pathViewBox: element.pathViewBox ?? { x: 0, y: 0, width: w, height: h },
    fillOpacity:
      element.kind === 'path' && !element.pathData ? 0 : element.fillOpacity
  }
}

export function splitSegment(
  vector: Vector,
  contourId: string,
  nodeId: string
): Vector {
  const result = structuredClone(vector),
    c = result.find(c => c.id === contourId)

  if (!c || c.nodes.length >= 2000) return result

  const i = c.nodes.findIndex(n => n.id === nodeId),
    a = c.nodes[i],
    b = c.nodes[(i + 1) % c.nodes.length]

  if (!a || !b || (!c.closed && i === c.nodes.length - 1)) return result

  const p = mix(a, a.out ?? a, 0.5),
    q = mix(a.out ?? a, b.in ?? b, 0.5),
    r = mix(b.in ?? b, b, 0.5)
  const s = mix(p, q, 0.5),
    t = mix(q, r, 0.5),
    middle = node(mix(s, t, 0.5))

  if (a.out || b.in) {
    a.out = p
    b.in = r
    middle.in = s
    middle.out = t
    middle.mode = 'smooth'
  }
  c.nodes.splice(i + 1, 0, middle)

  return result
}

export function moveNode(
  n: VectorNode,
  point: Point,
  handle: 'anchor' | 'in' | 'out'
): VectorNode {
  if (handle === 'anchor') {
    const dx = point.x - n.x,
      dy = point.y - n.y

    return {
      ...n,
      ...point,
      in: n.in ? { x: n.in.x + dx, y: n.in.y + dy } : null,
      out: n.out ? { x: n.out.x + dx, y: n.out.y + dy } : null
    }
  }

  const opposite = handle === 'in' ? 'out' : 'in',
    old = n[opposite]

  let other = old

  if (n.mode === 'symmetric') other = reflect(point, n)
  else if (n.mode === 'smooth' && old) {
    const angle = Math.atan2(n.y - point.y, n.x - point.x),
      length = Math.hypot(old.x - n.x, old.y - n.y)
    other = {
      x: n.x + Math.cos(angle) * length,
      y: n.y + Math.sin(angle) * length
    }
  }

  return { ...n, [handle]: point, [opposite]: other }
}

export function vectorPoint(element: Element, world: Point): Point {
  const a = (-element.rotation * Math.PI) / 180,
    x = world.x - element.x - element.width / 2,
    y = world.y - element.y - element.height / 2
  const box = element.pathViewBox ?? {
    x: 0,
    y: 0,
    width: element.width,
    height: element.height
  }

  return {
    x:
      box.x +
      ((x * Math.cos(a) - y * Math.sin(a) + element.width / 2) * box.width) /
        element.width,
    y:
      box.y +
      ((x * Math.sin(a) + y * Math.cos(a) + element.height / 2) * box.height) /
        element.height
  }
}

export function vectorWorld(element: Element, p: Point): Point {
  const box = element.pathViewBox ?? {
      x: 0,
      y: 0,
      width: element.width,
      height: element.height
    },
    a = (element.rotation * Math.PI) / 180
  const x = ((p.x - box.x) * element.width) / box.width - element.width / 2,
    y = ((p.y - box.y) * element.height) / box.height - element.height / 2

  return {
    x: element.x + element.width / 2 + x * Math.cos(a) - y * Math.sin(a),
    y: element.y + element.height / 2 + x * Math.sin(a) + y * Math.cos(a)
  }
}

/** Reframe the control hull while preserving the world transform and curve shape. */
export function fitVector(element: Element): Element {
  if (!element.vector) return element

  const points = element.vector.flatMap(c =>
    c.nodes.flatMap(n => [
      n,
      ...(n.in ? [n.in] : []),
      ...(n.out ? [n.out] : [])
    ])
  )
  const old = element.pathViewBox ?? {
    x: 0,
    y: 0,
    width: element.width,
    height: element.height
  }
  const x = Math.min(...points.map(p => p.x)),
    y = Math.min(...points.map(p => p.y))
  const w = Math.max(1, Math.max(...points.map(p => p.x)) - x),
    h = Math.max(1, Math.max(...points.map(p => p.y)) - y)
  const width = (w * element.width) / old.width,
    height = (h * element.height) / old.height

  if (width > 20000 || height > 20000) return element

  const p = vectorWorld(element, { x, y }),
    a = (element.rotation * Math.PI) / 180

  return {
    ...element,
    x: p.x - width / 2 + (Math.cos(a) * width) / 2 - (Math.sin(a) * height) / 2,
    y:
      p.y - height / 2 + (Math.sin(a) * width) / 2 + (Math.cos(a) * height) / 2,
    width: Math.max(1, width),
    height: Math.max(1, height),
    pathViewBox: { x, y, width: w, height: h }
  }
}
