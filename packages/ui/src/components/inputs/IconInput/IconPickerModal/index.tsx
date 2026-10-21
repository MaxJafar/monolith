// SPDX-License-Identifier: 0BSD
import { useId, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { LoadingScreen } from '@/components/feedback'
import {
  Button,
  ComboboxInput,
  ComboboxOption,
  SearchInput
} from '@/components/inputs'
import { VirtualGrid } from '@/components/layout'
import { ModalHeader } from '@/components/overlays'
import { Box, Flex, Icon, Stack, Text } from '@/components/primitives'

import { attributionLink, collectionList, iconCollections } from './catalog'
import { useIconResults } from './useIconResults'

export function IconPickerModal({
  data,
  onClose
}: {
  data: { setSelectedIcon: (icon: string) => void }
  onClose: () => void
}) {
  const titleId = useId()
  const { t } = useTranslation('common.modals')
  const [prefix, setPrefix] = useState('lucide')
  const [collectionQuery, setCollectionQuery] = useState('')
  const [query, setQuery] = useState('')
  const results = useIconResults(prefix, query)
  const visibleCollections = useMemo(
    () =>
      collectionList.filter(([id, info]) =>
        (id + ' ' + info.name)
          .toLowerCase()
          .includes(collectionQuery.toLowerCase())
      ),
    [collectionQuery]
  )
  const attribution = useMemo(
    () =>
      [...new Set(results.icons.map(icon => icon.split(':')[0]))]
        .map(id => iconCollections[id])
        .filter(Boolean),
    [results.icons]
  )
  return (
    <Stack
      role="dialog"
      aria-labelledby={titleId}
      className="monolith-form-dialog"
      width="580px"
      maxWidth="100%"
      gap="md"
    >
      <ModalHeader
        titleId={titleId}
        title="iconPicker.title"
        icon="tabler:icons"
        onClose={onClose}
        subtitle={
          <a href="https://iconify.design" target="_blank" rel="noreferrer">
            Iconify
          </a>
        }
      />
      <ComboboxInput
        value={prefix}
        onChange={value => setPrefix(value ?? '')}
        displayValue={value =>
          value
            ? (iconCollections[value]?.name ?? value)
            : t('iconPicker.allCollections')
        }
        label="iconPicker.items.iconSet"
        namespace="common.modals"
        icon="tabler:stack"
        onQueryChanged={setCollectionQuery}
      >
        <ComboboxOption value="" label={t('iconPicker.allCollections')} />
        {visibleCollections.map(([id, info]) => (
          <ComboboxOption key={id} value={id} label={info.name} />
        ))}
      </ComboboxInput>
      <SearchInput
        namespace="common.modals"
        searchTarget="iconPicker.items.icon"
        value={query}
        onChange={setQuery}
        debounceMs={250}
      />
      <Box
        height="min(360px, 42vh)"
        minHeight="180px"
        aria-busy={results.loading}
      >
        {results.loading && !results.icons.length ? (
          <LoadingScreen />
        ) : !results.icons.length && !results.error ? (
          <Text color="muted">{t('iconPicker.empty.icon.description')}</Text>
        ) : (
          <VirtualGrid
            items={results.icons}
            getItemKey={value => value}
            itemMinWidth={60}
            defaultRowHeight={62}
            renderItem={icon => (
              <Button
                namespace={false}
                variant="plain"
                aria-label={icon}
                title={icon}
                width="100%"
                height="44px"
                onClick={() => {
                  data.setSelectedIcon(icon)
                  onClose()
                }}
              >
                <Icon icon={icon} size="24px" />
              </Button>
            )}
          />
        )}
      </Box>
      {results.error && (
        <Flex align="center" gap="sm">
          <Text color="dangerous" role="alert">
            {t('iconPicker.loadError')}
          </Text>
          <Button variant="plain" onClick={results.retry}>
            retry
          </Button>
        </Flex>
      )}
      {results.more && (
        <Button
          variant="secondary"
          namespace="common.modals"
          loading={results.loading}
          onClick={results.loadMore}
        >
          iconPicker.more
        </Button>
      )}
      <Box maxHeight="72px" overflowY="auto">
        {attribution.map(info => (
          <Text as="div" size="xs" color="muted" key={info.name}>
            {info.name}
            {' · '}
            <a
              href={attributionLink(info.author?.url)}
              target="_blank"
              rel="noreferrer"
            >
              {info.author?.name}
            </a>
            {' · '}
            <a
              href={attributionLink(info.license?.url)}
              target="_blank"
              rel="noreferrer"
            >
              {info.license?.title}
            </a>
          </Text>
        ))}
      </Box>
    </Stack>
  )
}
