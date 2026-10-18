import { getNativeRuntime } from '@monolith/api'

/** Only the connected host supplies executable addon code; catalog URLs never reach this loader. */
export function resolveRemoteEntry(entry: string) {
  if (
    !/^\/modules\/[a-zA-Z0-9_-]+\/remoteEntry\.js(?:\?[a-zA-Z0-9_=&.-]+)?$/.test(
      entry
    )
  )
    throw Error('Invalid addon entry point')
  const native = getNativeRuntime()
  if (native) {
    const origin = new URL(native.profile.origin)
    if (origin.protocol !== 'https:')
      throw Error('Downloaded desktop addons require an HTTPS host')
    return new URL('/api' + entry, origin).href
  }
  return `${import.meta.env.VITE_API_HOST || ''}${entry}`
}
