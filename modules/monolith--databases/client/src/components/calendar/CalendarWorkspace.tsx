import dayjs from 'dayjs'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { Box, Button, Flex, Icon, Stack, Text } from '@monolith/ui'

import { useDatabases } from '@/DatabaseProvider'
import { withSystemDates } from '@/utils/systemViews'

import { viewConfigSchema } from '../../../../shared'
import { DatabaseCalendar } from '../DatabaseCalendar'
import { RecordEditor } from '../RecordEditor'
import {
  CalendarCreatePopover,
  type CalendarCreation
} from './CalendarCreatePopover'

export function CalendarWorkspace() {
  const {
    data,
    record,
    closeRecord,
    loading,
    error,
    retry,
    readOnly,
    workspaceId
  } = useDatabases()

  const { t } = useTranslation('common.workHub')
  const [query, setQuery] = useState('')
  const [hidden, setHidden] = useState<string[]>([])
  const [creation, setCreation] = useState<CalendarCreation | null>(null)

  const records = data.records.filter(
    row =>
      (!!withSystemDates(row, data.fields).date || row.item_type === 'event') &&
      !hidden.includes(row.base_id) &&
      row.title.toLowerCase().includes(query.toLowerCase())
  )
  const bases = data.bases.filter(
    base =>
      base.table_type === 'event' ||
      data.records.some(
        row =>
          row.base_id === base.id &&
          (withSystemDates(row, data.fields).date || row.item_type === 'event')
      )
  )
  const target =
    bases.find(base => !hidden.includes(base.id) && base.table_type === 'event')
      ?.id ?? ''

  if (record)
    return (
      <RecordEditor
        key={record.id}
        record={record}
        returnLabel={t('calendarTitle')}
        onDone={closeRecord}
      />
    )
  if (loading) return <Text role="status">{t('loading')}</Text>

  return (
    <Box className="calendar-workspace">
      {error && (
        <Flex gap="sm" role="alert">
          <Text>{error}</Text>
          <Button namespace={false} onClick={retry}>
            {t('retry')}
          </Button>
        </Flex>
      )}
      <DatabaseCalendar
        fields={data.fields}
        records={records}
        sidebar={
          <Stack gap="lg">
            <Flex align="center" className="calendar-source-search" gap="sm">
              <Icon icon="lucide:search" size="14px" />
              <Box
                aria-label={t('searchEvents')}
                as="input"
                placeholder={t('searchEvents')}
                type="search"
                value={query}
                onChange={event => setQuery(event.target.value)}
              />
            </Flex>
            <Stack gap="sm">
              <Text color="muted" size="xs">
                {t('calendarSources')}
              </Text>
              {bases.map((base, index) => (
                <Flex
                  key={base.id}
                  align="center"
                  as="label"
                  className="calendar-source"
                  gap="sm"
                >
                  <Box
                    as="input"
                    checked={!hidden.includes(base.id)}
                    style={{
                      accentColor: `var(--calendar-source-${index % 4},var(--text-primary))`
                    }}
                    type="checkbox"
                    onChange={event =>
                      setHidden(current =>
                        event.target.checked
                          ? current.filter(id => id !== base.id)
                          : [...current, base.id]
                      )
                    }
                  />
                  <Text size="sm">{base.name}</Text>
                </Flex>
              ))}
            </Stack>
            <Button
              as={Link}
              icon="lucide:calendar-cog"
              justify="start"
              namespace={false}
              to={`/calendar/sources?workspace=${workspaceId ?? ''}`}
              variant="plain"
            >
              {t('calendars')}
            </Button>
          </Stack>
        }
        toolbar={
          <Button
            aria-label={t('event')}
            disabled={readOnly}
            icon="lucide:plus"
            namespace={false}
            variant="secondary"
            onClick={event => {
              const start = dayjs()
                .minute(Math.ceil(dayjs().minute() / 15) * 15)
                .second(0)
              setCreation({
                anchor: event.currentTarget,
                database: target,
                start: start.format('YYYY-MM-DDTHH:mm'),
                end: start.add(1, 'hour').format('YYYY-MM-DDTHH:mm')
              })
            }}
          >
            {t('event')}
          </Button>
        }
        view={{
          id: 'system-calendar',
          base_id: '',
          name: t('calendarTitle'),
          mode: 'calendar',
          group_field_id: null,
          config: viewConfigSchema.parse({
            date_field_id: 'date',
            end_date_field_id: 'end_date'
          })
        }}
        onCreate={(values, anchor) => {
          if (anchor && !creation)
            setCreation({
              anchor,
              database: target,
              start: dayjs(String(values.date)).format('YYYY-MM-DDTHH:mm'),
              end: dayjs(String(values.end_date)).format('YYYY-MM-DDTHH:mm')
            })
        }}
      />
      {creation && (
        <CalendarCreatePopover
          initial={creation}
          onClose={() => setCreation(null)}
        />
      )}
    </Box>
  )
}
