import { defineRoutes, writeContractFileToClient } from '@monolith/server-utils'

import * as entries from './routes/entries'
import * as lists from './routes/lists'

const routes = defineRoutes({ lists, entries })
writeContractFileToClient(routes, import.meta.dirname)

export default routes
