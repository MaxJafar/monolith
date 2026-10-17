import { useState } from 'react'

import { useModuleTranslation } from '@monolith/localization'
import { Button, Flex, FloatingPopover, Stack } from '@monolith/ui'

import CardsPanel from '@/components/CardsPanel'
import DecksPanel from '@/components/DecksPanel'
import StudyPanel from '@/components/StudyPanel'

export const config = {
  id: 'flashcardStudy',
  icon: 'tabler:cards',
  minW: 1,
  minH: 3
}
export default function FlashcardWidget({
  readOnly = false,
  filter = '',
  onConfigChange
}: {
  readOnly?: boolean
  filter?: string
  onConfigChange?: (value: string) => void
}) {
  const { t } = useModuleTranslation()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null),
    [tab, setTab] = useState<'decks' | 'cards'>('decks')
  return (
    <Stack gap="sm">
      <StudyPanel
        readOnly={readOnly}
        initialDeck={filter}
        onDeckChange={onConfigChange}
      />
      {!readOnly && (
        <Button
          namespace={false}
          icon="lucide:settings-2"
          variant="plain"
          onClick={event => setAnchor(event.currentTarget)}
        >
          {t('manageWidget')}
        </Button>
      )}
      {anchor && (
        <FloatingPopover
          anchor={anchor}
          width={520}
          label={t('manageWidget')}
          onClose={() => setAnchor(null)}
        >
          <Stack gap="md" maxHeight="65vh" overflowY="auto">
            <Flex gap="sm">
              {(['decks', 'cards'] as const).map(key => (
                <Button
                  key={key}
                  namespace={false}
                  variant="plain"
                  aria-pressed={tab === key}
                  onClick={() => setTab(key)}
                >
                  {t('entities.' + key)}
                </Button>
              ))}
            </Flex>
            {tab === 'decks' ? <DecksPanel /> : <CardsPanel />}
          </Stack>
        </FloatingPopover>
      )}
    </Stack>
  )
}
