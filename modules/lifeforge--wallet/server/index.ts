import { forgeRouter, writeContractFileToClient } from '@lifeforge/server-utils'

import * as aiRouter from './routes/ai'
import * as analyticsRouter from './routes/analytics'
import * as assetsRouter from './routes/assets'
import * as categoriesRouter from './routes/categories'
import * as ledgersRouter from './routes/ledgers'
import * as platformsRouter from './routes/platforms'
import * as promptsRouter from './routes/prompts'
import * as statementsRouter from './routes/statements'
import * as templatesRouter from './routes/templates'
import * as transactionsRouter from './routes/transactions'

const routes = forgeRouter({
  transactions: {
    ...transactionsRouter,
    ...aiRouter,
    prompts: promptsRouter
  },
  categories: categoriesRouter,
  assets: assetsRouter,
  ledgers: ledgersRouter,
  platforms: platformsRouter,
  templates: templatesRouter,
  statements: statementsRouter,
  analytics: analyticsRouter
})

writeContractFileToClient(routes, import.meta.dirname)

export default routes
