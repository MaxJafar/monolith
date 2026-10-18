import { useTranslation } from 'react-i18next'

import { Button } from '@/components/inputs'
import { Grid } from '@/components/primitives'

import type { InlineDatabaseMode } from './CanvasWidgets'

const layouts = {
  table: 'lucide:table-2',
  kanban: 'lucide:columns-3',
  gallery: 'lucide:layout-grid',
  list: 'lucide:list',
  chart: 'lucide:chart-pie',
  dashboard: 'lucide:panels-top-left',
  timeline: 'lucide:chart-gantt',
  calendar: 'lucide:calendar-days'
} as const

/** The same layout choices for new databases, inline embeds and saved views. */
export function DatabaseLayoutPicker({
  onSelect,
  selected,
  focusMode = 'table',
  pending,
  disabled = false
}: {
  onSelect: (mode: InlineDatabaseMode) => void
  selected?: InlineDatabaseMode
  focusMode?: InlineDatabaseMode
  pending?: InlineDatabaseMode | null
  disabled?: boolean
}) {
  const { t } = useTranslation('common', { keyPrefix: 'inlineDatabase' })
  return (
    <Grid
      className="monolith-database-layouts"
      templateCols={4}
      gap="xs"
      role="group"
      aria-label={t('layout')}
    >
      {Object.entries(layouts).map(([value, icon]) => {
        const mode = value as InlineDatabaseMode
        return (
          <Button
            key={mode}
            namespace={false}
            variant="plain"
            direction="column"
            p="sm"
            gap="sm"
            height="68px"
            width="100%"
            icon={icon}
            iconProps={{ size: '19px' }}
            data-autofocus={mode === focusMode ? '' : undefined}
            aria-pressed={
              selected === undefined ? undefined : selected === mode
            }
            loading={pending === mode}
            disabled={disabled || !!pending}
            onClick={() => onSelect(mode)}
          >
            {t(`modes.${mode}`)}
          </Button>
        )
      })}
    </Grid>
  )
}
