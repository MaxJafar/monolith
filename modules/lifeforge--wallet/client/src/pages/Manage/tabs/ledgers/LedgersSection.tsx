import { useState } from 'react'

import {
  EmptyStateScreen,
  SearchInput,
  Stack,
  WithQuery,
  surface
} from '@lifeforge/ui'

import useEntityBreakdown from '@/hooks/useEntityBreakdown'
import { useWalletData } from '@/hooks/useWalletData'

import LedgerItem from './LedgerItem'

function LedgersSection() {
  const { ledgersQuery } = useWalletData()
  const { data: breakdown } = useEntityBreakdown()
  const [searchQuery, setSearchQuery] = useState('')

  const query = searchQuery.trim().toLowerCase()

  return (
    <>
      <SearchInput
        bg={surface.lightInteractive}
        debounceMs={300}
        my="md"
        searchTarget="ledger"
        value={searchQuery}
        onChange={setSearchQuery}
      />
      <WithQuery query={ledgersQuery}>
        {ledgers => {
          if (ledgers.length === 0) {
            return (
              <EmptyStateScreen
                icon="tabler:wallet-off"
                message={{
                  id: 'ledger'
                }}
              />
            )
          }

          const filtered = ledgers.filter(ledger =>
            ledger.name.toLowerCase().includes(query)
          )

          if (filtered.length === 0) {
            return (
              <EmptyStateScreen
                icon="tabler:search-off"
                message={{
                  id: 'results'
                }}
              />
            )
          }

          return (
            <Stack>
              {filtered.map(ledger => (
                <LedgerItem
                  key={ledger.id}
                  breakdown={breakdown?.ledgers[ledger.id]}
                  ledger={ledger}
                />
              ))}
            </Stack>
          )
        }}
      </WithQuery>
    </>
  )
}

export default LedgersSection
