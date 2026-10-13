import { forgeRouter, writeContractFileToClient } from '@lifeforge/server-utils'

import * as cards from './routes/cards'
import * as decks from './routes/decks'
import * as tags from './routes/tags'

const routes = forgeRouter({ tags, decks, cards })
writeContractFileToClient(routes, import.meta.dirname)

export default routes
