import { forgeRouter, writeContractFileToClient } from '@lifeforge/server-utils'

import * as categories from './routes/categories'
import * as columns from './routes/columns'
import * as entries from './routes/entries'
import * as statuses from './routes/statuses'
import * as tasks from './routes/tasks'
import * as technologies from './routes/technologies'
import * as visibilities from './routes/visibilities'

const routes = forgeRouter({
  categories,
  statuses,
  technologies,
  visibilities,
  entries,
  columns,
  tasks
})
writeContractFileToClient(routes, import.meta.dirname)

export default routes
