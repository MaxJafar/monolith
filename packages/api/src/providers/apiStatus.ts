// SPDX-License-Identifier: 0BSD
import { applicationFetch } from '../desktop/runtime'

export type ServerEnvironment = 'production' | 'development'

export async function checkAPIStatus(
  endpoint: string,
  signal?: AbortSignal
): Promise<ServerEnvironment | false> {
  try {
    const deadline = AbortSignal.timeout(5_000)
    const response = await applicationFetch(
      endpoint.replace(/\/+$/, '') + '/status',
      {
        signal: signal ? AbortSignal.any([signal, deadline]) : deadline
      }
    )
    if (!response.ok) return false
    const result = (await response.json()) as {
      data?: { environment?: unknown }
    } | null
    const environment = result?.data?.environment
    return environment === 'production' || environment === 'development'
      ? environment
      : false
  } catch {
    return false
  }
}
