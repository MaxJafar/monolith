import { ModalHeader, Stack, WithQueryData } from '@monolith/ui'

import { workspaceAPI } from '@/manifest'

import Details from './components/Details'
import Header from './components/Header'

function ViewTransactionModal({
  data: { id },
  onClose
}: {
  data: {
    id: string
  }
  onClose: () => void
}) {
  return (
    <Stack gap="xl" minWidth="30vw">
      <ModalHeader
        icon="tabler:eye"
        title="transactions.view"
        onClose={onClose}
      />
      <WithQueryData
        contract={workspaceAPI.transactions.getById.input({
          id
        })}
      >
        {transaction => (
          <>
            <Header transaction={transaction} />
            <Details transaction={transaction} />
          </>
        )}
      </WithQueryData>
    </Stack>
  )
}

export default ViewTransactionModal
