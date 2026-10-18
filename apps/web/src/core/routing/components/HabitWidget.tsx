import { useAuth } from '@monolith/api'
import {
  Box,
  Button,
  type CanvasWidgetConfiguration,
  Flex,
  Stack,
  Text
} from '@monolith/ui'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { useRpg } from '@/addons/urpg/useRpg'
import { workspaceAPI } from '@/core/workspaces/workspaceAPI'

import { completion } from '../../../../../../modules/monolith--databases/urpgShared'
import { widgetConfig } from '../../../../../../modules/monolith--databases/widgetShared'

export function HabitWidget({
  workspaceId,
  readOnly,
  configuration
}: {
  workspaceId: string
  readOnly: boolean
  configuration?: CanvasWidgetConfiguration
}) {
  const rpg = useRpg(),
    { userData } = useAuth(),
    { t } = useTranslation('common', { keyPrefix: 'widgetSettings' }),
    cache = useQueryClient()
  const options = workspaceAPI.workspaceWidgets.habits
      .input({
        workspace_id: workspaceId || '00000000-0000-4000-8000-000000000000'
      })
      .queryOptions(),
    key = [...options.queryKey, userData?.id]
  const query = useQuery({
    ...options,
    queryKey: key,
    enabled: !!workspaceId && !rpg.enabled
  })
  const [title, setTitle] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    lock = useRef(false)
  const showArchived = widgetConfig(configuration?.filter).archived === 'yes'
  async function update(
    command:
      | { type: 'create'; id: string; title: string }
      | { type: 'check'; id: string; day: string; checked: boolean }
      | { type: 'archive'; id: string; archived: boolean }
  ) {
    if (lock.current || readOnly || !query.data) return
    lock.current = true
    setBusy(true)
    setError('')
    try {
      const next = await workspaceAPI.workspaceWidgets.updateHabits
        .input({ workspace_id: workspaceId })
        .mutate({ expected_revision: query.data.revision, command })
      cache.setQueryData(key, next)
      if (command.type === 'create') setTitle('')
    } catch (cause) {
      setError(String(cause))
      await query.refetch()
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  if (rpg.enabled)
    return (
      <Stack gap="sm">
        {rpg.state?.items
          .filter(i => !i.archived && ['daily', 'weekly'].includes(i.kind))
          .map(item => {
            const done = completion(rpg.state!, item, rpg.day)
            return (
              <Flex key={item.id} align="center" gap="sm">
                <Button
                  namespace={false}
                  variant="plain"
                  className="urpg-check"
                  icon={done ? 'lucide:check' : undefined}
                  aria-pressed={!!done}
                  aria-label={item.title}
                  disabled={readOnly || rpg.busy}
                  onClick={() =>
                    void rpg.execute(
                      done
                        ? { type: 'undo', id: done.id }
                        : { type: 'complete', id: item.id, quality: 'done' }
                    )
                  }
                />
                <Text truncate size="xs">
                  {item.title}
                </Text>
              </Flex>
            )
          })}
        <Button
          as={Link}
          to={`/urpg?workspace=${workspaceId}&view=rituals`}
          namespace={false}
          variant="plain"
          justify="start"
          icon="lucide:arrow-up-right"
        >
          {t('manageRituals')}
        </Button>
        {rpg.error && (
          <Text role="alert" size="xs">
            {rpg.error}
          </Text>
        )}
      </Stack>
    )
  if (query.isPending)
    return (
      <Text role="status" size="xs">
        {t('loading')}
      </Text>
    )
  if (query.isError)
    return (
      <Button
        namespace={false}
        variant="plain"
        onClick={() => void query.refetch()}
      >
        {t('retry')}
      </Button>
    )
  return (
    <Stack gap="sm">
      {query.data?.habits
        .filter(h => h.archived === showArchived)
        .map(habit => (
          <Flex key={habit.id} align="center" gap="xs">
            <Button
              namespace={false}
              variant="plain"
              className="urpg-check"
              aria-label={habit.title}
              aria-pressed={habit.days.includes(rpg.day)}
              disabled={busy || readOnly || habit.archived}
              icon={habit.days.includes(rpg.day) ? 'lucide:check' : undefined}
              onClick={() =>
                void update({
                  type: 'check',
                  id: habit.id,
                  day: rpg.day,
                  checked: !habit.days.includes(rpg.day)
                })
              }
            />
            <Stack gap="xs" flex="1" minWidth="0">
              <Text truncate size="xs">
                {habit.title}
              </Text>
              <Text size="xs" color="muted">
                {t('daysDone', { count: habit.days.length })}
              </Text>
            </Stack>
            <Button
              namespace={false}
              variant="plain"
              p="xs"
              icon={
                habit.archived ? 'lucide:archive-restore' : 'lucide:archive'
              }
              aria-label={t(habit.archived ? 'restore' : 'archive')}
              disabled={busy || readOnly}
              onClick={() =>
                void update({
                  type: 'archive',
                  id: habit.id,
                  archived: !habit.archived
                })
              }
            />
          </Flex>
        ))}
      {!showArchived && !readOnly && (
        <Flex
          as="form"
          gap="xs"
          onSubmit={e => {
            e.preventDefault()
            void update({ type: 'create', id: crypto.randomUUID(), title })
          }}
        >
          <Box
            as="input"
            className="workspace-input"
            width="100%"
            minWidth="0"
            required
            maxLength={100}
            aria-label={t('newHabit')}
            placeholder={t('newHabit')}
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          <Button
            namespace={false}
            type="submit"
            variant="plain"
            p="xs"
            icon="lucide:plus"
            aria-label={t('add')}
            disabled={busy}
          />
        </Flex>
      )}
      {configuration?.onConfigChange && (
        <Button
          namespace={false}
          variant="plain"
          p="xs"
          onClick={() =>
            configuration.onConfigChange?.(
              JSON.stringify({ archived: showArchived ? 'no' : 'yes' })
            )
          }
        >
          {t(showArchived ? 'activeHabits' : 'archivedHabits')}
        </Button>
      )}
      {error && (
        <Text role="alert" size="xs">
          {error}
        </Text>
      )}
    </Stack>
  )
}
