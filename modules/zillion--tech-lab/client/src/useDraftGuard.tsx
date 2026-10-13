import { useRef } from 'react'
import { useBeforeUnload, useBlocker } from 'react-router'

import { useModuleTranslation } from '@lifeforge/localization'
import { Button, Card, Flex, Text } from '@lifeforge/ui'

export function useDraftGuard(dirty: boolean) {
  const changed = useRef(dirty)
  const skip = useRef(false)

  changed.current = dirty

  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (skip.current) {
      skip.current = false

      return false
    }

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
      skip.current = true
    }
  }
}

export function DraftNotice({
  blocker
}: {
  blocker: ReturnType<typeof useDraftGuard>['blocker']
}) {
  const { t } = useModuleTranslation()

  if (blocker.state !== 'blocked') return null

  return (
    <Card gap="md" role="alert">
      <Text>{t('messages.unsaved')}</Text>
      <Flex gap="sm" wrap="wrap">
        <Button variant="secondary" onClick={() => blocker.reset()}>
          keepEditing
        </Button>
        <Button dangerous onClick={() => blocker.proceed()}>
          discardChanges
        </Button>
      </Flex>
    </Card>
  )
}
