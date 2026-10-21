// SPDX-License-Identifier: 0BSD
import { eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { ClientError, type CoreContext } from '@monolith/server-utils'

import type { CoreRelations } from '../../core/drizzle'
import { users } from './schema.drizzle'

type Database = PostgresJsDatabase<CoreRelations>
export async function accountFor(database: Database, id: string) {
  const account = await database.query.users.findFirst({ where: { id } })
  if (!account) throw new ClientError('Account is unavailable', 401)
  return account
}
export async function updateAccount(
  database: Database,
  id: string,
  changes: Parameters<ReturnType<Database['update']>['set']>[0]
) {
  await database
    .update(users)
    .set({ ...changes, updated: new Date() })
    .where(eq(users.id, id))
}

export async function changeAccountImage(options: {
  db: Database
  userId: string
  storage: CoreContext['storage']
  field: 'avatar' | 'bgImage'
  file?: import('@monolith/file-storage').StagedFile
  remove?: boolean
}) {
  const { db, userId, storage, field } = options
  const account = await accountFor(db, userId)
  const previous = account[field]
  if (options.remove) {
    if (previous) await storage.delete(previous)
    await updateAccount(db, userId, { [field]: null })
    return null
  }
  if (!options.file) throw new ClientError('Choose an image to upload', 400)
  const reference = await storage.save({
    file: options.file,
    currentKey: previous || undefined,
    ...(field === 'avatar' ? { thumbs: ['256x0'] } : {})
  })
  if (!reference) throw new ClientError('Image could not be saved', 400)
  await updateAccount(db, userId, {
    [field]: reference.key,
    ...(field === 'bgImage'
      ? {
          backdropFilters: {
            blur: 'none',
            brightness: 100,
            contrast: 100,
            saturation: 100,
            overlayOpacity: 50
          }
        }
      : {})
  })
  return reference
}
