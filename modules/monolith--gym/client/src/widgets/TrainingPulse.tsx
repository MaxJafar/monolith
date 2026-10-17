import { useQuery } from '@tanstack/react-query'

import { useAuth } from '@monolith/api'
import type { WidgetConfig } from '@monolith/configs'
import { useModuleTranslation } from '@monolith/localization'
import { Grid, Stack, Text } from '@monolith/ui'

import { workspaceAPI } from '@/manifest'

export default function TrainingPulse() {
  const { userData } = useAuth(),
    { t } = useModuleTranslation()
  const query = useQuery(
    workspaceAPI.snapshot.queryOptions({
      queryKey: [...workspaceAPI.snapshot.key, userData?.id],
      enabled: !!userData,
      staleTime: 30_000
    })
  )
  if (query.isPending) return <Text role="status">{t('loading')}</Text>
  if (query.error) return <Text role="alert">{query.error.message}</Text>
  const stats = query.data?.stats
  return (
    <Grid templateCols={3} gap="sm">
      {[
        ['workouts', stats?.workouts ?? 0],
        ['sets', stats?.completed_sets ?? 0],
        ['streak', stats?.streak_weeks ?? 0]
      ].map(([key, value]) => (
        <Stack key={key} gap="sm" py="md">
          <Text size="3xl" weight="semibold">
            {value}
          </Text>
          <Text size="sm" color="muted">
            {t(`dashboard.${key}`)}
          </Text>
        </Stack>
      ))}
    </Grid>
  )
}
export const config: WidgetConfig = {
  id: 'gymTrainingPulse',
  icon: 'lucide:activity'
}
