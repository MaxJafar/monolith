import type { Session } from '@'
import dayjs from 'dayjs'

import { useForgeMutation } from '@lifeforge/api'
import { useModuleTranslation } from '@lifeforge/localization'
import {
  Box,
  Card,
  ConfirmationModal,
  ContextMenu,
  ContextMenuItem,
  Flex,
  Icon,
  TagChip,
  Text,
  anyColorToHex,
  useModalStore
} from '@lifeforge/ui'

import STATUS_STYLES from '@/constants/status_styles'
import { forgeAPI } from '@/manifest'
import ModifySessionModal from '@/modal/ModifySessionModal'
import SessionEndedModal from '@/modal/SessionEndedModal'
import { useActiveSession } from '@/providers/ActiveSessionProvider'
import formatTime from '@/utils/formatTime'

function SessionCard({ session }: { session: Session }) {
  const { t } = useModuleTranslation()
  const { open } = useModalStore()
  const { setActiveSession } = useActiveSession()

  const deleteMutation = useForgeMutation(
    forgeAPI.sessions.remove.input({ id: session.id }),
    {
      action: 'delete',
      queryKey: forgeAPI.sessions.list.key
    }
  )

  function handleDelete() {
    open(ConfirmationModal, {
      title: 'Delete Session',
      description: `Are you sure you want to delete the session "${session.name}"? This action cannot be undone.`,
      confirmationButton: 'delete',
      onConfirm: async () => {
        await deleteMutation.mutateAsync(undefined)
      }
    })
  }

  function handleClick() {
    if (session.status === 'completed') {
      open(SessionEndedModal, {
        sessionId: session.id
      })
    } else {
      setActiveSession(session.id)
    }
  }

  return (
    <Card
      key={session.id}
      isInteractive
      direction="row"
      gap="xl"
      justify="between"
      onClick={handleClick}
    >
      <Flex
        align={{ base: 'start', sm: 'center' }}
        direction={{ base: 'column', sm: 'row' }}
        gap="md"
      >
        <Box
          p="sm"
          r="lg"
          style={{
            color: STATUS_STYLES[session.status].color,
            backgroundColor:
              anyColorToHex(STATUS_STYLES[session.status].color) + '20'
          }}
        >
          <Icon icon={STATUS_STYLES[session.status].icon} size="1.75rem" />
        </Box>
        <Box>
          <Flex align="center" as="h3" gap="sm">
            <Text size="lg" weight="medium">
              {session.name}
            </Text>
            <TagChip
              color={STATUS_STYLES[session.status].color}
              display={{ base: 'none', sm: 'block' }}
              icon={STATUS_STYLES[session.status].icon}
              label={t(`statuses.${session.status}`)}
              size="sm"
              style={{ padding: '0.125rem 0.375rem' }}
            />
          </Flex>
          <Flex
            align="center"
            gapX="md"
            gapY="sm"
            mt={{ base: 'sm', sm: 'xs' }}
            wrap="wrap"
          >
            <Flex align="center" gap="xs">
              <Icon color="muted" icon="tabler:clock" size="1rem" />
              <Text color="muted" size="sm">
                {t('timer.sessionConfig', {
                  durations: `${session.workDuration} / ${session.shortBreakDuration} / ${session.longBreakDuration}`,
                  perCycle: session.sessionUntilLongBreak
                })}
              </Text>
            </Flex>
            {session.status !== 'new' && (
              <Flex align="center" gap="xs">
                <Icon color="muted" icon="tabler:flag-check" size="1rem" />
                <Text color="muted" size="sm">
                  {t('timer.pomodoroDone', {
                    count: session.pomodoroCount,
                    total: formatTime(session.totalTimeElapsed as number)
                  })}
                </Text>
              </Flex>
            )}
            <Flex align="center" gap="xs">
              <Icon color="muted" icon="tabler:calendar" size="1rem" />
              <Text color="muted" size="sm">
                {dayjs(session.created).format('DD MMM YYYY')}
              </Text>
            </Flex>
          </Flex>
        </Box>
      </Flex>
      <ContextMenu
        position={{ base: 'absolute', sm: 'static' }}
        right="1rem"
        top="1rem"
      >
        <ContextMenuItem
          icon="tabler:pencil"
          label="edit"
          onClick={() => {
            open(ModifySessionModal, {
              openType: 'update',
              initialData: session
            })
          }}
        />
        <ContextMenuItem
          dangerous
          icon="tabler:trash"
          label="delete"
          onClick={handleDelete}
        />
      </ContextMenu>
    </Card>
  )
}

export default SessionCard
