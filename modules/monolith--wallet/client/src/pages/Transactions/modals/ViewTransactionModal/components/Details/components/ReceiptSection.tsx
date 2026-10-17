import { Button, ViewImageModal, useModalStore } from '@monolith/ui'

import { workspaceAPI } from '@/manifest'

import { useTransactionDetails } from '../TransactionDetailsContext'
import DetailItem from './DetailItem'

function ReceiptSection() {
  const transaction = useTransactionDetails()
  const { open } = useModalStore()

  if (!transaction.receipt) return null

  return (
    <DetailItem vertical icon="tabler:receipt" label="receipt">
      <Button
        icon="tabler:eye"
        variant="secondary"
        width="100%"
        onClick={() => {
          open(ViewImageModal, {
            src: workspaceAPI.getMedia({
              key: transaction.receipt || ''
            })
          })
        }}
      >
        View Receipt
      </Button>
    </DetailItem>
  )
}

export default ReceiptSection
