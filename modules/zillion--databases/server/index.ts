import { forgeRouter, writeContractFileToClient } from '@lifeforge/server-utils'

import * as documents from './documentRoutes'
import './itemBridge'
import * as knowledgeLibrary from './knowledgeLibraryRoutes'
import * as knowledge from './knowledgeRoutes'
import * as databaseRoutes from './routes'
import * as workspaceDatabases from './workspaceDatabaseRoutes'
import * as workspaceGraph from './workspaceGraphRoutes'
import * as workspaces from './workspaceRoutes'

const routes = forgeRouter({
  ...databaseRoutes,
  documents,
  knowledge,
  knowledgeLibrary,
  workspaces,
  workspaceDatabases,
  workspaceGraph
})
writeContractFileToClient(routes, import.meta.dirname)

export default routes
