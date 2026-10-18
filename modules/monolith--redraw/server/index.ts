import { defineRoutes, writeContractFileToClient } from '@monolith/server-utils'

import { list as workspaces } from '../../monolith--databases/server/workspaceRoutes'
import * as collaboration from './collaboration'
import * as comments from './comments'
import * as projects from './routes'

const routes = defineRoutes({ workspaces, projects, collaboration, comments })
writeContractFileToClient(routes, import.meta.dirname)

export default routes
