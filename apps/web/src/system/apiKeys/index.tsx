import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import type { InferOutput } from '@monolith/api'
import {
  Button,
  EmptyStateScreen,
  ModuleHeader,
  Stack,
  WithQuery,
  useModalStore
} from '@monolith/ui'

import workspaceAPI from '@/core/utils/workspaceAPI'

import EntryItem from './components/EntryItem'
import ModifyAPIKeyModal from './modals/ModifyAPIKeyModal'

export type APIKeyEntry = InferOutput<
  typeof workspaceAPI.apiKeys.entries.list
>[number]

export default function APIKeys() {
  const { t } = useTranslation('common.api-keys')
  const { open } = useModalStore()
  const query = useQuery(workspaceAPI.apiKeys.entries.list.queryOptions())

  const create = () => open(ModifyAPIKeyModal, { type: 'create' })

  return (
    <Stack gap="lg" pb="xl">
      <ModuleHeader
        namespace="common.api-keys"
        trailing={
          <Button
            icon="tabler:plus"
            tProps={{ item: t('items.apiKey') }}
            onClick={create}
          >
            new
          </Button>
        }
      />
      <WithQuery query={query}>
        {entries =>
          entries.length ? (
            <Stack aria-label={t('title')} gap="sm" role="list">
              {entries.map(entry => (
                <EntryItem key={entry.id} entry={entry} />
              ))}
            </Stack>
          ) : (
            <EmptyStateScreen
              icon="tabler:key-off"
              message={{ id: 'apiKeys', namespace: 'common.api-keys' }}
            />
          )
        }
      </WithQuery>
    </Stack>
  )
}
