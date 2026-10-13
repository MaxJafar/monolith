import { forgeRouter, writeContractFileToClient } from '@lifeforge/server-utils'

import * as coaching from './coachRoutes'
import * as push from './pushRoutes'
import * as gym from './routes'

const routes = forgeRouter({ ...gym, ...coaching, ...push })
writeContractFileToClient(routes, import.meta.dirname)

export default routes
