import { type ReactNode, useCallback } from 'react'

import { Flex, Icon, Text, ViewImageModal, useModalStore } from '@lifeforge/ui'

import { forgeAPI } from '@/manifest'

function TransactionParticular({
  receipt,
  children
}: {
  receipt?: string
  children: ReactNode
}) {
  const { open } = useModalStore()

  const handleViewReceipt = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      e.preventDefault()

      if (!receipt) return

      open(ViewImageModal, {
        src: forgeAPI.getMedia({ key: receipt })
      })
    },
    [receipt]
  )

  return (
    <Flex align="center" gap="sm" minWidth="0" width="100%">
      <Text truncate size="lg" weight="medium">
        {children}
      </Text>
      {receipt && (
        <button onClick={handleViewReceipt}>
          <Icon
            color={{ base: 'muted', print: 'zinc-500' }}
            icon="tabler:file-text"
          />
        </button>
      )}
    </Flex>
  )
}

export default TransactionParticular
