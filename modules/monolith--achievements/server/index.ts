import { defineRoutes, writeContractFileToClient } from '@monolith/server-utils'

import * as categoriesRoutes from './routes/categories'
import * as entriesRoutes from './routes/entries'

const routes = defineRoutes({
  entries: entriesRoutes,
  categories: categoriesRoutes
})

writeContractFileToClient(routes, import.meta.dirname)

export default routes
