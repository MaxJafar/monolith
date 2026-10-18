import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Box, Button, Flex, Stack, Text } from '@monolith/ui'

import { useDatabases } from '@/DatabaseProvider'
import { projectProgress } from '@/utils/projectRelations'

import { WorkCreatePopover } from './WorkCreatePopover'
import './workHub.css'

export function ProjectActionsPanel({ projectId }: { projectId: string }) {
  const { data, api, run, openRecord, busy, readOnly } = useDatabases()
  const { t } = useTranslation('common.workHub')
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)

  const progress = projectProgress(projectId, data.records)

  return (
    <Stack className="work-project-actions" gap="sm">
      <Flex align="center" justify="between">
        <Text weight="semibold">{t('actions')}</Text>
        <Button
          disabled={busy || readOnly}
          icon="lucide:plus"
          namespace={false}
          variant="plain"
          onClick={event => setAnchor(event.currentTarget)}
        >
          {t('newAction')}
        </Button>
      </Flex>
      <Text color="muted" size="sm">
        {t('taskCount', {
          completed: progress.completed,
          total: progress.total
        })}{' '}
        · {progress.percent}%
      </Text>
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
      {progress.actions.map(action => (
        <Flex
          key={action.id}
          align="center"
          className="work-action-row"
          gap="sm"
        >
          <Box
            aria-label={t('complete', { name: action.title })}
            as="input"
            checked={!!action.done || action.status === 'done'}
            disabled={readOnly || busy}
            type="checkbox"
            onChange={event => {
              const done = event.target.checked
              void run(() =>
                api.updateRecord.input({ id: action.id }).mutate({
                  expected_updated: action.updated,
                  done,
                  status: done ? 'done' : 'planned'
                })
              )
            }}
          />
          <Box
            as="button"
            className="work-title-link"
            onClick={() => openRecord(action)}
          >
            {action.title}
          </Box>
        </Flex>
      ))}
      {!progress.total && (
        <Text color="muted" size="sm">
          {t('noActions')}
        </Text>
      )}
      {anchor && (
        <WorkCreatePopover
          anchor={anchor}
          kind="action"
          projectId={projectId}
          onClose={() => setAnchor(null)}
        />
      )}
    </Stack>
  )
}
