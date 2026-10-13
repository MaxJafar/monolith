import { useModuleTranslation } from '@lifeforge/localization'
import {
  Box,
  Button,
  ConfirmationModal,
  ContextMenu,
  ContextMenuItem,
  Flex,
  Text,
  useModalStore
} from '@lifeforge/ui'

import SettingsModal from '@/modal/ModifySettingsModal'
import { useCurrentSession } from '@/providers/CurrentSessionProvider'
import { usePomodoro } from '@/providers/PomodoroProvider'
import { usePomodoroSettings } from '@/providers/PomodoroSettingsProvider'

function Header() {
  const { t } = useModuleTranslation()
  const { open } = useModalStore()
  const timer = usePomodoro()
  const currentSession = useCurrentSession()
  const settings = usePomodoroSettings()

  function handleStopSession() {
    if (!currentSession) return

    open(ConfirmationModal, {
      title: t('modals.endSession.title'),
      description: t('modals.endSession.description', {
        sessionName: currentSession.session.name
      }),
      onConfirm: async () => {
        await timer.endSession()
      }
    })
  }

  if (!currentSession) {
    return null
  }

  return (
    <Flex as="header" justify="between" mt="sm">
      <Box>
        <Text as="h1" size="2xl" weight="medium">
          {currentSession.session.name}
        </Text>
        <Text as="p" color="muted" size="sm">
          {t('timer.sessionConfig', {
            durations: `${currentSession.session.workDuration} / ${currentSession.session.shortBreakDuration} / ${currentSession.session.longBreakDuration}`,
            perCycle: currentSession.session.sessionUntilLongBreak
          })}
        </Text>
      </Box>
      <Flex align="center" gap="md">
        <Button
          disabled={timer.isRunning}
          icon="tabler:player-stop"
          variant="secondary"
          onClick={handleStopSession}
        >
          End Session
        </Button>
        <ContextMenu>
          <ContextMenuItem
            icon="tabler:settings"
            label="Settings"
            onClick={() =>
              open(SettingsModal, {
                initialData: settings
              })
            }
          />
        </ContextMenu>
      </Flex>
    </Flex>
  )
}

export default Header
