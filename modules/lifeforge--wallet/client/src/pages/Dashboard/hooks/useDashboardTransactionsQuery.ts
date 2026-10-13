import { useQuery } from '@tanstack/react-query'

import { forgeAPI } from '@/manifest'
import { useWalletRange } from '@/providers/RangeProvider'

export default function useDashboardTransactionsQuery() {
  const { queryInput } = useWalletRange()

  return useQuery(forgeAPI.transactions.list.input(queryInput).queryOptions())
}
