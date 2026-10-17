import { defineRoutes, writeContractFileToClient } from '@monolith/server-utils'

import * as documents from './documentRoutes'
import './itemBridge'
import * as knowledgeLibrary from './knowledgeLibraryRoutes'
import * as knowledge from './knowledgeRoutes'
import * as databaseRoutes from './routes'
import * as workspaceDatabases from './workspaceDatabaseRoutes'
import * as workspaceGraph from './workspaceGraphRoutes'
import * as workspaces from './workspaceRoutes'
import * as urpg from './urpgRoutes'
import * as workspaceWidgets from './widgetRoutes'

const routes = defineRoutes({
  ...databaseRoutes,
  documents,
  knowledge,
  knowledgeLibrary,
  urpg,
  workspaceWidgets,
  workspaces,
  workspaceDatabases,
  workspaceGraph
})
writeContractFileToClient(routes, import.meta.dirname)

export default routes
