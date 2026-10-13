import { useState } from 'react'

import { useModuleTranslation } from '@lifeforge/localization'
import {
  Button,
  Card,
  Flex,
  Stack,
  Text,
  TextAreaInput,
  TextInput
} from '@lifeforge/ui'

import { useAgents } from '@/AgentContext'
import Select from '@/Select'
import { forgeAPI } from '@/manifest'
import { DraftNotice, useDraftGuard } from '@/useDraftGuard'

export default function Create({
  kind,
  projectId
}: {
  kind: 'project' | 'task'
  projectId: string
}) {
  const { t } = useModuleTranslation(),
    { data, act, busy, navigate } = useAgents(),
    [name, setName] = useState(''),
    [content, setContent] = useState(''),
    [project, setProject] = useState(projectId)

  const guard = useDraftGuard(Boolean(name || content))

  async function save() {
    if (
      await act(async () => {
        if (kind === 'project') {
          const p = await forgeAPI.project.create.mutate({
            name,
            description: content
          })
          guard.allowNavigation()
          navigate({ project: p.id, new: null })
        } else {
          const task = await forgeAPI.work.create.mutate({
            project_id: project,
            title: name,
            content
          })
          guard.allowNavigation()
          navigate({ project, task: task.id, new: null })
        }
      })
    ) {
      setName('')
      setContent('')
    }
  }

  return (
    <Stack>
      <DraftNotice blocker={guard.blocker} />
      <Card gap="md">
        <Text as="h3" size="xl" weight="semibold">
          {t(kind === 'project' ? 'newProject' : 'newTask')}
        </Text>
        {kind === 'task' && (
          <Select
            disabled={busy}
            label="inputs.project"
            options={data.projects.map(p => ({ value: p.id, label: p.name }))}
            value={project}
            onChange={setProject}
          />
        )}
        <TextInput
          disabled={busy}
          icon="tabler:pencil"
          label="inputs.title"
          placeholder={t('inputs.title')}
          value={name}
          onChange={setName}
        />
        <TextAreaInput
          disabled={busy}
          icon="tabler:notes"
          label="inputs.brief"
          placeholder={t('briefHint')}
          value={content}
          onChange={setContent}
        />
        <Flex gap="sm">
          <Button
            disabled={busy || !name.trim() || (kind === 'task' && !project)}
            namespace={false}
            onClick={() => {
              void save()
            }}
          >
            {t('create')}
          </Button>
          <Button
            disabled={busy}
            namespace={false}
            variant="secondary"
            onClick={() => navigate({ new: null })}
          >
            {t('close')}
          </Button>
        </Flex>
      </Card>
    </Stack>
  )
}
