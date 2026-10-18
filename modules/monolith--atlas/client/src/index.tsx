import { useAuth } from '@monolith/api'
import { useModuleTranslation } from '@monolith/localization'
import { Button, Flex, Icon, KnowledgeGraph, Stack, Text } from '@monolith/ui'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useSearchParams } from 'react-router'

import { workspaceAPI } from '../manifest'
import { AtlasProvider, useAtlas } from './AtlasProvider'
import { AtlasOverview, DatabaseCollections } from './Dashboard'
import { Explorer } from './Explorer'
import { Inspector } from './Inspector'
import { MapControls } from './MapControls'
import { RagSearch } from './RagSearch'
import './atlas.css'
import { DiscoveryTrails } from './components/DiscoveryTrails'
import { MapSettings } from './components/MapSettings'
import './dashboard.css'
import { entityType } from './model'

function AtlasDashboard() {
  const a = useAtlas(),
    { t } = useModuleTranslation()
  const [newPage, setNewPage] = useState(false),
    [title, setTitle] = useState('')
  const filtered = !!(
    a.search ||
    a.filters.kind !== 'all' ||
    a.filters.context ||
    a.filters.tag ||
    !a.filters.orphans
  )
  return (
    <div className="atlas">
      <header className="atlas-header">
        <Flex align="center" gap="md" minWidth="0">
          <Flex
            centered
            width="56px"
            height="56px"
            flexShrink="0"
            r="lg"
            bg={{ base: 'bg-100', dark: 'bg-800' }}
            aria-hidden="true"
          >
            <Icon icon="lucide:orbit" size="32px" />
          </Flex>
          <Stack gap="xs">
            <Text
              as="h1"
              size={{ base: '3xl', md: '4xl' }}
              weight="semibold"
              tracking="tight"
            >
              Atlas
            </Text>
            <Text as="p" size="sm" color="muted">
              {t('description')}
            </Text>
          </Stack>
        </Flex>
        <div className="atlas-header-actions">
          <Button
            namespace={false}
            variant="plain"
            icon="lucide:refresh-cw"
            className="atlas-icon-button"
            aria-label={t('refresh')}
            disabled={a.query.isFetching}
            onClick={async () => {
              await a.query.refetch()
              await a.contextQuery.refetch()
            }}
          />
          <Button
            namespace={false}
            variant="secondary"
            icon="lucide:sparkles"
            aria-expanded={a.ragOpen}
            onClick={() => a.setRagOpen(!a.ragOpen)}
          >
            {t('rag.title')}
          </Button>
          {!a.readOnly && (
            <Button
              namespace={false}
              variant="secondary"
              icon="lucide:plus"
              aria-expanded={newPage}
              onClick={() => setNewPage(!newPage)}
            >
              {t('newPage')}
            </Button>
          )}
        </div>
      </header>
      {a.ragOpen && <RagSearch />}
      {newPage && (
        <form
          className="atlas-new-page"
          onSubmit={async event => {
            event.preventDefault()
            if (title.trim() && (await a.createPage(title))) {
              setNewPage(false)
              setTitle('')
            }
          }}
        >
          <label>
            {t('pageTitle')}
            <input
              aria-label={t('pageTitle')}
              autoFocus
              required
              maxLength={255}
              value={title}
              onChange={event => setTitle(event.target.value)}
              placeholder={t('pageTitlePlaceholder')}
            />
          </label>
          <Button
            namespace={false}
            type="submit"
            disabled={!title.trim() || a.busy}
          >
            {t('createAndOpen')}
          </Button>
          <Button
            namespace={false}
            variant="plain"
            onClick={() => setNewPage(false)}
          >
            {t('cancel')}
          </Button>
        </form>
      )}
      {(a.error || a.query.error || !a.online) && (
        <div className="atlas-banner" role="alert">
          <Icon icon="lucide:circle-alert" size="18px" />
          <span>
            {!a.online ? t('offline') : a.error || a.query.error?.message}
          </span>
          <Button
            namespace={false}
            variant="plain"
            onClick={() => {
              a.setError(null)
              void a.query.refetch()
            }}
          >
            {t('retry')}
          </Button>
        </div>
      )}
      <AtlasOverview />
      <div className="atlas-map-section" data-selected={!!a.selected}>
        <main className="atlas-map" aria-label={t('map')}>
          <div className="atlas-map-topbar">
            <Flex align="center" gap="md" wrap="wrap">
              <Text as="h2" size="lg" weight="medium">
                {t('map')}
              </Text>
              <div className="atlas-mode-switch" aria-label={t('layout')}>
                <button
                  type="button"
                  aria-pressed={a.layout === 'force'}
                  onClick={() => a.setLayout('force')}
                >
                  <Icon icon="lucide:network" size="15px" />
                  {t('graph')}
                </button>
                <button
                  type="button"
                  aria-pressed={a.layout === 'radial'}
                  onClick={() => a.setLayout('radial')}
                >
                  <Icon icon="lucide:git-fork" size="15px" />
                  {t('mindMap')}
                </button>
              </div>
            </Flex>
            <div className="atlas-map-actions">
              <Button
                namespace={false}
                className="atlas-icon-button"
                variant="plain"
                icon={a.paused ? 'lucide:play' : 'lucide:pause'}
                aria-label={t(a.paused ? 'resume' : 'pause')}
                aria-pressed={a.paused}
                onClick={() => a.setPaused(!a.paused)}
              />
              <MapSettings />
            </div>
          </div>
          <div className="atlas-scopebar">
            <div className="atlas-scope-options">
              <button
                type="button"
                aria-pressed={a.scope === 'global'}
                onClick={() => a.setScope('global')}
              >
                {t('wholeWorkspace')}
              </button>
              <button
                type="button"
                disabled={!a.selected}
                aria-pressed={a.scope === 'local'}
                onClick={() => a.setScope('local')}
              >
                {t('neighborhood')}
              </button>
            </div>
            {a.scope === 'local' && a.selected && (
              <label className="atlas-depth">
                {t('depth')}
                <select
                  aria-label={t('depth')}
                  value={a.filters.depth}
                  onChange={event => a.setDepth(Number(event.target.value))}
                >
                  {[1, 2, 3].map(depth => (
                    <option key={depth}>{depth}</option>
                  ))}
                </select>
              </label>
            )}
            {filtered && (
              <button
                type="button"
                className="atlas-filter-reset"
                onClick={a.resetFilters}
              >
                {t('clearFilters')}
              </button>
            )}
            <MapControls />
          </div>
          {a.contextQuery.isFetching && (
            <div className="atlas-map-notice" role="status">
              {t('layers.loading')}
            </div>
          )}
          {a.contextQuery.error && (
            <div className="atlas-map-notice" role="alert">
              {t('layers.unavailable')}{' '}
              <button
                type="button"
                onClick={() => void a.contextQuery.refetch()}
              >
                {t('retry')}
              </button>
            </div>
          )}
          {a.contextQuery.data &&
            (a.contextQuery.data.coverage.analyzed <
              a.contextQuery.data.coverage.eligible ||
              a.contextQuery.data.coverage.omittedTags > 0) && (
              <div className="atlas-map-notice">
                {t('layers.coverage', {
                  count: a.contextQuery.data.coverage.analyzed,
                  total: a.contextQuery.data.coverage.eligible
                })}
              </div>
            )}
          {a.visible.omitted > 0 && (
            <div className="atlas-map-notice" role="status">
              {t('limited', {
                shown: a.visible.graph.nodes.length,
                total: a.visible.matches.length
              })}
            </div>
          )}
          {a.selected &&
            !a.visible.graph.nodes.some(node => node.key === a.focus) && (
              <div className="atlas-map-notice">{t('selectedFiltered')}</div>
            )}
          {a.query.isPending ? (
            <div className="atlas-map-state" role="status">
              <Icon icon="lucide:orbit" size="34px" />
              <p>{t('loadingMap')}</p>
            </div>
          ) : !a.graph.nodes.length ? (
            <div className="atlas-map-state">
              <div className="atlas-empty-orbits">
                <span />
                <span />
                <span />
              </div>
              <h2>{t('emptyTitle')}</h2>
              <p>{t('emptyBody')}</p>
              {!a.readOnly && (
                <Button
                  namespace={false}
                  variant="secondary"
                  icon="lucide:plus"
                  onClick={() => setNewPage(true)}
                >
                  {t('newPage')}
                </Button>
              )}
            </div>
          ) : !a.visible.graph.nodes.length ? (
            <div className="atlas-map-state">
              <Icon icon="lucide:search" size="32px" />
              <Text as="h2" size="lg">
                {t('noResults')}
              </Text>
              <Button
                namespace={false}
                variant="secondary"
                onClick={a.resetFilters}
              >
                {t('clearFilters')}
              </Button>
            </div>
          ) : (
            <KnowledgeGraph
              graph={a.visible.graph}
              selected={a.focus}
              onSelect={a.select}
              onOpen={a.open}
              onSelectEdge={a.selectEdge}
              selectedEdge={a.edgeFocus}
              nodeLabel={node =>
                `${node.title} · ${t(`entity.${entityType(node)}`)}`
              }
              presentation="atlas"
              layout={a.layout}
              root={a.layout === 'radial' ? a.focus : undefined}
              showLabels={a.showLabels}
              paused={a.paused}
              spacing={a.spacing}
            />
          )}
          <footer className="atlas-map-footer">
            <span>
              <i />
              {t('workspaceMap', { name: a.workspace.name })}
            </span>
            <span>
              {a.contextQuery.data
                ? t('layers.indexed', {
                    count: a.contextQuery.data.coverage.embedded,
                    total: a.contextQuery.data.coverage.analyzed
                  })
                : a.readOnly
                  ? t('readOnly')
                  : t('liveKnowledge')}
            </span>
          </footer>
        </main>
        {a.selected && <Inspector key={a.focus} />}
      </div>
      <DiscoveryTrails />
      <div className="atlas-dashboard-library">
        <Explorer />
        <DatabaseCollections />
      </div>
      {a.graph.unresolved > 0 && (
        <p className="atlas-unresolved">
          <Icon icon="lucide:info" size="14px" />
          {t('unresolved', { count: a.graph.unresolved })}
        </p>
      )}
    </div>
  )
}

export default function Atlas() {
  const { userData } = useAuth(),
    { t } = useModuleTranslation()
  const [params] = useSearchParams()
  const options = workspaceAPI.workspaces.queryOptions()
  const query = useQuery({
    ...options,
    queryKey: [...options.queryKey, userData?.id],
    enabled: !!userData?.id
  })
  const workspace = params.get('workspace')
    ? query.data?.find(item => item.id === params.get('workspace'))
    : (query.data?.find(item => item.is_default) ?? query.data?.[0])
  if (query.isPending)
    return (
      <div className="atlas-map-state" role="status">
        {t('loading')}
      </div>
    )
  if (query.error || !workspace)
    return (
      <div className="atlas-map-state" role="alert">
        <p>{t('workspaceUnavailable')}</p>
        <Button
          namespace={false}
          variant="secondary"
          onClick={() => void query.refetch()}
        >
          {t('retry')}
        </Button>
      </div>
    )
  return (
    <AtlasProvider
      key={`${userData?.id}:${workspace.id}`}
      workspace={workspace}
    >
      <AtlasDashboard />
    </AtlasProvider>
  )
}
