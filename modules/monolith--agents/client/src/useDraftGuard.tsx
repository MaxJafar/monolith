import { useRef } from 'react'
import { useBeforeUnload, useBlocker } from 'react-router'

import { useModuleTranslation } from '@monolith/localization'
import { Button, Card, Flex, Text } from '@monolith/ui'

export function useDraftGuard(dirty: boolean) {
  const changed = useRef(dirty),
    skip = useRef(false)
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

  return blocker.state === 'blocked' ? (
    <Card role="alert">
      <Flex gap="sm" wrap="wrap">
        <Text>{t('unsaved')}</Text>
        <Button
          namespace={false}
          variant="secondary"
          onClick={() => blocker.reset()}
        >
          {t('keepEditing')}
        </Button>
        <Button dangerous namespace={false} onClick={() => blocker.proceed()}>
          {t('discard')}
        </Button>
      </Flex>
    </Card>
  ) : null
}
