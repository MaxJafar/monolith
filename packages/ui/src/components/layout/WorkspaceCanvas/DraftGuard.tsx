import { useTranslation } from 'react-i18next'
import { useBeforeUnload, useBlocker } from 'react-router'

import { Button } from '@/components/inputs'
import { Flex, Text } from '@/components/primitives'

export function CanvasDraftGuard({
  dirty,
  pending
}: {
  dirty: boolean
  pending: boolean
}) {
  const { t } = useTranslation('common.canvas')
  const blocker = useBlocker(dirty)

  useBeforeUnload(event => {
    if (!dirty) return
    event.preventDefault()
    event.returnValue = ''
  })
  if (blocker.state !== 'blocked') return null

  return (
    <Flex gap="sm" role="alert" wrap="wrap">
      <Text>{t(pending ? 'saving' : 'unsaved')}</Text>
      <Button
        namespace={false}
        variant="secondary"
        onClick={() => blocker.reset()}
      >
        {t('keepEditing')}
      </Button>
      <Button
        dangerous
        disabled={pending}
        namespace={false}
        onClick={() => blocker.proceed()}
      >
        {t('discard')}
      </Button>
    </Flex>
  )
}
