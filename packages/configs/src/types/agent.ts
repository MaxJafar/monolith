export type AgentAdapter = 'planner' | 'external' | 'cli' | 'codex' | 'openclaw'

export type TokenUsage = {
  provider: string
  model: string
  session_id: string
  input_tokens: number
  cached_input_tokens: number
  output_tokens: number
  total_tokens: number
  reported_cost_cents: number
}
