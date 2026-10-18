import { useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useRef, useState } from 'react'

import { useModuleTranslation } from '@monolith/localization'
import {
  Bordered,
  Box,
  Button,
  Flex,
  Grid,
  Icon,
  Stack,
  Text,
  TextInput
} from '@monolith/ui'

import { importWorkflow, templateGraph } from '../../import'
import type { Workflow } from '../../shared'
import { workspaceAPI } from '../manifest'

export function Dashboard({
  workflows,
  workspace,
  open,
  readOnly
}: {
  workflows: Workflow[]
  workspace: string
  open: (id: string) => void
  readOnly: boolean
}) {
  const { t } = useModuleTranslation(),
    cache = useQueryClient(),
    file = useRef<HTMLInputElement>(null)
  const [search, setSearch] = useState(''),
    [filter, setFilter] = useState('all'),
    [pending, setPending] = useState(false),
    [error, setError] = useState('')
  const locked = useRef(false)
  async function remove(flow: Workflow) {
    if (
      locked.current ||
      readOnly ||
      !window.confirm(t('deleteConfirm', { name: flow.title }))
    )
      return
    locked.current = true
    setPending(true)
    setError('')
    try {
      await workspaceAPI.flows.remove
        .input({ workspace_id: workspace, id: flow.id })
        .mutate({ expected_revision: flow.revision })
      await cache.invalidateQueries({ queryKey: workspaceAPI.flows.list.key })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      locked.current = false
      setPending(false)
    }
  }
  async function create(kind: 'starter' | 'branch' | 'request', text?: string) {
    if (locked.current || readOnly) return
    locked.current = true
    setPending(true)
    setError('')
    try {
      const draft = text
        ? importWorkflow(text)
        : {
            title: t(`templates.${kind}.name`),
            description: t(`templates.${kind}.description`),
            graph: templateGraph(kind),
            interval_minutes: 0
          }
      const result = await workspaceAPI.flows.create
        .input({ workspace_id: workspace })
        .mutate(draft)
      void cache.invalidateQueries({ queryKey: workspaceAPI.flows.list.key })
      open(result.id)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      locked.current = false
      setPending(false)
    }
  }
  const filtered = workflows.filter(
    w =>
      (filter === 'all' || (filter === 'active' ? w.enabled : !w.enabled)) &&
      `${w.title} ${w.description}`
        .toLocaleLowerCase()
        .includes(search.trim().toLocaleLowerCase())
  )
  return (
    <Stack
      className="automations"
      p={{ base: 'md', md: 'xl' }}
      gap="lg"
      maxWidth="1440px"
      width="100%"
    >
      <Flex align="start" justify="between" wrap="wrap" gap="md">
        <Stack gap="sm" width="auto">
          <Flex gap="sm" align="center">
            <Icon icon="lucide:workflow" size="1.7em" />
            <Text as="h1" size="2xl" weight="semibold">
              {t('title')}
            </Text>
          </Flex>
          <Text color="muted">{t('description')}</Text>
        </Stack>
        <Flex gap="sm">
          <Button
            variant="secondary"
            icon="lucide:upload"
            disabled={readOnly || pending}
            onClick={() => file.current?.click()}
          >
            import
          </Button>
          <Button
            icon="lucide:plus"
            disabled={readOnly || pending}
            loading={pending}
            onClick={() => void create('starter')}
          >
            newWorkflow
          </Button>
        </Flex>
      </Flex>
      <input
        ref={file}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={event => {
          const selected = event.target.files?.[0]
          event.target.value = ''
          if (!selected) return
          if (selected.size > 500000) {
            setError(t('fileTooLarge'))
            return
          }
          void selected
            .text()
            .then(text => create('starter', text))
            .catch(cause => setError(String(cause)))
        }}
      />
      {error && (
        <Text color="dangerous" role="alert">
          {error}
        </Text>
      )}
      <Grid templateCols={{ base: 1, md: 3 }} gap="md">
        {(['starter', 'branch', 'request'] as const).map((kind, index) => (
          <Bordered key={kind} p="lg" r="lg" className="automation-template">
            <Stack gap="md">
              <Flex justify="between" align="center">
                <Icon
                  icon={
                    ['lucide:zap', 'lucide:git-branch', 'lucide:globe'][index]!
                  }
                  size="1.5em"
                />
                <Text size="sm" color="muted">
                  0{index + 1}
                </Text>
              </Flex>
              <Text weight="semibold">{t(`templates.${kind}.name`)}</Text>
              <Text color="muted" size="sm">
                {t(`templates.${kind}.description`)}
              </Text>
              <Button
                variant="plain"
                icon="lucide:arrow-up-right"
                justify="start"
                disabled={readOnly || pending}
                onClick={() => void create(kind)}
              >
                useTemplate
              </Button>
            </Stack>
          </Bordered>
        ))}
      </Grid>
      <Flex align="center" justify="between" wrap="wrap" gap="md">
        <Flex gap="xs">
          {['all', 'active', 'paused'].map(value => (
            <Button
              key={value}
              variant={filter === value ? 'secondary' : 'plain'}
              namespace={false}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {t(value)}
              <Text color="muted" size="sm">
                {
                  workflows.filter(
                    w =>
                      value === 'all' ||
                      (value === 'active' ? w.enabled : !w.enabled)
                  ).length
                }
              </Text>
            </Button>
          ))}
        </Flex>
        <Box width={{ base: '100%', md: '18rem' }}>
          <TextInput
            placeholder=""
            icon="lucide:search"
            label="search"
            value={search}
            onChange={setSearch}
          />
        </Box>
      </Flex>
      <Stack gap="none" className="automation-flow-list">
        {filtered.map(flow => (
          <Flex key={flow.id} align="center" className="automation-flow-entry">
            <Flex
              as="button"
              type="button"
              className="automation-flow-row"
              width="100%"
              p="md"
              align="center"
              gap="md"
              onClick={() => open(flow.id)}
            >
              <Icon icon="lucide:workflow" />
              <Stack gap="xs" flex="1" minWidth="0">
                <Text weight="medium" truncate>
                  {flow.title}
                </Text>
                <Text color="muted" size="sm" truncate>
                  {flow.description ||
                    `${flow.graph.nodes.length} ${t('steps')}`}
                </Text>
              </Stack>
              <Text color="muted" size="sm" className="automation-status">
                {t(flow.enabled ? 'active' : 'paused')}
              </Text>
              <Text
                color="muted"
                size="sm"
                display={{ base: 'none', md: 'block' }}
              >
                {dayjs(flow.updated).format('MMM D')}
              </Text>
              <Icon icon="lucide:chevron-right" />
            </Flex>
            <Button
              variant="plain"
              icon="lucide:trash-2"
              disabled={readOnly || pending}
              aria-label={t('deleteWorkflow', { name: flow.title })}
              onClick={() => void remove(flow)}
            />
          </Flex>
        ))}
        {!filtered.length && (
          <Stack p="2xl" align="center" gap="md">
            <Icon icon="lucide:workflow" size="2.5em" />
            <Text weight="medium">
              {t(workflows.length ? 'noMatches' : 'emptyTitle')}
            </Text>
            <Text color="muted" align="center">
              {t(workflows.length ? 'adjustFilters' : 'emptyDescription')}
            </Text>
            {workflows.length > 0 && (
              <Button
                variant="secondary"
                onClick={() => {
                  setSearch('')
                  setFilter('all')
                }}
              >
                clearFilters
              </Button>
            )}
          </Stack>
        )}
      </Stack>
    </Stack>
  )
}
