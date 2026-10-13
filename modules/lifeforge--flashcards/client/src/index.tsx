import { useState } from 'react'

import { useModuleTranslation } from '@lifeforge/localization'
import { Box, Button, Flex, ModuleHeader, Stack } from '@lifeforge/ui'

import CardsPanel from './components/CardsPanel'
import DecksPanel from './components/DecksPanel'
import StudyPanel from './components/StudyPanel'
import TagsPanel from './components/TagsPanel'

const panels = {
  tags: TagsPanel,
  decks: DecksPanel,
  cards: CardsPanel,
  study: StudyPanel
}

export default function Flashcards() {
  const { t } = useModuleTranslation()
  const [active, setActive] = useState<keyof typeof panels>('decks')

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
                {t(entity === 'study' ? entity : 'entities.' + entity)}
              </Button>
            ))}
          </Flex>
          <Panel key={active} />
        </Stack>
      </Box>
    </>
  )
}
