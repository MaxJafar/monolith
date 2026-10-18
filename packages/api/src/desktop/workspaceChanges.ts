export type WorkspaceChange = {
  serverId: string
  accountId: string
  workspaceId: string
}

const eventName = 'monolith-workspace-content-saved'
const channelName = 'monolith-workspace-content'

/** Notifications contain identities only. Readers still authorize and fetch
 * current data from their own server; drafts never leave the editor here. */
export function publishWorkspaceChange(change: WorkspaceChange) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(eventName, { detail: change }))
  try {
    const channel = new BroadcastChannel(channelName)
    channel.postMessage(change)
    channel.close()
  } catch {
    // Focus/foreground refresh also works where channels are unavailable.
  }
}

export function subscribeWorkspaceChanges(
  scope: WorkspaceChange,
  refresh: () => void
) {
  if (typeof window === 'undefined') return () => {}
  const receive = (value: unknown) => {
    if (!value || typeof value !== 'object') return
    const change = value as Partial<WorkspaceChange>
    if (
      change.serverId === scope.serverId &&
      change.accountId === scope.accountId &&
      change.workspaceId === scope.workspaceId
    )
      refresh()
  }
  const local = (event: Event) => receive((event as CustomEvent).detail)
  window.addEventListener(eventName, local)
  let channel: BroadcastChannel | undefined
  try {
    channel = new BroadcastChannel(channelName)
    channel.onmessage = event => receive(event.data)
  } catch {
    /* Native hosts may disable cross-window channels. */
  }
  return () => {
    window.removeEventListener(eventName, local)
    channel?.close()
  }
}
