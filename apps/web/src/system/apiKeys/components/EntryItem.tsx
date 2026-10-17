import { useQueryClient } from '@tanstack/react-query'
import copy from 'copy-to-clipboard'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useFederation } from '@monolith/federation'
import {
  Button,
  Card,
  ConfirmationModal,
  Flex,
  Icon,
  Stack,
  Text,
  toast,
  useModalStore
} from '@monolith/ui'

import workspaceAPI from '@/core/utils/workspaceAPI'

import type { APIKeyEntry } from '..'
import ModifyAPIKeyModal from '../modals/ModifyAPIKeyModal'
import ModulesRequiredListModal from '../modals/ModulesRequiredListModal'
import { credentialUsers } from '../model'

export default function EntryItem({ entry }: { entry: APIKeyEntry }) {
  const { t, i18n } = useTranslation('common.api-keys')
  const { moduleGroups } = useFederation()
  const { open } = useModalStore()
  const cache = useQueryClient()
  const [busy, setBusy] = useState(false)
  const locked = useRef(false)
  const consumers = credentialUsers(moduleGroups, entry.keyId)

  async function copySecret() {
    if (!entry.exposable || locked.current) return
    locked.current = true
    setBusy(true)
    try {
      const secret = await workspaceAPI.apiKeys.entries.get
        .input({ keyId: entry.keyId })
        .query()
      if (!secret || !copy(secret)) throw new Error('Clipboard unavailable')
      toast.success(t('messages.copied'))
    } catch {
      toast.error(t('messages.copyFailed'))
    } finally {
      locked.current = false
      setBusy(false)
    }
  }

  function remove() {
    open(ConfirmationModal, {
      title: t('actions.remove', { name: entry.name }),
      description: t('messages.removeDescription'),
      confirmationButton: 'delete',
      onConfirm: async () => {
        try {
          await workspaceAPI.apiKeys.entries.remove
            .input({ id: entry.id })
            .mutateRaw(undefined)
          await cache.invalidateQueries({ queryKey: workspaceAPI.apiKeys.key })
          toast.success(t('messages.removed'))
        } catch (error) {
          toast.error(t('messages.removeFailed'))
          throw error
        }
      }
    })
  }

  return (
    <Card role="listitem" gap="md">
      <Flex align="start" justify="between" gap="md" wrap="wrap">
        <Flex align="start" gap="md" minWidth="0">
          <Icon icon={entry.icon} size="1.75em" color="muted" />
          <Stack gap="xs" minWidth="0">
            <Text weight="semibold" style={{ overflowWrap: 'anywhere' }}>
              {entry.name}
            </Text>
            <Text as="code" size="sm" color="muted">
              {entry.keyId}
            </Text>
          </Stack>
        </Flex>
        <Flex align="center" gap="xs">
          <Icon
            icon={entry.exposable ? 'tabler:world' : 'tabler:lock'}
            color="muted"
          />
          <Text color="muted" size="sm">
            {t(entry.exposable ? 'misc.exposable' : 'misc.internalOnly')}
          </Text>
        </Flex>
      </Flex>
      <Flex gap="md" align="center" wrap="wrap" justify="between">
        <Stack gap="xs">
          <Text as="code">{'•••• •••• ' + entry.key}</Text>
          <Text color="muted" size="sm">
            {t('misc.lastUpdated', {
              time: new Intl.DateTimeFormat(i18n.resolvedLanguage, {
                dateStyle: 'medium',
                timeStyle: 'short'
              }).format(new Date(entry.updated))
            })}
          </Text>
        </Stack>
        <Flex gap="xs" wrap="wrap">
          {consumers.length > 0 && (
            <Button
              icon="tabler:apps"
              variant="plain"
              namespace={false}
              onClick={() =>
                open(ModulesRequiredListModal, { keyId: entry.keyId })
              }
            >
              {t('misc.requiredBy', { count: consumers.length })}
            </Button>
          )}
          {entry.exposable && (
            <Button
              icon="tabler:copy"
              variant="plain"
              loading={busy}
              onClick={copySecret}
            >
              copy
            </Button>
          )}
          <Button
            icon="tabler:pencil"
            variant="plain"
            disabled={busy}
            onClick={() =>
              open(ModifyAPIKeyModal, { type: 'update', initialData: entry })
            }
          >
            edit
          </Button>
          <Button
            icon="tabler:trash"
            variant="plain"
            dangerous
            disabled={busy}
            onClick={remove}
          >
            delete
          </Button>
        </Flex>
      </Flex>
    </Card>
  )
}
