import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  Button,
  ChoiceSelect,
  Flex,
  Stack,
  Text,
  useCanvasWidgets,
  useModalStore
} from '@monolith/ui'

import { workspaceAPI } from '@/manifest'
import ModifySessionModal from '@/modal/ModifySessionModal'
import { useActiveSession } from '@/providers/ActiveSessionProvider'
import { useCurrentSession } from '@/providers/CurrentSessionProvider'
import { usePomodoro } from '@/providers/PomodoroProvider'

export const config = {
  id: 'focusTimer',
  icon: 'lucide:timer',
  minW: 1,
  minH: 2
}

export default function FocusWidget({
  readOnly = false,
  filter = '',
  onConfigChange
}: {
  readOnly?: boolean
  filter?: string
  onConfigChange?: (filter: string) => void
}) {
  const { t } = useTranslation('common.workspaceUI')
  const { t: work } = useTranslation('common.workHub')
  const { actions, actionsLoading, completeAction } = useCanvasWidgets()

  const task = actions?.find(action => action.id === filter)

  const { open } = useModalStore()
  const { activeSessionId, setActiveSession } = useActiveSession()
  const current = useCurrentSession()
  const timer = usePomodoro()

  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false)

  const sessions = useQuery(workspaceAPI.sessions.list.queryOptions())

  const minutes = Math.floor(timer.timeLeft / 60),
    seconds = timer.timeLeft % 60

  async function start() {
    if (!current) return
    setBusy(true)
    setError('')

    try {
      if (current.session.status === 'new') await current.changeStatus('active')
      timer.start()
    } catch (cause) {
      setError(String(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Stack gap="sm">
      {actions && (
        <Stack gap="xs">
          <Text color="muted" size="xs">
            {work('focusTask')}
          </Text>
          <ChoiceSelect
            disabled={
              readOnly || timer.isRunning || actionsLoading || !onConfigChange
            }
            label={work('focusTask')}
            options={[
              { value: '', label: work('noFocusTask') },
              ...actions
                .filter(action => !action.done || action.id === filter)
                .map(action => ({
                  value: action.id,
                  label: action.project
                    ? `${action.title} · ${action.project}`
                    : action.title
                }))
            ]}
            value={task?.id ?? ''}
            onChange={value => onConfigChange?.(value)}
          />
          {task?.done && (
            <Text color="muted" size="xs">
              {work('taskCompleted')}
            </Text>
          )}
        </Stack>
      )}
      <ChoiceSelect
        disabled={readOnly || timer.isRunning}
        label={t('focus')}
        options={[
          { value: '', label: t('chooseFocus') },
          ...(sessions.data ?? [])
            .filter(session => session.status !== 'completed')
            .map(session => ({ value: session.id, label: session.name }))
        ]}
        value={activeSessionId ?? ''}
        onChange={value => setActiveSession(value || null)}
      />
      {current && current.session.status !== 'completed' ? (
        <>
          <Text
            align="center"
            aria-label={t('focus')}
            role="timer"
            size="4xl"
            weight="semibold"
          >
            {String(minutes).padStart(2, '0')}:
            {String(seconds).padStart(2, '0')}
          </Text>
          <Text align="center" color="muted" size="xs">
            {current.session.name} · {timer.pomodoroCount} {t('completed')}
          </Text>
          <Flex gap="sm" justify="center">
            <Button
              disabled={readOnly || busy}
              icon={timer.isRunning ? 'lucide:pause' : 'lucide:play'}
              namespace={false}
              onClick={() => (timer.isRunning ? timer.pause() : void start())}
            >
              {t(timer.isRunning ? 'pause' : 'start')}
            </Button>
            <Button
              aria-label={t('reset')}
              disabled={readOnly}
              icon="lucide:rotate-ccw"
              namespace={false}
              variant="plain"
              onClick={timer.reset}
            />
          </Flex>
        </>
      ) : (
        <Button
          disabled={readOnly}
          icon="lucide:plus"
          namespace={false}
          variant="secondary"
          onClick={() =>
            open(ModifySessionModal, {
              openType: 'create',
              onCreated: setActiveSession
            })
          }
        >
          {t('createFocus')}
        </Button>
      )}
      {(error || sessions.error) && (
        <Text color="dangerous" role="alert" size="sm">
          {error || sessions.error?.message}
        </Text>
      )}
      {task && !task.done && completeAction && (
        <Button
          disabled={readOnly || busy || actionsLoading}
          icon="lucide:check"
          namespace={false}
          variant="plain"
          onClick={async () => {
            setBusy(true)
            setError('')

            try {
              await completeAction(task.id)
              timer.pause()
            } catch (cause) {
              setError(String(cause))
            } finally {
              setBusy(false)
            }
          }}
        >
          {work('markComplete')}
        </Button>
      )}
    </Stack>
  )
}
