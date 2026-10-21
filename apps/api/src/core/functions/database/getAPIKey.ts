// SPDX-License-Identifier: 0BSD
import { decrypt2 } from '@functions/auth/encryption'
import { createServiceLogger } from '@functions/logging'

import { ModuleRegistry } from '@monolith/module-runtime/registry'

import type { db } from '../../drizzle'

type Caller = { source: 'app' | 'core'; id: string }
export async function validateCallerAccess(
  caller: Caller,
  key: string
): Promise<void> {
  if (caller.source === 'core') return
  const registration = ModuleRegistry.entries.find(
    item => item.id === caller.id || item.name === caller.id
  )
  if (!registration) throw new Error('Module is not registered: ' + caller.id)
  if (!registration.APIKeyAccess?.[key])
    throw new Error('Module has not declared API access: ' + key)
}

export default function getAPIKeyFactory(
  database: typeof db,
  caller?: Caller
): (id: string) => Promise<string> {
  return async key => {
    if (!caller) throw new Error('API credentials require a registered caller')
    const saved = await database.query.apiKeysEntries.findFirst({
      where: { keyId: key }
    })
    if (!saved) throw new Error('API key is not configured: ' + key)
    if (!saved.exposable) await validateCallerAccess(caller, key)
    const secret = process.env.MASTER_KEY
    if (!secret)
      throw new Error('MASTER_KEY is required to open API credentials')
    let value: string
    try {
      value = decrypt2(saved.key, secret)
    } catch (cause) {
      throw new Error('Stored API credential could not be decrypted: ' + key, {
        cause
      })
    }
    createServiceLogger('API Key Vault').info(
      'Credential accessed: ' + key + ' by ' + caller.source + ':' + caller.id
    )
    return value
  }
}
