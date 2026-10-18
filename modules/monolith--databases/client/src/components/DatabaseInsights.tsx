import { useModuleTranslation } from '@monolith/localization'
import { AnimatedCollapse, Button, Flex, Stack, Text } from '@monolith/ui'
import dayjs from 'dayjs'
import { type CSSProperties, useMemo, useState } from 'react'

import { useDatabases } from '@/DatabaseProvider'
import { recordCalendarRange } from '@/utils/calendar'
import { chartBuckets } from '@/utils/chart'
import { useViewColors } from '@/utils/viewColors'

import {
  type Field,
  type RecordPage,
  type SavedView,
  viewProperties
} from '../../../shared'

type Props = { records: RecordPage[]; fields: Field[]; view: SavedView }

export function DatabaseChart({ records, fields, view }: Props) {
  const { t, i18n } = useModuleTranslation()
  const { data, openRecord, propertyLabel } = useDatabases()
  const [selected, setSelected] = useState<string | null>(null)
  const field = [...viewProperties(view.base_id, t), ...fields].find(
    field => field.id === view.config.chart?.group_by
  )
  const buckets = useMemo(
    () => chartBuckets(records, field, view.config.chart, data.links),
    [records, field, view.config.chart, data.links]
  )
  const minimum = Math.min(0, ...buckets.map(bucket => bucket.value))
  const maximum = Math.max(0, ...buckets.map(bucket => bucket.value))
  const span = maximum - minimum || 1
  const zero = (-minimum / span) * 100
  const format = new Intl.NumberFormat(i18n.language, {
    maximumFractionDigits: 2
  })
  const label = (key: string) =>
    !field
      ? t('allRecords')
      : !key
        ? t('emptyValue')
        : propertyLabel(field, field.kind === 'checkbox' ? key === 'true' : key)
  const details = buckets.find(bucket => bucket.key === selected)
  return (
    <Stack gap="md" className="database-chart" aria-label={t('chart')}>
      <Flex justify="between" align="center">
        <Text size="sm" weight="medium">
          {field?.name ?? t('allRecords')}
        </Text>
        <Text size="xs" color="muted">
          {t('aggregations.' + (view.config.chart?.aggregation ?? 'count'))}
          {view.config.chart?.value_field
            ? ` · ${fields.find(field => field.id === view.config.chart?.value_field)?.name ?? ''}`
            : ''}
        </Text>
      </Flex>
      {buckets.length ? (
        <div className="database-chart-bars">
          {buckets.map(bucket => (
            <button
              key={bucket.key}
              type="button"
              className="database-chart-row"
              aria-pressed={selected === bucket.key}
              onClick={() =>
                setSelected(selected === bucket.key ? null : bucket.key)
              }
            >
              <span className="database-chart-label">{label(bucket.key)}</span>
              <span className="database-chart-track">
                <span
                  className="database-chart-zero"
                  style={{ left: `${zero}%` }}
                />
                <span
                  className="database-chart-bar"
                  style={{
                    left: `${Math.min(zero, ((bucket.value - minimum) / span) * 100)}%`,
                    width: `${(Math.abs(bucket.value) / span) * 100}%`,
                    backgroundColor:
                      field?.config.option_colors?.[bucket.key] ||
                      'var(--selection-color)'
                  }}
                />
              </span>
              <span className="database-chart-value">
                {format.format(bucket.value)}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <Text color="muted" size="sm">
          {t('emptyRecords')}
        </Text>
      )}
      {details && (
        <div
          className="database-insight-records"
          aria-label={label(details.key)}
        >
          {details.records.map(record => (
            <button
              key={record.id}
              type="button"
              onClick={() => openRecord(record)}
            >
              {record.title || t('untitledPage')}
            </button>
          ))}
        </div>
      )}
    </Stack>
  )
}

export function DatabaseTimeline({ records, fields, view }: Props) {
  const { t } = useModuleTranslation()
  const { openRecord } = useDatabases()
  const colors = useViewColors()
  const [month, setMonth] = useState(() => dayjs().format('YYYY-MM-DD'))
  const [showUnscheduled, setShowUnscheduled] = useState(false)
  const first = dayjs(month).startOf('month').format('YYYY-MM-DD')
  const last = dayjs(month).endOf('month').format('YYYY-MM-DD')
  const days = dayjs(month).daysInMonth()
  const dated = records.map(record => ({
    record,
    range: recordCalendarRange(
      record,
      view.config.date_field_id,
      view.config.end_date_field_id
    )
  }))
  const scheduled = dated.filter(
    item => item.range && item.range.start <= last && item.range.end >= first
  )
  const unscheduled = dated.filter(item => !item.range)
  const dayIndex = (date: string) => dayjs(date).diff(dayjs(first), 'day')
  const todayIndex = dayIndex(dayjs().format('YYYY-MM-DD'))
  if (
    !view.config.date_field_id ||
    ![...viewProperties(view.base_id, t), ...fields].some(
      field => field.id === view.config.date_field_id
    )
  )
    return <Text color="muted">{t('calendarView.noDateFields')}</Text>
  return (
    <Stack gap="sm" className="database-timeline" aria-label={t('timeline')}>
      <Flex align="center" justify="between" gap="sm">
        <Flex align="center" gap="xs">
          <Button
            variant="plain"
            icon="lucide:chevron-left"
            aria-label={t('calendarView.previous')}
            onClick={() =>
              setMonth(dayjs(month).subtract(1, 'month').format('YYYY-MM-DD'))
            }
          />
          <Text size="sm" weight="medium">
            {dayjs(month).format('MMMM YYYY')}
          </Text>
          <Button
            variant="plain"
            icon="lucide:chevron-right"
            aria-label={t('calendarView.next')}
            onClick={() =>
              setMonth(dayjs(month).add(1, 'month').format('YYYY-MM-DD'))
            }
          />
        </Flex>
        <Button
          namespace={false}
          variant="plain"
          onClick={() => setMonth(dayjs().format('YYYY-MM-DD'))}
        >
          {t('buttons.calendarToday')}
        </Button>
      </Flex>
      <div className="database-timeline-scroll">
        <div
          className="database-timeline-grid"
          style={{ '--timeline-days': days } as CSSProperties}
        >
          <div className="database-timeline-header">
            <span>{t('inputs.recordTitle')}</span>
            <div>
              {Array.from({ length: days }, (_, i) => (
                <span key={i} data-today={i === todayIndex || undefined}>
                  {i + 1}
                </span>
              ))}
            </div>
          </div>
          {scheduled.map(({ record, range }) => {
            const start = Math.max(0, dayIndex(range!.start))
            const end = Math.min(days, dayIndex(range!.end) + 1)
            return (
              <div className="database-timeline-row" key={record.id}>
                <button
                  type="button"
                  className="database-timeline-title"
                  onClick={() => openRecord(record)}
                >
                  {record.title || t('untitledPage')}
                </button>
                <div className="database-timeline-track">
                  {todayIndex >= 0 && todayIndex < days && (
                    <span
                      className="database-timeline-today"
                      style={{ left: `${((todayIndex + 0.5) / days) * 100}%` }}
                    />
                  )}
                  <button
                    className="database-timeline-bar"
                    type="button"
                    style={{
                      ...colors.style(record),
                      left: `${(start / days) * 100}%`,
                      width: `${((end - start) / days) * 100}%`
                    }}
                    title={`${record.title} · ${range!.start} – ${range!.end}`}
                    onClick={() => openRecord(record)}
                  >
                    {record.title || t('untitledPage')}
                  </button>
                </div>
              </div>
            )
          })}
          {!scheduled.length && (
            <Text size="sm" color="muted" p="md">
              {t('timelineEmpty')}
            </Text>
          )}
        </div>
      </div>
      {unscheduled.length > 0 && (
        <section className="database-timeline-unscheduled">
          <Button
            namespace={false}
            variant="plain"
            icon="lucide:chevron-right"
            className="monolith-disclosure"
            aria-expanded={showUnscheduled}
            onClick={() => setShowUnscheduled(!showUnscheduled)}
          >
            {t('calendarView.unscheduled')} · {unscheduled.length}
          </Button>
          <AnimatedCollapse open={showUnscheduled}>
            <div className="database-insight-records">
              {unscheduled.map(({ record }) => (
                <button
                  type="button"
                  key={record.id}
                  onClick={() => openRecord(record)}
                >
                  {record.title || t('untitledPage')}
                </button>
              ))}
            </div>
          </AnimatedCollapse>
        </section>
      )}
    </Stack>
  )
}

export function DatabaseDashboard({ records, fields, view }: Props) {
  const { t } = useModuleTranslation()
  const { openRecord } = useDatabases()
  const completed = records.filter(
    record => record.done || record.status === 'done'
  ).length
  return (
    <Stack gap="lg" className="database-dashboard" aria-label={t('dashboard')}>
      <div className="database-dashboard-metrics">
        {[
          [t('allRecords'), records.length],
          [t('dashboardCompleted'), completed],
          [
            t('dashboardCompletion'),
            `${records.length ? Math.round((completed / records.length) * 100) : 0}%`
          ]
        ].map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <DatabaseChart records={records} fields={fields} view={view} />
      <Stack gap="xs">
        <Text size="sm" weight="medium">
          {t('dashboardRecent')}
        </Text>
        <div className="database-insight-records">
          {[...records]
            .sort((a, b) => b.updated.localeCompare(a.updated))
            .slice(0, 8)
            .map(record => (
              <button
                key={record.id}
                type="button"
                onClick={() => openRecord(record)}
              >
                {record.title || t('untitledPage')}
              </button>
            ))}
        </div>
        {!records.length && (
          <Text size="sm" color="muted">
            {t('emptyRecords')}
          </Text>
        )}
      </Stack>
    </Stack>
  )
}
