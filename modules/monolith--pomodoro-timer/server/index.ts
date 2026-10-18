import { defineRoutes, writeContractFileToClient } from '@monolith/server-utils'

import * as sessionsRoutes from './routes/sessions'
import * as settingsRoutes from './routes/settings'

const routes = defineRoutes({
  settings: settingsRoutes,
  sessions: sessionsRoutes
})

writeContractFileToClient(routes, import.meta.dirname)

export default routes
