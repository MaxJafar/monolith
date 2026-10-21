// SPDX-License-Identifier: 0BSD
import { ghApi } from './cli'
import { registryConfig } from './registryConfig'

export function validateMaintainerAccess(username: string) {
  const value = ghApi<{ permission: string }>(
    'repos/' +
      registryConfig().repo +
      '/collaborators/' +
      encodeURIComponent(username) +
      '/permission'
  )
  if (!new Set(['admin', 'maintain', 'write']).has(value.permission))
    throw Error('This GitHub account cannot publish to the configured registry')
}
