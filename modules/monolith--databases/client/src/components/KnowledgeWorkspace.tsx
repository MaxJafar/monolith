import { useDeferredValue, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'

import { type GraphNode, localGraph } from '@monolith/blocks'
import { useModuleTranslation } from '@monolith/localization'
import {
  Box,
  Button,
  Card,
  Checkbox,
  Flex,
  KnowledgeGraph,
  Stack,
  Text,
  TextInput
} from '@monolith/ui'

import { useDatabases } from '@/DatabaseProvider'

import { PageConnections } from './PageConnections'
import { SelectInput } from './SelectInput'

export function KnowledgeWorkspace() {
  const {
    api: workspaceAPI,
    knowledge,
    knowledgeLoading,
    openPage,
    run,
    busy
  } = useDatabases()
  const { t } = useModuleTranslation()
  const [params, setParams] = useSearchParams()

  const focus = params.get('focus') ?? ''
  const local = !!focus && params.get('scope') !== 'global'
  const localFocus = local ? focus : ''

  const [search, setSearch] = useState('')
  const [kind, setKind] = useState('all')
  const [orphans, setOrphans] = useState(true)
  const [depth, setDepth] = useState('1')
  const [target, setTarget] = useState('')
  const [label, setLabel] = useState('')
  const deferred = useDeferredValue(search)

  const selected = knowledge.nodes.find(node => node.key === focus)
  const graph = useMemo(() => {
    const source = localFocus
      ? localGraph(knowledge, localFocus, Number(depth))
      : knowledge
    const connected = new Set(
      source.edges.flatMap(edge => [edge.source, edge.target])
    )
    const nodes = source.nodes.filter(
      node =>
        (kind === 'all' || node.kind === kind) &&
        `${node.title} ${node.context ?? ''}`
          .toLocaleLowerCase()
          .includes(deferred.toLocaleLowerCase()) &&
        (orphans || connected.has(node.key))
    )
    const keys = new Set(nodes.map(node => node.key))

    return {
      ...source,
      nodes,
      edges: source.edges.filter(
        edge => keys.has(edge.source) && keys.has(edge.target)
      )
    }
  }, [knowledge, localFocus, depth, kind, deferred, orphans])

  function select(key: string) {
    setParams({
      section: 'graph',
      ...(params.get('workspace')
        ? { workspace: params.get('workspace')! }
        : {}),
      focus: key,
      ...(!local ? { scope: 'global' } : {})
    })
    setTarget('')
  }

  async function relate() {
    const other = knowledge.nodes.find(node => node.key === target)

    if (!selected || !other) return

    const result = await run(async () => {
      await workspaceAPI.knowledge.relate.mutate({
        source: { kind: selected.kind, id: selected.id },
        target: { kind: other.kind, id: other.id },
        label: label.trim() || t('connections.defaultLabel')
      })

      return true
    })

    if (result) {
      setTarget('')
      setLabel('')
    }
  }

  const related = knowledge.edges.filter(
    edge =>
      edge.kind === 'related' &&
      (edge.source === focus || edge.target === focus)
  )

  return (
    <Stack className="zillion-workspace-enter" gap="lg">
      <Flex align="end" gap="md" wrap="wrap">
        <Box flex="1" minWidth="12rem">
          <TextInput
            icon="tabler:search"
            label={t('map.search')}
            namespace={false}
            placeholder={t('map.search')}
            value={search}
            onChange={setSearch}
          />
        </Box>
        <Box flexShrink="0" width={{ base: '100%', md: '14rem' }}>
          <SelectInput
            label={t('map.kind')}
            options={['all', 'document', 'record', 'note'].map(value => ({
              value,
              label: t(`map.kinds.${value}`)
            }))}
            value={kind}
            onChange={setKind}
          />
        </Box>
        <Checkbox
          checked={orphans}
          label={t('map.orphans')}
          onCheckedChange={setOrphans}
        />
        {local && (
          <>
            <SelectInput
              label={t('map.depth')}
              options={['1', '2', '3'].map(value => ({ value, label: value }))}
              value={depth}
              onChange={setDepth}
            />
            <Button
              namespace={false}
              variant="secondary"
              onClick={() => setParams({ section: 'graph' })}
            >
              {t('map.global')}
            </Button>
          </>
        )}
        {focus && !local && (
          <Button
            namespace={false}
            variant="secondary"
            onClick={() => setParams({ section: 'graph', focus })}
          >
            {t('connections.localMap')}
          </Button>
        )}
      </Flex>
      <Flex gap="sm" wrap="wrap">
        <Text color="primary">● {t('map.kinds.document')}</Text>
        <Text color="blue-500">● {t('map.kinds.record')}</Text>
        <Text color="green-500">● {t('map.kinds.note')}</Text>
      </Flex>
      {knowledgeLoading ? (
        <Text role="status">{t('loading')}</Text>
      ) : (
        <Flex
          align="start"
          direction={{ base: 'column', xl: 'row' }}
          gap="lg"
          minWidth="0"
        >
          <Stack flex="1" gap="md" minWidth="0" width="100%">
            <KnowledgeGraph
              graph={graph}
              selected={focus}
              onOpen={openPage}
              onSelect={select}
            />
            {knowledge.unresolved > 0 && (
              <Text color="muted" size="sm">
                {t('map.unresolved', { count: knowledge.unresolved })}
              </Text>
            )}
            <Card>
              <Stack gap="sm">
                <Text weight="semibold">{t('map.pages')}</Text>
                <Flex gap="xs" wrap="wrap">
                  {graph.nodes.map(node => (
                    <Button
                      key={node.key}
                      namespace={false}
                      variant={focus === node.key ? 'secondary' : 'plain'}
                      onClick={() => select(node.key)}
                    >
                      {node.title}
                    </Button>
                  ))}
                </Flex>
              </Stack>
            </Card>
          </Stack>
          <Stack flexShrink="0" gap="md" width={{ base: '100%', xl: '23rem' }}>
            {selected ? (
              <>
                <Card>
                  <Stack gap="md">
                    <Text color="muted" size="sm">
                      {t(`map.kinds.${selected.kind}`)} · {selected.context}
                    </Text>
                    <Text as="h2" size="xl" weight="semibold">
                      {selected.title}
                    </Text>
                    <Text as="p" color="muted">
                      {selected.excerpt}
                    </Text>
                    <Button
                      icon="tabler:arrow-up-right"
                      namespace={false}
                      onClick={() => openPage(selected)}
                    >
                      {t('map.open')}
                    </Button>
                  </Stack>
                </Card>
                <PageConnections pageKey={selected.key} />
                <Card>
                  <Stack gap="md">
                    <Text as="h3" weight="semibold">
                      {t('map.relate')}
                    </Text>
                    <SelectInput
                      label={t('map.target')}
                      options={[
                        { value: '', label: t('map.choose') },
                        ...knowledge.nodes
                          .filter(node => node.key !== focus)
                          .map((node: GraphNode) => ({
                            value: node.key,
                            label: `${node.title} · ${node.context ?? node.kind}`
                          }))
                      ]}
                      value={target}
                      onChange={setTarget}
                    />
                    <TextInput
                      icon="tabler:tag"
                      label={t('map.label')}
                      namespace={false}
                      placeholder={t('connections.defaultLabel')}
                      value={label}
                      onChange={setLabel}
                    />
                    <Button
                      disabled={!target}
                      icon="tabler:link"
                      loading={busy}
                      namespace={false}
                      onClick={() => {
                        void relate()
                      }}
                    >
                      {t('map.link')}
                    </Button>
                    {related.map(edge => (
                      <Flex
                        key={edge.id}
                        align="center"
                        gap="sm"
                        justify="between"
                      >
                        <Text>{edge.label}</Text>
                        <Button
                          aria-label={t('map.unlink')}
                          disabled={busy}
                          icon="tabler:unlink"
                          namespace={false}
                          variant="plain"
                          onClick={() => {
                            void run(() =>
                              workspaceAPI.knowledge.unrelate
                                .input({ id: edge.id.replace('related:', '') })
                                .mutate(undefined)
                            )
                          }}
                        />
                      </Flex>
                    ))}
                  </Stack>
                </Card>
              </>
            ) : (
              <Card>
                <Text color="muted">{t('map.help')}</Text>
              </Card>
            )}
          </Stack>
        </Flex>
      )}
    </Stack>
  )
}
