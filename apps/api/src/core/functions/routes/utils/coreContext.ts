import {
  decrypt,
  decrypt2,
  encrypt,
  encrypt2
} from '@functions/auth/encryption'
import getAPIKeyFactory from '@functions/database/getAPIKey'
import createFetchAI from '@functions/external/ai'
import searchLocations from '@functions/external/location'
import parseOCR from '@functions/external/ocr'
import convertPDFToImage from '@functions/media/convertPDFToImage'
import {
  addToTaskPool,
  globalTaskPool,
  updateTaskInPool
} from '@functions/socketio/taskPool'
import TempFileManager from '@functions/utils/tempFileManager'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { FileStorage } from '@monolith/file-storage'
import { createFileMetadataStore } from '@monolith/file-storage/server'
import { type Logger, createLogger } from '@monolith/log'
import { ModuleRegistry } from '@monolith/module-runtime/registry'
import type { CoreContext } from '@monolith/server-utils'

import type { db as coreDb } from '../../../drizzle'
import { storageProvider } from '../../../storage'

type Caller = { source: 'app' | 'core'; id: string }
const loggers = new Map<string, Logger>()

const shared = {
  tempFile: TempFileManager,
  crypto: Object.freeze({ decrypt, decrypt2, encrypt, encrypt2 }),
  media: Object.freeze({ convertPDFToImage, parseOCR }),
  tasks: Object.freeze({
    global: globalTaskPool,
    add: addToTaskPool,
    update: updateTaskInPool
  }),
  validation: Object.freeze({
    checkModulesAvailability: async (id: string) =>
      ModuleRegistry.isAvailable(id)
  })
} satisfies Pick<
  CoreContext,
  'tempFile' | 'crypto' | 'media' | 'tasks' | 'validation'
>

/** Only database-bound capabilities are constructed per request; ownership comes from the registered contract. */
export function createCoreContext({
  module,
  db
}: {
  module?: Caller
  db: PostgresJsDatabase
}): CoreContext {
  const name = module ? module.source + ':' + module.id : 'core'
  let logging = loggers.get(name)
  if (!logging) {
    logging = createLogger({ name })
    loggers.set(name, logging)
  }
  const database = db as typeof coreDb
  return {
    ...shared,
    logging,
    storage: new FileStorage(
      storageProvider,
      createFileMetadataStore(db),
      module?.id ?? 'unknown',
      logging
    ),
    api: {
      fetchAI: createFetchAI(database, module),
      getAPIKey: getAPIKeyFactory(database, module),
      searchLocations
    }
  }
}
