// SPDX-License-Identifier: 0BSD
import { useQueryClient } from '@tanstack/react-query'
import { type ReactNode, useEffect, useMemo } from 'react'

import { useAuth } from '@monolith/api'
import { ModuleMetadataProvider } from '@monolith/federation'

import { Flex } from '@/components/primitives'
import { ModuleSidebarStateProvider } from '@/providers'
import { workspaceAPI } from '@/utils/workspaceAPI'

import { AppearanceCover } from '../AppearanceCover'
import { Scrollbar } from '../Scrollbar'
import { WorkspaceCanvas, useCanvasWidgets } from '../WorkspaceCanvas'

export interface ModuleWrapperProps {
  children: ReactNode
  config: {
    name: string
    title: string
    displayName?: string
    icon: string
    translationNamespace?: string
    canvas?: boolean
    clearQueryOnUnmount: boolean
  }
}

export function ModuleWrapper({ children, config }: ModuleWrapperProps) {
  const queryClient = useQueryClient()
  const { userData } = useAuth()
  const { pageStorage } = useCanvasWidgets()
  const route = typeof location === 'undefined' ? '/' : location.pathname
  const account = userData?.id
  const shouldClear = config.clearQueryOnUnmount ?? true
  const storage = pageStorage?.(route)
  const metadata = useMemo(
    () => ({
      name: config.name,
      title: config.title,
      icon: config.icon
    }),
    [config.name, config.title, config.icon]
  )

  useEffect(() => {
    if (!shouldClear) return
    const page = workspaceAPI.user.pages.get.input({ key: route })
    const queryKey = [...page.queryOptions().queryKey, account]
    return () => {
      queryClient.removeQueries({ queryKey })
    }
  }, [queryClient, route, account, shouldClear])

  const view =
    config.canvas === false ? (
      <>
        <AppearanceCover />
        {children}
      </>
    ) : (
      <WorkspaceCanvas
        key={storage ? JSON.stringify(storage.queryKey) : route}
        native={children}
        title={config.title}
        translationNamespace={config.translationNamespace}
        storage={storage}
        widgetScope={config.name}
      />
    )
  return (
    <ModuleMetadataProvider value={metadata}>
      <ModuleSidebarStateProvider>
        <Flex asChild direction="column" minHeight="0">
          <Scrollbar hideHorizontal usePaddingRight={false}>
            <Flex
              className="monolith-module-content"
              direction="column"
              flex="1"
              overflowX="hidden"
              width="100%"
              pt="xl"
              px={{ base: 'md', sm: '2xl' }}
            >
              {view}
            </Flex>
          </Scrollbar>
        </Flex>
      </ModuleSidebarStateProvider>
    </ModuleMetadataProvider>
  )
}
