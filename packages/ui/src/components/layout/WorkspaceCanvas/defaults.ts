import type {
  CanvasBlock,
  CanvasBlockType,
  CanvasPage
} from '@lifeforge/blocks'

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
    title: home ? (labels.home ?? 'Home') : title,
    icon: `lucide:${icons[key.split('/')[1] ?? ''] ?? 'file-text'}`,
    fullWidth: true,
    revision: 0,
    updated: null,
    blocks: home
      ? [
          newCanvasBlock('heading', {
            title: labels.quickAccess ?? 'Quick access'
          }),
          newCanvasBlock('button', {
            title: labels.projects ?? 'Projects',
            url: '/projects',
            width: 'third'
          }),
          newCanvasBlock('button', {
            title: labels.documents ?? 'Documents & databases',
            url: '/databases',
            width: 'third'
          }),
          newCanvasBlock('button', {
            title: 'Tech Lab',
            url: '/tech-lab',
            width: 'third'
          }),
          newCanvasBlock('widget', {
            title: labels.labHealth ?? 'Lab health',
            widget: 'techLabHealth',
            width: 'half'
          }),
          newCanvasBlock('widget', {
            title: labels.deviceResources ?? 'Device resources',
            widget: 'techLabDevice',
            width: 'half'
          }),
          newCanvasBlock('widget', {
            title: labels.projects ?? 'Projects',
            widget: 'projectOverview'
          }),
          newCanvasBlock('widget', {
            title: labels.homelab ?? 'Homelab',
            widget: 'techLabServices'
          }),
          newCanvasBlock('widget', {
            title: labels.financialOverview ?? 'Financial overview',
            widget: 'assetsBalance',
            width: 'half'
          }),
          newCanvasBlock('document', {
            title: labels.notes ?? 'Notes',
            width: 'half'
          })
        ]
      : key.startsWith('/page/')
        ? [newCanvasBlock('document')]
        : [newCanvasBlock('native', { title })]
  }
}
