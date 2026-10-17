import { useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { InferOutput } from '@monolith/api'
import {
  Button,
  Card,
  ConfirmationModal,
  Flex,
  Icon,
  Stack,
  Switch,
  Text,
  toast,
  useModalStore
} from '@monolith/ui'

import workspaceAPI from '@/core/utils/workspaceAPI'

import ModifyOAuthProviderModal from '../../ModifyOAuthProviderModal'

export default function ProviderItem({
  entry
}: {
  entry: InferOutput<
    typeof workspaceAPI.auth.oauth.providers.listOptions
  >[number]
}) {
  const { t, i18n } = useTranslation('common.account-settings')
  const { open } = useModalStore()
  const cache = useQueryClient()
  const [busy, setBusy] = useState(false)
  const locked = useRef(false)

  async function change(operation: 'toggle' | 'remove') {
    if (!entry.id || locked.current) return
    locked.current = true
    setBusy(true)
    try {
      await workspaceAPI.auth.oauth.providers[operation]
        .input({ id: entry.id })
        .mutateRaw(undefined)
      await cache.invalidateQueries({ queryKey: workspaceAPI.auth.oauth.key })
    } catch (error) {
      toast.error(t('messages.oauth.saveFailed'))
      throw error
    } finally {
      locked.current = false
      setBusy(false)
    }
  }

  return (
    <Card role="listitem" gap="md">
      <Flex align="center" gap="md" justify="between" wrap="wrap">
        <Flex align="center" gap="md">
          <Icon icon={entry.icon} size="1.75em" color="muted" />
          <Stack gap="xs">
            <Text weight="medium">{entry.name}</Text>
            {entry.updated && (
              <Text color="muted" size="sm">
                {t('misc.lastUpdated')}{' '}
                {new Intl.DateTimeFormat(i18n.resolvedLanguage, {
                  dateStyle: 'medium'
                }).format(new Date(entry.updated))}
              </Text>
            )}
          </Stack>
        </Flex>
        {entry.configured && (
          <Switch
            aria-label={t('actions.enableProvider', { provider: entry.name })}
            disabled={busy}
            value={entry.enabled}
            onChange={() => {
              void change('toggle').catch(() => {})
            }}
          />
        )}
      </Flex>
      <Flex gap="sm" justify="end">
        <Button
          variant="plain"
          disabled={busy}
          icon={entry.configured ? 'tabler:pencil' : 'tabler:plus'}
          onClick={() =>
            open(ModifyOAuthProviderModal, {
              type: entry.configured ? 'update' : 'create',
              provider: entry.provider
            })
          }
        >
          {entry.configured ? 'edit' : 'add'}
        </Button>
        {entry.configured && (
          <Button
            dangerous
            variant="plain"
            icon="tabler:trash"
            disabled={busy}
            onClick={() =>
              open(ConfirmationModal, {
                title: t('actions.removeProvider', { provider: entry.name }),
                description: t('messages.oauth.removeDescription'),
                confirmationButton: 'delete',
                onConfirm: () => change('remove')
              })
            }
          >
            delete
          </Button>
        )}
      </Flex>
    </Card>
  )
}
