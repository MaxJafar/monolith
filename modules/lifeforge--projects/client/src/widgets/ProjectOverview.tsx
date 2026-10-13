import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'

import { useAuth } from '@lifeforge/api'
import { contentText } from '@lifeforge/blocks'
import type { WidgetConfig } from '@lifeforge/configs'
import { useModuleTranslation } from '@lifeforge/localization'
import { Button, Flex, Grid, Stack, Text } from '@lifeforge/ui'

import { forgeAPI } from '@/manifest'

export default function ProjectOverview({ filter = '' }: { filter?: string }) {
  const { userData } = useAuth(),
    owner = userData?.id

  const { t } = useModuleTranslation()

  const projects = useQuery({
    queryKey: [...forgeAPI.entries.list.key, owner],
    queryFn: () => forgeAPI.entries.list.query(),
    enabled: !!owner
  })
  const columns = useQuery({
    queryKey: [...forgeAPI.columns.list.key, owner],
    queryFn: () => forgeAPI.columns.list.query(),
    enabled: !!owner
  })
  const tasks = useQuery({
    queryKey: [...forgeAPI.tasks.list.key, owner],
    queryFn: () => forgeAPI.tasks.list.query(),
    enabled: !!owner
  })

  if ([projects, columns, tasks].some(query => query.isLoading))
    return <Text role="status">{t('loading')}</Text>
  if ([projects, columns, tasks].some(query => query.isError))
    return <Text role="alert">{t('saveFailed')}</Text>

  const projectByColumn = new Map(
    columns.data?.map(column => [column.id, column.project_id])
  )
  const taskCounts = new Map<string, number>()

  for (const task of tasks.data ?? []) {
    const projectId = projectByColumn.get(task.column_id)

    if (projectId)
      taskCounts.set(projectId, (taskCounts.get(projectId) ?? 0) + 1)
  }

  const project = filter
    ? projects.data?.find(item =>
        item.name.toLocaleLowerCase().includes(filter.toLocaleLowerCase())
      )
    : projects.data
        ?.slice()
        .sort(
          (first, second) =>
            (taskCounts.get(second.id) ?? 0) - (taskCounts.get(first.id) ?? 0)
        )[0]

  if (!project) return <Text color="muted">{t('none')}</Text>

  const visible =
    columns.data
      ?.filter(column => column.project_id === project.id)
      .sort((first, second) =>
        String(first.created).localeCompare(String(second.created))
      ) ?? []

  return (
    <Stack gap="md">
      <Flex align="center" gap="sm" justify="between">
        <Text weight="semibold">{project.name}</Text>
        <Button
          as={Link}
          icon="lucide:arrow-up-right"
          to={`/projects?panel=board&project=${project.id}`}
          variant="plain"
        >
          {t('board')}
        </Button>
      </Flex>
      <Grid gap="md" templateCols={{ base: 1, md: 2, lg: 4 }}>
        {visible.map(column => (
          <Stack key={column.id} bg="surface-container" gap="md" p="md" r="sm">
            <Flex align="center" gap="sm" justify="between">
              <Text weight="semibold">{column.name}</Text>
              <Text color="muted">
                {tasks.data?.filter(task => task.column_id === column.id)
                  .length ?? 0}
              </Text>
            </Flex>
            {tasks.data
              ?.filter(task => task.column_id === column.id)
              .slice(0, 8)
              .map(task => (
                <Stack key={task.id} bg="surface" gap="sm" p="md" r="sm">
                  <Text overflowWrap="anywhere" weight="medium">
                    {task.title}
                  </Text>
                  {task.content && (
                    <Text color="muted" lineClamp={2}>
                      {contentText(task.content)}
                    </Text>
                  )}
                </Stack>
              ))}
          </Stack>
        ))}
      </Grid>
    </Stack>
  )
}

export const config: WidgetConfig = {
  id: 'projectOverview',
  icon: 'lucide:kanban'
}
