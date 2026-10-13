import { forgeRouter, writeContractFileToClient } from '@lifeforge/server-utils'

import * as categories from './routes/categories'
import * as entries from './routes/entries'

const routes = forgeRouter({ categories, entries })
writeContractFileToClient(routes, import.meta.dirname)

export default routes
