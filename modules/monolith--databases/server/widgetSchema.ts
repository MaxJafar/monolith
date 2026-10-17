import { createModuleTable } from '@monolith/drizzle'
import { jsonb, uuid } from 'drizzle-orm/pg-core'

import type { HabitState } from '../widgetShared'
import { workspaces } from './workspaceSchema'

export const workspaceHabits = createModuleTable('zillion_databases')(
  'workspace_habits',
  {
    workspace_id: uuid('workspace_id')
      .primaryKey()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    owner_id: uuid('owner_id').notNull(),
    state: jsonb('state').$type<HabitState>().notNull()
  }
)
