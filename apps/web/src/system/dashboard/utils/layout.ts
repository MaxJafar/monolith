import type { IDashboardLayout } from '@monolith/ui'

type WidgetConstraints = {
  minW?: number
  minH?: number
  maxW?: number
  maxH?: number
}

export function hasDashboardWidgets(layout: IDashboardLayout) {
  return Object.values(layout).some(widgets => widgets.length > 0)
}

function layoutGeometry(layout: IDashboardLayout) {
  return JSON.stringify(
    Object.entries(layout)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([breakpoint, widgets]) => [
        breakpoint,
        widgets
          .map(({ i, x, y, w, h, minW, minH }) => [i, x, y, w, h, minW, minH])
          .sort(([left], [right]) => String(left).localeCompare(String(right)))
      ])
  )
}

export function shouldPersistDashboardLayout(
  canLayoutChange: boolean,
  saved: IDashboardLayout,
  computed: IDashboardLayout
) {
  return canLayoutChange && layoutGeometry(saved) !== layoutGeometry(computed)
}

export function addDashboardWidget(
  layout: IDashboardLayout,
  id: string,
  { minW, minH, maxW, maxH }: WidgetConstraints
): IDashboardLayout {
  return Object.fromEntries(
    [...new Set([...Object.keys(layout), 'lg', 'md', 'sm', 'xs', 'xxs'])].map(
      breakpoint => {
        const widgets = layout[breakpoint] ?? []

        if (widgets.some(widget => widget.i === id))
          return [breakpoint, widgets]

        const bottom = widgets.reduce(
          (end, widget) =>
            Math.max(
              end,
              Number.isFinite(widget.y) && Number.isFinite(widget.h)
                ? widget.y + widget.h
                : 0
            ),
          0
        )

        return [
          breakpoint,
          [
            ...widgets,
            {
              i: id,
              x: 0,
              y: bottom,
              w: minW ?? maxW ?? 4,
              h: minH ?? maxH ?? 4,
              minW: minW ?? 1,
              minH: minH ?? 1,
              maxW: maxW ?? 8,
              maxH: maxH ?? 8
            }
          ]
        ]
      }
    )
  )
}

/** Extract widget positions without treating other account settings as grid rows. */
export function readDashboardLayout(value: unknown): IDashboardLayout {
  if (!value || typeof value !== 'object') return {}
  const result: IDashboardLayout = {}
  for (const [name, rows] of Object.entries(value)) {
    if (!Array.isArray(rows)) continue
    result[name] = rows
      .filter(
        row =>
          row &&
          typeof row === 'object' &&
          typeof row.i === 'string' &&
          ['x', 'y', 'w', 'h'].every(field => Number.isFinite(row[field])) &&
          row.w > 0 &&
          row.h > 0
      )
      .map(row => ({ ...row }))
  }
  return result
}
