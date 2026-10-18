import {
  GatewayError,
  type NativeHost,
  setDesktopBackgroundReader,
  setDesktopUpdater
} from '@monolith/api'
import { platformUpdateSchema } from '@monolith/configs'

type Reply = { status?: number; code?: string; message?: string }
type NativeWindow = Window & {
  __TAURI__?: {
    core: { invoke<T>(command: string, payload: unknown): Promise<T> }
  }
  webkit?: {
    messageHandlers?: {
      monolith?: { postMessage(payload: unknown): Promise<unknown> }
    }
  }
}
const native = window as NativeWindow
async function call<T>(
  operation: string,
  args: Record<string, unknown> = {}
): Promise<T> {
  try {
    if (native.__TAURI__)
      return await native.__TAURI__.core.invoke<T>('native_host', {
        operation,
        args
      })
    if (native.webkit?.messageHandlers?.monolith) {
      const reply = (await native.webkit.messageHandlers.monolith.postMessage({
        operation,
        args
      })) as { value?: T; error?: Reply }
      if (reply.error) throw reply.error
      return reply.value as T
    }
    throw {
      code: 'native_unavailable',
      message: 'Open this bundle in the Monolith desktop app'
    }
  } catch (cause) {
    const error =
      typeof cause === 'object' && cause
        ? (cause as Reply)
        : { message: String(cause) }
    throw new GatewayError(
      error.status ?? 0,
      error.code ?? 'native_error',
      error.message ?? 'The native operation failed'
    )
  }
}
export const host: NativeHost = {
  platform: native.__TAURI__ ? 'windows' : 'macos',
  profile: () => call('profile'),
  connect: url => call('connect', { url }),
  login: credentials => call('login', { credentials }),
  totp: (challenge, code) => call('totp', { challenge, code }),
  refresh: () => call('refresh'),
  signOut: () => call('signOut'),
  request: request => call('request', { request }),
  readDraft: key => call('readDraft', { key }),
  writeDraft: (key, value, expectedVersion) =>
    call('writeDraft', { key, value, expectedVersion }),
  removeDraft: (key, expectedVersion) =>
    call('removeDraft', { key, expectedVersion }),
  listDrafts: () => call('listDrafts'),
  openExternal: url => call('openExternal', { url }),
  saveFile: (name, content) => call('saveFile', { name, content }),
  windowControl: action => call('windowControl', { action })
}

setDesktopUpdater(async (action, preferences) =>
  platformUpdateSchema.parse(await call('updates', { action, preferences }))
)
setDesktopBackgroundReader(async () => {
  const state = await host.windowControl!('state')
  return state.background === true
})
