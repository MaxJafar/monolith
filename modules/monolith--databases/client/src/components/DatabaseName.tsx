import { useModuleTranslation } from '@monolith/localization'
import { Button, Flex, Icon, Text } from '@monolith/ui'
import { useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router'

import { useDatabases } from '@/DatabaseProvider'

import type { Base } from '../../../shared'

/** Rename the shared source, so every embed and the catalog stay in sync. */
export function DatabaseName({ base, href }: { base: Base; href?: string }) {
  const { api, run, busy, readOnly, retry } = useDatabases()
  const { t } = useModuleTranslation()
  const [draft, setDraft] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const saving = useRef(false)
  const input = useRef<HTMLInputElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const focusTrigger = useRef(false)
  const editing = draft !== null
  useLayoutEffect(() => {
    if (editing && !busy) input.current?.focus()
    else if (!editing && focusTrigger.current) {
      trigger.current?.focus()
      focusTrigger.current = false
    }
  }, [editing, busy])

  async function save(restoreFocus = false) {
    if (saving.current || readOnly || draft === null) return
    const name = draft.trim()
    focusTrigger.current = restoreFocus
    if (!name || name === base.name) {
      setDraft(null)
      return
    }
    saving.current = true
    setFailed(false)
    const result = await run(async () => {
      const current = (await api.snapshot.query()).bases.find(
        item => item.id === base.id
      )
      if (!current) throw Error('Database is unavailable')
      return api.updateBase
        .input({ id: base.id })
        .mutate({ name, description: current.description })
    })
    saving.current = false
    if (result) setDraft(null)
    else {
      retry()
      setFailed(true)
    }
  }
  const start = () => {
    setFailed(false)
    setDraft(base.name)
  }
  const field = editing ? (
    <input
      ref={input}
      autoFocus
      maxLength={255}
      className="database-title-input"
      aria-label={t('databaseName')}
      aria-invalid={failed || undefined}
      value={draft}
      disabled={busy}
      onFocus={event => event.currentTarget.select()}
      onChange={event => {
        setDraft(event.target.value)
        setFailed(false)
      }}
      onBlur={() => void save()}
      onKeyDown={event => {
        if (event.nativeEvent.isComposing) return
        if (event.key === 'Enter') {
          event.preventDefault()
          event.stopPropagation()
          void save(true)
        }
        if (event.key === 'Escape') {
          event.preventDefault()
          event.stopPropagation()
          focusTrigger.current = true
          setDraft(null)
          setFailed(false)
        }
      }}
    />
  ) : href ? (
    <Button
      as={Link}
      to={href}
      namespace={false}
      variant="plain"
      justify="start"
    >
      <Text weight="medium">{base.name}</Text>
    </Button>
  ) : (
    <button
      ref={trigger}
      type="button"
      className="database-title-trigger"
      disabled={readOnly || busy}
      aria-label={t('renameDatabase', { name: base.name })}
      title={readOnly ? undefined : t('renameDatabase', { name: base.name })}
      onClick={start}
    >
      {base.name}
    </button>
  )
  return (
    <div className={href ? 'database-catalog-name' : 'database-source-name'}>
      {href ? (
        <Flex align="center" gap="xs" minWidth="0">
          <Icon icon="lucide:database" size="16px" color="muted" />
          {field}
          {!editing && !readOnly && (
            <Button
              ref={trigger}
              namespace={false}
              variant="plain"
              icon="lucide:pencil"
              className="database-rename-button"
              aria-label={t('renameDatabase', { name: base.name })}
              title={t('renameDatabase', { name: base.name })}
              disabled={busy}
              onClick={start}
            />
          )}
        </Flex>
      ) : (
        <Text
          as="h2"
          aria-label={base.name}
          size="2xl"
          tracking="tight"
          weight="semibold"
        >
          {field}
        </Text>
      )}
      {failed && (
        <Text size="xs" role="alert">
          {t('renameDatabaseFailed')}
        </Text>
      )}
    </div>
  )
}
