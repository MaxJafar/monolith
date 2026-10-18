import { defineRoutes, writeContractFileToClient } from '@monolith/server-utils'

import * as entries from './routes/entries'
import * as subjects from './routes/subjects'
import * as workspaces from './routes/workspaces'

const routes = defineRoutes({ workspaces, subjects, entries })
writeContractFileToClient(routes, import.meta.dirname)

export default routes
