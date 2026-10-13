import { forgeRouter, writeContractFileToClient } from '@lifeforge/server-utils'

import * as entries from './routes/entries'
import * as lists from './routes/lists'

const routes = forgeRouter({ lists, entries })
writeContractFileToClient(routes, import.meta.dirname)

export default routes
