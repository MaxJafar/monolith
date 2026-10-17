import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'

import { useModuleTranslation } from '@monolith/localization'
import { Button, Icon } from '@monolith/ui'

import { useAtlas } from './AtlasProvider'
import { searchAPI } from './searchAPI'

type Result = Awaited<ReturnType<typeof searchAPI.query.mutate>>

export function RagSearch() {
  const a = useAtlas(),
    { t } = useModuleTranslation()
  const [result, setResult] = useState<Result>(),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false)

  const [keyword, setKeyword] = useState(false)
  const request = useRef(0)

  useEffect(() => {
    request.current++
    setBusy(false)
    setResult(undefined)
    setError('')

    return () => {
      request.current++
    }
  }, [a.ragQuery])

  async function search() {
    if (!a.ragQuery.trim() || busy || !a.online) return

    const id = ++request.current
    setBusy(true)
    setError('')
    setResult(undefined)

    try {
      const next = await searchAPI.query.mutate({
        workspace_id: a.workspace.id,
        query: a.ragQuery.trim(),
        mode: keyword ? 'keyword' : 'hybrid',
        answer: false
      })

      if (request.current === id) setResult(next)
    } catch (caught) {
      if (request.current === id)
        setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      if (request.current === id) setBusy(false)
    }
  }

  return (
    <section aria-label={t('rag.title')} className="atlas-rag">
      <form
        onSubmit={event => {
          event.preventDefault()
          void search()
        }}
      >
        <Icon icon="lucide:sparkles" size="18px" />
        <input
          autoFocus
          aria-label={t('rag.query')}
          maxLength={800}
          placeholder={t('rag.placeholder')}
          value={a.ragQuery}
          onChange={event => a.setRagQuery(event.target.value)}
        />
        <Button
          disabled={!a.ragQuery.trim() || busy || !a.online}
          namespace={false}
          type="submit"
          variant="secondary"
        >
          {t(busy ? 'rag.searching' : 'rag.search')}
        </Button>
        <Button
          aria-label={t('rag.close')}
          className="atlas-icon-button"
          icon="lucide:x"
          namespace={false}
          variant="plain"
          onClick={() => a.setRagOpen(false)}
        />
      </form>
      <div className="atlas-rag-meta">
        <span>{t('rag.help')}</span>
        <label>
          <input
            checked={keyword}
            type="checkbox"
            onChange={event => {
              request.current++
              setBusy(false)
              setResult(undefined)
              setError('')
              setKeyword(event.target.checked)
            }}
          />
          {t('rag.keyword')}
        </label>
        <Link to={`/search?workspace=${a.workspace.id}`}>
          {t('rag.manageIndex')}
        </Link>
      </div>
      {error && (
        <p className="atlas-rag-message" role="alert">
          {error}
        </p>
      )}
      {busy && (
        <p className="atlas-rag-message" role="status">
          {t('rag.searching')}
        </p>
      )}
      {result && (
        <>
          <p className="atlas-rag-message" role="status">
            {t('rag.coverage', { ready: result.ready, total: result.total })} ·{' '}
            {t(
              result.stages.includes('embedding') ? 'rag.hybrid' : 'rag.lexical'
            )}
            {result.warnings.some(warning =>
              warning.code.endsWith('unavailable')
            )
              ? ` · ${t('rag.fallback')}`
              : ''}
          </p>
          <div className="atlas-rag-results">
            {result.hits.map((hit, i) => {
              const node = hit.graph_key
                ? a.index.nodes.get(hit.graph_key)
                : undefined

              return (
                <article key={hit.id}>
                  <span className="atlas-evidence-number">{i + 1}</span>
                  <div>
                    <strong>{hit.title}</strong>
                    <p>{hit.text}</p>
                    {hit.inferred && <small>{t('rag.inferred')}</small>}
                    <div className="atlas-evidence-actions">
                      {node && (
                        <button
                          type="button"
                          onClick={() => a.explore(node.key)}
                        >
                          {t('rag.showOnMap')}
                        </button>
                      )}
                      {hit.href.startsWith('/') &&
                        !hit.href.startsWith('//') && (
                          <Link to={hit.href}>{t('openPage')}</Link>
                        )}
                    </div>
                  </div>
                </article>
              )
            })}
            {!result.hits.length && (
              <p className="atlas-rag-message">{t('rag.empty')}</p>
            )}
          </div>
        </>
      )}
    </section>
  )
}
