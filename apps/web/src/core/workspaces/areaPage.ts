export function workspaceArea(path: string, search: string) {
  const params = new URLSearchParams(search)
  const type = path === '/databases' ? params.get('type') : null
  const modules: Record<string, string> = {
    project: 'projects',
    task: 'todo-list',
    note: 'notes',
    event: 'calendar',
    post: 'blog',
    page: 'databases'
  }

  if (type && modules[type])
    return { key: `/${modules[type]}`, titleKey: `areaTitles.${type}` }
  if (path === '/databases' && params.get('section') === 'workspace')
    return { key: '/workspace-settings', titleKey: 'workspaceSettings' }

  return { key: path, titleKey: null }
}
