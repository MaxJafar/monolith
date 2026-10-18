import { Button, Flex, Icon, Stack, Text, TextInput } from '@monolith/ui'
import { useQuery } from '@tanstack/react-query'
import { useDeferredValue, useState } from 'react'
import { useTranslation } from 'react-i18next'

import workspaceAPI from '@/core/utils/workspaceAPI'

import { useRooms } from '../RoomsContext'
import type { Entity } from '../types'

export default function EntityPicker({
  initialQuery = '',
  onSelect,
  onClose
}: {
  initialQuery?: string
  onSelect: (entity: Entity) => void
  onClose: () => void
}) {
  const { t } = useTranslation('common.rooms')
  const { workspaceId, actor } = useRooms()
  const [query, setQuery] = useState(initialQuery)
  const deferred = useDeferredValue(query)

  const options = workspaceAPI.entities.search
    .input({ workspace_id: workspaceId, q: deferred })
    .queryOptions()
  const search = useQuery({
    ...options,
    queryKey: [...options.queryKey, actor],
    staleTime: 3000
  })

  return (
    <Stack
      aria-label={t('mentionItem')}
      className="rooms-mention-picker"
      gap="xs"
      maxHeight="18rem"
      overflowY="auto"
      p="sm"
      role="region"
    >
      <Flex align="center" gap="sm" justify="between">
        <Text size="sm" weight="medium">
          {t('mentionItem')}
        </Text>
        <Button
          aria-label={t('close')}
          icon="lucide:x"
          variant="plain"
          onClick={onClose}
        />
      </Flex>
      <TextInput
        autoFocus
        icon="lucide:search"
        label="findItem"
        namespace="common.rooms"
        placeholder={t('findItem')}
        value={query}
        variant="plain"
        onChange={setQuery}
        onKeyDown={event => {
          if (event.key === 'Escape') {
            event.preventDefault()
            onClose()
          }

          if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
            event.preventDefault()
            const first = search.data?.[0]

            if (first && !search.isFetching && deferred === query)
              onSelect(first)
          }
        }}
      />
      {search.isFetching && !search.data && (
        <Text color="muted" role="status" size="sm">
          {t('loading')}
        </Text>
      )}
      {search.error && (
        <Text color="dangerous" role="alert" size="sm">
          {search.error.message}
        </Text>
      )}
      {search.data?.map(entity => (
        <Button
          key={entity.key}
          gap="sm"
          justify="start"
          namespace={false}
          px="sm"
          py="sm"
          variant="plain"
          onClick={() => onSelect(entity)}
        >
          <Icon
            color="muted"
            icon={
              entity.kind === 'person'
                ? 'lucide:at-sign'
                : entity.kind === 'redraw'
                  ? 'lucide:pen-tool'
                  : 'lucide:link'
            }
          />
          <Text truncate size="sm">
            {entity.title}
          </Text>
          <Text color="muted" size="sm">
            {entity.kind}
          </Text>
        </Button>
      ))}
      {search.data?.length === 0 && (
        <Text color="muted" size="sm">
          {t('noItems')}
        </Text>
      )}
    </Stack>
  )
}
