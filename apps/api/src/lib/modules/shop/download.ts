const hosts = new Set([
  'github.com',
  'release-assets.githubusercontent.com',
  'objects.githubusercontent.com',
  'raw.githubusercontent.com'
])

export function checkReleaseUrl(value: string) {
  const url = new URL(value)
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.port ||
    !hosts.has(url.hostname)
  )
    throw Error('Only HTTPS GitHub release sources are allowed')
  return url
}

export async function downloadRelease(
  url: string,
  max: number,
  progress?: (bytes: number) => void
): Promise<Buffer> {
  let next = checkReleaseUrl(url)
  const signal = AbortSignal.timeout(120000)
  for (let redirects = 0; redirects < 6; redirects++) {
    const result = await fetch(next, {
      redirect: 'manual',
      signal,
      headers: { Accept: 'application/octet-stream' }
    })
    if ([301, 302, 303, 307, 308].includes(result.status)) {
      await result.body?.cancel()
      next = checkReleaseUrl(
        new URL(result.headers.get('location') ?? '', next).href
      )
      continue
    }
    if (!result.ok || !result.body)
      throw Error(`Release download failed (${result.status})`)
    if (Number(result.headers.get('content-length')) > max) {
      await result.body.cancel()
      throw Error('Download exceeds package size limit')
    }
    const chunks: Buffer[] = []
    let length = 0
    for await (const part of result.body) {
      length += part.length
      if (length > max) throw Error('Download exceeds package size limit')
      chunks.push(Buffer.from(part))
      progress?.(length)
    }
    return Buffer.concat(chunks)
  }
  throw Error('Too many download redirects')
}
