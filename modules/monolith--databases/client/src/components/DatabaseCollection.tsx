import { useModuleTranslation } from '@monolith/localization'
import {
  AppearanceContext,
  AppearanceCover,
  Box,
  Icon,
  Stack,
  Text
} from '@monolith/ui'

import { useViewColors } from '@/utils/viewColors'

import { type Field, type RecordPage } from '../../../shared'
import { DatabaseCardProperties } from './DatabaseCardProperties'
import { RecordLink } from './RecordLink'

export function DatabaseCollection({
  records,
  fields,
  mode
}: {
  records: RecordPage[]
  fields: Field[]
  mode: 'gallery' | 'list'
}) {
  const { t } = useModuleTranslation()
  const colors = useViewColors()

  return (
    <Box aria-label={t(mode)} as="ul" className={`monolith-database-${mode}`}>
      {records.map(record => {
        return (
          <Box
            key={record.id}
            as="li"
            className="monolith-collection-item"
            style={colors.style(record)}
          >
            {mode === 'gallery' && record.appearance?.cover ? (
              <AppearanceContext
                value={{ appearance: record.appearance, readOnly: true }}
              >
                <AppearanceCover />
              </AppearanceContext>
            ) : (
              mode === 'gallery' && (
                <Box aria-hidden="true" className="monolith-gallery-cover">
                  <Icon
                    icon={
                      record.appearance?.icon ??
                      (record.item_type === 'project'
                        ? 'lucide:layers'
                        : record.done
                          ? 'lucide:circle-check'
                          : 'lucide:file-text')
                    }
                  />
                </Box>
              )
            )}
            <Stack className="monolith-collection-body" gap="sm" minWidth="0">
              <RecordLink className="monolith-collection-title" record={record}>
                {record.title}
              </RecordLink>
              <DatabaseCardProperties fields={fields} record={record} />
            </Stack>
          </Box>
        )
      })}
      {!records.length && (
        <Box as="li" p="lg">
          <Text color="muted">{t('noRecords')}</Text>
        </Box>
      )}
    </Box>
  )
}
