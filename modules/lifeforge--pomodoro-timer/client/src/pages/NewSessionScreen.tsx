import type { Session } from '@'

import { useModuleTranslation } from '@lifeforge/localization'
import { Button, Flex, Icon, Text } from '@lifeforge/ui'

function NewSessionScreen({
  session,
  changeStatus
}: {
  session: Session
  changeStatus: (newStatus: Session['status']) => Promise<void>
}) {
  const { t } = useModuleTranslation()

  return (
    <Flex centered direction="column" flex="1">
      <Icon color="muted" icon="tabler:clock-bolt" size="6rem" />
      <Text as="h2" mb="md" mt="2xl" size="3xl" weight="medium">
        {session.name || 'New Session'}
      </Text>
      <Text as="p" color="muted" mb="lg">
        {t('timer.readyPrompt')}
      </Text>
      <Button
        icon="tabler:play"
        mt="lg"
        onClick={() => {
          changeStatus('active')
        }}
      >
        Start Pomodoro
      </Button>
    </Flex>
  )
}

export default NewSessionScreen
