import { useState } from 'react'

import { useModuleTranslation } from '@monolith/localization'
import { Button, Card, Flex, Grid, Text } from '@monolith/ui'

import { useAgents } from '@/AgentContext'
import Select from '@/Select'
import { workspaceAPI } from '@/manifest'

import { ROLES } from '../../../shared'

export default function Membership({ projectId }: { projectId: string }) {
  const { t } = useModuleTranslation(),
    { data, act, busy } = useAgents(),
    [person, setPerson] = useState(''),
    [role, setRole] = useState('contributor')

  return (
    <Card gap="md">
      <Text as="h3" weight="semibold">
        {t('accessTitle')}
      </Text>
      <Text color="muted" size="sm">
        {t('accessHint')}
      </Text>
      <Grid gap="sm" templateCols={{ base: 1, md: 2 }}>
        <Select
          disabled={busy}
          label="inputs.agent"
          options={[
            { value: '', label: t('chooseAgent') },
            ...data.principals
              .filter(p => p.kind === 'agent')
              .map(p => ({ value: p.id, label: p.name }))
          ]}
          value={person}
          onChange={setPerson}
        />
        <Select
          disabled={busy}
          label="inputs.role"
          options={ROLES.map(value => ({ value, label: t('roles.' + value) }))}
          value={role}
          onChange={setRole}
        />
      </Grid>
      <Button
        disabled={busy || !person}
        namespace={false}
        variant="secondary"
        onClick={() => {
          void act(() =>
            workspaceAPI.project.membership.mutate({
              project_id: projectId,
              principal_id: person,
              role: role as (typeof ROLES)[number]
            })
          )
        }}
      >
        {t('grantAccess')}
      </Button>
      {data.members
        .filter(m => m.project_id === projectId)
        .map(m => (
          <Flex
            key={m.id}
            align="center"
            gap="sm"
            justify="between"
            wrap="wrap"
          >
            <Text>
              {data.principals.find(p => p.id === m.principal_id)?.name} ·{' '}
              {t('roles.' + m.role)}
            </Text>
            <Button
              dangerous
              disabled={busy}
              namespace={false}
              variant="plain"
              onClick={() => {
                void act(() =>
                  workspaceAPI.project.membership.mutate({
                    project_id: projectId,
                    principal_id: m.principal_id,
                    role: null
                  })
                )
              }}
            >
              {t('revoke')}
            </Button>
          </Flex>
        ))}
    </Card>
  )
}
