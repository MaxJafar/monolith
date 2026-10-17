const guards = new Set<() => Promise<void>>()
export function registerSignOutGuard(guard: () => Promise<void>) {
  guards.add(guard)
  return () => {
    guards.delete(guard)
  }
}
export async function checkSignOutGuards() {
  for (const guard of guards) await guard()
}
