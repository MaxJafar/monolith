import { and, eq, ilike, isNull, sql } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import type { BuiltModuleSchema } from '@lifeforge/drizzle'

import type { IdeaBoxSchema } from '../forge'
import {
  ideaBoxEntries,
  ideaBoxEntriesText,
  ideaBoxFolders
} from '../schema.drizzle'

type IdeaBoxDb = PostgresJsDatabase<BuiltModuleSchema<IdeaBoxSchema>>

export const validateFolderPath = async (
  db: IdeaBoxDb,
  container: string,
  path: string[]
): Promise<{ folderExists: boolean; lastFolder: string }> => {
  let folderExists = true
  let lastFolder = ''

  for (const folder of path) {
    if (!folder) continue

    const folderEntry = await db.query.folders.findFirst({
      where: { id: folder }
    })

    if (
      !folderEntry ||
      (folderEntry.parent ?? '') !== lastFolder ||
      folderEntry.container !== container
    ) {
      folderExists = false
      break
    }

    lastFolder = folder
  }

  return { folderExists, lastFolder }
}

export async function recursivelySearchFolder(
  db: IdeaBoxDb,
  folderId: string,
  q: string,
  container: string,
  tags: string = '',
  parents: string
) {
  const folderInsideFolder = await db
    .select()
    .from(ideaBoxFolders)
    .where(
      and(
        eq(ideaBoxFolders.container, container),
        folderId
          ? eq(ideaBoxFolders.parent, folderId)
          : isNull(ideaBoxFolders.parent)
      )
    )

  const thisFolder = folderId
    ? await db.query.folders.findFirst({ where: { id: folderId } })
    : undefined

  const textResults = (
    await db
      .select({
        base_entry: ideaBoxEntries,
        content: ideaBoxEntriesText.content
      })
      .from(ideaBoxEntriesText)
      .innerJoin(
        ideaBoxEntries,
        eq(ideaBoxEntriesText.base_entry, ideaBoxEntries.id)
      )
      .where(
        and(
          ilike(ideaBoxEntriesText.content, `%${q}%`),
          eq(ideaBoxEntries.container, container),
          eq(ideaBoxEntries.archived, false),
          folderId
            ? eq(ideaBoxEntries.folder, folderId)
            : isNull(ideaBoxEntries.folder),
          ...(tags
            ? tags
                .split(',')
                .map(tag => sql`jsonb_exists(${ideaBoxEntries.tags}, ${tag})`)
            : [])
        )
      )
  ).map(result => ({
    ...result.base_entry,
    content: result.content,
    type: 'text' as const,
    fullPath: parents,
    expand: {
      folder: thisFolder
    }
  }))

  if (folderInsideFolder.length === 0) {
    return textResults
  }

  for (const folder of folderInsideFolder) {
    const results = await recursivelySearchFolder(
      db,
      folder.id,
      q,
      container,
      tags,
      parents + '/' + folder.id
    )

    textResults.push(...results)
  }

  return textResults
}
