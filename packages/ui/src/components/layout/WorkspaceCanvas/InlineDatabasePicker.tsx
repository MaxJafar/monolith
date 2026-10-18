import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/inputs'
import { Box, Flex, Icon, Stack, Text } from '@/components/primitives'

import { type InlineDatabaseMode, useCanvasWidgets } from './CanvasWidgets'
import { DatabaseLayoutPicker } from './DatabaseLayoutPicker'

export type InlineDatabaseReference = {
  workspaceId: string
  baseId: string
  viewId: string
}

export function InlineDatabasePicker({
  workspaceId,
  initialMode = 'table',
  onInsert,
  onCancel
}: {
  workspaceId?: string
  initialMode?: InlineDatabaseMode
  onInsert: (reference: InlineDatabaseReference, title: string) => void
  onCancel?: () => void
}) {
  const { t } = useTranslation('common', { keyPrefix: 'inlineDatabase' })
  const { databases = [], createDatabase } = useCanvasWidgets()
  const [pending, setPending] = useState<InlineDatabaseMode | null>(null)
  const [error, setError] = useState('')
  const [linking, setLinking] = useState(!createDatabase)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const request = useRef(false)
  const mounted = useRef(true)
  const container = useRef<HTMLDivElement>(null)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  useEffect(() => {
    if (selected)
      container.current
        ?.querySelector<HTMLButtonElement>('.monolith-database-picker-row')
        ?.focus({ preventScroll: true })
    else if (!linking)
      container.current
        ?.querySelector<HTMLButtonElement>('[data-autofocus]')
        ?.focus({ preventScroll: true })
  }, [selected, linking])
  const available = databases.filter(
    base => !workspaceId || base.workspaceId === workspaceId
  )
  const base = available.find(item => item.id === selected)
  const matches = available.filter(item =>
    item.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
  )
  async function create(mode: InlineDatabaseMode) {
    if (!createDatabase || request.current) return
    request.current = true
    setPending(mode)
    setError('')
    try {
      const reference = await createDatabase(t('newDatabase'), mode)
      if (!mounted.current) return
      if (workspaceId && reference.workspaceId !== workspaceId)
        throw Error(t('workspaceChanged'))
      onInsert(reference, t('newDatabase'))
    } catch (cause) {
      if (mounted.current)
        setError(cause instanceof Error ? cause.message : t('createFailed'))
    } finally {
      request.current = false
      if (mounted.current) setPending(null)
    }
  }
  return (
    <Stack
      ref={container}
      className="monolith-database-picker"
      gap="sm"
      role="region"
      aria-label={t('title')}
    >
      <Flex justify="between" align="center" gap="xs" px="xs">
        {(linking && createDatabase) || base ? (
          <Button
            namespace={false}
            variant="plain"
            icon="lucide:arrow-left"
            aria-label={t('back')}
            p="xs"
            onClick={() => (base ? setSelected(null) : setLinking(false))}
          />
        ) : null}
        <Box flex="1" minWidth="0">
          <Text as="h3" size="sm" weight="medium" color="muted" truncate>
            {base ? base.name : t(linking ? 'linkExisting' : 'newDatabase')}
          </Text>
        </Box>
        {onCancel && (
          <Button
            aria-label={t('cancel')}
            disabled={!!pending}
            icon="lucide:x"
            variant="plain"
            p="xs"
            onClick={onCancel}
          />
        )}
      </Flex>
      {!linking && createDatabase && (
        <>
          <DatabaseLayoutPicker
            focusMode={initialMode}
            pending={pending}
            onSelect={mode => void create(mode)}
          />
          <Text size="sm" color="muted" px="sm" role="status">
            {t(pending ? 'creating' : 'createHint')}
          </Text>
          <Button
            className="monolith-database-picker-link"
            namespace={false}
            variant="plain"
            icon="lucide:link"
            justify="start"
            disabled={!!pending}
            onClick={() => setLinking(true)}
          >
            {t('linkExisting')}
          </Button>
        </>
      )}
      {linking && !base && (
        <>
          <Flex
            align="center"
            gap="sm"
            className="monolith-picker-search"
            px="sm"
          >
            <Icon icon="lucide:search" size="16px" color="muted" />
            <Box
              as="input"
              autoFocus
              type="search"
              width="100%"
              minWidth="0"
              aria-label={t('search')}
              placeholder={t('search')}
              value={query}
              onChange={event => setQuery(event.target.value)}
            />
          </Flex>
          <Stack
            gap="xs"
            maxHeight="280px"
            overflowY="auto"
            aria-label={t('linkExisting')}
          >
            {matches.map(item => (
              <Button
                key={item.id}
                namespace={false}
                variant="plain"
                justify="start"
                icon="lucide:database"
                className="monolith-database-picker-row"
                onClick={() => setSelected(item.id)}
              >
                <Box flex="1" minWidth="0">
                  <Text truncate>{item.name}</Text>
                </Box>
                <Icon icon="lucide:chevron-right" size="14px" color="muted" />
              </Button>
            ))}
            {!matches.length && (
              <Text size="sm" color="muted" p="sm">
                {t('noDatabases')}
              </Text>
            )}
          </Stack>
        </>
      )}
      {base && (
        <Stack
          gap="xs"
          maxHeight="280px"
          overflowY="auto"
          aria-label={t('viewFor', { name: base.name })}
        >
          {base.views.map(view => (
            <Button
              key={view.id}
              namespace={false}
              variant="plain"
              justify="start"
              icon="lucide:table-2"
              className="monolith-database-picker-row"
              onClick={() =>
                onInsert(
                  {
                    workspaceId: base.workspaceId,
                    baseId: base.id,
                    viewId: view.id
                  },
                  base.name
                )
              }
            >
              {view.name}
            </Button>
          ))}
          {!base.views.length && (
            <Text size="sm" color="muted" p="sm">
              {t('noViews')}
            </Text>
          )}
        </Stack>
      )}
      {error && (
        <Text
          role="alert"
          color="dangerous"
          size="sm"
          p="sm"
          className="monolith-picker-error"
        >
          {error}
        </Text>
      )}
    </Stack>
  )
}
