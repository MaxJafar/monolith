import { defineRoutes, writeContractFileToClient } from '@monolith/server-utils'

import * as routes from './routes'
import * as runtime from './runtime'
import { scopeAgentRoutes } from './workspaceScope'

const router = defineRoutes(scopeAgentRoutes({ ...routes, runtime }))
writeContractFileToClient(router, import.meta.dirname)

export default router
