import type { CanvasBlock } from '@monolith/blocks'

import { newCanvasBlock } from './defaults'

export type WidgetScope = 'dashboard' | string

export type WidgetDescriptor = {
  title: string
  icon: string
  module?: string
  filterable?: boolean
}

export function scopedWidgets(
  widgets: Record<string, WidgetDescriptor>,
  scope: WidgetScope
) {
  return Object.fromEntries(
    Object.entries(widgets).filter(
      ([id, widget]) =>
        id !== 'linkedDatabase' &&
        (scope === 'dashboard' ||
          scope === 'actions' ||
          widget.module === scope)
    )
  )
}

export const dashboardTemplates = {
  focus: [
    ['workspacePulse', 'full'],
    ['actionAgenda', 'half'],
    ['projectFocus', 'half'],
    ['quickLinks', 'half'],
    ['weather', 'half']
  ],
  planning: [
    ['projectFocus', 'half'],
    ['actionAgenda', 'half'],
    ['workspacePulse', 'full'],
    ['quickLinks', 'full']
  ],
  overview: [
    ['workspacePulse', 'full'],
    ['native', 'full'],
    ['actionAgenda', 'half'],
    ['weather', 'half']
  ],
  homelab: [
    ['techLabHealth', 'half'],
    ['weather', 'half'],
    ['techLabServices', 'full'],
    ['techLabDevice', 'half'],
    ['actionAgenda', 'half']
  ]
} as const

export type DashboardTemplate = keyof typeof dashboardTemplates

export function templateWidgets(
  template: DashboardTemplate,
  widgets: Record<string, WidgetDescriptor>,
  nativeTitle: string
) {
  return dashboardTemplates[template]
    .filter(([id]) => id === 'native' || !!widgets[id])
    .map(([id, width]) =>
      newCanvasBlock(id === 'native' ? 'native' : 'widget', {
        widget: id === 'native' ? '' : id,
        title: id === 'native' ? nativeTitle : widgets[id]!.title,
        width
      })
    )
}

export function resizeWidget(
  block: CanvasBlock,
  width: number,
  height: number,
  available: number
): CanvasBlock {
  const ratio = width / Math.max(1, available)

  return {
    ...block,
    width: ratio < 0.42 ? 'third' : ratio < 0.75 ? 'half' : 'full',
    height: Math.round(Math.max(180, Math.min(1000, height)))
  }
}
