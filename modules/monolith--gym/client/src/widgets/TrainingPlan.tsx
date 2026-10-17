import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { Link, useLocation } from 'react-router'

import { useAuth } from '@monolith/api'
import type { WidgetConfig } from '@monolith/configs'
import { useModuleTranslation } from '@monolith/localization'
import { Button, Flex, Icon, Stack, Text } from '@monolith/ui'

import { workspaceAPI } from '@/manifest'

import { scheduledRoutine } from '../../../shared'

export default function TrainingPlan() {
  const { userData } = useAuth(),
    { t } = useModuleTranslation(),
    location = useLocation()
  const query = useQuery(
    workspaceAPI.snapshot.queryOptions({
      queryKey: [...workspaceAPI.snapshot.key, userData?.id],
      enabled: !!userData,
      staleTime: 30_000
    })
  )
  if (query.isPending) return <Text role="status">{t('loading')}</Text>
  if (query.error) return <Text role="alert">{query.error.message}</Text>
  const data = query.data
  if (!data) return null
  const params = new URLSearchParams(location.search)
  params.set('section', 'plan')
  return (
    <Stack gap="sm">
      {Array.from({ length: 4 }, (_, i) => {
        const date = dayjs().add(i, 'day'),
          id = scheduledRoutine(data.schedule, date.format('YYYY-MM-DD'))
        return (
          <Flex key={i} align="center" gap="sm" py="sm">
            <Icon icon="lucide:dumbbell" color="muted" />
            <Stack gap="xs">
              <Text size="sm" weight="medium">
                {data.routines.find(routine => routine.id === id)?.name ??
                  t('plan.restDay')}
              </Text>
              <Text size="xs" color="muted">
                {date.format('ddd, D MMM')}
              </Text>
            </Stack>
          </Flex>
        )
      })}
      <Button
        as={Link}
        to={`/gym?${params}`}
        namespace={false}
        variant="plain"
        icon="lucide:arrow-up-right"
      >
        {t('buttons.editPlan')}
      </Button>
    </Stack>
  )
}
export const config: WidgetConfig = {
  id: 'gymTrainingPlan',
  icon: 'lucide:dumbbell'
}
