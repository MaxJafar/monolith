import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { useModuleTranslation } from '@lifeforge/localization'
import {
  Box,
  Button,
  Flex,
  ListboxInput,
  ListboxOption,
  Stack,
  Text,
  TextInput,
  useModalStore
} from '@lifeforge/ui'

import { forgeAPI } from '@/manifest'
import { tasksInput } from '@/models'

import { BoardTaskEditor } from './BoardTaskEditor'
import { type BoardTask, ProjectBoardCard } from './ProjectBoardCard'

export default function BoardPanel() {
  const { t } = useModuleTranslation()
  const client = useQueryClient()
  const { open } = useModalStore()

  const projectsQuery = useQuery(
    forgeAPI.entries.list.queryOptions({
      staleTime: 0,
      refetchOnWindowFocus: true
    })
  )
  const columnsQuery = useQuery(
    forgeAPI.columns.list.queryOptions({
      staleTime: 0,
      refetchOnWindowFocus: true
    })
  )
  const tasksQuery = useQuery(
    forgeAPI.tasks.list.queryOptions({
      staleTime: 0,
      refetchOnWindowFocus: true
    })
  )

  const [params, setParams] = useSearchParams()

  const project = params.get('project') ?? ''

  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState<string | null>(null)
  const [over, setOver] = useState<string | null>(null)

  const [pending, setPending] = useState<{
    id: string
    column_id: string
    completed: boolean
  } | null>(null)

  const [announcement, setAnnouncement] = useState('')

  const columns = (columnsQuery.data ?? [])
    .filter(column => !project || column.project_id === project)
    .sort((first, second) =>
      String(first.created).localeCompare(String(second.created))
    )
  const tasks = (tasksQuery.data ?? []).map(task =>
    pending?.id === task.id ? { ...task, ...pending } : task
  )
  const filtered = tasks.filter(task =>
    task.title.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())
  )
  const fetchingError = [projectsQuery, columnsQuery, tasksQuery].find(
    query => query.isError
  )?.error
  const loading = [projectsQuery, columnsQuery, tasksQuery].some(
    query => query.isFetching && !query.data
  )

  async function update(
    task: BoardTask,
    column_id = task.column_id,
    completed = task.completed
  ) {
    if (busy) return

    const from = columns.find(column => column.id === task.column_id)
    const target = columns.find(column => column.id === column_id)

    if (!from || !target || from.project_id !== target.project_id) return
    setBusy(true)
    setError('')
    setPending({ id: task.id, column_id, completed })
    setDragging(null)
    setOver(null)

    try {
      await forgeAPI.tasks.update.input({ id: task.id }).mutate({
        title: task.title,
        content: task.content,
        column_id,
        completed
      })
      await client.invalidateQueries({ queryKey: forgeAPI.tasks.key })
      setAnnouncement(
        t('boardMoved', { title: task.title, group: target.name })
      )
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('saveFailed'))
    } finally {
      setBusy(false)
      setPending(null)
    }
  }

  function edit(column_id: string, task?: BoardTask) {
    open(BoardTaskEditor, {
      title: task?.title,
      content: task?.content,
      onSave: async (title: string, content: string) => {
        const body = tasksInput.parse({
          title,
          content,
          column_id,
          completed: task?.completed ?? false
        })

        if (task)
          await forgeAPI.tasks.update.input({ id: task.id }).mutate(body)
        else await forgeAPI.tasks.create.mutate(body)
        await client.invalidateQueries({ queryKey: forgeAPI.tasks.key })
      }
    })
  }

  const move = (id: string, column: string) => {
    const task = tasks.find(task => task.id === id)

    if (task) void update(task, column)
  }

  return (
    <Stack gap="md" minWidth="0">
      <Flex align="center" gap="sm" justify="between" wrap="wrap">
        <Box width={{ base: '100%', md: '240px' }}>
          <ListboxInput
            customActive
            icon="tabler:briefcase"
            label="inputs.project_id"
            renderContent={() => (
              <Text>
                {projectsQuery.data?.find(item => item.id === project)?.name ||
                  t('allProjects')}
              </Text>
            )}
            size="small"
            value={project}
            variant="plain"
            onChange={project =>
              setParams(current => {
                const next = new URLSearchParams(current)

                if (project) next.set('project', project)
                else next.delete('project')

                return next
              })
            }
          >
            <ListboxOption label={t('allProjects')} value="" />
            {projectsQuery.data?.map(item => (
              <ListboxOption key={item.id} label={item.name} value={item.id} />
            ))}
          </ListboxInput>
        </Box>
        <Box width={{ base: '100%', md: '240px' }}>
          <TextInput
            aria-label={t('searchTasks')}
            icon="tabler:search"
            label="searchTasks"
            placeholder={t('searchTasks')}
            size="small"
            value={search}
            variant="plain"
            onChange={setSearch}
          />
        </Box>
      </Flex>
      {(error || fetchingError) && (
        <Flex align="center" gap="sm">
          <Text color="dangerous" role="alert">
            {error || fetchingError?.message}
          </Text>
          <Button
            variant="plain"
            onClick={() => {
              setError('')
              void Promise.all([
                projectsQuery.refetch(),
                columnsQuery.refetch(),
                tasksQuery.refetch()
              ])
            }}
          >
            retry
          </Button>
        </Flex>
      )}
      <Text className="monolith-board-status" role="status">
        {announcement}
      </Text>
      {loading ? (
        <Text role="status">{t('loading')}</Text>
      ) : (
        <Flex
          align="start"
          aria-label={t('board')}
          className="monolith-board"
          gap="md"
          minWidth="0"
          overflowX="auto"
          pb="md"
        >
          {columns.map(column => {
            const items = filtered.filter(task => task.column_id === column.id)

            return (
              <Stack
                key={column.id}
                aria-label={column.name}
                as="section"
                className="monolith-board-column"
                data-over={over === column.id}
                flexShrink="0"
                gap="sm"
                minWidth="min(280px, 82vw)"
                p="sm"
                r="lg"
                width="280px"
                onDragLeave={event => {
                  if (
                    !event.currentTarget.contains(event.relatedTarget as Node)
                  )
                    setOver(null)
                }}
                onDragOver={event => {
                  const source = tasks.find(task => task.id === dragging)

                  if (
                    !busy &&
                    source &&
                    columns.find(item => item.id === source.column_id)
                      ?.project_id === column.project_id
                  ) {
                    event.preventDefault()
                    event.dataTransfer.dropEffect = 'move'
                    setOver(column.id)
                  }
                }}
                onDrop={event => {
                  event.preventDefault()
                  const id = event.dataTransfer.getData(
                    'application/x-monolith-task'
                  )

                  if (id === dragging) move(id, column.id)
                  setDragging(null)
                  setOver(null)
                }}
              >
                {!project && (
                  <Text color="muted" px="xs">
                    {
                      projectsQuery.data?.find(
                        item => item.id === column.project_id
                      )?.name
                    }
                  </Text>
                )}
                <Flex align="center" gap="sm" justify="between" px="xs" py="xs">
                  <Flex align="center" gap="sm">
                    <Box
                      aria-hidden="true"
                      bg="muted"
                      height="7px"
                      r="full"
                      width="7px"
                    />
                    <Text as="h3" weight="medium">
                      {column.name}
                    </Text>
                    <Text color="muted">{items.length}</Text>
                  </Flex>
                  <Button
                    aria-label={t('addToGroup', { group: column.name })}
                    disabled={busy}
                    icon="tabler:plus"
                    minHeight="28px"
                    p="xs"
                    variant="plain"
                    onClick={() => edit(column.id)}
                  />
                </Flex>
                {items.map(task => (
                  <ProjectBoardCard
                    key={task.id}
                    busy={busy}
                    columns={columns}
                    dragging={dragging === task.id}
                    task={task}
                    onDrag={id => {
                      setDragging(id)
                      if (!id) setOver(null)
                    }}
                    onEdit={task => edit(column.id, task)}
                    onMove={move}
                    onToggle={task =>
                      void update(task, task.column_id, !task.completed)
                    }
                  />
                ))}
                {!items.length && (
                  <Text align="center" color="muted" py="lg">
                    {search ? t('noResults') : t('emptyColumn')}
                  </Text>
                )}
                <Button
                  className="monolith-board-create"
                  disabled={busy}
                  icon="tabler:plus"
                  justify="start"
                  variant="plain"
                  onClick={() => edit(column.id)}
                >
                  newTask
                </Button>
              </Stack>
            )
          })}
        </Flex>
      )}
      {!loading && !columns.length && (
        <Stack align="start" gap="sm" py="xl">
          <Text weight="medium">{t('emptyBoard')}</Text>
          <Text color="muted">{t('emptyBoardHint')}</Text>
          <Button
            as={Link}
            to={
              project ? `?panel=columns&project=${project}` : '?panel=entries'
            }
          >
            {project ? 'entities.columns' : 'entities.entries'}
          </Button>
        </Stack>
      )}
    </Stack>
  )
}
