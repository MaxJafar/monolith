export async function checkAPIStatus(
  apiEndpoint: string
): Promise<'production' | 'development' | false> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)

  try {
    const response = await fetch(`${apiEndpoint}/status`, {
      signal: controller.signal
    })

    if (!response.ok) return false

    const envelope: unknown = await response.json()

    if (
      !envelope ||
      typeof envelope !== 'object' ||
      !('data' in envelope) ||
      !envelope.data ||
      typeof envelope.data !== 'object' ||
      !('environment' in envelope.data)
    )
      return false

    const environment = envelope.data.environment

    return environment === 'production' || environment === 'development'
      ? environment
      : false
  } catch {
    return false
  } finally {
    clearTimeout(timeout)
  }
}
