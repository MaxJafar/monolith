import { defineRoutes, writeContractFileToClient } from '@monolith/server-utils'

import * as finance from './routes'

const routes = defineRoutes({ ...finance })
writeContractFileToClient(routes, import.meta.dirname)

export default routes
