import { defineRoutes, writeContractFileToClient } from '@monolith/server-utils'

import * as calendarsRouter from './routes/calendars'
import * as categoriesRouter from './routes/categories'
import * as eventsRouter from './routes/events'

const routes = defineRoutes({
  events: eventsRouter,
  calendars: calendarsRouter,
  categories: categoriesRouter
})

writeContractFileToClient(routes, import.meta.dirname)

export default routes
