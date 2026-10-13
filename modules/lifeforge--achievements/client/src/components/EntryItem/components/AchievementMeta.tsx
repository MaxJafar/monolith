import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

import { useModuleTranslation } from '@lifeforge/localization'
import { Box, Flex, Icon, Text, usePersonalization } from '@lifeforge/ui'

import { forgeAPI } from '@/manifest'

dayjs.extend(relativeTime)

function AchievementMeta({
  title,
  thoughts,
  category,
  created
}: {
  category: string | null | undefined
  title: string
  thoughts: string
  created: string
}) {
  const { t } = useModuleTranslation()
  const { language } = usePersonalization()
  const categoriesQuery = useQuery(forgeAPI.categories.list.queryOptions())

  const categoryData = (categoriesQuery.data || []).find(
    cat => cat.id === category
  )

  return (
    <Box>
      <Flex
        align="center"
        gap="xs"
        mb="xs"
        mr={{ base: 'none', sm: 'md' }}
        wrap="wrap"
      >
        {categoryData && (
          <>
            <Text asChild color="muted" size="sm" weight="medium">
              <Flex align="center" as="p" gap="xs">
                <Flex
                  centered
                  flexShrink="0"
                  height="1.5em"
                  r="sm"
                  style={{ backgroundColor: `${categoryData.color}20` }}
                  width="1.5em"
                >
                  <Icon
                    icon={categoryData.icon}
                    size="0.8em"
                    style={{ color: categoryData.color }}
                  />
                </Flex>
                {categoryData.name}
              </Flex>
            </Text>
            <Text asChild color="muted">
              <Icon icon="tabler:circle-filled" size="4px" />
            </Text>
          </>
        )}
        <Text as="p" color="muted" size="sm">
          {t('accomplishedOn', {
            date: dayjs(created).locale(language).fromNow()
          })}
        </Text>
      </Flex>
      <Text
        as="h2"
        mb="xs"
        mr={{ base: 'none', sm: 'md' }}
        size="lg"
        weight="semibold"
      >
        {title}
      </Text>
      <Text as="p" color="muted" size="sm">
        {thoughts}
      </Text>
    </Box>
  )
}

export default AchievementMeta
