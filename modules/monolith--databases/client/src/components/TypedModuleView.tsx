import dayjs from 'dayjs'
import { useState } from 'react'

import { useModuleTranslation } from '@monolith/localization'
import { Button, Flex, Grid, Stack, Text } from '@monolith/ui'

import { useDatabases } from '@/DatabaseProvider'

import { itemType } from '../../../workspaceShared'

export function TypedModuleView({ type }: { type: string }) {
  const { data, api, run, busy, openRecord, readOnly } = useDatabases(),
    { t } = useModuleTranslation()
  const [title, setTitle] = useState(''),
    [query, setQuery] = useState(''),
    [month, setMonth] = useState(dayjs().startOf('month'))
  const kind = itemType.parse(type)
  const items = data.records.filter(
    item =>
      item.item_type === kind &&
      item.title.toLowerCase().includes(query.toLowerCase())
  )
  async function create() {
    const result = await run(async () => {
      const base =
        data.bases.find(base => base.source_type === kind) ??
        data.bases[0] ??
        (await api.createBase.mutate({
          name: t(`itemTypes.${kind}`),
          description: ''
        }))
      return api.createRecord.mutate({
        base_id: base.id,
        title,
        item_type: kind,
        content: '',
        values: {}
      })
    })
    if (result) {
      setTitle('')
      openRecord(result)
    }
  }
  const renderItem = (item: (typeof items)[number]) => (
    <Flex key={item.id} align="center" gap="sm" minWidth="0">
      {kind === 'task' && (
        <input
          type="checkbox"
          aria-label={`${t('itemDone')} ${item.title}`}
          checked={item.done ?? false}
          disabled={readOnly || busy}
          onChange={event =>
            void run(() =>
              api.updateRecord
                .input({ id: item.id })
                .mutate({
                  title: item.title,
                  content: item.content,
                  values: item.values,
                  done: event.target.checked,
                  expected_updated: item.updated
                })
            )
          }
        />
      )}
      <Button
        namespace={false}
        variant="plain"
        justify="start"
        flex="1"
        onClick={() => openRecord(item)}
      >
        {item.title}
      </Button>
      {item.date && (
        <Text size="sm" color="muted">
          {dayjs(item.date).format('MMM D')}
        </Text>
      )}
    </Flex>
  )
  const start = month.subtract((month.day() + 6) % 7, 'day')
  return (
    <Stack gap="lg">
      <Flex align="center" justify="between" wrap="wrap" gap="md">
        <Text as="h2">{t(`itemModules.${kind}`)}</Text>
        <Text color="muted">{t('recordCount', { count: items.length })}</Text>
      </Flex>
      <Flex gap="sm" wrap="wrap">
        <input
          aria-label={t('search')}
          placeholder={t('search')}
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
        {!readOnly && (
          <>
            <input
              aria-label={t('inputs.recordTitle')}
              placeholder={t('inputs.recordTitle')}
              value={title}
              onChange={event => setTitle(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter' && title.trim()) void create()
              }}
            />
            <Button
              namespace={false}
              disabled={!title.trim()}
              loading={busy}
              onClick={() => void create()}
            >
              {t('newRecord')}
            </Button>
          </>
        )}
      </Flex>
      {kind === 'event' ? (
        <>
          <Flex gap="sm" align="center">
            <Button
              icon="lucide:chevron-left"
              aria-label={t('previousMonth')}
              variant="plain"
              onClick={() => setMonth(month.subtract(1, 'month'))}
            />
            <Text as="h3">{month.format('MMMM YYYY')}</Text>
            <Button
              icon="lucide:chevron-right"
              aria-label={t('nextMonth')}
              variant="plain"
              onClick={() => setMonth(month.add(1, 'month'))}
            />
          </Flex>
          <Grid templateCols={{ base: 1, md: 7 }} gap="xs">
            {Array.from({ length: 42 }, (_, index) =>
              start.add(index, 'day')
            ).map(date => (
              <Stack
                key={date.format('YYYY-MM-DD')}
                bg="surface"
                p="sm"
                r="sm"
                minHeight="120px"
              >
                <Text
                  color={date.month() === month.month() ? 'primary' : 'muted'}
                  size="sm"
                >
                  {date.format('ddd D')}
                </Text>
                {items
                  .filter(
                    item =>
                      item.date &&
                      dayjs(item.date).format('YYYY-MM-DD') ===
                        date.format('YYYY-MM-DD')
                  )
                  .map(renderItem)}
              </Stack>
            ))}
          </Grid>
          <Text as="h3">{t('unscheduled')}</Text>
          {items.filter(item => !item.date).map(renderItem)}
        </>
      ) : (
        <Stack gap="xs">{items.map(renderItem)}</Stack>
      )}
      {!items.length && <Text color="muted">{t('noRecords')}</Text>}
    </Stack>
  )
}
