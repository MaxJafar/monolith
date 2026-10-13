import { useRef } from 'react'
import { useBeforeUnload, useBlocker } from 'react-router'

import { useModuleTranslation } from '@lifeforge/localization'
import { Button, Card, Flex, Text } from '@lifeforge/ui'

export function useDraftGuard(dirty: boolean) {
  const changed = useRef(dirty)

  changed.current = dirty
  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    return (
      changed.current &&
      currentLocation.pathname + currentLocation.search !==
        nextLocation.pathname + nextLocation.search
    )
  })
  useBeforeUnload(event => {
    if (changed.current) {
      event.preventDefault()
      event.returnValue = ''
    }
  })

  return {
    blocker,
    allowNavigation: () => {
      changed.current = false
    }
  }
}

export function DraftNotice({
  blocker
}: {
  blocker: ReturnType<typeof useDraftGuard>['blocker']
}) {
  if (blocker.state !== 'blocked') return null

  return (
    <DraftConfirmation
      onDiscard={blocker.proceed}
      onKeepEditing={blocker.reset}
    />
  )
}

export function DraftConfirmation({
  onKeepEditing,
  onDiscard
}: {
  onKeepEditing: () => void
  onDiscard: () => void
}) {
  const { t } = useModuleTranslation()

  return (
    <Card role="alert">
      <Flex align="center" gap="md" wrap="wrap">
        <Text>{t('docs.unsaved')}</Text>
        <Button
          autoFocus
          namespace={false}
          variant="secondary"
          onClick={onKeepEditing}
        >
          {t('docs.keepEditing')}
        </Button>
        <Button dangerous namespace={false} onClick={onDiscard}>
          {t('docs.discard')}
        </Button>
      </Flex>
    </Card>
  )
}
