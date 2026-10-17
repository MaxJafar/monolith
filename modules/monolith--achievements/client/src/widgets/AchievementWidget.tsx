import { Button, Flex, Icon, Stack, Text, useModalStore } from '@monolith/ui'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import ModifyAchievementModal from '@/components/modals/ModifyAchievementModal'
import { workspaceAPI } from '@/manifest'

export const config = {
  id: 'achievementHighlights',
  icon: 'lucide:award',
  minW: 1,
  minH: 2
}

export default function AchievementWidget({
  readOnly = false
}: {
  readOnly?: boolean
}) {
  const { t } = useTranslation('common.workspaceUI')
  const { open } = useModalStore()
  const query = useQuery(workspaceAPI.entries.list.input({}).queryOptions())

  return (
    <Stack gap="sm">
      <Flex align="center" gap="sm">
        <Icon icon="lucide:award" size="24px" />
        <Text size="2xl" weight="semibold">
          {query.data?.length ?? '—'}
        </Text>
        <Text color="muted" size="xs">
          {t('completed')}
        </Text>
      </Flex>
      {query.data?.slice(0, 4).map(item => (
        <Button
          key={item.id}
          disabled={readOnly}
          justify="start"
          namespace={false}
          variant="plain"
          onClick={() =>
            open(ModifyAchievementModal, {
              modifyType: 'update',
              initialData: item
            })
          }
        >
          <Text truncate size="sm">
            {item.title}
          </Text>
        </Button>
      ))}
      <Button
        disabled={readOnly}
        icon="lucide:plus"
        namespace={false}
        variant="secondary"
        onClick={() => open(ModifyAchievementModal, { modifyType: 'create' })}
      >
        {t('newAchievement')}
      </Button>
      {!query.isFetched && (
        <Text role="status" size="sm">
          {t('loading')}
        </Text>
      )}
      {query.error && (
        <Text color="dangerous" role="alert" size="sm">
          {query.error.message}
        </Text>
      )}
    </Stack>
  )
}
