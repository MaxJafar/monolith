import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { getDesktopUpdater } from '@monolith/api'
import { Box, Button, Flex, Text } from '@monolith/ui'

import UpdateCard from './UpdateCard'
import { useDesktopUpdates } from './useDesktopUpdates'

export default function DesktopUpdateControls() {
  const controller = useDesktopUpdates()
  const dialog = useRef<HTMLDialogElement>(null)
  const { t } = useTranslation('common')

  useEffect(() => {
    void getDesktopUpdater()?.('ready').catch(() => {})
  }, [])

  return (
    <>
      <Box bottom="20px" position="fixed" right="20px" zIndex="100">
        <Button
          icon="lucide:download"
          namespace={false}
          variant="secondary"
          onClick={() => dialog.current?.showModal()}
        >
          {t('updates.title')}
          {['available', 'ready'].includes(controller.state?.phase ?? '')
            ? ' •'
            : ''}
        </Button>
      </Box>
      <dialog
        ref={dialog}
        aria-label={t('updates.title')}
        className="monolith-updates-dialog"
      >
        <Flex align="center" justify="between" mb="lg">
          <Text as="h1" size="xl">
            {t('updates.title')}
          </Text>
          <Button
            aria-label={t('updates.close')}
            icon="lucide:x"
            namespace={false}
            variant="plain"
            onClick={() => dialog.current?.close()}
          />
        </Flex>
        <UpdateCard
          canManage
          native
          error={controller.error}
          pending={controller.pending}
          state={controller.state}
          title={t('updates.desktop')}
          onAction={controller.act}
        />
      </dialog>
    </>
  )
}
