import { useFederation } from '@monolith/federation'
import { Box, Button, Flex, Icon, Stack, Text } from '@monolith/ui'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { modulePath } from '@/core/routing/utils/navigation'
import { useWorkspace } from '@/core/workspaces/WorkspaceProvider'
import { workspaceAPI } from '@/core/workspaces/workspaceAPI'

import { coreAddonPaths } from '../../../../../modules/monolith--databases/navigationShared'

export function WorkspaceSettingsPanel() {
  const { active, refresh } = useWorkspace()
  const { moduleGroups } = useFederation()
  const { t } = useTranslation('common.workspaceUI')
  const { t: common } = useTranslation('common.canvas')
  const { t: navigation } = useTranslation('common.navigation')

  const [name, setName] = useState(active?.name ?? ''),
    [enabled, setEnabled] = useState(active?.enabled_modules ?? []),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [saved, setSaved] = useState(false)
  const addons = moduleGroups
    .flatMap(group => group.items)
    .filter(
      item =>
        item.rawModule && !coreAddonPaths.has(modulePath(item.name).slice(1))
    )

  async function save() {
    if (!active || active.role !== 'owner' || busy || !name.trim()) return
    setBusy(true)
    setError('')
    setSaved(false)

    try {
      await workspaceAPI.workspaces.update.input({ id: active.id }).mutate({
        name: name.trim(),
        icon: active.icon,
        description: active.description,
        profile: active.profile,
        enabled_modules: enabled
      })
      await refresh()
      setSaved(true)
    } catch (cause) {
      setError(String(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Stack
      as="form"
      gap="md"
      onSubmit={event => {
        event.preventDefault()
        void save()
      }}
    >
      <Text as="label" htmlFor="settings-workspace-name" size="sm">
        {common('workspaceName')}
      </Text>
      <Box
        required
        as="input"
        className="workspace-input"
        disabled={active?.role !== 'owner' || busy}
        id="settings-workspace-name"
        maxLength={160}
        value={name}
        onChange={event => {
          setName(event.target.value)
          setSaved(false)
        }}
      />
      <Text weight="semibold">{navigation('addons')}</Text>
      {addons.map(addon => {
        const id = modulePath(addon.name).slice(1)

        return (
          <Flex
            key={id}
            align="center"
            as="label"
            className="workspace-setting-row"
            gap="sm"
          >
            <Icon icon={addon.icon} size="18px" />
            <Stack flex="1" gap="xs" minWidth="0">
              <Text size="sm" weight="medium">
                {addon.rawModule?.displayName ?? id}
              </Text>
              <Text color="muted" size="xs">
                {t(
                  `addonKinds.${addon.rawModule?.experience?.kind ?? 'standard'}`
                )}
              </Text>
            </Stack>
            <input
              checked={enabled.includes(id)}
              disabled={active?.role !== 'owner' || busy}
              type="checkbox"
              onChange={event => {
                setEnabled(old =>
                  event.target.checked
                    ? [...old, id]
                    : old.filter(value => value !== id)
                )
                setSaved(false)
              }}
            />
          </Flex>
        )
      })}
      <Button
        disabled={busy || active?.role !== 'owner' || !name.trim()}
        namespace={false}
        type="submit"
        width="fit-content"
      >
        {navigation('save')}
      </Button>
      {saved && (
        <Text role="status" size="sm">
          {navigation('saved')}
        </Text>
      )}
      {error && (
        <Text color="dangerous" role="alert" size="sm">
          {error}
        </Text>
      )}
    </Stack>
  )
}
