import { defineRoutes, writeContractFileToClient } from '@monolith/server-utils'

import * as calendar from './calendarRoutes'
import * as documents from './documentRoutes'
import './itemBridge'
import * as knowledgeLibrary from './knowledgeLibraryRoutes'
import * as knowledge from './knowledgeRoutes'
import * as databaseRoutes from './routes'
import * as urpg from './urpgRoutes'
import * as workspaceWidgets from './widgetRoutes'
import * as workspaceDatabases from './workspaceDatabaseRoutes'
import * as workspaceGraph from './workspaceGraphRoutes'
import * as workspaces from './workspaceRoutes'

const routes = defineRoutes({
  calendar: {
    list: calendar.list,
    save: calendar.save,
    occurrence: calendar.occurrence,
    move: calendar.move,
    edit: calendar.edit,
    respond: calendar.respond,
    notifications: calendar.notifications,
    markRead: calendar.markRead
  },
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
