// SPDX-License-Identifier: 0BSD
const session = { token: null as string | null, revision: 0 }
const subscribers = new Set<() => void>()

function publish(token: string | null): void {
  session.token = token
  session.revision += 1
  for (const notify of [...subscribers]) notify()
}

export const getAccessToken = (): string | null => session.token
export const getAccessTokenRevision = (): number => session.revision
export const setAccessToken = (token: string): void => publish(token)
export const clearAccessToken = (): void => publish(null)
export function subscribeAccessToken(notify: () => void): () => void {
  subscribers.add(notify)
  return () => {
    subscribers.delete(notify)
  }
}
