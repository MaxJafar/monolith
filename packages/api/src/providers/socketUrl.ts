/** HTTP API path prefixes are separate from Socket.IO namespaces. */
export function resolveSocketUrl(
  apiHost: string,
  browserOrigin: string,
  namespace = '/'
): string {
  const origin = new URL(apiHost || browserOrigin, browserOrigin).origin

  return new URL(namespace, origin).href
}
