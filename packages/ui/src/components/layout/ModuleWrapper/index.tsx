import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { useAuth } from '@lifeforge/api'
import { ModuleMetadataProvider } from '@lifeforge/federation'

import { Flex } from '@/components/primitives'
import { ModuleSidebarStateProvider } from '@/providers'
import { forgeAPI } from '@/utils/forgeAPI'

import { Scrollbar } from '../Scrollbar'
import { WorkspaceCanvas, useCanvasWidgets } from '../WorkspaceCanvas'

/**
 * The wrapper component for all modules in the app. It provides the layout and context for the module header and sidebar, as well as handling query cleanup on unmount if specified. If being used within LifeForge instance, it will be automatically wrapped around the module content. Therefore, no explicit usage is needed in most cases.
 */
export function ModuleWrapper({
  children,
  config: {
    name,
    title,
    icon,
    translationNamespace,
    clearQueryOnUnmount = true
  }
}: {
  children: React.ReactNode
  config: {
    name: string
    title: string
    displayName?: string
    icon: string
    translationNamespace?: string
    clearQueryOnUnmount: boolean
  }
}) {
  const queryClient = useQueryClient()
  const { userData } = useAuth()
  const { pageStorage } = useCanvasWidgets()

  const pathname = window.location.pathname
  const storage = pageStorage?.(pathname)

  useEffect(() => {
    return () => {
      if (!clearQueryOnUnmount) return

      queryClient.removeQueries({
        queryKey: [
          ...forgeAPI.user.pages.get.input({ key: pathname }).queryOptions()
            .queryKey,
          userData?.id
        ]
      })
    }
  }, [queryClient, clearQueryOnUnmount, pathname, userData?.id])

  return (
    <ModuleMetadataProvider value={{ name, title, icon }}>
      <ModuleSidebarStateProvider>
        <Flex asChild direction="column" minHeight="0">
          <Scrollbar className="no-overflow-x" usePaddingRight={false}>
            <Flex
              className="monolith-module-content"
              direction="column"
              flex="1"
              overflowX="hidden"
              pt="xl"
              px={{ base: 'md', sm: '2xl' }}
              width="100%"
            >
              <WorkspaceCanvas
                key={storage ? JSON.stringify(storage.queryKey) : pathname}
                native={children}
                title={title}
                translationNamespace={translationNamespace}
                storage={storage}
              />
            </Flex>
          </Scrollbar>
        </Flex>
      </ModuleSidebarStateProvider>
    </ModuleMetadataProvider>
  )
}
