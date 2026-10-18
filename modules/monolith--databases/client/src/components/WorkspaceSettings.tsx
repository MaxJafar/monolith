import { useAuth } from '@monolith/api'
import { useFederation } from '@monolith/federation'
import { useModuleTranslation } from '@monolith/localization'
import { Button, ChoiceSelect, Flex, Grid, Stack, Text } from '@monolith/ui'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'

import { workspaceAPI } from '@/manifest'

import { coreAddonPaths } from '../../../navigationShared'
import {
  type WorkspaceModule,
  workspaceModule,
  workspaceProfile
} from '../../../workspaceShared'

export function WorkspaceSettings() {
  const { moduleGroups } = useFederation()
  const addons = moduleGroups
    .flatMap(group => group.items)
    .filter(
      item =>
        item.rawModule &&
        !coreAddonPaths.has(
          item.name
            .replace(/^@[^/]+\//, '')
            .split('--')
            .pop() ?? item.name
        )
    )
  const { t } = useModuleTranslation(),
    { userData } = useAuth(),
    [params] = useSearchParams(),
    cache = useQueryClient()
  const id = params.get('workspace') ?? ''
  const options = workspaceAPI.workspaces.list.queryOptions()
  const query = useQuery({
    ...options,
    queryKey: [...options.queryKey, userData?.id]
  })
  const workspace = query.data?.find(item => item.id === id)
  const [name, setName] = useState(''),
    [modules, setModules] = useState<WorkspaceModule[]>([]),
    [email, setEmail] = useState(''),
    [role, setRole] = useState<'editor' | 'viewer'>('viewer'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  useEffect(() => {
    if (workspace) {
      setName(workspace.name)
      setModules(
        workspace.enabled_modules.filter(
          (value): value is WorkspaceModule =>
            typeof value === 'string' &&
            workspaceModule.safeParse(value).success
        )
      )
    }
  }, [workspace])
  const membersEndpoint = workspaceAPI.workspaces.members.input({
    workspace_id: id
  })
  const membersOptions = membersEndpoint.queryOptions()
  const members = useQuery({
    ...membersOptions,
    queryKey: [...membersOptions.queryKey, userData?.id],
    enabled: workspace?.role === 'owner'
  })
  async function run(action: () => Promise<unknown>) {
    setBusy(true)
    setError('')
    try {
      await action()
      await cache.invalidateQueries({ queryKey: workspaceAPI.workspaces.list.key })
      await cache.invalidateQueries({
        queryKey: workspaceAPI.workspaces.members.key
      })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusy(false)
    }
  }
  if (!workspace) return <Text role="status">{t('loading')}</Text>
  return (
    <Stack gap="lg">
      <Text as="h2">{t('workspaceSettings')}</Text>
      {error && (
        <Text role="alert" color="dangerous">
          {error}
        </Text>
      )}
      <Text color="muted">{t('workspaceSettingsHelp')}</Text>
      <fieldset
        disabled={workspace.role !== 'owner' || busy}
        style={{ padding: 0, border: 0, minWidth: 0 }}
      >
        <Stack gap="md">
          <label>
            {t('workspaceName')}
            <input
              value={name}
              onChange={event => setName(event.target.value)}
            />
          </label>
          <Grid templateCols={{ base: 1, md: 2 }} gap="sm">
            {addons.map(addon => {
              const module =
                addon.name
                  .replace(/^@[^/]+\//, '')
                  .split('--')
                  .pop() ?? addon.name
              return (
                <label key={module}>
                  <input
                    type="checkbox"
                    checked={modules.includes(module)}
                    onChange={event =>
                      setModules(old =>
                        event.target.checked
                          ? [...old, module]
                          : old.filter(value => value !== module)
                      )
                    }
                  />{' '}
                  {t(`workspaceModules.${module}`, {
                    defaultValue: addon.rawModule?.displayName || module
                  })}
                </label>
              )
            })}
          </Grid>
          <Button
            namespace={false}
            loading={busy}
            disabled={!name.trim()}
            onClick={() =>
              void run(() =>
                workspaceAPI.workspaces.update.input({ id }).mutate({
                  name,
                  icon: workspace.icon,
                  profile: workspaceProfile.parse(workspace.profile),
                  enabled_modules: modules,
                  description: workspace.description
                })
              )
            }
          >
            {t('save')}
          </Button>
        </Stack>
      </fieldset>
      {workspace.role === 'owner' && (
        <Stack gap="md">
          <Text as="h3">{t('workspaceMembers')}</Text>
          <Flex gap="sm" wrap="wrap">
            <input
              type="email"
              aria-label={t('memberEmail')}
              placeholder={t('memberEmail')}
              value={email}
              onChange={event => setEmail(event.target.value)}
            />
            <ChoiceSelect
              label={t('memberRole')}
              value={role}
              onChange={value =>
                setRole(value === 'editor' ? 'editor' : 'viewer')
              }
              options={[
                { value: 'viewer', label: t('memberViewer') },
                { value: 'editor', label: t('memberEditor') }
              ]}
            />
            <Button
              namespace={false}
              disabled={!email.includes('@')}
              loading={busy}
              onClick={() =>
                void run(() =>
                  workspaceAPI.workspaces.setMember
                    .input({ workspace_id: id })
                    .mutate({ email, role })
                )
              }
            >
              {t('addMember')}
            </Button>
          </Flex>
          {members.data?.map(member => (
            <Flex key={member.id} align="center" gap="sm" justify="between">
              <Text>
                {member.name} ·{' '}
                {t(member.role === 'editor' ? 'memberEditor' : 'memberViewer')}
              </Text>
              <Button
                namespace={false}
                variant="plain"
                icon="lucide:x"
                aria-label={t('removeMember')}
                onClick={() =>
                  void run(() =>
                    workspaceAPI.workspaces.removeMember
                      .input({ workspace_id: id, user_id: member.user_id })
                      .mutate(undefined)
                  )
                }
              />
            </Flex>
          ))}
        </Stack>
      )}
      {workspace.role !== 'owner' && (
        <Text color="muted">{t('workspaceReadOnly')}</Text>
      )}
    </Stack>
  )
}
