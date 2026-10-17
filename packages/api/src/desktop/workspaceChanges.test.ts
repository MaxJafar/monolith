import { afterEach, describe, expect, it, vi } from 'vitest'

import { GatewayClient } from './transport'
import {
  publishWorkspaceChange,
  subscribeWorkspaceChanges
} from './workspaceChanges'

afterEach(() => vi.unstubAllGlobals())
describe('saved workspace notifications', () => {
  it('refreshes only the matching identity and unsubscribes cleanly', () => {
    vi.stubGlobal('window', new EventTarget())
    vi.stubGlobal(
      'BroadcastChannel',
      class {
        postMessage() {}
        close() {}
      }
    )
    const scope = {
        serverId: 'server',
        accountId: 'account',
        workspaceId: 'workspace'
      },
      refresh = vi.fn()
    const unsubscribe = subscribeWorkspaceChanges(scope, refresh)
    for (const property of ['serverId', 'accountId', 'workspaceId'])
      publishWorkspaceChange({ ...scope, [property]: 'other' })
    expect(refresh).not.toHaveBeenCalled()
    publishWorkspaceChange(scope)
    expect(refresh).toHaveBeenCalledTimes(1)
    unsubscribe()
    publishWorkspaceChange(scope)
    expect(refresh).toHaveBeenCalledTimes(1)
  })
  it('notifies after a committed mutation, never a failed save or read', async () => {
    vi.stubGlobal('window', new EventTarget())
    vi.stubGlobal(
      'BroadcastChannel',
      class {
        postMessage() {}
        close() {}
      }
    )
    const scope = {
        serverId: 'server',
        accountId: 'account',
        workspaceId: 'workspace'
      },
      refresh = vi.fn()
    const unsubscribe = subscribeWorkspaceChanges(scope, refresh)
    const request = vi
      .fn()
      .mockResolvedValue({ status: 200, body: '{}', headers: {} })
    const client = new GatewayClient({ request }, scope)
    const parameters = {
      workspaceId: scope.workspaceId,
      kind: 'page',
      id: 'page'
    }
    await client.call('document', parameters)
    expect(refresh).not.toHaveBeenCalled()
    request.mockResolvedValueOnce({ status: 409, body: '{}', headers: {} })
    await expect(client.call('saveDocument', parameters, {})).rejects.toThrow()
    expect(refresh).not.toHaveBeenCalled()
    await client.call('saveDocument', parameters, {})
    expect(refresh).toHaveBeenCalledTimes(1)
    unsubscribe()
  })
})
