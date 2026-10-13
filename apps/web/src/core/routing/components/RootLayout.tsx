import { ErrorBoundary } from 'react-error-boundary'
import { Outlet, useLocation } from 'react-router'

import { ErrorScreen, Flex, ModalManager } from '@lifeforge/ui'

import { WorkspaceProvider } from '@/core/workspaces/WorkspaceProvider'

import useTitleEffect from '../hooks/useTitleEffect'
import CanvasWidgetBridge from './CanvasWidgetBridge'
import MonolithAppBar from './MonolithAppBar'
import Sidebar from './Sidebar/Sidebar'

function RootLayout() {
  const location = useLocation()
  useTitleEffect()

  return (
    <WorkspaceProvider>
      <CanvasWidgetBridge>
        <Flex height="100%" minWidth="0" width="100%">
          <Sidebar />
          <Flex
            direction="column"
            flex="1"
            minHeight="0"
            minWidth="0"
            overflowX="hidden"
            position="relative"
            width="100%"
          >
            <MonolithAppBar />
            <ErrorBoundary
              key={location.pathname}
              fallback={<ErrorScreen message="An unexpected error occurred." />}
              resetKeys={[location.pathname]}
            >
              <Outlet />
            </ErrorBoundary>
          </Flex>
        </Flex>
        <ModalManager />
      </CanvasWidgetBridge>
    </WorkspaceProvider>
  )
}

export default RootLayout
