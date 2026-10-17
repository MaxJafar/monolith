import { useAuth } from '@monolith/api'
import {
  Box,
  Button,
  ChoiceSelect,
  Flex,
  Icon,
  Stack,
  Text,
  useModalStore
} from '@monolith/ui'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'

import { useNavigation } from '@/core/routing/components/Sidebar/NavigationProvider'
import { useWorkspaceTabs } from '@/core/routing/components/WorkspaceTabs'
import coreAPI from '@/core/utils/workspaceAPI'
import { useWorkspace } from '@/core/workspaces/WorkspaceProvider'
import { workspaceAPI } from '@/core/workspaces/workspaceAPI'

import { useSettingsOverlay } from './SettingsOverlay'
import './overlays.css'
import { useOverlayFocus } from './useOverlayFocus'

type Hit = {
  id: string
  title: string
  href: string
  text: string
  kind: string
  icon: string
}

export function useSearchOverlay() {
  const { open, stack } = useModalStore()

  return (newTab = false) => {
    if (
      !stack.some(item => item.component === SearchOverlay && !item.isClosing)
    )
      open(SearchOverlay, { newTab })
  }
}

export default function SearchOverlay({
  data: optionsData,
  onClose
}: {
  data: { newTab?: boolean }
  onClose: () => void
}) {
  const { t } = useTranslation('common.workspaceUI')
  const { active } = useWorkspace()
  const { userData } = useAuth()
  const nav = useNavigation()
  const navigate = useNavigate()
  const tabs = useWorkspaceTabs()
  const settings = useSettingsOverlay()
  const ref = useOverlayFocus(onClose)

  const [query, setQuery] = useState(''),
    [kind, setKind] = useState('all'),
    [mode, setMode] = useState<'keyword' | 'hybrid'>('keyword'),
    [selected, setSelected] = useState(0)
  const [remote, setRemote] = useState<Hit[]>([]),
    [pending, setPending] = useState(false),
    [error, setError] = useState('')

  const [debounced, setDebounced] = useState('')

  const options = workspaceAPI.workspaceDatabases.snapshot
    .input({
      workspace_id: active?.id ?? '00000000-0000-4000-8000-000000000000'
    })
    .queryOptions()
  const data = useQuery({
    ...options,
    queryKey: [...options.queryKey, userData?.id],
    enabled: !!active
  })
  useEffect(() => {
    setSelected(0)
    setRemote([])
    setError('')
    setPending(query.trim().length >= 2)
    const timer = setTimeout(() => setDebounced(query.trim()), 220)

    return () => clearTimeout(timer)
  }, [query, active?.id, mode])
  useEffect(() => {
    let cancelled = false
    if (debounced.length < 2 || !active || debounced !== query.trim()) return
    setPending(true)
    void coreAPI.search.query
      .mutate({
        workspace_id: active.id,
        query: debounced,
        mode,
        answer: false
      })
      .then(result => {
        if (!cancelled)
          setRemote(
            result.hits.map(hit => ({
              id: hit.id,
              title: hit.title,
              text: hit.text,
              href: hit.href,
              kind: 'content',
              icon: 'lucide:file-text'
            }))
          )
      })
      .catch(cause => {
        if (!cancelled)
          setError(cause instanceof Error ? cause.message : String(cause))
      })
      .finally(() => {
        if (!cancelled) setPending(false)
      })

    return () => {
      cancelled = true
    }
  }, [debounced, query, active?.id, mode])
  const hits = useMemo(() => {
    const local: Hit[] = [
      ...nav.items
        .filter(item => item.kind === 'page' && !nav.isArchived(item))
        .map(item => ({
          id: item.id,
          title: item.title,
          href: item.href,
          text: t('pagePreview'),
          kind: 'pages',
          icon: item.icon
        })),
      ...(data.data?.records ?? []).map(item => ({
        id: item.id,
        title: item.title,
        href: `/databases?${new URLSearchParams({ workspace: active?.id ?? '', base: item.base_id, record: item.id })}`,
        text:
          item.content?.replace(/<[^>]+>/g, ' ').slice(0, 900) ||
          t('recordPreview'),
        kind:
          item.item_type === 'task'
            ? 'actions'
            : item.item_type === 'project'
              ? 'projects'
              : 'docs',
        icon:
          item.item_type === 'task'
            ? 'lucide:circle-check'
            : item.item_type === 'project'
              ? 'lucide:layers-2'
              : 'lucide:file-text'
      }))
    ].filter(
      hit =>
        hit.title
          .toLocaleLowerCase()
          .includes(query.trim().toLocaleLowerCase()) &&
        (kind === 'all' || kind === hit.kind)
    )
    const seen = new Set(local.map(item => item.href))

    return [
      ...local,
      ...(kind === 'all' || kind === 'content'
        ? remote.filter(
            item =>
              !seen.has(item.href) &&
              !nav.items.some(
                page => nav.isArchived(page) && item.href.includes(page.id)
              )
          )
        : [])
    ].slice(0, 80)
  }, [nav.items, nav.config, data.data, query, kind, remote, active?.id, t])
  const current = hits[Math.min(selected, Math.max(0, hits.length - 1))]
  useEffect(() => {
    ref.current
      ?.querySelector('[role=option][aria-selected=true]')
      ?.scrollIntoView({ block: 'nearest' })
  }, [selected, kind])

  function go(hit: Hit, newTab = optionsData.newTab) {
    onClose()
    if (newTab) tabs.open(hit.href)
    else navigate(hit.href)
  }

  return (
    <Stack
      ref={ref}
      aria-label={t('search')}
      aria-modal="true"
      className="workspace-search"
      data-workspace-overlay="search"
      gap="none"
      role="dialog"
      tabIndex={-1}
      width={undefined}
    >
      <Flex
        align="center"
        className="workspace-search-field"
        gap="md"
        px="lg"
        py="md"
      >
        <Icon color="muted" icon="lucide:search" size="22px" />
        <Box
          data-autofocus
          aria-activedescendant={
            current ? `search-hit-${hits.indexOf(current)}` : undefined
          }
          aria-autocomplete="list"
          aria-controls="workspace-search-results"
          aria-expanded="true"
          aria-label={t('search')}
          as="input"
          className="workspace-search-input"
          placeholder={t('searchPlaceholder', {
            name: active?.name ?? 'monolith'
          })}
          role="combobox"
          value={query}
          onChange={e => setQuery(e.target.value.slice(0, 800))}
          onKeyDown={event => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault()
              setSelected(value =>
                Math.max(
                  0,
                  Math.min(
                    hits.length - 1,
                    value + (event.key === 'ArrowDown' ? 1 : -1)
                  )
                )
              )
            } else if (event.key === 'Enter' && current) {
              event.preventDefault()
              go(current, optionsData.newTab || event.metaKey || event.ctrlKey)
            }
          }}
        />
        <Button
          aria-label={t('close')}
          icon="lucide:x"
          namespace={false}
          variant="plain"
          onClick={onClose}
        />
      </Flex>
      <Flex
        className="workspace-search-filters"
        gap="sm"
        pb="md"
        px="lg"
        wrap="wrap"
      >
        {['all', 'pages', 'actions', 'projects', 'docs', 'content'].map(id => (
          <Button
            key={id}
            aria-pressed={kind === id}
            className="workspace-filter-chip"
            namespace={false}
            variant="plain"
            onClick={() => {
              setKind(id)
              setSelected(0)
            }}
          >
            {t(id)}
          </Button>
        ))}
        <ChoiceSelect
          label={t('searchMode')}
          value={mode}
          onChange={value => setMode(value as typeof mode)}
          options={[
            { value: 'keyword', label: t('keyword') },
            { value: 'hybrid', label: t('contextual') }
          ]}
        />
      </Flex>
      <Flex className="workspace-search-body" flex="1" minHeight="0">
        <Stack
          className="workspace-search-results"
          flex="1"
          gap="xs"
          minWidth="0"
          p="md"
          width="0"
        >
          <Text color="muted" pb="xs" px="sm" role="status" size="xs">
            {pending
              ? t('searching')
              : query
                ? t('resultCount', { count: hits.length })
                : t('workspacePages')}
          </Text>
          <Stack
            aria-label={t('results')}
            gap="xs"
            id="workspace-search-results"
            role="listbox"
          >
            {hits.map((hit, index) => (
              <Box
                key={`${hit.id}:${index}`}
                aria-selected={hit === current}
                as="button"
                className="workspace-search-hit"
                id={`search-hit-${index}`}
                role="option"
                type="button"
                onClick={() => go(hit)}
                onFocus={() => setSelected(index)}
                onMouseEnter={() => setSelected(index)}
              >
                <Icon icon={hit.icon} size="17px" />
                <Text truncate>{hit.title}</Text>
                <Text color="muted" size="xs">
                  {t(hit.kind)}
                </Text>
              </Box>
            ))}
          </Stack>
          {!hits.length && (
            <Stack className="workspace-empty" gap="sm" p="lg">
              <Text weight="medium">{t('noResults')}</Text>
              <Text color="muted" size="sm">
                {t('searchHint')}
              </Text>
            </Stack>
          )}
          {(error || data.error) && (
            <Text color="dangerous" role="alert" size="sm">
              {error || data.error?.message}
            </Text>
          )}
        </Stack>
        <Stack
          aria-label={t('preview')}
          as="aside"
          className="workspace-search-preview"
          gap="md"
          p="lg"
          width={undefined}
        >
          {current ? (
            <>
              <Flex
                align="center"
                className="workspace-preview-cover"
                justify="center"
              >
                <Icon icon={current.icon} size="42px" />
              </Flex>
              <Text as="h2" size="xl" weight="semibold">
                {current.title}
              </Text>
              <Text color="muted" size="xs">
                {t(current.kind)} · {active?.name}
              </Text>
              <Text
                className="workspace-preview-text"
                color="muted"
                size="sm"
                whiteSpace="pre-wrap"
              >
                {current.text}
              </Text>
              <Button
                icon="lucide:arrow-up-right"
                namespace={false}
                variant="secondary"
                onClick={() => go(current)}
              >
                {t('open')}
              </Button>
            </>
          ) : (
            <Text color="muted">{t('previewHelp')}</Text>
          )}
        </Stack>
      </Flex>
      <Flex
        align="center"
        className="workspace-search-footer"
        gap="sm"
        justify="between"
        px="lg"
        py="sm"
      >
        <Text color="muted" size="xs">
          {t('searchShortcuts')}
        </Text>
        <Button
          aria-label={t('searchSettings')}
          icon="lucide:sliders-horizontal"
          namespace={false}
          variant="plain"
          onClick={() => settings('search')}
        />
      </Flex>
    </Stack>
  )
}
