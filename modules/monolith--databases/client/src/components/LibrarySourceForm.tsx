import { useState } from 'react'

import { useModuleTranslation } from '@monolith/localization'
import {
  Box,
  Button,
  Flex,
  Stack,
  Text,
  TextAreaInput,
  TextInput
} from '@monolith/ui'

import { DraftNotice, useDraftGuard } from '@/useDraftGuard'

import {
  type KnowledgeLibrary,
  type KnowledgeSourceInput,
  knowledgeLimits
} from '../../../knowledgeLibraryShared'
import { SelectInput } from './SelectInput'

export function LibrarySourceForm({
  library,
  collectionId,
  busy,
  readOnly = false,
  onSave,
  onCancel
}: {
  library: KnowledgeLibrary
  collectionId: string
  busy: boolean
  readOnly?: boolean
  onSave: (input: KnowledgeSourceInput) => Promise<boolean>
  onCancel: () => void
}) {
  const { t } = useModuleTranslation()

  const defaultCollection = collectionId || library.collections[0]?.id || ''
  const [collection, setCollection] = useState(defaultCollection),
    [mode, setMode] = useState('linked'),
    [source, setSource] = useState(''),
    [title, setTitle] = useState(''),
    [content, setContent] = useState(''),
    [mediaType, setMediaType] = useState<'text/plain' | 'text/markdown'>(
      'text/plain'
    ),
    [reading, setReading] = useState(false),
    [error, setError] = useState('')
  const locked = busy || reading || readOnly
  const { blocker, allowNavigation } = useDraftGuard(
    busy ||
      reading ||
      !!source ||
      !!title ||
      !!content ||
      collection !== defaultCollection
  )
  const valid =
    library.collections.some(item => item.id === collection) &&
    (mode === 'linked'
      ? library.catalog.some(item => `${item.kind}:${item.id}` === source)
      : !!title.trim() &&
        title.trim().length <= 255 &&
        !!content.trim() &&
        content.length <= knowledgeLimits.characters &&
        !content.includes('\0'))

  async function importFile(file?: File) {
    if (!file || locked) return
    setError('')

    if (
      !/\.(txt|md|markdown)$/i.test(file.name) ||
      file.size > knowledgeLimits.characters * 4
    ) {
      setError(
        t('library.fileError', {
          limit: knowledgeLimits.characters.toLocaleString()
        })
      )

      return
    }
    setReading(true)

    try {
      const text = await file.text()

      if (
        !text.trim() ||
        text.length > knowledgeLimits.characters ||
        text.includes('\0')
      )
        throw new Error(
          t('library.fileError', {
            limit: knowledgeLimits.characters.toLocaleString()
          })
        )
      setContent(text)
      setTitle(file.name.replace(/\.(txt|md|markdown)$/i, '').slice(0, 255))
      setMediaType(
        /\.(md|markdown)$/i.test(file.name) ? 'text/markdown' : 'text/plain'
      )
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setReading(false)
    }
  }

  return (
    <Stack
      aria-label={t('library.addSource')}
      as="form"
      gap="md"
      onSubmit={async event => {
        event.preventDefault()
        if (!valid || locked) return
        let input: KnowledgeSourceInput
        if (mode === 'linked') {
          const match = library.catalog.find(
            item => `${item.kind}:${item.id}` === source
          )

          if (!match) return
          input = {
            collection_id: collection,
            kind: match.kind,
            source_id: match.id
          }
        } else
          input = {
            collection_id: collection,
            kind: 'text',
            title: title.trim(),
            content: content.trim(),
            media_type: mediaType
          }
        if (await onSave(input)) allowNavigation()
      }}
    >
      <DraftNotice blocker={blocker} />
      <SelectInput
        disabled={locked}
        label={t('library.collection')}
        options={library.collections.map(item => ({
          value: item.id,
          label: item.name
        }))}
        value={collection}
        onChange={setCollection}
      />
      <SelectInput
        disabled={locked}
        label={t('library.sourceType')}
        options={[
          { value: 'linked', label: t('library.linkExisting') },
          { value: 'text', label: t('library.importText') }
        ]}
        value={mode}
        onChange={setMode}
      />
      {mode === 'linked' ? (
        <Stack gap="sm">
          <SelectInput
            disabled={locked}
            label={t('library.linkedSource')}
            options={[
              { value: '', label: t('library.chooseSource') },
              ...library.catalog.map(item => ({
                value: `${item.kind}:${item.id}`,
                label: `${t(`library.kinds.${item.kind}`)} · ${item.title}`
              }))
            ]}
            value={source}
            onChange={setSource}
          />
          <Text color="muted" size="sm">
            {t('library.liveHelp')}
          </Text>
          {source &&
            !library.catalog.some(
              item => `${item.kind}:${item.id}` === source
            ) && <Text role="status">{t('library.chooseSource')}</Text>}
          {library.catalog_truncated && (
            <Text color="muted" size="sm">
              {t('library.catalogTruncated')}
            </Text>
          )}
        </Stack>
      ) : (
        <Stack gap="md">
          <Box as="label">
            <Text as="span" size="sm">
              {t('library.uploadText')}
            </Text>
            <Box
              accept=".txt,.md,.markdown,text/plain,text/markdown"
              as="input"
              disabled={locked}
              p="sm"
              type="file"
              width="100%"
              onChange={event => {
                void importFile(event.currentTarget.files?.[0])
                event.currentTarget.value = ''
              }}
            />
          </Box>
          <TextInput
            required
            disabled={locked}
            label={t('library.sourceTitle')}
            namespace={false}
            placeholder={t('library.sourceTitle')}
            value={title}
            onChange={setTitle}
          />
          <SelectInput
            disabled={locked}
            label={t('library.format')}
            options={[
              { value: 'text/plain', label: t('library.plainText') },
              { value: 'text/markdown', label: 'Markdown' }
            ]}
            value={mediaType}
            onChange={value => setMediaType(value as typeof mediaType)}
          />
          <TextAreaInput
            required
            className="monolith-library-import"
            disabled={locked}
            label={t('library.sourceContent')}
            namespace={false}
            placeholder={t('library.contentPlaceholder')}
            value={content}
            onChange={setContent}
          />
          <Text color="muted" size="sm">
            {t('library.importLimit', {
              limit: knowledgeLimits.characters.toLocaleString(),
              count: content.length.toLocaleString()
            })}
          </Text>
        </Stack>
      )}
      {error && (
        <Text color="dangerous" role="alert">
          {error}
        </Text>
      )}
      {reading && <Text role="status">{t('library.reading')}</Text>}
      <Flex gap="sm" wrap="wrap">
        <Button
          disabled={!valid || reading || readOnly}
          loading={busy}
          namespace={false}
          type="submit"
        >
          {t('library.addSource')}
        </Button>
        <Button
          disabled={busy || reading}
          namespace={false}
          type="button"
          variant="secondary"
          onClick={() => {
            allowNavigation()
            onCancel()
          }}
        >
          {t('buttons.cancel')}
        </Button>
      </Flex>
    </Stack>
  )
}
