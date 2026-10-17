import { createCache } from '@functions/cache'

const attempts = createCache<{ failures: number; until: number }>(
  'monolith-login-attempts',
  { stdTTL: 3600 }
)
export function checkLoginRateLimit(address: string): boolean {
  return (attempts.get(address)?.until ?? 0) <= Date.now()
}
export function recordFailedLogin(address: string): void {
  const failures = (attempts.get(address)?.failures ?? 0) + 1
  const tier = Math.min(3, Math.floor((failures - 1) / 3))
  const delay = [0, 5000, 30000, 300000][tier]!
  attempts.set(address, { failures, until: Date.now() + delay })
}
export function clearLoginRateLimit(address: string): void {
  attempts.del(address)
}
