import type {
  CanvasBlock,
  CanvasBlockType,
  CanvasPage
} from '@monolith/blocks'

export function newCanvasBlock(
  type: CanvasBlockType,
  values: Partial<CanvasBlock> = {}
): CanvasBlock {
  return {
    id: crypto.randomUUID(),
    type,
    width: 'full',
    title: '',
    content: '',
    url: '',
    widget: '',
    ...values
  }
}

export function defaultCanvasPage(
  key: string,
  title: string,
  labels: Record<string, string> = {}
): CanvasPage {
  const home = key === '/dashboard'
  const icons: Record<string, string> = {
    dashboard: 'house',
    'tech-lab': 'server',
    wallet: 'wallet',
    gym: 'dumbbell',
    projects: 'kanban',
    databases: 'database',
    agents: 'bot',
    calendar: 'calendar-days',
    notes: 'notebook-pen'
  }

  return {
    version: 1,
    title,
    icon: `lucide:${icons[key.split('/')[1] ?? ''] ?? 'file-text'}`,
    fullWidth: true,
    revision: 0,
    updated: null,
    blocks: home
      ? [
          ...[
            'workspacePulse',
            'actionAgenda',
            'projectFocus',
            'quickLinks',
            'weather'
          ].map(widget =>
            newCanvasBlock('widget', {
              title: labels[widget] ?? widget,
              widget,
              width: widget === 'workspacePulse' ? 'full' : 'half'
            })
          )
        ]
      : key.startsWith('/page/')
        ? [newCanvasBlock('document')]
        : [newCanvasBlock('native', { title })]
  }
}
