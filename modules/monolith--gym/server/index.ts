import { defineRoutes, writeContractFileToClient } from '@monolith/server-utils'

import * as coaching from './coachRoutes'
import * as push from './pushRoutes'
import * as gym from './routes'

const routes = defineRoutes({ ...gym, ...coaching, ...push })
writeContractFileToClient(routes, import.meta.dirname)

export default routes
