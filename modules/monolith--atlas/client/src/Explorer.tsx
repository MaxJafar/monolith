import { useModuleTranslation } from '@monolith/localization'
import { Button, Icon } from '@monolith/ui'

import { useAtlas } from './AtlasProvider'
import { entityKinds, entityType } from './model'

export function Explorer() {
  const { t } = useModuleTranslation()
  const a = useAtlas()
  const nodes = a.visible.graph.nodes
  return (
    <section className="atlas-explorer" aria-label={t('explorer')}>
      <div className="atlas-pane-heading">
        <span>{t('dashboard.library')}</span>
        <span className="atlas-count">{a.graph.nodes.length}</span>
      </div>
      <label className="atlas-search">
        <Icon icon="lucide:search" size="16px" />
        <input
          aria-label={t('search')}
          placeholder={t('search')}
          type="search"
          value={a.search}
          onChange={event => a.setSearch(event.target.value)}
        />
      </label>
      <div className="atlas-filter-grid">
        <select
          aria-label={t('kind')}
          value={a.filters.kind}
          onChange={event => a.setKind(event.target.value)}
        >
          <option value="all">{t('allTypes')}</option>
          <option value="document">{t('pages')}</option>
          <option value="record">{t('records')}</option>
          {entityKinds
            .filter(kind => kind !== 'page')
            .map(kind => (
              <option key={kind} value={kind}>
                {t(`entity.${kind}`)}
              </option>
            ))}
        </select>
        <select
          aria-label={t('sort')}
          value={a.filters.sort}
          onChange={event => a.setSort(event.target.value)}
        >
          <option value="connections">{t('mostConnected')}</option>
          <option value="title">{t('alphabetical')}</option>
        </select>
        {a.contexts.length > 1 && (
          <select
            aria-label={t('source')}
            value={a.filters.context}
            onChange={event => a.setContext(event.target.value)}
          >
            <option value="">{t('allSources')}</option>
            {a.contexts.map(context => (
              <option key={context}>{context}</option>
            ))}
          </select>
        )}
        {!!a.tags.length && (
          <select
            aria-label={t('tag')}
            value={a.filters.tag}
            onChange={event => a.setTag(event.target.value)}
          >
            <option value="">{t('allTags')}</option>
            {a.tags.map(tag => (
              <option key={tag}>{tag}</option>
            ))}
          </select>
        )}
      </div>
      <label className="atlas-check">
        <input
          type="checkbox"
          checked={a.filters.orphans}
          onChange={event => a.setOrphans(event.target.checked)}
        />
        {t('showUnconnected')}
      </label>
      <div className="atlas-explorer-list" aria-label={t('results')}>
        {nodes.map(node => (
          <button
            type="button"
            key={node.key}
            className="atlas-node-row"
            aria-pressed={a.focus === node.key}
            onClick={() => {
              a.select(node.key)
              document
                .querySelector('.atlas-map-section')
                ?.scrollIntoView({ block: 'start' })
            }}
            onDoubleClick={() => a.open(node)}
          >
            <span
              className="atlas-entity-dot"
              data-entity={entityType(node)}
              style={{ backgroundColor: node.color }}
            />
            <span className="atlas-node-copy">
              <strong>{node.title}</strong>
              <small>
                {t(`entity.${entityType(node)}`)}
                {node.context ? ` · ${node.context}` : ''}
              </small>
            </span>
            <span className="atlas-count">
              {a.index.neighbors.get(node.key)?.size ?? 0}
            </span>
          </button>
        ))}
        {!nodes.length && (
          <div className="atlas-no-results">
            <p>{t('noResults')}</p>
            <Button namespace={false} variant="plain" onClick={a.resetFilters}>
              {t('clearFilters')}
            </Button>
          </div>
        )}
      </div>
      <div className="atlas-explorer-footer">
        <Icon icon="lucide:link" size="14px" />
        <span>{t('automaticLinks')}</span>
      </div>
    </section>
  )
}
