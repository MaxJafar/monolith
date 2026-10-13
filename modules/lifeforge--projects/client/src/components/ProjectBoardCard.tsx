import { Link } from 'react-router'

import { contentText } from '@lifeforge/blocks'
import { useModuleTranslation } from '@lifeforge/localization'
import {
  Box,
  Button,
  ContextMenu,
  ContextMenuItem,
  Flex,
  Icon,
  Stack,
  Text
} from '@lifeforge/ui'

export type BoardTask = {
  id: string
  title: string
  content: string
  completed: boolean
  column_id: string
  assignee_name: string | null
  agent_state: string | null
}

export type BoardColumn = { id: string; name: string; project_id: string }

export function ProjectBoardCard({
  task,
  columns,
  busy,
  dragging,
  onDrag,
  onMove,
  onToggle,
  onEdit
}: {
  task: BoardTask
  columns: BoardColumn[]
  busy: boolean
  dragging: boolean
  onDrag: (id: string | null) => void
  onMove: (id: string, column: string) => void
  onToggle: (task: BoardTask) => void
  onEdit: (task: BoardTask) => void
}) {
  const { t } = useModuleTranslation()

  const project = columns.find(
    column => column.id === task.column_id
  )?.project_id

  return (
    <Stack
      as="article"
      className="monolith-board-card"
      data-dragging={dragging}
      draggable={!busy}
      gap="sm"
      p="md"
      r="md"
      onDragEnd={() => onDrag(null)}
      onDragStart={event => {
        if (
          busy ||
          (event.target instanceof Element &&
            event.target.closest('button,a,input'))
        ) {
          event.preventDefault()

          return
        }
        event.dataTransfer.setData('application/x-monolith-task', task.id)
        event.dataTransfer.effectAllowed = 'move'
        onDrag(task.id)
      }}
    >
      <Flex align="start" gap="xs" justify="between">
        <Button
          aria-label={t(task.completed ? 'markIncomplete' : 'markComplete')}
          disabled={busy}
          icon={task.completed ? 'tabler:circle-check-filled' : 'tabler:circle'}
          minHeight="28px"
          p="xs"
          variant="plain"
          onClick={() => onToggle(task)}
        />
        <Box asChild flex="1" minWidth="0">
          <Text
            align="left"
            as="button"
            className="monolith-project-title"
            decoration={task.completed ? 'line-through' : 'none'}
            disabled={busy}
            type="button"
            weight="medium"
            onClick={() => onEdit(task)}
          >
            {task.title}
          </Text>
        </Box>
        <ContextMenu
          className="monolith-board-actions"
          componentProps={{
            button: {
              'aria-label': t('boardActions', { title: task.title }),
              minHeight: '28px',
              p: 'xs',
              disabled: busy
            }
          }}
          customIcon="tabler:dots"
        >
          <ContextMenuItem
            icon="tabler:pencil"
            label="editTask"
            onClick={() => onEdit(task)}
          />
          {columns
            .filter(column => column.project_id === project)
            .map(column => (
              <ContextMenuItem
                key={column.id}
                checked={column.id === task.column_id}
                disabled={column.id === task.column_id || busy}
                icon="tabler:arrow-right"
                label={t('moveToGroup', { group: column.name })}
                namespace={false}
                onClick={() => onMove(task.id, column.id)}
              />
            ))}
        </ContextMenu>
      </Flex>
      {task.content && (
        <Text as="p" color="muted" lineClamp={2}>
          {contentText(task.content)}
        </Text>
      )}
      <Flex align="center" gap="sm" justify="between">
        <Text
          as={Link}
          className="monolith-task-assignee"
          color="muted"
          to={`/agents?section=work&project=${project ?? ''}&task=${task.id}`}
        >
          <Icon aria-hidden="true" icon="tabler:user-circle" mr="xs" />
          {task.assignee_name || t('unassigned')}
        </Text>
        {task.agent_state && (
          <Text color="muted">{t(`agentStates.${task.agent_state}`)}</Text>
        )}
      </Flex>
    </Stack>
  )
}
