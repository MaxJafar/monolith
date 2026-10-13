import { forgeRouter, writeContractFileToClient } from '@lifeforge/server-utils'

import * as entriesRouter from './routes/entries'
import * as listsRouter from './routes/lists'
import * as prioritiesRouter from './routes/priorities'
import * as tagsRouter from './routes/tags'

const routes = forgeRouter({
  entries: entriesRouter,
  priorities: prioritiesRouter,
  lists: listsRouter,
  tags: tagsRouter
})

writeContractFileToClient(routes, import.meta.dirname)

export default routes
