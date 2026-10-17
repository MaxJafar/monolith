let accessToken: string | null = null
const listeners = new Set<() => void>()
export function subscribeAccessToken(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function setAccessToken(token: string): void {
  accessToken = token
  for (const listener of listeners) listener()
}

export function getAccessToken(): string | null {
  return accessToken
}

export function clearAccessToken(): void {
  accessToken = null
  for (const listener of listeners) listener()
}
