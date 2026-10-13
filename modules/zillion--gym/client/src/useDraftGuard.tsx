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
  blocker,
  recoverable = false
}: {
  recoverable?: boolean
  blocker: ReturnType<typeof useDraftGuard>['blocker']
}) {
  const { t } = useModuleTranslation()

  if (blocker.state !== 'blocked') return null

  return (
    <Card role="alert">
      <Flex gap="md" wrap="wrap">
        <Text>{t(recoverable ? 'workout.leaveHelp' : 'messages.unsaved')}</Text>
        <Button variant="secondary" onClick={() => blocker.reset()}>
          keepEditing
        </Button>
        <Button dangerous={!recoverable} onClick={() => blocker.proceed()}>
          {recoverable ? 'leaveWithRecovery' : 'discardChanges'}
        </Button>
      </Flex>
    </Card>
  )
}
