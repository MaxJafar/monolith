import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  Box,
  Button,
  Flex,
  FloatingPopover,
  Icon,
  Listbox,
  ListboxOption,
  Stack,
  Text,
  surface
} from '@monolith/ui'

import { useAppAppearance } from '@/core/appearance/AppearanceContext'

import { navigationSchema } from '../../../../../modules/monolith--databases/navigationShared'
import { useWorkspace } from './WorkspaceProvider'
import { workspaceAPI } from './workspaceAPI'

const modules = [
  'agents',
  'atlas',
  'automations',
  'databases',
  'gym',
  'redraw',
  'tech-lab'
] as const

export default function WorkspaceSwitcher() {
  const { t } = useTranslation('common.canvas')

  const {
    active,
    workspaces,
    select,
    refresh,
    loading,
    error: loadError
  } = useWorkspace()

  const appearance = useAppAppearance()
  const createAnchor = useRef<HTMLButtonElement>(null)

  const [creating, setCreating] = useState(false),
    [name, setName] = useState(''),
    [profile, setProfile] = useState<'personal' | 'collaborative' | 'agents'>(
      'personal'
    ),
    [error, setError] = useState(''),
    [pending, setPending] = useState(false)

  async function create() {
    if (pending || !name.trim()) return
    setPending(true)
    setError('')

    try {
      const workspace = await workspaceAPI.workspaces.create.mutate({
        name: name.trim(),
        description: '',
        icon: 'lucide:layers',
        profile,
        enabled_modules:
          profile === 'agents'
            ? ['agents']
            : profile === 'collaborative'
              ? ['projects', 'notes', 'calendar', 'todo-list', 'databases']
              : [...modules]
      })
      await refresh()
      setCreating(false)
      setName('')
      select(workspace.id)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setPending(false)
    }
  }

  return (
    <Stack flexShrink="0" gap="sm" px="md" py="sm">
      <Flex align="center" gap="xs" minWidth="0">
        <Listbox
          aria-label={t('workspace')}
          bg="transparent"
          className="monolith-workspace-select"
          disabled={loading || pending}
          flex="1"
          gap="xs"
          minWidth="0"
          p="sm"
          renderContent={() => (
            <Flex align="center" gap="sm" minWidth="0">
              <Box flexShrink="0">
                <Icon
                  icon={
                    appearance.workspace.icon || active?.icon || 'lucide:layers'
                  }
                  preserveStyle={!!appearance.workspace.icon}
                  size="1rem"
                />
              </Box>
              <Text truncate align="left" size="sm" weight="semibold">
                {active?.name || t('workspace')}
              </Text>
            </Flex>
          )}
          value={active?.id ?? ''}
          onChange={select}
        >
          {workspaces.map(workspace => (
            <ListboxOption
              key={workspace.id}
              icon={
                (workspace.id === active?.id
                  ? appearance.workspace.icon
                  : navigationSchema.safeParse(workspace.navigation).data
                      ?.appearance?.icon) ||
                workspace.icon ||
                'lucide:layers'
              }
              label={workspace.name}
              value={workspace.id}
            />
          ))}
        </Listbox>
        <Button
          ref={createAnchor}
          aria-controls={creating ? 'monolith-workspace-create' : undefined}
          aria-expanded={creating}
          aria-label={t('newWorkspace')}
          className="monolith-navigation-action"
          disabled={pending}
          icon="lucide:plus"
          namespace={false}
          p="xs"
          title={t('newWorkspace')}
          variant="plain"
          onClick={() => setCreating(!creating)}
        />
      </Flex>
      {creating && (
        <FloatingPopover
          anchor={createAnchor.current}
          label={t('newWorkspace')}
          width={300}
          onClose={() => {
            if (!pending) setCreating(false)
          }}
        >
          <Stack
            as="form"
            gap="sm"
            id="monolith-workspace-create"
            p="sm"
            r="sm"
            onSubmit={event => {
              event.preventDefault()
              void create()
            }}
          >
            <Text
              as="label"
              htmlFor="monolith-workspace-name"
              size="sm"
              weight="medium"
            >
              {t('workspaceName')}
            </Text>
            <Box
              autoFocus
              aria-label={t('workspaceName')}
              as="input"
              bg={surface.default}
              className="monolith-workspace-input"
              disabled={pending}
              id="monolith-workspace-name"
              minHeight="32px"
              p="sm"
              placeholder={t('workspaceName')}
              r="sm"
              value={name}
              width="100%"
              onChange={event => setName(event.target.value)}
            />
            <Listbox
              aria-label={t('workspaceProfile')}
              bg={surface.default}
              disabled={pending}
              gap="sm"
              minHeight="32px"
              p="sm"
              r="sm"
              renderContent={() => (
                <Text truncate align="left" size="sm">
                  {t(`profiles.${profile}`)}
                </Text>
              )}
              value={profile}
              onChange={setProfile}
            >
              {(['personal', 'collaborative', 'agents'] as const).map(value => (
                <ListboxOption
                  key={value}
                  label={t(`profiles.${value}`)}
                  value={value}
                />
              ))}
            </Listbox>
            {error && (
              <Text color="dangerous" role="alert" size="sm">
                {error}
              </Text>
            )}
            <Flex justify="end" gap="xs">
              <Button
                disabled={pending}
                namespace={false}
                type="button"
                variant="plain"
                onClick={() => setCreating(false)}
              >
                {t('common.buttons:cancel')}
              </Button>
              <Button
                disabled={!name.trim()}
                loading={pending}
                namespace={false}
                p="sm"
                type="submit"
              >
                {t('createWorkspace')}
              </Button>
            </Flex>
          </Stack>
        </FloatingPopover>
      )}
      {loadError && (
        <Text color="dangerous" role="alert" size="sm">
          {loadError}
        </Text>
      )}
    </Stack>
  )
}
