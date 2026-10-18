import { useTranslation } from 'react-i18next'

import { Stack, Text } from '@monolith/ui'

import WidgetCatalog from '@/system/moduleManager/pages/Modules/components/WidgetCatalog'

export default function WidgetSettings() {
  const { t } = useTranslation('common.module-manager')
  return (
    <Stack gap="md">
      <Text size="sm" color="muted">
        {t('shop.sidebarHelp')}
      </Text>
      <WidgetCatalog search="" sidebar />
    </Stack>
  )
}
