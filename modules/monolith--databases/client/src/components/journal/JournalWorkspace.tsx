// SPDX-License-Identifier: 0BSD
import dayjs from 'dayjs'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Box, Button, Flex, FloatingPopover, Stack, Text } from '@monolith/ui'

import { useDatabases } from '@/DatabaseProvider'
import { DraftConfirmation, DraftNotice, useDraftGuard } from '@/useDraftGuard'

import { JournalActivity } from '../JournalActivity'
import { RecordEditor } from '../RecordEditor'
import './journal.css'
import { journalEntries } from './journalEntries'

function JournalComposer({
  anchor,
  onClose
}: {
  anchor: HTMLElement
  onClose: () => void
}) {
  const { t } = useTranslation('common.journal')
  const { data, api, run, busy, readOnly, openRecord } = useDatabases()
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [target, setTarget] = useState(
    data.bases.find(
      base =>
        base.source_type === 'post' ||
        data.records.some(
          record => record.base_id === base.id && record.item_type === 'post'
        ) ||
        base.name === t('title')
    )?.id ?? ''
  )
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)
  const [discard, setDiscard] = useState(false)
  const dirty = !!title || date !== dayjs().format('YYYY-MM-DD')
  const { blocker, allowNavigation } = useDraftGuard(dirty || pending)
  const disabled = busy || pending || readOnly
  function close() {
    if (pending) return
    if (dirty) setDiscard(true)
    else onClose()
  }
  async function create() {
    if (disabled || !date || !title.trim()) return
    setPending(true)
    setFailed(false)
    try {
      const entry = await run(async () => {
        const base = target
          ? { id: target }
          : await api.createBase.mutate({
              name: t('title'),
              description: '',
              table_type: 'general'
            })
        setTarget(base.id)
        return api.createRecord.mutate({
          base_id: base.id,
          title: title.trim(),
          item_type: 'post',
          tags: ['journal'],
          date: new Date(date + 'T12:00:00').toISOString(),
          content: '',
          values: {}
        })
      })
      if (!entry) {
        setFailed(true)
        return
      }
      allowNavigation()
      onClose()
      openRecord(entry)
    } finally {
      setPending(false)
    }
  }
  return (
    <FloatingPopover
      anchor={anchor}
      align="end"
      label={t('newEntry')}
      width={380}
      onClose={close}
    >
      <Stack
        as="form"
        gap="md"
        p="sm"
        onSubmit={event => {
          event.preventDefault()
          void create()
        }}
      >
        <Flex align="center" justify="between">
          <Text weight="semibold">{t('newEntry')}</Text>
          <Button
            aria-label={t('close')}
            namespace={false}
            variant="plain"
            icon="lucide:x"
            disabled={pending}
            onClick={close}
          />
        </Flex>
        <Box
          as="input"
          autoFocus
          required
          maxLength={255}
          className="journal-input"
          aria-label={t('entryTitle')}
          placeholder={t('entryTitle')}
          value={title}
          disabled={disabled}
          onChange={event => setTitle(event.target.value)}
        />
        <Box as="label">
          <Text size="sm" color="muted">
            {t('date')}
          </Text>
          <Box
            as="input"
            required
            className="journal-input"
            aria-label={t('date')}
            type="date"
            value={date}
            disabled={disabled}
            onChange={event => setDate(event.target.value)}
          />
        </Box>
        {failed && (
          <Text role="alert" color="dangerous">
            {t('saveFailed')}
          </Text>
        )}
        <Flex justify="end">
          <Button
            namespace={false}
            type="submit"
            disabled={disabled || !title.trim() || !date}
            loading={pending}
          >
            {t('startWriting')}
          </Button>
        </Flex>
        {discard && blocker.state !== 'blocked' && (
          <DraftConfirmation
            onKeepEditing={() => setDiscard(false)}
            onDiscard={() => {
              allowNavigation()
              onClose()
            }}
          />
        )}
        <DraftNotice blocker={blocker} />
      </Stack>
    </FloatingPopover>
  )
}

export function JournalWorkspace() {
  const { t } = useTranslation('common.journal')
  const {
    data,
    record,
    openRecord,
    closeRecord,
    loading,
    error,
    stale,
    retry,
    readOnly,
    workspaceId
  } = useDatabases()
  const [query, setQuery] = useState('')
  const [month, setMonth] = useState('')
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const all = journalEntries(data.records, data.fields)
  const entries = journalEntries(data.records, data.fields, { query, month })
  if (record)
    return (
      <RecordEditor
        key={record.id}
        record={record}
        returnLabel={t('back')}
        onDone={closeRecord}
      />
    )
  if (loading) return <Text role="status">{t('loading')}</Text>
  return (
    <Stack
      className="monolith-system-workspace journal-workspace"
      gap="lg"
      pb="2xl"
    >
      <Flex justify="between" align="start" gap="md" wrap="wrap">
        <Stack gap="xs" width="auto">
          <Text as="h1" size="3xl" weight="semibold" tracking="tight">
            {t('title')}
          </Text>
          <Text color="muted">{t('description')}</Text>
        </Stack>
        <Button
          namespace={false}
          icon="lucide:plus"
          aria-haspopup="dialog"
          aria-expanded={!!anchor}
          disabled={readOnly}
          onClick={event => setAnchor(event.currentTarget)}
        >
          {t('newEntry')}
        </Button>
      </Flex>
      {(error || stale) && (
        <Flex role="alert" gap="sm" align="center">
          <Text color="dangerous">{error || t('stale')}</Text>
          <Button namespace={false} variant="plain" onClick={retry}>
            {t('retry')}
          </Button>
        </Flex>
      )}
      <JournalActivity records={all} />
      <Flex gap="sm" align="center" wrap="wrap">
        <Box
          as="input"
          className="journal-input"
          aria-label={t('search')}
          placeholder={t('search')}
          type="search"
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
        <Box
          as="input"
          className="journal-input"
          type="month"
          aria-label={t('month')}
          value={month}
          onChange={event => setMonth(event.target.value)}
        />
        {month && (
          <Button
            namespace={false}
            variant="plain"
            onClick={() => setMonth('')}
          >
            {t('allDates')}
          </Button>
        )}
        <Text color="muted" size="sm" role="status">
          {t('entries', { count: entries.length })}
        </Text>
      </Flex>
      <Stack gap="sm" aria-label={t('title')}>
        {entries.map(entry => (
          <Button
            key={entry.id}
            namespace={false}
            variant="plain"
            className="journal-entry"
            onClick={() => openRecord(entry)}
          >
            <Stack gap="xs" width="auto" minWidth="70px">
              <Text size="xl" weight="semibold">
                {dayjs(entry.date || entry.created || entry.updated).format(
                  'DD'
                )}
              </Text>
              <Text color="muted" size="xs">
                {dayjs(entry.date || entry.created || entry.updated).format(
                  'MMM YYYY'
                )}
              </Text>
            </Stack>
            <Stack gap="xs" flex="1" minWidth="0">
              <Text weight="semibold" truncate>
                {entry.title}
              </Text>
              <Text color="muted" size="sm" truncate>
                {entry.description ||
                  data.bases.find(base => base.id === entry.base_id)?.name}
              </Text>
            </Stack>
            <Text color="muted" aria-hidden="true">
              ↗
            </Text>
          </Button>
        ))}
        {!entries.length && (
          <Stack align="center" gap="sm" py="2xl">
            <Text weight="semibold">{t('empty')}</Text>
            <Text color="muted">{t('emptyHint')}</Text>
          </Stack>
        )}
      </Stack>
      {anchor && (
        <JournalComposer
          key={workspaceId}
          anchor={anchor}
          onClose={() => setAnchor(null)}
        />
      )}
    </Stack>
  )
}
