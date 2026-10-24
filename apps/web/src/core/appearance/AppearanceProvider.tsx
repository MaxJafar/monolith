import { useQuery, useQueryClient } from '@tanstack/react-query'
import { type ReactNode, useMemo } from 'react'
import { useLocation } from 'react-router'

import { useAuth } from '@monolith/api'
import {
  APPEARANCE_LAYOUT_KEY,
  type Appearance,
  type AppearanceScope,
  resolveAppearance
} from '@monolith/blocks'
import {
  AppearanceContext,
  Flex,
  appearanceVariables,
  useModalStore,
  usePersonalization
} from '@monolith/ui'

import coreAPI from '@/core/utils/workspaceAPI'
import { useWorkspace } from '@/core/workspaces/WorkspaceProvider'
import { workspaceArea } from '@/core/workspaces/areaPage'
import { workspaceAPI } from '@/core/workspaces/workspaceAPI'

import AppearanceBuilder from './AppearanceBuilder'
import {
  AppAppearanceContext,
  type AppearanceState,
  useAppAppearance
} from './AppearanceContext'
import { AppearanceFont } from './AppearanceFont'
import './appearance.css'

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const { active } = useWorkspace()
  const { userData, setUserData } = useAuth()
  const location = useLocation()
  const cache = useQueryClient()
  const { open } = useModalStore()
  const { derivedTheme } = usePersonalization()

  const workspaceId = active?.id ?? ''
  const accountId = userData?.id ?? ''
  const pageKey = workspaceArea(location.pathname, location.search).key
  const globalOptions =
    coreAPI.user.personalization.getAppearance.queryOptions()
  const globalKey = [...globalOptions.queryKey, accountId]
  const global = useQuery({
    ...globalOptions,
    queryKey: globalKey,
    enabled: !!accountId
  })
  const workspaceOptions = workspaceAPI.workspaces.navigation
    .input({
      workspace_id: workspaceId || '00000000-0000-4000-8000-000000000000'
    })
    .queryOptions()
  const workspaceKey = [...workspaceOptions.queryKey, accountId]
  const navigation = useQuery({
    ...workspaceOptions,
    queryKey: workspaceKey,
    enabled: !!workspaceId && !!accountId
  })
  const ready = !!global.data && !!navigation.data
  const canEdit = !!active && active.role !== 'viewer' && ready
  const state: AppearanceState = {
    global: global.data?.appearance ?? {},
    workspace: navigation.data?.appearance ?? {},
    pages: navigation.data?.pageAppearance ?? {},
    workspaceId,
    accountId,
    pageKey,
    ready,
    canEdit,
    globalRevision: global.data?.revision ?? 0,
    workspaceRevision: navigation.data?.revision ?? 0,
    error: global.error?.message ?? navigation.error?.message ?? '',
    openEditor: (scope = 'page') => {
      open(AppearanceBuilder, { initialScope: scope })
    },
    reload: async () => {
      const results = await Promise.all([
        global.refetch(),
        navigation.refetch()
      ])

      for (const result of results) if (result.error) throw result.error
    },
    save: async (
      scope: AppearanceScope,
      appearance: Appearance,
      revision: number
    ) => {
      if (!accountId || (scope !== 'global' && !canEdit))
        throw Error('This workspace is read-only')

      if (scope === 'global') {
        const saved = await coreAPI.user.personalization.saveAppearance.mutate(
          { appearance, expected_revision: revision }
        )
        cache.setQueryData(globalKey, saved)
        setUserData(current =>
          current?.id === accountId
            ? {
                ...current,
                dashboardLayout: {
                  ...(current.dashboardLayout as Record<
                    string,
                    unknown
                  > | null),
                  [APPEARANCE_LAYOUT_KEY]: saved
                }
              }
            : current
        )

        return saved.revision
      }

      const saved = await workspaceAPI.workspaces.saveAppearance
        .input({ workspace_id: workspaceId })
        .mutate({
          scope,
          key: scope === 'page' ? pageKey : undefined,
          appearance,
          expected_revision: revision
        })
      cache.setQueryData(workspaceKey, saved)

      if (scope === 'workspace') {
        const workspaceListKey = [
          ...workspaceAPI.workspaces.list.queryOptions().queryKey,
          accountId
        ]
        cache.setQueryData<
          Awaited<ReturnType<typeof workspaceAPI.workspaces.list.query>>
        >(workspaceListKey, current =>
          current?.map(workspace =>
            workspace.id === workspaceId
              ? { ...workspace, navigation: saved }
              : workspace
          )
        )
      }

      return saved.revision
    }
  }
  const inherited = useMemo(
    () => resolveAppearance(state.global, state.workspace),
    [state.global, state.workspace]
  )

  return (
    <AppAppearanceContext value={state}>
      <AppearanceContext
        value={{
          appearance: inherited,
          openEditor: state.openEditor,
          readOnly: !canEdit
        }}
      >
        <Flex
          className="appearance-surface"
          data-custom-background={!!inherited.background}
          direction="column"
          height="100%"
          minWidth="0"
          style={appearanceVariables(inherited, derivedTheme)}
          width="100%"
        >
          <AppearanceFont font={inherited.font} />
          {children}
        </Flex>
      </AppearanceContext>
    </AppAppearanceContext>
  )
}

export function PageAppearanceSurface({ children }: { children: ReactNode }) {
  const state = useAppAppearance()
  const { derivedTheme } = usePersonalization()

  const appearance = resolveAppearance(
    state.global,
    state.workspace,
    state.pages[state.pageKey]
  )

  return (
    <AppearanceContext
      value={{
        appearance,
        openEditor: state.openEditor,
        changeCover: async cover => {
          await state.save('page', {...state.pages[state.pageKey],cover},state.workspaceRevision)
        },
        changeIcon: async icon => {
          await state.save(
            'page',
            { ...state.pages[state.pageKey], icon },
            state.workspaceRevision
          )
        },
        readOnly: !state.canEdit
      }}
    >
      <Flex
        className="appearance-surface appearance-page"
        data-content-width={appearance.contentWidth}
        data-custom-background={!!appearance.background}
        direction="column"
        flex="1"
        minHeight="0"
        minWidth="0"
        style={appearanceVariables(appearance, derivedTheme)}
      >
        <AppearanceFont font={appearance.font} />
        {children}
      </Flex>
    </AppearanceContext>
  )
}

export function PageAppearanceOverlay({ children }: { children: ReactNode }) {
  const state = useAppAppearance()

  const appearance = resolveAppearance(
    state.global,
    state.workspace,
    state.pages[state.pageKey]
  )

  return (
    <AppearanceContext
      value={{
        appearance,
        openEditor: state.openEditor,
        readOnly: !state.canEdit
      }}
    >
      {children}
    </AppearanceContext>
  )
}

export { AppearanceFont } from './AppearanceFont'
