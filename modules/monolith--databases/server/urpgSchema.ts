import { createModuleTable } from '@monolith/drizzle'
import { jsonb, timestamp, uuid } from 'drizzle-orm/pg-core'

import type { Campaign } from '../urpgShared'
import { workspaces } from './workspaceSchema'

const table = createModuleTable('zillion_databases')
export const rpgCampaigns = table('rpg_campaigns', {
  workspace_id: uuid('workspace_id')
    .primaryKey()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  owner_id: uuid('owner_id').notNull(),
  setup_id: uuid('setup_id').notNull().unique(),
  state: jsonb('state').$type<Campaign>().notNull(),
  updated: timestamp('updated', { mode: 'date', withTimezone: true })
    .defaultNow()
    .notNull()
})
