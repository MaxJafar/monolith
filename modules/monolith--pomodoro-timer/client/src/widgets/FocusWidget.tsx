import { Box, Button, Flex, Stack, Text, useModalStore } from '@monolith/ui'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

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
  readOnly = false
}: {
  readOnly?: boolean
}) {
  const { t } = useTranslation('common.workspaceUI')
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
      <Box
        aria-label={t('focus')}
        as="select"
        className="workspace-input"
        disabled={readOnly || timer.isRunning}
        value={activeSessionId ?? ''}
        onChange={event => setActiveSession(event.target.value || null)}
      >
        <option value="">{t('chooseFocus')}</option>
        {sessions.data
          ?.filter(session => session.status !== 'completed')
          .map(session => (
            <option key={session.id} value={session.id}>
              {session.name}
            </option>
          ))}
      </Box>
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
          onClick={() => open(ModifySessionModal, { openType: 'create' })}
        >
          {t('createFocus')}
        </Button>
      )}
      {(error || sessions.error) && (
        <Text color="dangerous" role="alert" size="sm">
          {error || sessions.error?.message}
        </Text>
      )}
    </Stack>
  )
}
