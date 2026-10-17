import { Link } from 'react-router'

import { useModuleTranslation } from '@monolith/localization'
import { Button, Flex, Stack } from '@monolith/ui'

import { useTechLab } from '@/TechLabContext'
import { InventoryImport } from '@/components/InventoryImport'
import { SettingsEditor } from '@/components/SettingsEditor'
import { sectionParams } from '@/utils/navigation'

export default function ImportView() {
  const { data, params } = useTechLab()
  const { t } = useModuleTranslation()

  const settings = params.get('panel') === 'settings'

  if (!data) return null

  return (
    <Stack gap="lg">
      <Flex gap="sm" wrap="wrap">
        <Button
          aria-current={!settings ? 'page' : undefined}
          as={Link}
          namespace={false}
          to={{ search: sectionParams('import').toString() }}
          variant={settings ? 'secondary' : 'primary'}
        >
          {t('import.title')}
        </Button>
        <Button
          aria-current={settings ? 'page' : undefined}
          as={Link}
          namespace={false}
          to={{
            search: sectionParams('import', { panel: 'settings' }).toString()
          }}
          variant={settings ? 'primary' : 'secondary'}
        >
          {t('settings.title')}
        </Button>
      </Flex>
      {settings ? (
        <SettingsEditor settings={data.settings} />
      ) : (
        <InventoryImport />
      )}
    </Stack>
  )
}
