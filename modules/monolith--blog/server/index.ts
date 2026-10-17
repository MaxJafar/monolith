import { defineRoutes, writeContractFileToClient } from '@monolith/server-utils'

import * as categories from './routes/categories'
import * as entries from './routes/entries'

const routes = defineRoutes({ categories, entries })
writeContractFileToClient(routes, import.meta.dirname)

export default routes
