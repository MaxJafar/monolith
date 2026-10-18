import { defineRoutes, writeContractFileToClient } from '@monolith/server-utils'

import * as inventory from './routes'

const routes = defineRoutes({ ...inventory })
writeContractFileToClient(routes, import.meta.dirname)

export default routes
