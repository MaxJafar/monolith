import { useState } from 'react'

import { useModuleTranslation } from '@monolith/localization'
import { Box, Button, Flex, ModuleHeader, Stack } from '@monolith/ui'

import CategoriesPanel from './components/CategoriesPanel'
import EntriesPanel from './components/EntriesPanel'

const panels = { categories: CategoriesPanel, entries: EntriesPanel }

export default function Blog() {
  const { t } = useModuleTranslation()
  const [active, setActive] = useState<keyof typeof panels>('entries')

  const Panel = panels[active]

  return (
    <>
      <ModuleHeader />
      <Box flex="1" minHeight="0" overflowY="auto" p={{ base: 'sm', md: 'lg' }}>
        <Stack gap="lg" maxWidth="80rem" width="100%">
          <Flex aria-label={t('title')} gap="sm" role="navigation" wrap="wrap">
            {(Object.keys(panels) as (keyof typeof panels)[]).map(entity => (
              <Button
                key={entity}
                aria-pressed={active === entity}
                namespace={false}
                variant={active === entity ? 'primary' : 'secondary'}
                onClick={() => setActive(entity)}
              >
                {t('entities.' + entity)}
              </Button>
            ))}
          </Flex>
          <Panel key={active} />
        </Stack>
      </Box>
    </>
  )
}
