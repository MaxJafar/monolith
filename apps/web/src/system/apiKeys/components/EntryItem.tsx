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
    <Card gap="md" role="listitem">
      <Flex align="start" gap="md" justify="between" wrap="wrap">
        <Flex align="start" gap="md" minWidth="0">
          <Icon color="muted" icon={entry.icon} size="1.75em" />
          <Stack gap="xs" minWidth="0">
            <Text style={{ overflowWrap: 'anywhere' }} weight="semibold">
              {entry.name}
            </Text>
            <Text as="code" color="muted" size="sm">
              {entry.keyId}
            </Text>
          </Stack>
        </Flex>
        <Flex align="center" gap="xs">
          <Icon
            color="muted"
            icon={entry.exposable ? 'tabler:world' : 'tabler:lock'}
          />
          <Text color="muted" size="sm">
            {t(entry.exposable ? 'misc.exposable' : 'misc.internalOnly')}
          </Text>
        </Flex>
      </Flex>
      <Flex align="center" gap="md" justify="between" wrap="wrap">
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
              namespace={false}
              variant="plain"
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
              loading={busy}
              variant="plain"
              onClick={copySecret}
            >
              copy
            </Button>
          )}
          <Button
            disabled={busy}
            icon="tabler:pencil"
            variant="plain"
            onClick={() =>
              open(ModifyAPIKeyModal, { type: 'update', initialData: entry })
            }
          >
            edit
          </Button>
          <Button
            dangerous
            disabled={busy}
            icon="tabler:trash"
            variant="plain"
            onClick={remove}
          >
            delete
          </Button>
        </Flex>
      </Flex>
    </Card>
  )
}
