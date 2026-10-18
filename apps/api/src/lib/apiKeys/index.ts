import { defineRoutes } from '@monolith/server-utils'

import entriesRouter from './routes/entries'

export default defineRoutes({
  entries: entriesRouter
})
