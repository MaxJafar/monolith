import { defineRoutes, writeContractFileToClient } from '@monolith/server-utils'

import { list as workspaces } from '../../monolith--databases/server/workspaceRoutes'
import * as flows from './routes'

const routes = defineRoutes({ workspaces, flows })
writeContractFileToClient(routes, import.meta.dirname)
export default routes
