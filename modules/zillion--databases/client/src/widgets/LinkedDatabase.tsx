import z from 'zod'

import type { WidgetConfig } from '@lifeforge/configs'
import { useModuleTranslation } from '@lifeforge/localization'
import { Stack, Text } from '@lifeforge/ui'

import { DatabaseProvider, useDatabases } from '@/DatabaseProvider'
import { BaseBrowser } from '@/components/BaseBrowser'

const sourceSchema = z.object({
  workspaceId: z.string().uuid(),
  baseId: z.string().uuid(),
  viewId: z.string().uuid().optional()
})

function View() {
  const { loading, error, base } = useDatabases()
  const { t } = useModuleTranslation()

  if (loading) return <Text role="status">{t('loading')}</Text>
  if (error || !base)
    return <Text role="alert">{error || t('sourceUnavailable')}</Text>

  return (
    <Stack minWidth="0">
      <BaseBrowser />
    </Stack>
  )
}

export default function LinkedDatabase({ filter = '' }: { filter?: string }) {
  const { t } = useModuleTranslation()

  let source: z.infer<typeof sourceSchema>

  try {
    source = sourceSchema.parse(JSON.parse(filter))
  } catch {
    return <Text role="alert">{t('chooseDatabaseView')}</Text>
  }

  return (
    <DatabaseProvider
      baseId={source.baseId}
      viewId={source.viewId}
      workspaceId={source.workspaceId}
    >
      <View />
    </DatabaseProvider>
  )
}

export const config: WidgetConfig = {
  id: 'linkedDatabase',
  icon: 'lucide:database'
}
