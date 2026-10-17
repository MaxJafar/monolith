import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'

import { useAuth } from '@monolith/api'
import { Box, Button, Flex, Stack, Text, TextInput } from '@monolith/ui'

import workspaceAPI from '@/core/utils/workspaceAPI'
import { useWorkspace } from '@/core/workspaces/WorkspaceProvider'

type Results = Awaited<ReturnType<typeof workspaceAPI.search.query.mutate>>
type Progress = Awaited<ReturnType<typeof workspaceAPI.search.index.mutate>>

/** Remounting on account change clears private results before a new session. */
export default function SystemSearchPage() {
  const { userData } = useAuth()

  return userData ? (
    <SearchScreen key={userData.id} actor={userData.id} />
  ) : null
}

function SearchScreen({ actor }: { actor: string }) {
  const { t } = useTranslation('common.systemSearch')
  const { workspaces } = useWorkspace()
  const cache = useQueryClient()
  const [params] = useSearchParams()
  const [workspace, setWorkspace] = useState(
    () => params.get('workspace') ?? ''
  )
  const [module, setModule] = useState('')
  const [query, setQuery] = useState('')
  const [keyword, setKeyword] = useState(false)
  const [generate, setGenerate] = useState(true)
  const [searching, setSearching] = useState(false)
  const [indexing, setIndexing] = useState(false)
  const [results, setResults] = useState<Results>()
  const [progress, setProgress] = useState<Progress>()
  const [error, setError] = useState('')
  const run = useRef(0)
  const stop = useRef(true)

  const scope = {
    workspace_id: workspace || undefined,
    module: module || undefined
  }
  const options = workspaceAPI.search.status.input(scope).queryOptions()
  const status = useQuery({
    ...options,
    queryKey: [...options.queryKey, actor],
    retry: false
  })
  const healthOptions = workspaceAPI.search.host.queryOptions()
  const health = useQuery({
    ...healthOptions,
    queryKey: [...healthOptions.queryKey, actor],
    retry: false,
    staleTime: 30_000
  })
  const modules = [
    'achievements',
    'agents',
    'blog',
    'calendar',
    'code-time',
    'databases',
    'flashcards',
    'gym',
    'idea-box',
    'notes',
    'pomodoro-timer',
    'projects',
    'tech-lab',
    'todo-list',
    'wallet',
    'wishlist'
  ]
  useEffect(
    () => () => {
      run.current++
      stop.current = true
    },
    []
  )

  function changeScope(kind: 'workspace' | 'module', value: string) {
    run.current++
    stop.current = true
    setIndexing(false)
    setSearching(false)
    setResults(undefined)
    setProgress(undefined)
    setError('')
    if (kind === 'workspace') {
      setWorkspace(value)
      setModule('')
    } else setModule(value)
  }

  async function search() {
    if (!query.trim() || searching || indexing) return

    const id = ++run.current
    setSearching(true)
    setError('')
    setResults(undefined)

    try {
      const result = await workspaceAPI.search.query.mutate({
        ...scope,
        query: query.trim(),
        mode: keyword ? 'keyword' : 'hybrid',
        answer: generate
      })

      if (run.current === id) setResults(result)
    } catch (err) {
      if (run.current === id)
        setError(err instanceof Error ? err.message : t('failed'))
    } finally {
      if (run.current === id) setSearching(false)
    }
  }

  async function index() {
    if (indexing || searching) return

    const id = ++run.current
    const canContinue = () => !stop.current && run.current === id

    stop.current = false
    setIndexing(true)
    setError('')

    try {
      while (canContinue()) {
        const batch = await workspaceAPI.search.index.mutate(scope)

        if (run.current !== id) break
        setProgress(batch)
        await cache.invalidateQueries({
          queryKey: workspaceAPI.search.status.key
        })
        if (!batch.pending) break
      }
    } catch (err) {
      if (run.current === id)
        setError(err instanceof Error ? err.message : t('failed'))
    } finally {
      if (run.current === id) {
        stop.current = true
        setIndexing(false)
      }
    }
  }

  async function clearIndex() {
    const id = ++run.current
    setSearching(true)
    setError('')

    try {
      await workspaceAPI.search.clear.mutate({})

      if (run.current === id) {
        setProgress(undefined)
        setResults(undefined)
      }
      await cache.invalidateQueries({
        queryKey: workspaceAPI.search.status.key
      })
    } catch (err) {
      if (run.current === id)
        setError(err instanceof Error ? err.message : t('failed'))
    } finally {
      if (run.current === id) setSearching(false)
    }
  }

  const coverage = progress ?? status.data
  const hostReady = Boolean(health.data?.ready)
  const warnings =
    results?.warnings ?? progress?.warnings ?? status.data?.warnings ?? []

  return (
    <Box
      maxWidth="1000px"
      p={{ base: 'md', md: 'xl' }}
      style={{ marginInline: 'auto' }}
      width="100%"
    >
      <Stack gap="lg">
        <Stack gap="xs">
          <Text as="h1" size="3xl" weight="semibold">
            {t('title')}
          </Text>
          <Text color="muted">{t('subtitle')}</Text>
        </Stack>
        <Flex align="end" gap="md" wrap="wrap">
          <Stack flexGrow="1" gap="xs" width="auto">
            <Text as="label" htmlFor="search-workspace" size="sm">
              {t('scope')}
            </Text>
            <Box
              as="select"
              bg="bg-100"
              id="search-workspace"
              p="sm"
              r="md"
              value={workspace}
              onChange={e => changeScope('workspace', e.target.value)}
            >
              <option value="">{t('allWorkspaces')}</option>
              {workspaces.map(w => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </Box>
          </Stack>
          <Stack flexGrow="1" gap="xs" width="auto">
            <Text as="label" htmlFor="search-module" size="sm">
              {t('module')}
            </Text>
            <Box
              as="select"
              bg="bg-100"
              id="search-module"
              p="sm"
              r="md"
              value={module}
              onChange={e => changeScope('module', e.target.value)}
            >
              <option value="">{t('allModules')}</option>
              {modules.map(m => (
                <option key={m} value={m}>
                  {m.replace(/-/g, ' ')}
                </option>
              ))}
            </Box>
          </Stack>
        </Flex>
        <Box
          as="form"
          onSubmit={e => {
            e.preventDefault()
            void search()
          }}
        >
          <Stack gap="md">
            <TextInput
              icon="lucide:search"
              label={t('queryLabel')}
              namespace={false}
              placeholder={t('placeholder')}
              value={query}
              onChange={value => setQuery(value.slice(0, 800))}
            />
            <Flex align="center" gap="md" wrap="wrap">
              <Button
                disabled={!query.trim() || indexing}
                icon="lucide:search"
                loading={searching}
                namespace={false}
                type="submit"
              >
                {t('search')}
              </Button>
              <Flex align="center" as="label" gap="xs">
                <input
                  checked={keyword}
                  type="checkbox"
                  onChange={e => setKeyword(e.target.checked)}
                />
                {t('keyword')}
              </Flex>
              <Flex align="center" as="label" gap="xs">
                <input
                  checked={generate}
                  type="checkbox"
                  onChange={e => setGenerate(e.target.checked)}
                />
                {t('generate')}
              </Flex>
            </Flex>
          </Stack>
        </Box>
        <Box bg="bg-100" p="md" r="lg">
          <Flex align="center" gap="md" justify="between" wrap="wrap">
            <Stack gap="xs" width="auto">
              <Text weight="medium">
                {coverage
                  ? t('coverage', {
                      ready: coverage.ready,
                      total: coverage.total
                    })
                  : t('loading')}
              </Text>
              <Text color="muted" size="sm">
                {health.isFetching
                  ? t('checkingHost')
                  : hostReady
                    ? t('hostReady')
                    : t('hostOffline')}
              </Text>
              {indexing && progress?.source && (
                <Text aria-live="polite" size="sm">
                  {t('indexing', { source: progress.source })}
                </Text>
              )}
            </Stack>
            <Flex gap="sm" wrap="wrap">
              <Button
                disabled={searching || indexing || !hostReady}
                icon="lucide:database"
                namespace={false}
                variant="secondary"
                onClick={() => void index()}
              >
                {t('index')}
              </Button>
              {indexing && (
                <Button
                  namespace={false}
                  variant="plain"
                  onClick={() => {
                    stop.current = true
                  }}
                >
                  {t('stop')}
                </Button>
              )}
              {!health.data?.ready && (
                <Button
                  namespace={false}
                  variant="plain"
                  onClick={() => void health.refetch()}
                >
                  {t('retryHost')}
                </Button>
              )}
              <Button
                disabled={indexing || searching}
                namespace={false}
                variant="plain"
                onClick={() => void clearIndex()}
              >
                {t('clearIndex')}
              </Button>
            </Flex>
          </Flex>
          <Text as="p" color="muted" mt="sm" size="sm">
            {t('indexHelp')}
          </Text>
        </Box>
        {(error || status.error) && (
          <Text color="red-500" role="alert">
            {error || status.error?.message}
          </Text>
        )}
        {!!warnings.length && (
          <Stack aria-live="polite" gap="xs">
            {[...new Map(warnings.map(w => [w.code + w.source, w])).values()]
              .slice(0, 12)
              .map(w => (
                <Text key={w.code + w.source} color="muted" size="sm">
                  {w.source ? `${w.source}: ` : ''}
                  {t(`warnings.${w.code}`, {
                    defaultValue: t('warnings.general')
                  })}
                </Text>
              ))}
          </Stack>
        )}
        {results && (
          <Stack aria-live="polite" gap="lg">
            {!!results.answer.length && (
              <Box bg="bg-100" p="lg" r="lg">
                <Text as="h2" size="lg" weight="semibold">
                  {t('answer')}
                </Text>
                <Stack gap="md" mt="md">
                  {results.answer.map((statement, i) => (
                    <Box key={i}>
                      <Text overflowWrap="anywhere" whiteSpace="pre-wrap">
                        {statement.text}
                      </Text>{' '}
                      {statement.citations.map(id => (
                        <Text
                          key={id}
                          aria-label={t('citation', { id })}
                          as="a"
                          color="primary"
                          href={`#evidence-${id}`}
                          ml="xs"
                        >
                          [{id}]
                        </Text>
                      ))}
                    </Box>
                  ))}
                </Stack>
                <Text as="p" color="muted" mt="md" size="sm">
                  {t('answerHelp')}
                </Text>
              </Box>
            )}
            <Flex align="center" gap="sm" justify="between" wrap="wrap">
              <Text as="h2" size="lg" weight="semibold">
                {t('evidence', { count: results.hits.length })}
              </Text>
              <Text color="muted" size="sm">
                {results.stages.map(stage => t(`stages.${stage}`)).join(' → ')}
              </Text>
            </Flex>
            {!results.hits.length && <Text color="muted">{t('empty')}</Text>}
            {results.hits.map((hit, i) => (
              <Box
                key={hit.id}
                as="article"
                bg="bg-100"
                id={`evidence-${i + 1}`}
                p="lg"
                r="lg"
              >
                <Stack gap="sm">
                  <Text as={Link} size="lg" to={hit.href} weight="medium">
                    [{i + 1}] {hit.title}
                  </Text>
                  <Text color="muted" size="sm">
                    {hit.module.replace(/-/g, ' ')}
                    {hit.inferred ? ` · ${t('visionLabel')}` : ''}
                    {hit.relevance !== null && hit.confidence !== null
                      ? ` · ${t('relevance', { score: Math.round(hit.relevance * 100), confidence: Math.round(hit.confidence * 100) })}`
                      : ''}
                  </Text>
                  <Text overflowWrap="anywhere" whiteSpace="pre-wrap">
                    {hit.text}
                  </Text>
                  {hit.file_key ? (
                    <Button
                      as="a"
                      href={
                        workspaceAPI.files.get.input({ key: hit.file_key })
                          .endpoint
                      }
                      icon="lucide:arrow-up-right"
                      namespace={false}
                      rel="noopener noreferrer"
                      target="_blank"
                      variant="plain"
                    >
                      {t('open')}
                    </Button>
                  ) : (
                    <Button
                      as={Link}
                      icon="lucide:arrow-up-right"
                      namespace={false}
                      to={hit.href}
                      variant="plain"
                    >
                      {t('open')}
                    </Button>
                  )}
                </Stack>
              </Box>
            ))}
          </Stack>
        )}
      </Stack>
    </Box>
  )
}
