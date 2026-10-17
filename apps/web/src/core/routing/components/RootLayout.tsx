import { ErrorBoundary } from 'react-error-boundary'
import { Outlet, useLocation } from 'react-router'

import {
  ErrorScreen,
  Flex,
  ModalManager,
  PageChromeProvider
} from '@monolith/ui'

import {
  AppearanceProvider,
  PageAppearanceOverlay,
  PageAppearanceSurface
} from '@/core/appearance/AppearanceProvider'
import { RoomsDraftsProvider } from '@/core/rooms/RoomsDrafts'
import { RoomsRuntime } from '@/core/rooms/RoomsRuntime'
import UpdatesProvider from '@/core/updates/UpdatesProvider'
import { WorkspaceProvider } from '@/core/workspaces/WorkspaceProvider'

import useTitleEffect from '../hooks/useTitleEffect'
import CanvasWidgetBridge from './CanvasWidgetBridge'
import MonolithAppBar from './MonolithAppBar'
import { NavigationProvider } from './Sidebar/NavigationProvider'
import Sidebar from './Sidebar/Sidebar'
import { SidebarPreferencesProvider } from './Sidebar/SidebarPreferences'
import WorkspaceChrome from './WorkspaceChrome'
import { WorkspaceTabsProvider } from './WorkspaceTabs'

function RootLayout() {
  const location = useLocation()
  useTitleEffect()

  return (
    <UpdatesProvider>
      <RoomsRuntime>
        <RoomsDraftsProvider>
          <WorkspaceProvider>
            <AppearanceProvider>
              <CanvasWidgetBridge>
                <WorkspaceTabsProvider>
                  <PageChromeProvider>
                    <NavigationProvider>
                      <SidebarPreferencesProvider>
                        <Flex
                          direction="column"
                          height="100%"
                          minWidth="0"
                          width="100%"
                        >
                          <WorkspaceChrome />
                          <Flex
                            flex="1"
                            minHeight="0"
                            minWidth="0"
                            position="relative"
                          >
                            <Sidebar />
                            <PageAppearanceSurface>
                              <Flex
                                direction="column"
                                flex="1"
                                id="workspace-tab-panel"
                                minHeight="0"
                                minWidth="0"
                                overflowX="hidden"
                                position="relative"
                                role="tabpanel"
                                width="100%"
                              >
                                <MonolithAppBar />
                                <ErrorBoundary
                                  key={location.pathname}
                                  fallback={
                                    <ErrorScreen message="An unexpected error occurred." />
                                  }
                                  resetKeys={[location.pathname]}
                                >
                                  <Outlet />
                                </ErrorBoundary>
                              </Flex>
                            </PageAppearanceSurface>
                          </Flex>
                        </Flex>
                        <PageAppearanceOverlay>
                          <ModalManager />
                        </PageAppearanceOverlay>
                      </SidebarPreferencesProvider>
                    </NavigationProvider>
                  </PageChromeProvider>
                </WorkspaceTabsProvider>
              </CanvasWidgetBridge>
            </AppearanceProvider>
          </WorkspaceProvider>
        </RoomsDraftsProvider>
      </RoomsRuntime>
    </UpdatesProvider>
  )
}

export default RootLayout
