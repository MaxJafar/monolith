import type { WidgetConfig } from '@monolith/configs'
import { useModuleTranslation } from '@monolith/localization'
import { Stack, Text } from '@monolith/ui'
import { useTranslation } from 'react-i18next'
import z from 'zod'

import { DatabaseProvider, useDatabases } from '@/DatabaseProvider'
import { BaseBrowser } from '@/components/BaseBrowser'
import { InlineDatabaseFrame } from '@/components/InlineDatabaseFrame'
import { RecordEditor } from '@/components/RecordEditor'
import '@/styles.css'

const sourceSchema = z.object({
  workspaceId: z.string().uuid(),
  baseId: z.string().uuid(),
  viewId: z.union([z.string().uuid(), z.literal('')]).optional(),
  height: z.number().min(0).max(1200).optional()
})

function View() {
  const { loading, error, base, stale, record, closeRecord } = useDatabases()
  const { t } = useModuleTranslation()
  const { t: common } = useTranslation('common')

  if (loading) return <Text role="status">{t('loading')}</Text>
  if (!base) return <Text role="alert">{error || t('sourceUnavailable')}</Text>

  return (
    <Stack minWidth="0">
      {stale && (
        <Text color="muted" role="status">
          {common('documentEditor.stale')}
        </Text>
      )}
      {error && <Text role="alert">{error}</Text>}
      <BaseBrowser />
      {record && (
        <RecordEditor key={record.id} record={record} onDone={closeRecord} />
      )}
    </Stack>
  )
}

export default function LinkedDatabase({
  filter = '',
  onViewChange,
  onHeightChange
}: {
  filter?: string
  onViewChange?: (id: string) => void
  onHeightChange?: (height: number) => void
}) {
  const { t } = useModuleTranslation()

  let source: z.infer<typeof sourceSchema>

  try {
    source = sourceSchema.parse(JSON.parse(filter))
  } catch {
    return <Text role="alert">{t('chooseDatabaseView')}</Text>
  }

  return (
    <DatabaseProvider
      key={`${source.workspaceId}:${source.baseId}`}
      onViewChange={onViewChange}
      baseId={source.baseId}
      viewId={source.viewId}
      workspaceId={source.workspaceId}
    >
      <InlineDatabaseFrame
        height={source.height}
        onHeightChange={onHeightChange}
      >
        <View />
      </InlineDatabaseFrame>
    </DatabaseProvider>
  )
}

export const config: WidgetConfig = {
  id: 'linkedDatabase',
  icon: 'lucide:database'
}
