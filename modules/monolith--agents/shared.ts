export const ROLES = ['lead', 'contributor', 'observer'] as const

export const ADAPTERS = [
  'planner',
  'external',
  'cli',
  'codex',
  'openclaw'
] as const

export type { TokenUsage } from '@monolith/configs'

export type UsageRecord = {
  id: string
  original_run_id: string
  run_id: string | null
  principal_id: string
  task_title: string
  adapter: Principal['adapter']
  status: Run['status']
  provider: string
  model: string
  session_id: string
  input_tokens: number | null
  cached_input_tokens: number | null
  output_tokens: number | null
  total_tokens: number | null
  cost_cents: number
  reported_cost_cents: number | null
  created: string
  updated: string
}

export const WORK_STATES = [
  'ready',
  'running',
  'review',
  'blocked',
  'done'
] as const

export const RUN_STATES = [
  'queued',
  'running',
  'review',
  'approved',
  'rejected',
  'failed',
  'cancelled'
] as const

export type Principal = {
  id: string
  kind: 'human' | 'agent'
  name: string
  role: (typeof ROLES)[number]
  status: 'active' | 'paused'
  reports_to: string | null
  adapter: (typeof ADAPTERS)[number]
  instructions: string
  budget_cents: number
  revision: number
  playbook_ids?: string[]
}

export type Playbook = {
  id: string
  name: string
  description: string
  instructions: string
  checks: string[]
  require_review: boolean
  archived: boolean
  revision: number
}

export type PlaybookSnapshot = Omit<Playbook, 'archived'>

export type QualityEvidence = {
  check_id: string
  passed: boolean
  evidence: string
}

export type Project = { id: string; name: string }

export type Member = {
  id: string
  principal_id: string
  project_id: string
  role: (typeof ROLES)[number]
}

export type WorkItem = {
  id: string
  task_id: string
  project_id: string
  title: string
  content: string
  completed: boolean
  assignee_id: string | null
  status: (typeof WORK_STATES)[number]
  priority: 'low' | 'medium' | 'high'
  revision: number
  blockers: string[]
  context: string[]
  auto_dispatch: boolean
  run_budget_cents: number
  auto_approve: boolean
}

export type Run = {
  task_title: string
  id: string
  task_id: string
  principal_id: string
  status: (typeof RUN_STATES)[number]
  estimated_cents: number
  cost_cents: number
  result: string
  error: string
  decision_note: string
  created: string
  heartbeat_at: string | null
  lease_expires: string | null
  adapter: Principal['adapter']
  auto_approve: boolean
  playbooks: Omit<PlaybookSnapshot, 'instructions' | 'description'>[]
  quality_report: QualityEvidence[]
}

export type Activity = {
  id: string
  actor_id: string
  task_id: string | null
  run_id: string | null
  action: string
  message: string
  created: string
}

export type Credential = {
  id: string
  principal_id: string
  name: string
  expires: string
  revoked: boolean
  last_used: string | null
}

export type AgentSnapshot = {
  playbooks: Playbook[]
  principals: Principal[]
  projects: Project[]
  members: Member[]
  tasks: WorkItem[]
  runs: Run[]
  activity: Activity[]
  credentials: Credential[]
  pages: { key: string; title: string; kind: 'document' | 'record' | 'note' | 'redraw' }[]
  usage: { principal_id: string; spent_cents: number; reserved_cents: number }[]
}
