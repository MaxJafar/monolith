import { decrypt2 } from '@functions/auth/encryption'
import { createServiceLogger } from '@functions/logging'
import { ModuleRegistry } from '@monolith/module-runtime/registry'
import chalk from 'chalk'

import type { db } from '../../drizzle'

const logger = createServiceLogger('API Key Vault')

export async function validateCallerAccess(
  callerModule: { source: 'app' | 'core'; id: string },
  id: string
) {
  if (callerModule.source === 'core') {
    return
  }

  const entry = ModuleRegistry.entries.find(
    candidate =>
      candidate.name === callerModule.id || candidate.id === callerModule.id
  )

  if (!entry) {
    throw new Error(`Module ${callerModule.id} is not registered`)
  }

  const access = entry.APIKeyAccess?.[id]

  if (!access) {
    throw new Error(`API access for ${id} not found`)
  }
}

async function getAPIKey(
  database: typeof db,
  id: string,
  callerModule?: { source: 'app' | 'core'; id: string }
): Promise<string> {
  try {
    if (!callerModule) {
      throw new Error(
        'Unable to determine caller module for API key validation.'
      )
    }

    const record = await database.query.apiKeysEntries.findFirst({
      where: { keyId: id }
    })

    if (!record) {
      throw new Error(`API key for ${id} not found`)
    }

    if (!record.exposable) {
      await validateCallerAccess(callerModule, id)
    }

    try {
      logger.info(
        `API key for ${chalk.blue(id)} retrieved by ${chalk.blue(callerModule.source)}:${chalk.blue(callerModule.id)}`
      )

      return decrypt2(record.key, process.env.MASTER_KEY!)
    } catch {
      throw new Error(`Failed to decrypt API key for ${id}.`)
    }
  } catch (err) {
    throw new Error(
      `Failed to retrieve API key for ${id}: ${err instanceof Error ? err.message : String(err)}`,
      { cause: err }
    )
  }
}

export default function getAPIKeyFactory(
  database: typeof db,
  callerModule?: { source: 'app' | 'core'; id: string }
): (id: string) => Promise<string> {
  return (id: string) => getAPIKey(database, id, callerModule)
}
