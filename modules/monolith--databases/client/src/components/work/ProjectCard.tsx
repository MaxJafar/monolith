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

  return (
    <Box
      as="article"
      className="work-project-card"
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
            <Icon icon="lucide:layers-2" size="36px" />
            <Text>{project.title.slice(0, 1).toUpperCase()}</Text>
          </Box>
        )}
        {progress.actions.some(
          action => !action.done && action.status !== 'done'
        ) && (
          <Stack className="work-project-peek" gap="xs">
            <Text color="muted" size="xs">
              {t('nextActions')}
            </Text>
            {progress.actions
              .filter(action => !action.done && action.status !== 'done')
              .slice(0, 2)
              .map(action => (
                <Text key={action.id} truncate size="sm">
                  {action.title}
                </Text>
              ))}
          </Stack>
        )}
        <Text className="work-project-open">{t('open')}</Text>
      </Box>
      <Stack gap="sm" p="md">
        <Flex align="center" gap="sm" justify="between">
          <Box
            as="button"
            className="work-title-link"
            onClick={() => openRecord(project)}
          >
            {project.title}
          </Box>
          <Box width="120px">
            <ChoiceSelect
              disabled={readOnly || busy}
              label={t('status')}
              options={['planned', 'active', 'done'].map(value => ({
                value,
                label: t(`statuses.${value}`)
              }))}
              value={systemStatus(project)}
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
        <Flex align="center" justify="between">
          <Text color="muted" size="xs">
            {t('taskCount', {
              completed: progress.completed,
              total: progress.total
            })}
          </Text>
          <Text size="xs">{progress.percent}%</Text>
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
        <Flex align="center" gap="sm" justify="between">
          <Text color="muted" size="xs">
            {project.date
              ? dayjs(project.date).format('MMM D, YYYY')
              : t('noDueDate')}
          </Text>
          <Text color="muted" size="xs">
            {t(`priorities.${project.priority ?? 'normal'}`)}
          </Text>
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
