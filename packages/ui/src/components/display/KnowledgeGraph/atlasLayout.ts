type Node = { key: string; kind: string }
type Edge = { source: string; target: string; kind: string }

// Keep canonical families together. Inferred links can connect families without
// pulling the entire workspace into one ball of equally weighted connections.
export function atlasTargets(nodes: Node[], edges: Edge[], spacing: number) {
  const parents = new Map(nodes.map(node => [node.key, node.key]))
  const find = (key: string): string => {
    const parent = parents.get(key)!
    if (parent === key) return key
    const root = find(parent)
    parents.set(key, root)
    return root
  }
  for (const edge of edges) {
    if (
      !['parent', 'collection', 'embed'].includes(edge.kind) ||
      !parents.has(edge.source) ||
      !parents.has(edge.target)
    )
      continue
    const a = find(edge.source),
      b = find(edge.target)
    parents.set(a < b ? b : a, a < b ? a : b)
  }
  const groups = new Map<string, Node[]>()
  const concepts = new Set(
    nodes
      .filter(node => ['tag', 'topic'].includes(node.kind))
      .map(node => node.key)
  )
  for (const node of [...nodes].sort((a, b) => a.key.localeCompare(b.key))) {
    let group = find(node.key)
    if (concepts.has(node.key)) {
      const neighbor = edges
        .filter(edge => edge.source === node.key || edge.target === node.key)
        .map(edge => (edge.source === node.key ? edge.target : edge.source))
        .filter(key => parents.has(key) && !concepts.has(key))
        .sort()[0]
      if (neighbor) group = find(neighbor)
    }
    groups.set(group, [...(groups.get(group) ?? []), node])
  }
  const families = [...groups.entries()].sort(
    (a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0])
  )
  // Small disconnected groups share a compact shelf, without inventing edges.
  const singles = families
    .filter(([, members]) => members.length === 1)
    .flatMap(([, members]) => members)
  const clusters = families
    .filter(([, members]) => members.length > 1)
    .map(([, members]) => members)
  if (singles.length) clusters.push(singles)
  const sizes = clusters.map(
    members => Math.max(1.2, Math.sqrt(members.length)) * spacing * 0.75
  )
  const width = Math.max(
    ...sizes,
    Math.sqrt(sizes.reduce((sum, size) => sum + size * size, 0) * 2.6)
  )
  const targets = new Map<string, { x: number; y: number; group: number }>()
  let x = 0,
    y = 0,
    rowHeight = 0
  clusters.forEach((members, group) => {
    const size = sizes[group]
    if (x > 0 && x + size > width) {
      x = 0
      y += rowHeight + spacing * 0.6
      rowHeight = 0
    }
    members.forEach((node, index) => {
      const angle = index * 2.399963
      const radius = Math.sqrt(index / members.length) * size * 0.38
      targets.set(node.key, {
        x: x + size / 2 + Math.cos(angle) * radius,
        y: y + size / 2 + Math.sin(angle) * radius,
        group
      })
    })
    x += size + spacing * 0.6
    rowHeight = Math.max(rowHeight, size)
  })
  return targets
}

export type LabelCandidate = {
  key: string
  x: number
  y: number
  width: number
  radius: number
  priority: number
  required?: boolean
}

// All coordinates are CSS pixels, so labels remain readable and collision-free
// at any zoom. Also reserve space around node markers, not only other labels.
export function graphLabels(
  nodes: LabelCandidate[],
  width: number,
  height: number,
  budget: number
) {
  const visible = new Map<
    string,
    { x: number; y: number; anchor: 'middle' | 'start' | 'end' }
  >()
  const boxes: { left: number; right: number; top: number; bottom: number }[] =
    []
  for (const node of [...nodes].sort(
    (a, b) =>
      Number(!!b.required) - Number(!!a.required) ||
      b.priority - a.priority ||
      a.key.localeCompare(b.key)
  )) {
    if (!node.required && (visible.size >= budget || node.priority < 0))
      continue
    const placements = [
      { x: 0, y: node.radius + 18, anchor: 'middle' as const },
      { x: 0, y: -node.radius - 10, anchor: 'middle' as const },
      { x: node.radius + 10, y: 4, anchor: 'start' as const },
      { x: -node.radius - 10, y: 4, anchor: 'end' as const }
    ]
    for (const placement of placements) {
      const left =
        node.x +
        placement.x -
        (placement.anchor === 'middle'
          ? node.width / 2
          : placement.anchor === 'end'
            ? node.width
            : 0)
      const box = {
        left: left - 7,
        right: left + node.width + 7,
        top: node.y + placement.y - 14,
        bottom: node.y + placement.y + 6
      }
      if (
        box.left < 4 ||
        box.right > width - 4 ||
        box.top < 4 ||
        box.bottom > height - 4
      )
        continue
      if (
        boxes.some(
          other =>
            box.left < other.right &&
            box.right > other.left &&
            box.top < other.bottom &&
            box.bottom > other.top
        ) ||
        nodes.some(
          other =>
            other.key !== node.key &&
            other.x + other.radius + 3 > box.left &&
            other.x - other.radius - 3 < box.right &&
            other.y + other.radius + 3 > box.top &&
            other.y - other.radius - 3 < box.bottom
        )
      )
        continue
      visible.set(node.key, placement)
      boxes.push(box)
      break
    }
    // Focused titles remain available even in a very dense neighborhood.
    if (
      node.required &&
      !visible.has(node.key) &&
      node.x >= 0 &&
      node.x <= width &&
      node.y >= 0 &&
      node.y <= height
    )
      visible.set(node.key, placements[0])
  }
  return visible
}
