import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'

import {
  AppearanceContext,
  AppearanceCover,
  Box,
  Button,
  ChoiceSelect,
  Flex,
  Icon,
  Stack,
  Text,
  elasticDragPreview,
  setInternalDragData,
  useCoverPicker
} from '@monolith/ui'

import { useDatabases } from '@/DatabaseProvider'
import { projectProgress } from '@/utils/projectRelations'
import { systemStatus } from '@/utils/systemViews'

import type { RecordPage } from '../../../../shared'

export function ProjectCard({
  project,
  onAdd
}: {
  project: RecordPage
  onAdd: (anchor: HTMLElement) => void
}) {
  const { data, openRecord, api, run, readOnly, busy } = useDatabases()
  const { t } = useTranslation('common.workHub')
  const pickCover = useCoverPicker()

  const progress = projectProgress(project.id, data.records)
  const next = progress.actions
    .filter(action => !action.done && action.status !== 'done')
    .slice(0, 2)
  const icon = project.appearance?.icon
  const status = systemStatus(project)

  return (
    <Box
      as="article"
      className="work-project-card"
      data-icon={!!icon || undefined}
      draggable={!readOnly && !busy}
      onDragStart={event => {
        setInternalDragData(
          event.nativeEvent,
          'application/x-monolith-project',
          project.id
        )
        event.dataTransfer.effectAllowed = 'move'
        elasticDragPreview(
          event.nativeEvent,
          project.title,
          event.currentTarget
        )
      }}
    >
      <Box
        aria-label={t('openProject', { name: project.title })}
        as="button"
        className="work-project-preview"
        type="button"
        onClick={() => openRecord(project)}
      >
        {project.appearance?.cover ? (
          <AppearanceContext
            value={{ appearance: project.appearance, readOnly: true }}
          >
            <AppearanceCover />
          </AppearanceContext>
        ) : (
          <Box className="work-cover-placeholder">
            {!icon && <Text>{project.title.slice(0, 1).toUpperCase()}</Text>}
          </Box>
        )}
        <Flex align="center" className="work-project-open" gap="xs">
          {t('open')}
          <Icon icon="lucide:arrow-up-right" size="13px" />
        </Flex>
      </Box>
      {icon && (
        <Box aria-hidden className="work-project-icon">
          <Icon preserveStyle icon={icon} size="26px" />
        </Box>
      )}
      <Stack className="work-project-body" gap="sm">
        <Flex align="start" gap="sm" justify="between">
          <Box
            as="button"
            className="work-title-link"
            onClick={() => openRecord(project)}
          >
            {project.title}
          </Box>
          <Box className="work-project-status" data-status={status}>
            <ChoiceSelect
              disabled={readOnly || busy}
              label={t('status')}
              options={['planned', 'active', 'done'].map(value => ({
                value,
                label: t(`statuses.${value}`)
              }))}
              value={status}
              onChange={value => {
                void run(() =>
                  api.updateRecord.input({ id: project.id }).mutate({
                    expected_updated: project.updated,
                    status: value as 'planned' | 'active' | 'done',
                    done: value === 'done'
                  })
                )
              }}
            />
          </Box>
        </Flex>
        <Text className="work-project-description" color="muted" size="sm">
          {project.description || t('projectDescription')}
        </Text>
        {next.length > 0 && (
          <Stack className="work-project-next" gap="xs">
            <Text color="muted" size="xs" weight="medium">
              {t('nextActions')}
            </Text>
            {next.map(action => (
              <Flex key={action.id} align="center" gap="sm" minWidth="0">
                <Icon color="muted" icon="lucide:circle" size="12px" />
                <Text truncate size="sm">
                  {action.title}
                </Text>
              </Flex>
            ))}
          </Stack>
        )}
        <Stack gap="xs">
          <Flex align="center" justify="between">
            <Text color="muted" size="xs">
              {t('taskCount', {
                completed: progress.completed,
                total: progress.total
              })}
            </Text>
            <Text color="muted" size="xs">
              {progress.percent}%
            </Text>
          </Flex>
          <Box
            aria-label={t('progress')}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={progress.percent}
            className="work-progress"
            role="progressbar"
          >
            <Box style={{ width: `${progress.percent}%` }} />
          </Box>
        </Stack>
        <Flex align="center" gap="md" justify="between">
          <Flex align="center" gap="xs" minWidth="0">
            <Icon color="muted" icon="lucide:calendar" size="13px" />
            <Text color="muted" size="xs">
              {project.date
                ? dayjs(project.date).format('MMM D, YYYY')
                : t('noDueDate')}
            </Text>
          </Flex>
          <Flex align="center" gap="xs">
            <Icon color="muted" icon="lucide:flag" size="13px" />
            <Text
              className="work-priority"
              color="muted"
              data-priority={project.priority ?? 'normal'}
              size="xs"
            >
              {t(`priorities.${project.priority ?? 'normal'}`)}
            </Text>
          </Flex>
        </Flex>
        <Flex className="work-project-details" gap="sm" justify="between">
          <Button
            disabled={busy || readOnly}
            icon="lucide:plus"
            namespace={false}
            variant="plain"
            onClick={event => onAdd(event.currentTarget)}
          >
            {t('newAction')}
          </Button>
          <Button
            aria-label={t('changeCover')}
            disabled={busy || readOnly}
            icon="lucide:image"
            namespace={false}
            variant="plain"
            onClick={() =>
              pickCover(project.appearance?.cover, cover => {
                void run(() =>
                  api.updateRecord.input({ id: project.id }).mutate({
                    expected_updated: project.updated,
                    appearance: { ...project.appearance, cover }
                  })
                )
              })
            }
          />
        </Flex>
      </Stack>
    </Box>
  )
}
