import { useState } from 'react'
import { Link } from 'react-router'

import { useModuleTranslation } from '@lifeforge/localization'
import { Button, Flex, Stack, Text, TextInput } from '@lifeforge/ui'

import { forgeAPI } from '@/manifest'

import type { KnowledgeSearch } from '../../../knowledgeLibraryShared'

export function LibrarySearch({
  workspace,
  collectionId,
  disabled
}: {
  workspace: string
  collectionId: string
  disabled: boolean
}) {
  const { t } = useModuleTranslation()

  const [question, setQuestion] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [result, setResult] = useState<KnowledgeSearch | null>(null)

  async function search() {
    if (busy || disabled || !question.trim() || question.trim().length > 1000)
      return
    setBusy(true)
    setError('')
    setResult(null)

    try {
      setResult(
        await forgeAPI.knowledgeLibrary.search
          .input({ workspace_id: workspace })
          .mutate({
            query: question.trim(),
            ...(collectionId ? { collection_ids: [collectionId] } : {}),
            limit: 8
          })
      )
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Stack gap="md" minWidth="0">
      <Stack
        aria-label={t('library.search')}
        as="form"
        gap="sm"
        onSubmit={event => {
          event.preventDefault()
          void search()
        }}
      >
        <TextInput
          disabled={busy || disabled}
          icon="tabler:search"
          label={t('library.searchLabel')}
          namespace={false}
          placeholder={t('library.searchPlaceholder')}
          value={question}
          onChange={setQuestion}
        />
        <Flex align="center" gap="md" wrap="wrap">
          <Button
            disabled={
              disabled || !question.trim() || question.trim().length > 1000
            }
            loading={busy}
            namespace={false}
            type="submit"
          >
            {t('library.search')}
          </Button>
          <Text color="muted" size="sm">
            {t('library.engine')}
          </Text>
        </Flex>
      </Stack>
      {error && (
        <Text color="dangerous" role="alert">
          {error}
        </Text>
      )}
      {result && (
        <Stack aria-live="polite" gap="md" minWidth="0">
          <Text className="monolith-library-wrap" color="muted" size="sm">
            {t('library.coverage', {
              query: result.query,
              count: result.searched_sources,
              chunks: result.total_chunks
            })}
          </Text>
          {!result.citations.length ? (
            <Text role="status">{t('library.noMatches')}</Text>
          ) : (
            <>
              <Text as="h3" weight="semibold">
                {t('library.evidence')}
              </Text>
              {result.citations.map((citation, index) => (
                <Stack
                  key={citation.id}
                  as="article"
                  bg={{ base: 'bg-100', dark: 'bg-900' }}
                  gap="sm"
                  minWidth="0"
                  p="md"
                  r="md"
                >
                  <Flex align="center" gap="sm" justify="between" wrap="wrap">
                    <Text className="monolith-library-wrap" weight="medium">
                      [{index + 1}] {citation.title}
                    </Text>
                    {citation.href && (
                      <Button
                        as={Link}
                        icon="tabler:arrow-up-right"
                        namespace={false}
                        to={citation.href}
                        variant="plain"
                      >
                        {t('library.openSource')}
                      </Button>
                    )}
                  </Flex>
                  <Text color="muted" size="sm">
                    {t(`library.kinds.${citation.kind}`)} ·{' '}
                    {t('library.chunk', { number: citation.chunk_index + 1 })}
                  </Text>
                  <Text className="monolith-library-excerpt">
                    {citation.text}
                  </Text>
                </Stack>
              ))}
            </>
          )}
        </Stack>
      )}
    </Stack>
  )
}
