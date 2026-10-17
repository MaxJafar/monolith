import { useModuleTranslation } from '@monolith/localization'
import { Button, Icon } from '@monolith/ui'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { workspaceAPI } from '../manifest'
import { useAtlas } from './AtlasProvider'
import { type GraphEdge, entityType, isPage, targetOf } from './model'

function ConnectionEvidence() {
  const a = useAtlas(),
    { t } = useModuleTranslation()
  const edge = a.graph.edges.find(edge => edge.id === a.edgeFocus)

  if (!edge) return null

  const source = a.index.nodes.get(edge.source),
    target = a.index.nodes.get(edge.target)

  if (!source || !target) return null

  return (
    <section className="atlas-link-evidence">
      <div className="atlas-pane-heading">
        <span>{t('evidence.title')}</span>
        <i
          className="atlas-edge-swatch"
          style={{ backgroundColor: edge.color }}
        />
      </div>
      <p>
        <strong>{source.title}</strong> <span aria-hidden="true">↔</span>{' '}
        <strong>{target.title}</strong>
      </p>
      <span className="atlas-relation-badge">{t(`edge.${edge.kind}`)}</span>
      {edge.method && <p>{t(`evidence.${edge.method}`)}</p>}
      {edge.kind === 'context' && (
        <p className="atlas-muted">
          {t('evidence.similarity', {
            score: Math.round((edge.strength ?? 0) * 100)
          })}
        </p>
      )}
      {!!edge.evidence?.length && (
        <div className="atlas-evidence-terms">
          {edge.evidence.map(term => (
            <span key={term}>{term}</span>
          ))}
        </div>
      )}
      {edge.kind === 'context' &&
        !a.readOnly &&
        isPage(source) &&
        isPage(target) && (
          <Button
            disabled={a.busy}
            icon="lucide:link"
            namespace={false}
            variant="secondary"
            onClick={() =>
              void a.run(() =>
                workspaceAPI.relate.input({ workspace_id: a.workspace.id }).mutate({
                  source: { id: source.id, kind: source.kind },
                  target: { id: target.id, kind: target.kind },
                  label: t('evidence.savedLabel')
                })
              )
            }
          >
            {t('evidence.save')}
          </Button>
        )}
    </section>
  )
}

function Connections({ title, edges }: { title: string; edges: GraphEdge[] }) {
  const a = useAtlas(),
    { t } = useModuleTranslation()

  const [confirm, setConfirm] = useState('')

  return (
    <section className="atlas-connections">
      <div className="atlas-pane-heading">
        <span>{title}</span>
        <span className="atlas-count">{edges.length}</span>
      </div>
      {!edges.length && (
        <p className="atlas-muted atlas-empty-links">{t('noneYet')}</p>
      )}
      {edges.map(edge => {
        const node = targetOf(edge, a.focus, a.index)

        if (!node) return null

        return (
          <div key={edge.id} className="atlas-connection">
            <button
              className="atlas-connection-link"
              type="button"
              onClick={() => a.select(node.key)}
            >
              <span
                className="atlas-entity-dot"
                style={{ backgroundColor: edge.color }}
              />
              <span>
                <strong>{node.title}</strong>
                <small>
                  {edge.kind === 'related'
                    ? edge.label
                    : t(`edge.${edge.kind}`)}
                </small>
                {edge.kind === 'context' && (
                  <small>
                    {Math.round((edge.strength ?? 0) * 100)}% ·{' '}
                    {edge.evidence?.slice(0, 2).join(' · ')}
                  </small>
                )}
              </span>
            </button>
            <Button
              aria-label={t('evidence.inspect', { title: node.title })}
              className="atlas-icon-button"
              icon="lucide:info"
              namespace={false}
              variant="plain"
              onClick={() => a.selectEdge(edge.id)}
            />
            {edge.kind === 'related' && !a.readOnly && (
              <Button
                aria-label={t('removeConnection', { title: node.title })}
                className="atlas-icon-button"
                icon="lucide:unlink"
                namespace={false}
                variant="plain"
                onClick={() => setConfirm(confirm === edge.id ? '' : edge.id)}
              />
            )}
            {confirm === edge.id && (
              <div className="atlas-confirm">
                <span>{t('removePrompt')}</span>
                <Button
                  disabled={a.busy}
                  namespace={false}
                  variant="secondary"
                  onClick={async () => {
                    if (
                      await a.run(() =>
                        workspaceAPI.unrelate
                          .input({ workspace_id: a.workspace.id, id: edge.id })
                          .mutate(undefined)
                      )
                    )
                      setConfirm('')
                  }}
                >
                  {t('remove')}
                </Button>
                <Button
                  namespace={false}
                  variant="plain"
                  onClick={() => setConfirm('')}
                >
                  {t('cancel')}
                </Button>
              </div>
            )}
          </div>
        )
      })}
    </section>
  )
}

export function Inspector() {
  const a = useAtlas(),
    { t } = useModuleTranslation()
  const selected = a.selected
  const [target, setTarget] = useState(''),
    [label, setLabel] = useState(''),
    [adding, setAdding] = useState(false)
  const options = workspaceAPI.preview
    .input({
      workspace_id: a.workspace.id,
      kind: selected?.kind === 'redraw' ? 'redraw' : selected?.kind === 'record' ? 'record' : 'document',
      id:
        selected && isPage(selected)
          ? selected.id
          : '00000000-0000-0000-0000-000000000000'
    })
    .queryOptions()
  const preview = useQuery({
    ...options,
    queryKey: [...options.queryKey, a.userId],
    enabled:
      !!selected &&
      (selected.kind === 'document' || selected.kind === 'record' || selected.kind === 'redraw'),
    staleTime: 0,
    refetchInterval: 15000
  })

  if (!selected)
    return (
      <aside
        aria-label={t('details')}
        className="atlas-inspector atlas-inspector-welcome"
      >
        <div className="atlas-orbit">
          <Icon icon="lucide:orbit" size="30px" />
        </div>
        <h2>{t('welcomeTitle')}</h2>
        <p>{t('welcomeBody')}</p>
        <div className="atlas-tip">
          <Icon icon="lucide:brackets" size="19px" />
          <div>
            <strong>{t('linkTipTitle')}</strong>
            <p>{t('linkTipBody')}</p>
            <code>[[{t('examplePage')}]]</code>
          </div>
        </div>
        <div className="atlas-tip">
          <Icon icon="lucide:mouse-pointer-2" size="19px" />
          <div>
            <strong>{t('exploreTipTitle')}</strong>
            <p>{t('exploreTipBody')}</p>
          </div>
        </div>
      </aside>
    )

  const connected = a.index.neighbors.get(selected.key)?.size ?? 0

  return (
    <aside aria-label={t('details')} className="atlas-inspector">
      <div className="atlas-inspector-title">
        <div className="atlas-pane-heading">
          <span className="atlas-inspector-kind">
            <i
              className="atlas-entity-dot"
              style={{ backgroundColor: selected.color }}
            />
            {t(`entity.${entityType(selected)}`)}
          </span>
          <Button
            aria-label={t('closeDetails')}
            className="atlas-icon-button"
            icon="lucide:x"
            namespace={false}
            variant="plain"
            onClick={() => a.select('')}
          />
        </div>
        <h2>{selected.title}</h2>
        <p className="atlas-muted">
          {selected.context ? `${selected.context} · ` : ''}
          {t('connectionCount', { count: connected })}
        </p>
        <Button
          icon="lucide:arrow-up-right"
          namespace={false}
          variant="secondary"
          onClick={() => a.open(selected)}
        >
          {t(
            selected.kind === 'tag' || selected.kind === 'topic'
              ? 'evidence.explore'
              : 'openPage'
          )}
        </Button>
        <Button
          icon="lucide:sparkles"
          namespace={false}
          variant="plain"
          onClick={() => a.searchContext(selected.title)}
        >
          {t('rag.related')}
        </Button>
      </div>
      <ConnectionEvidence />
      <section className="atlas-preview">
        <div className="atlas-pane-heading">{t('preview')}</div>
        {!isPage(selected) || selected.kind === 'note' ? (
          <p className="atlas-preview-text">
            {selected.kind === 'tag'
              ? t('evidence.tagHub')
              : selected.kind === 'topic'
                ? t('evidence.topicHub')
                : selected.kind === 'database'
                  ? t('dashboard.databaseHelp')
                  : selected.excerpt || t('emptyPage')}
          </p>
        ) : preview.isPending ? (
          <p className="atlas-muted" role="status">
            {t('loading')}
          </p>
        ) : preview.error ? (
          <div role="alert">
            <p>{t('previewError')}</p>
            <Button
              namespace={false}
              variant="plain"
              onClick={() => void preview.refetch()}
            >
              {t('retry')}
            </Button>
          </div>
        ) : (
          <>
            <p className="atlas-preview-text">
              {preview.data.text || t('emptyPage')}
            </p>
            {preview.data.truncated && (
              <small className="atlas-muted">{t('previewTruncated')}</small>
            )}
          </>
        )}
      </section>
      <Connections
        edges={a.index.incoming.get(selected.key) ?? []}
        title={t('backlinks')}
      />
      <Connections
        edges={a.index.outgoing.get(selected.key) ?? []}
        title={t('outgoing')}
      />
      <Connections
        edges={(a.index.related.get(selected.key) ?? []).filter(edge =>
          ['related', 'relation', 'collection', 'embed'].includes(edge.kind)
        )}
        title={t('related')}
      />
      <Connections
        edges={(a.index.related.get(selected.key) ?? []).filter(edge =>
          ['tag', 'topic', 'context'].includes(edge.kind)
        )}
        title={t('evidence.discovered')}
      />
      {!a.readOnly && isPage(selected) && (
        <section className="atlas-connect-form">
          <Button
            aria-expanded={adding}
            icon="lucide:plus"
            namespace={false}
            variant="plain"
            onClick={() => setAdding(!adding)}
          >
            {t('connectPage')}
          </Button>
          {adding && (
            <form
              onSubmit={async event => {
                event.preventDefault()
                const node = a.index.nodes.get(target)

                if (
                  !node ||
                  !isPage(node) ||
                  !isPage(selected) ||
                  node.key === selected.key
                )
                  return

                if (
                  await a.run(() =>
                    workspaceAPI.relate
                      .input({ workspace_id: a.workspace.id })
                      .mutate({
                        source: { kind: selected.kind, id: selected.id },
                        target: { kind: node.kind, id: node.id },
                        label: label.trim() || t('defaultRelation')
                      })
                  )
                ) {
                  setTarget('')
                  setLabel('')
                  setAdding(false)
                }
              }}
            >
              <label>
                {t('target')}
                <select
                  required
                  aria-label={t('target')}
                  value={target}
                  onChange={event => setTarget(event.target.value)}
                >
                  <option value="">{t('choosePage')}</option>
                  {a.graph.nodes
                    .filter(node => isPage(node) && node.key !== selected.key)
                    .sort((x, y) => x.title.localeCompare(y.title))
                    .map(node => (
                      <option key={node.key} value={node.key}>
                        {node.title} · {node.context}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                {t('relationship')}
                <input
                  aria-label={t('relationship')}
                  maxLength={255}
                  placeholder={t('relationExample')}
                  value={label}
                  onChange={event => setLabel(event.target.value)}
                />
              </label>
              <Button
                disabled={!target || a.busy}
                namespace={false}
                type="submit"
              >
                {t('connect')}
              </Button>
            </form>
          )}
        </section>
      )}
    </aside>
  )
}
