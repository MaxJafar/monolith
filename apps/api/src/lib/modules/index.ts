import { defineRoutes } from '@monolith/server-utils'

import * as categoriesRoutes from './routes/categories'
import * as modulesRoutes from './routes/modules'
import * as shopRoutes from './routes/shop'

export default defineRoutes({
  ...modulesRoutes,
  shop: shopRoutes,
  categories: categoriesRoutes
})
