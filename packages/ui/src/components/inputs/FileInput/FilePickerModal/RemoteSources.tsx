// SPDX-License-Identifier: 0BSD
import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useAPIEndpoint } from '@monolith/api'

import { LoadingScreen } from '@/components/feedback'
import {
  Button,
  ListboxInput,
  ListboxOption,
  SearchInput,
  Switch,
  TextAreaInput
} from '@/components/inputs'
import { Pagination } from '@/components/navigation'
import { Flex, Stack, Text } from '@/components/primitives'
import { workspaceAPI } from '@/utils/workspaceAPI'

import { type FileSelection, remoteFileURL } from '../model'

const categories = [
  'animals',
  'backgrounds',
  'buildings',
  'business',
  'computer',
  'education',
  'fashion',
  'feelings',
  'food',
  'health',
  'industry',
  'music',
  'nature',
  'people',
  'places',
  'religion',
  'science',
  'sports',
  'transportation',
  'travel'
] as const
const colors = [
  'black',
  'blue',
  'brown',
  'gray',
  'grayscale',
  'green',
  'lilac',
  'orange',
  'pink',
  'red',
  'transparent',
  'turquoise',
  'white',
  'yellow'
] as const
const kinds = ['all', 'photo', 'illustration', 'vector'] as const
type Filters = {
  type: (typeof kinds)[number]
  category?: (typeof categories)[number]
  colors?: (typeof colors)[number]
  editors_choice: 'true' | 'false'
}
const defaults: Filters = { type: 'all', editors_choice: 'false' }

export function PixabaySource({
  selected,
  onSelect
}: {
  selected: FileSelection | null
  onSelect: (value: FileSelection | null) => void
}) {
  const host = useAPIEndpoint(),
    { t } = useTranslation('common.modals')
  const keys = useQuery(
    workspaceAPI.checkAPIKeys({ keys: 'pixabay' }).setHost(host).queryOptions()
  )
  const [draft, setDraft] = useState(''),
    [filters, setFilters] = useState<Filters>(defaults),
    [request, setRequest] = useState({ q: '', page: '1', ...defaults }),
    [expanded, setExpanded] = useState(false)
  const images = useQuery({
    ...workspaceAPI.pixabay.searchImages
      .setHost(host)
      .input(request)
      .queryOptions(),
    enabled: !!keys.data && !!request.q
  })
  if (keys.isPending) return <LoadingScreen />
  if (keys.isError)
    return (
      <Stack gap="sm">
        <Text role="alert">{t('imagePicker.serviceError')}</Text>
        <Button
          onClick={async () => {
            await keys.refetch()
          }}
        >
          retry
        </Button>
      </Stack>
    )
  if (!keys.data)
    return (
      <Text color="muted">{t('imagePicker.empty.noAPIKey.description')}</Text>
    )
  const search = () => {
    if (draft.trim()) {
      setRequest({ q: draft.trim(), page: '1', ...filters })
      onSelect(null)
    }
  }
  return (
    <Stack gap="md">
      <SearchInput
        namespace="common.modals"
        searchTarget="imagePicker.items.pixabay"
        value={draft}
        onChange={setDraft}
        onEnter={search}
      />
      <Flex gap="sm">
        <Button disabled={!draft.trim()} onClick={search}>
          search
        </Button>
        <Button
          namespace="common.modals"
          variant="plain"
          icon="tabler:filter"
          aria-expanded={expanded}
          onClick={() => setExpanded(value => !value)}
        >
          searchFilters
        </Button>
      </Flex>
      {expanded && (
        <Stack gap="sm">
          <ListboxInput
            namespace="common.modals"
            label="imagePicker.inputs.imageType"
            value={filters.type}
            renderContent={value => t('imagePicker.imageType.' + value)}
            onChange={type => setFilters(value => ({ ...value, type }))}
          >
            {kinds.map(kind => (
              <ListboxOption
                key={kind}
                value={kind}
                label={t('imagePicker.imageType.' + kind)}
              />
            ))}
          </ListboxInput>
          <ListboxInput
            namespace="common.modals"
            label="imagePicker.inputs.imageCategory"
            value={filters.category ?? ''}
            renderContent={value => value || t('imagePicker.imageType.all')}
            onChange={category =>
              setFilters(value => ({
                ...value,
                category: categories.find(item => item === category)
              }))
            }
          >
            <ListboxOption value="" label={t('imagePicker.imageType.all')} />
            {categories.map(category => (
              <ListboxOption key={category} value={category} label={category} />
            ))}
          </ListboxInput>
          <ListboxInput
            namespace="common.modals"
            label="imagePicker.inputs.imageColor"
            value={filters.colors ?? ''}
            renderContent={value => value || t('imagePicker.imageType.all')}
            onChange={selectedColor =>
              setFilters(value => ({
                ...value,
                colors: colors.find(item => item === selectedColor)
              }))
            }
          >
            <ListboxOption value="" label={t('imagePicker.imageType.all')} />
            {colors.map(color => (
              <ListboxOption key={color} value={color} label={color} />
            ))}
          </ListboxInput>
          <Flex align="center" justify="between">
            <Text size="sm">{t('imagePicker.inputs.editorsChoice')}</Text>
            <Switch
              aria-label={t('imagePicker.inputs.editorsChoice')}
              value={filters.editors_choice === 'true'}
              onChange={checked =>
                setFilters(value => ({
                  ...value,
                  editors_choice: checked ? 'true' : 'false'
                }))
              }
            />
          </Flex>
        </Stack>
      )}
      {request.q && images.isPending ? (
        <LoadingScreen />
      ) : images.isError ? (
        <Stack gap="sm">
          <Text role="alert" color="dangerous">
            {t('imagePicker.serviceError')}
          </Text>
          <Button
            onClick={async () => {
              await images.refetch()
            }}
          >
            retry
          </Button>
        </Stack>
      ) : images.data ? (
        <>
          <div className="monolith-file-results">
            {images.data.hits.map(image => (
              <button
                type="button"
                key={image.id}
                aria-label={t('imagePicker.result', { id: image.id })}
                aria-pressed={selected?.file === image.imageURL}
                onClick={() => {
                  const file = remoteFileURL(image.imageURL),
                    preview = remoteFileURL(image.thumbnail.url)
                  if (file) onSelect({ file, preview: preview ?? null })
                }}
              >
                <img
                  loading="lazy"
                  alt=""
                  src={remoteFileURL(image.thumbnail.url)}
                  referrerPolicy="no-referrer"
                />
              </button>
            ))}
          </div>
          {!images.data.hits.length && (
            <Text color="muted">
              {t('imagePicker.empty.result.description')}
            </Text>
          )}
          <Pagination
            page={Number(request.page)}
            totalPages={Math.ceil(images.data.total / 20)}
            onPageChange={page => {
              setRequest(value => ({ ...value, page: String(page) }))
              onSelect(null)
            }}
          />
        </>
      ) : null}
      <Text
        as="a"
        href="https://pixabay.com/service/license-summary/"
        target="_blank"
        rel="noreferrer"
        size="xs"
        color="muted"
      >
        Pixabay
      </Text>
    </Stack>
  )
}

export function GeneratedSource({
  defaultPrompt,
  onSelect
}: {
  defaultPrompt: string
  onSelect: (value: FileSelection | null) => void
}) {
  const host = useAPIEndpoint(),
    { t } = useTranslation('common.modals')
  const [prompt, setPrompt] = useState(defaultPrompt)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  const keys = useQuery(
    workspaceAPI.checkAPIKeys({ keys: 'openai' }).setHost(host).queryOptions()
  )
  const generation = useMutation({
    mutationFn: () =>
      workspaceAPI.ai.imageGeneration.generateImage
        .setHost(host)
        .mutate({ prompt: prompt.trim() }),
    onSuccess: result => {
      if (mounted.current) onSelect({ file: result, preview: result })
    }
  })
  if (keys.isPending) return <LoadingScreen />
  if (keys.isError)
    return (
      <Stack gap="sm">
        <Text role="alert">{t('imagePicker.serviceError')}</Text>
        <Button
          onClick={async () => {
            await keys.refetch()
          }}
        >
          retry
        </Button>
      </Stack>
    )
  if (!keys.data)
    return (
      <Text color="muted">
        {t('imagePicker.empty.noOpenAIKey.description')}
      </Text>
    )
  return (
    <Stack gap="sm">
      <TextAreaInput
        namespace="common.modals"
        label="imagePicker.inputs.prompt"
        value={prompt}
        onChange={setPrompt}
        disabled={generation.isPending}
        placeholder={t('imagePicker.promptHint')}
      />
      <Button
        disabled={!prompt.trim()}
        loading={generation.isPending}
        icon="tabler:sparkles"
        onClick={() => generation.mutate()}
      >
        generate
      </Button>
      {generation.isError && (
        <Text role="alert" color="dangerous">
          {t('imagePicker.serviceError')}
        </Text>
      )}
    </Stack>
  )
}
