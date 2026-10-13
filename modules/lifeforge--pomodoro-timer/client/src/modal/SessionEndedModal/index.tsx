import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { type InferOutput } from '@lifeforge/api'
import { useModuleTranslation } from '@lifeforge/localization'
import { Box, Flex, ModalHeader, Stack, Text, WithQuery } from '@lifeforge/ui'

import { forgeAPI } from '@/manifest'

import StatsCard from './components/StatsCard'
import SubSessionItem from './components/SubSessionItem'

type SubSession = InferOutput<typeof forgeAPI.sessions.listSubSessions>[number]

interface Cycle {
  cycleNumber: number
  subSessions: SubSession[]
}

function SessionEndedModal({
  onClose,
  data: { sessionId }
}: {
  onClose: () => void
  data: {
    sessionId: string
  }
}) {
  const { t } = useModuleTranslation()

  const sessionQuery = useQuery(
    forgeAPI.sessions.getById.input({ id: sessionId }).queryOptions()
  )

  const subSessionsQuery = useQuery(
    forgeAPI.sessions.listSubSessions.input({ sessionId }).queryOptions()
  )

  // Group subsessions by cycle
  const cycles = useMemo(() => {
    if (!subSessionsQuery.data) return []

    const result: Cycle[] = []

    let currentCycle: Cycle = { cycleNumber: 1, subSessions: [] }

    for (const subSession of subSessionsQuery.data) {
      currentCycle.subSessions.push(subSession)

      // After a long break, start new cycle
      if (subSession.type === 'long_break') {
        result.push(currentCycle)
        currentCycle = {
          cycleNumber: currentCycle.cycleNumber + 1,
          subSessions: []
        }
      }
    }

    // Push remaining cycle if it has subsessions
    if (currentCycle.subSessions.length > 0) {
      result.push(currentCycle)
    }

    return result
  }, [subSessionsQuery.data])

  const totalBreakTime = useMemo(() => {
    if (!subSessionsQuery.data) return 0

    return subSessionsQuery.data
      .filter(s => s.type !== 'work')
      .reduce((sum, s) => sum + s.durationElapsed, 0)
  }, [subSessionsQuery.data])

  return (
    <Flex direction="column" minWidth="70vw">
      <WithQuery query={sessionQuery}>
        {session => (
          <>
            <ModalHeader
              icon="tabler:history"
              title={
                <Box>
                  <Box>{session.name}</Box>
                  <Text as="p" color="muted" mt="xs" size="sm">
                    {t('timer.sessionConfig', {
                      durations: `${session.workDuration} / ${session.shortBreakDuration} / ${session.longBreakDuration}`,
                      perCycle: session.sessionUntilLongBreak
                    })}
                  </Text>
                </Box>
              }
              onClose={onClose}
            />
            <StatsCard breakTime={totalBreakTime} session={session} />
            <WithQuery query={subSessionsQuery}>
              {() => (
                <Stack gap="xl" mt="lg">
                  {cycles.map(cycle => (
                    <Box key={`cycle-${cycle}`}>
                      <Flex align="center" gap="sm" mb="sm">
                        <Box
                          bg="custom-500"
                          height="1.5em"
                          r="full"
                          width="4px"
                        />
                        <Text as="h3" size="xl" weight="medium">
                          {t('timer.cycleCount', {
                            current: cycle.cycleNumber
                          })}
                        </Text>
                      </Flex>
                      <Stack>
                        {cycle.subSessions.map((subSession, idx) => (
                          <SubSessionItem
                            key={idx}
                            session={session}
                            subSession={subSession}
                          />
                        ))}
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              )}
            </WithQuery>
          </>
        )}
      </WithQuery>
    </Flex>
  )
}

export default SessionEndedModal
