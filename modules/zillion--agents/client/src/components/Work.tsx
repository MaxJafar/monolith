import { useState } from 'react'
import { Link } from 'react-router'

import { useModuleTranslation } from '@lifeforge/localization'
import {
  Box,
  Button,
  Card,
  Flex,
  Grid,
  Icon,
  Stack,
  Text,
  TextInput
} from '@lifeforge/ui'

import { useAgents } from '@/AgentContext'
import Select from '@/Select'

import { WORK_STATES } from '../../../shared'
import Create from './CreateWork'
import Membership from './ProjectMembership'
import Task from './TaskAssignment'

export default function Work() {
  const { t } = useModuleTranslation(),
    { data, params, navigate } = useAgents(),
    [search, setSearch] = useState('')
  const projectId = params.get('project') ?? '',
    selected = data.tasks.find(p => p.task_id === params.get('task')),
    creating = params.get('new')
  const visible = data.tasks.filter(
    p =>
      (!projectId || p.project_id === projectId) &&
      p.title.toLocaleLowerCase().includes(search.toLocaleLowerCase())
  )

  return (
    <Stack gap="lg">
      <Flex gap="sm" justify="between" wrap="wrap">
        <Box flex="1" minWidth="12rem">
          <Select
            label="inputs.project"
            options={[
              { value: '', label: t('allProjects') },
              ...data.projects.map(p => ({ value: p.id, label: p.name }))
            ]}
            value={projectId}
            onChange={project =>
              navigate({ project: project || null, task: null, new: null })
            }
          />
        </Box>
        <Button
          icon="tabler:briefcase"
          namespace={false}
          variant="secondary"
          onClick={() => navigate({ new: 'project', task: null })}
        >
          {t('newProject')}
        </Button>
        <Button
          disabled={!data.projects.length}
          icon="tabler:plus"
          namespace={false}
          onClick={() => navigate({ new: 'task', task: null })}
        >
          {t('newTask')}
        </Button>
        <Button
          as={Link}
          icon="tabler:external-link"
          namespace={false}
          to={`/projects?panel=board${projectId ? '&project=' + projectId : ''}`}
          variant="plain"
        >
          {t('projectBoard')}
        </Button>
      </Flex>
      <TextInput
        icon="tabler:search"
        label="inputs.taskSearch"
        placeholder={t('inputs.taskSearch')}
        value={search}
        onChange={setSearch}
      />
      <Grid
        align="start"
        gap="lg"
        templateCols={{
          base: 1,
          xl: selected || creating ? 'minmax(0, 1.5fr) minmax(0, 1fr)' : 1
        }}
      >
        <Stack gap="lg">
          <Grid
            align="start"
            gap="md"
            templateCols={{ base: 1, md: 2, xl: selected || creating ? 2 : 5 }}
          >
            {WORK_STATES.map(state => (
              <Stack
                key={state}
                bg={{ base: 'bg-100', dark: 'bg-950' }}
                gap="md"
                p="md"
                r="lg"
              >
                <Flex align="center" gap="sm" justify="between">
                  <Text weight="semibold">{t('states.' + state)}</Text>
                  <Text color="muted" size="sm">
                    {visible.filter(p => p.status === state).length}
                  </Text>
                </Flex>
                {visible
                  .filter(p => p.status === state)
                  .map(p => (
                    <Card
                      key={p.task_id}
                      isInteractive
                      aria-label={t('openTask', { name: p.title })}
                      as="button"
                      gap="sm"
                      onClick={() => navigate({ task: p.task_id, new: null })}
                    >
                      <Text align="left" weight="medium">
                        {p.title}
                      </Text>
                      <Text align="left" color="muted" size="sm">
                        {
                          data.projects.find(
                            project => project.id === p.project_id
                          )?.name
                        }
                      </Text>
                      <Flex align="center" gap="sm">
                        <Icon
                          color="primary"
                          icon={
                            data.principals.find(
                              person => person.id === p.assignee_id
                            )?.kind === 'agent'
                              ? 'tabler:robot'
                              : 'tabler:user'
                          }
                        />
                        <Text color="muted" size="sm">
                          {data.principals.find(
                            person => person.id === p.assignee_id
                          )?.kind === 'human'
                            ? t('you')
                            : (data.principals.find(
                                person => person.id === p.assignee_id
                              )?.name ?? t('unassigned'))}
                        </Text>
                      </Flex>
                      {p.blockers.some(
                        id =>
                          !data.tasks.find(task => task.task_id === id)
                            ?.completed
                      ) && (
                        <Text align="left" color="primary" size="sm">
                          {t('waitingDependencies')}
                        </Text>
                      )}
                    </Card>
                  ))}
              </Stack>
            ))}
          </Grid>
          {!data.tasks.length && (
            <Card>
              <Text color="muted">{t('emptyWork')}</Text>
            </Card>
          )}
          {projectId && <Membership key={projectId} projectId={projectId} />}
        </Stack>
        {creating === 'project' || creating === 'task' ? (
          <Create
            key={creating}
            kind={creating}
            projectId={projectId || data.projects[0]?.id || ''}
          />
        ) : (
          selected && <Task key={selected.task_id} task={selected} />
        )}
      </Grid>
    </Stack>
  )
}
