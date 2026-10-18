import { ROOT_DIR } from '@constants'
import fs from 'node:fs/promises'
import path from 'node:path'

import {
  type UpdatePreferences,
  emptyUpdateStatus,
  platformUpdateSchema
} from '@monolith/configs'

export function canManageUpdates(userId: string) {
  return (process.env.MONOLITH_UPDATE_ADMIN_IDS ?? '')
    .split(',')
    .map(id => id.trim())
    .filter(Boolean)
    .includes(userId)
}

export async function hostUpdate(
  action: 'status' | 'check' | 'download' | 'install' | 'rollback' | 'settings',
  preferences?: UpdatePreferences
) {
  const endpoint = process.env.MONOLITH_UPDATER_URL
  const token = process.env.MONOLITH_UPDATER_TOKEN

  if (!endpoint || !token) {
    if (action !== 'status')
      throw Error('The host update supervisor is not configured')

    const pkg = JSON.parse(
      await fs.readFile(path.join(ROOT_DIR, 'package.json'), 'utf8')
    )

    return emptyUpdateStatus(pkg.version)
  }

  const url = new URL(endpoint)

  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/'
  )
    throw Error('Invalid update supervisor endpoint')

  const result = await fetch(new URL(action, url), {
    method: action === 'status' ? 'GET' : 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: preferences ? JSON.stringify(preferences) : undefined,
    redirect: 'error',
    signal: AbortSignal.timeout(5000)
  })
  const value = await result.json()

  if (!result.ok)
    throw Error(
      typeof value.error === 'string'
        ? value.error
        : 'Update supervisor unavailable'
    )

  return platformUpdateSchema.parse(value)
}
