import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router'

import { useAuth } from '@lifeforge/api'
import { Button, Flex, Stack, Text } from '@lifeforge/ui'

import { useWorkspace } from '@/core/workspaces/WorkspaceProvider'
import { workspaceAPI } from '@/core/workspaces/workspaceAPI'

import PageBranch from './PageBranch'

export default function CustomPages() {
  const { t } = useTranslation('common.canvas'),
    { userData } = useAuth(),
    { active } = useWorkspace(),
    cache = useQueryClient(),
    navigate = useNavigate(),
    location = useLocation()
  const [pending, setPending] = useState(false),
    [error, setError] = useState('')
  const endpoint = workspaceAPI.workspaces.pages.input({
    workspace_id: active?.id ?? '00000000-0000-4000-8000-000000000000'
  })
  const options = endpoint.queryOptions()
  const query = useQuery({
    ...options,
    queryKey: [...options.queryKey, userData?.id],
    enabled: !!active
  })
  const pages = useMemo(
    () => query.data?.filter(page => page.route_key.startsWith('/page/')) ?? [],
    [query.data]
  )
  const childrenByParent = useMemo(() => {
    const children = new Map<string | null, typeof pages>()

    for (const page of pages) {
      const siblings = children.get(page.parent_id)

      if (siblings) siblings.push(page)
      else children.set(page.parent_id, [page])
    }

    return children
  }, [pages])
  const activeAncestors = useMemo(() => {
    const ancestors = new Set<string>()
    const byId = new Map(pages.map(page => [page.id, page]))

    let page = pages.find(item => `/page/${item.id}` === location.pathname)

    while (page?.parent_id && !ancestors.has(page.parent_id)) {
      ancestors.add(page.parent_id)
      page = byId.get(page.parent_id)
    }

    return ancestors
  }, [pages, location.pathname])

  async function create(parent: string | null = null) {
    if (!active || pending) return
    setPending(true)
    setError('')

    try {
      const page = await workspaceAPI.workspaces.createPage
        .input({ workspace_id: active.id })
        .mutate({ title: t('untitled'), parent_id: parent })
      await cache.invalidateQueries({
        queryKey: workspaceAPI.workspaces.pages.key
      })
      navigate(`/page/${page.id}`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setPending(false)
    }
  }

  return (
    <Stack aria-label={t('pages')} as="nav" gap="xs" px="md" py="sm">
      <Flex align="center" justify="between" minHeight="32px" pl="sm">
        <Text as="h3" color="muted" size="sm" weight="medium">
          {t('pages')}
        </Text>
        {active?.role !== 'viewer' && (
          <Button
            aria-label={t('newPage')}
            className="monolith-navigation-action"
            icon="lucide:plus"
            loading={pending}
            namespace={false}
            p="xs"
            title={t('newPage')}
            variant="plain"
            onClick={() => void create()}
          />
        )}
      </Flex>
      <Stack as="ul" className="monolith-page-list" gap="none">
        {childrenByParent.get(null)?.map(page => (
          <PageBranch
            key={`${active?.id}:${page.id}`}
            activeAncestors={activeAncestors}
            activePath={location.pathname}
            canEdit={active?.role !== 'viewer'}
            childrenByParent={childrenByParent}
            createChild={create}
            page={page}
            pending={pending}
          />
        ))}
      </Stack>
      {(error || query.error) && (
        <Text color="dangerous" role="alert">
          {error || query.error?.message}
        </Text>
      )}
    </Stack>
  )
}
