export const PROJECTS = {
  ui: 'packages/ui',
  client: 'apps/web',
  server: 'apps/api',
  docs: 'apps/site',
  cli: 'tools'
} as const

export type ProjectType = keyof typeof PROJECTS
