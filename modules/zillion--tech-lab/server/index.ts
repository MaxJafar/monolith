import { forgeRouter, writeContractFileToClient } from '@lifeforge/server-utils'

import * as inventory from './routes'

const routes = forgeRouter({ ...inventory })
writeContractFileToClient(routes, import.meta.dirname)

export default routes
