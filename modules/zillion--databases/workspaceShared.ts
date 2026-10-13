import z from 'zod'

export const workspaceModule = z.enum([
  'projects',
  'notes',
  'calendar',
  'blog',
  'todo-list',
  'agents',
  'databases',
  'wallet',
  'gym',
  'tech-lab',
  'achievements',
  'wishlist',
  'code-time',
  'flashcards',
  'idea-box',
  'pomodoro-timer'
])
export const workspaceProfile = z.enum(['personal', 'collaborative', 'agents'])
export const workspaceMemberRole = z.enum(['editor', 'viewer'])
export const itemType = z.enum([
  'page',
  'task',
  'note',
  'project',
  'event',
  'post'
])
export type WorkspaceModule = z.infer<typeof workspaceModule>
export type WorkspaceProfile = z.infer<typeof workspaceProfile>
export type WorkspaceMemberRole = z.infer<typeof workspaceMemberRole>
export type ItemType = z.infer<typeof itemType>

export const workspaceModules = z
  .array(workspaceModule)
  .max(64)
  .refine(
    values => new Set(values).size === values.length,
    'Choose each module only once'
  )
export const workspaceInput = z
  .object({
    name: z.string().trim().min(1).max(160),
    icon: z
      .string()
      .regex(/^lucide:[a-z0-9-]{1,60}$/)
      .default('lucide:layers'),
    profile: workspaceProfile.default('personal'),
    enabled_modules: workspaceModules,
    description: z.string().max(10000).default('')
  })
  .strict()

export function profileModules(profile: WorkspaceProfile): WorkspaceModule[] {
  if (profile === 'agents') return ['agents']
  if (profile === 'collaborative')
    return ['projects', 'notes', 'calendar', 'todo-list', 'databases']
  return [...workspaceModule.options]
}

export type Workspace = {
  id: string
  owner_id: string
  name: string
  icon: string
  profile: WorkspaceProfile
  enabled_modules: WorkspaceModule[]
  description: string
  is_default: boolean
  created: string
  updated: string
  role: 'owner' | WorkspaceMemberRole
}

export type WorkspacePageSummary = {
  id: string
  workspace_id: string
  parent_id: string | null
  title: string
  icon: string
  route_key: string
  position: number
  revision: number
}

export const nativeSourceKind = z.enum([
  'todo',
  'project-task',
  'project',
  'note',
  'event',
  'post'
])
export type NativeSourceKind = z.infer<typeof nativeSourceKind>
