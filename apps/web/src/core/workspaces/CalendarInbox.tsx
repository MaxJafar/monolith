import { useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'

import { useAuth } from '@monolith/api'
import { Button, Flex, FloatingPopover, Stack, Text } from '@monolith/ui'

import { useWorkspace } from './WorkspaceProvider'
import { workspaceAPI } from './workspaceAPI'

export function CalendarInbox() {
  const { active } = useWorkspace(),
    { userData } = useAuth()

  const { t } = useTranslation('common.calendarInbox')

  const cache = useQueryClient(),
    navigate = useNavigate()

  const [anchor, setAnchor] = useState<HTMLElement | null>(null)

  const [error, setError] = useState(''),
    [alert, setAlert] = useState('')

  const [opening, setOpening] = useState(false)
  const inboxButton = useRef<HTMLButtonElement>(null)
  const scope = useRef('')

  scope.current = `${active?.id}:${userData?.id}`

  const seen = useRef(new Set<string>())

  const options = workspaceAPI.calendar.notifications
    .input({ workspace_id: active?.id ?? '' })
    .queryOptions()
  const query = useQuery({
    ...options,
    queryKey: [...options.queryKey, userData?.id],
    enabled: !!active && !!userData?.id,
    refetchInterval: 30000,
    refetchOnWindowFocus: true
  })
  useEffect(() => {
    seen.current.clear()
    setAlert('')
    setAnchor(null)
    setError('')
  }, [active?.id, userData?.id])
  useEffect(() => {
    const latest = query.data?.find(
      item => !item.read && !seen.current.has(item.id)
    )

    for (const item of query.data ?? []) seen.current.add(item.id)
    if (latest) setAlert(t('newNotification', { title: latest.title }))
  }, [query.data, t])
  const unread = query.data?.filter(item => !item.read).length ?? 0

  async function open(id: string, recordId: string) {
    if (!active || opening) return

    const requestedScope = scope.current
    setOpening(true)
    setError('')

    try {
      const snapshot = await workspaceAPI.workspaceDatabases.snapshot
        .input({ workspace_id: active.id })
        .query()
      const record = snapshot.records.find(record => record.id === recordId)

      if (!record) throw Error(t('unavailable'))
      await workspaceAPI.calendar.markRead
        .input({ workspace_id: active.id })
        .mutate({ id })
      await cache.invalidateQueries({
        queryKey: workspaceAPI.calendar.notifications.key
      })
      if (scope.current !== requestedScope) return
      setAnchor(null)
      setAlert('')
      navigate(
        `/calendar?${new URLSearchParams({ workspace: active.id, base: record.base_id, record: recordId, pageMode: 'full' })}`
      )
    } catch (cause) {
      if (scope.current === requestedScope)
        setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setOpening(false)
    }
  }
  if (!active) return null

  return (
    <>
      <Button
        ref={inboxButton}
        aria-expanded={!!anchor}
        aria-label={t('title', { count: unread })}
        icon="lucide:bell"
        namespace={false}
        variant="plain"
        onClick={event => {
          setAnchor(event.currentTarget)
          setAlert('')
        }}
      >
        {unread ? String(unread) : ''}
      </Button>
      {alert &&
        createPortal(
          <Flex
            shadow
            align="center"
            bg={{ base: 'bg-50', dark: 'bg-900' }}
            bottom="24px"
            gap="sm"
            maxWidth="min(420px, calc(100vw - 48px))"
            p="md"
            position="fixed"
            r="lg"
            right="24px"
            role="status"
            zIndex="1000"
          >
            <Button
              namespace={false}
              variant="plain"
              onClick={() => {
                setAnchor(inboxButton.current)
                setAlert('')
              }}
            >
              {alert}
            </Button>
            <Button
              aria-label={t('dismiss')}
              icon="lucide:x"
              variant="plain"
              onClick={() => setAlert('')}
            />
          </Flex>,
          document.getElementById('app') ?? document.body
        )}
      {anchor && (
        <FloatingPopover
          anchor={anchor}
          label={t('heading')}
          width={400}
          onClose={() => setAnchor(null)}
        >
          <Stack gap="sm" maxHeight="60vh" overflow="auto">
            <Text as="h2" size="lg" weight="semibold">
              {t('heading')}
            </Text>
            {(error || query.error) && (
              <Text color="dangerous" role="alert">
                {error || query.error?.message}
              </Text>
            )}
            {query.isLoading && <Text role="status">{t('loading')}</Text>}
            {!query.isLoading && !query.error && !query.data?.length && (
              <Text color="muted">{t('empty')}</Text>
            )}
            {query.data?.map(item => (
              <Button
                key={item.id}
                disabled={opening}
                justify="start"
                namespace={false}
                variant={item.read ? 'plain' : 'secondary'}
                onClick={() => void open(item.id, item.record_id)}
              >
                <Stack gap="xs">
                  <Text weight="medium">{item.title}</Text>
                  <Text color="muted" size="sm">
                    {t(item.kind)} ·{' '}
                    {dayjs(item.starts_at).format('D MMM, HH:mm')}
                  </Text>
                  {item.email_status === 'failed' && (
                    <Text color="dangerous" size="sm">
                      {t('emailFailed')}
                    </Text>
                  )}
                </Stack>
              </Button>
            ))}
          </Stack>
        </FloatingPopover>
      )}
    </>
  )
}
