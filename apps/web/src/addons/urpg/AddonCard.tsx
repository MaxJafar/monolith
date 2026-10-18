import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'

import { useAuth } from '@monolith/api'
import {
  Button,
  Flex,
  Icon,
  Stack,
  Switch,
  Text,
  useModalStore
} from '@monolith/ui'

import { useWorkspace } from '@/core/workspaces/WorkspaceProvider'
import { workspaceAPI } from '@/core/workspaces/workspaceAPI'

import UrpgWizard from './UrpgWizard'

export default function UrpgAddonCard({
  onNavigate,
  disabled = false,
  onBusyChange
}: {
  onNavigate?: () => void
  disabled?: boolean
  onBusyChange?: (busy: boolean) => void
}) {
  const { t } = useTranslation('common', { keyPrefix: 'urpg' }),
    { active, refresh, workspaces } = useWorkspace(),
    { userData } = useAuth(),
    { open } = useModalStore(),
    navigate = useNavigate()
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  const enabled = active?.enabled_modules.includes('urpg')
  const options = workspaceAPI.urpg.snapshot
    .input({
      workspace_id: active?.id ?? '00000000-0000-4000-8000-000000000000'
    })
    .queryOptions()
  const campaign = useQuery({
    ...options,
    queryKey: [...options.queryKey, userData?.id],
    enabled: !!active
  })
  async function setEnabled(value: boolean, openCampaign = true) {
    if (!active || active.role !== 'owner' || busy || disabled) return
    onBusyChange?.(true)
    setBusy(true)
    setError('')
    try {
      await workspaceAPI.workspaces.update.input({ id: active.id }).mutate({
        name: active.name,
        icon: active.icon,
        profile: active.profile,
        description: active.description,
        enabled_modules: value
          ? [...new Set([...active.enabled_modules, 'urpg'])]
          : active.enabled_modules.filter(id => id !== 'urpg')
      })
      await refresh()
      if (value && openCampaign) {
        onNavigate?.()
        navigate(`/urpg?workspace=${active.id}`)
      }
    } catch (cause) {
      setError(String(cause))
    } finally {
      setBusy(false)
      onBusyChange?.(false)
    }
  }
  return (
    <Stack className="urpg-panel" p="lg" r="sm" gap="md">
      <Flex gap="md" align="center">
        <Icon icon="lucide:swords" size="28px" />
        <Stack gap="xs" flex="1">
          <Text weight="semibold">uRPG</Text>
          <Text color="muted" size="sm">
            {t('addonDescription')}
          </Text>
        </Stack>
        {(enabled || campaign.data) && (
          <Flex className="addon-toggle">
            <Switch
              value={!!enabled}
              disabled={busy || disabled || active?.role !== 'owner'}
              aria-label={t(enabled ? 'disable' : 'resumeCampaign')}
              onChange={value => void setEnabled(value, false)}
            />
          </Flex>
        )}
      </Flex>
      <Text size="xs" color="muted">
        {t('addonHelp')}
      </Text>
      <Flex gap="sm" wrap="wrap">
        <Button
          namespace={false}
          disabled={
            disabled ||
            busy ||
            campaign.isPending ||
            campaign.isError ||
            (!enabled && !!campaign.data && active?.role !== 'owner')
          }
          icon={enabled ? 'lucide:arrow-up-right' : 'lucide:swords'}
          onClick={() => {
            if (!enabled && campaign.data) {
              void setEnabled(true)
              return
            }
            onNavigate?.()
            if (enabled) navigate(`/urpg?workspace=${active!.id}`)
            else open(UrpgWizard, {})
          }}
        >
          {t(
            enabled
              ? 'openCampaign'
              : campaign.data
                ? 'resumeCampaign'
                : 'activate'
          )}
        </Button>
      </Flex>
      {!enabled &&
        workspaces
          .filter(w => w.enabled_modules.includes('urpg'))
          .map(w => (
            <Button
              key={w.id}
              namespace={false}
              variant="plain"
              justify="start"
              icon="lucide:swords"
              onClick={() => {
                onNavigate?.()
                navigate(`/urpg?workspace=${w.id}`)
              }}
            >
              {w.name}
            </Button>
          ))}
      {error && (
        <Text role="alert" color="dangerous" size="sm">
          {error}
        </Text>
      )}
      {campaign.isError && (
        <Button
          namespace={false}
          variant="plain"
          onClick={() => void campaign.refetch()}
        >
          {t('retry')}
        </Button>
      )}
    </Stack>
  )
}
