import { defineRoutes, writeContractFileToClient } from '@monolith/server-utils'

import {
  relate,
  snapshot,
  unrelate
} from '../../monolith--databases/server/workspaceGraphRoutes'
import {
  createPage,
  list as workspaces
} from '../../monolith--databases/server/workspaceRoutes'
import { preview } from './preview'

// Atlas is a lens on canonical workspace content, not a separate note store.
const routes = defineRoutes({
  workspaces,
  createPage,
  snapshot,
  relate,
  unrelate,
  preview
})
writeContractFileToClient(routes, import.meta.dirname)
export default routes
