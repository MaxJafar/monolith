import type { Session } from '@'
import _ from 'lodash'

import { type InferOutput } from '@monolith/api'
import { useModuleTranslation } from '@monolith/localization'
import { Box, Card, Flex, Icon, Text, surface } from '@monolith/ui'

import { useSessionStyles } from '@/hooks/useSessionStyles'
import { workspaceAPI } from '@/manifest'
import formatTime from '@/utils/formatTime'

type SubSession = InferOutput<typeof workspaceAPI.sessions.listSubSessions>[number]

function SubSessionItem({
  subSession,
  session
}: {
  subSession: SubSession
  session: Session
}) {
  const { t } = useModuleTranslation()
  const sessionStyles = useSessionStyles()

  return (
    <Card align="center" bg={surface.light} direction="row" gap="sm">
      <Box
        p={{ base: 'md', sm: 'sm' }}
        r="lg"
        style={{
          backgroundColor: sessionStyles[subSession.type].color + '20'
        }}
      >
        <Icon
          icon={sessionStyles[subSession.type].icon}
          size={{ base: '1.5em', sm: '1.25em' }}
          style={{ color: sessionStyles[subSession.type].color }}
        />
      </Box>
      <Flex
        align={{ base: 'start', sm: 'center' }}
        direction={{ base: 'column', sm: 'row' }}
        flex="1"
        gap="xs"
        justify={{ base: 'start', sm: 'between' }}
      >
        <Text size={{ base: 'lg', sm: 'base' }} weight="medium">
          {t(`timer.${_.camelCase(subSession.type)}`)}
        </Text>
        <Text as="p">
          <Text weight="medium">{formatTime(subSession.durationElapsed)}</Text>
          <Text color="muted" size="sm">
            {' '}
            /{' '}
            {formatTime(
              session[
                (
                  {
                    work: 'workDuration',
                    short_break: 'shortBreakDuration',
                    long_break: 'longBreakDuration'
                  } as const
                )[subSession.type]
              ] * 60
            )}
          </Text>
        </Text>
      </Flex>
      {subSession.isCompleted ? (
        <Icon color="green-500" icon="tabler:check" size="1rem" />
      ) : (
        <Icon color="bg-400" icon="tabler:skip-forward" size="1rem" />
      )}
    </Card>
  )
}

export default SubSessionItem
