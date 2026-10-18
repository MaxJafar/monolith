import { useQuery } from '@tanstack/react-query'

import { workspaceAPI } from '@/manifest'
import { useWalletRange } from '@/providers/RangeProvider'

export default function useDashboardTransactionsQuery() {
  const { queryInput } = useWalletRange()

  return useQuery(workspaceAPI.transactions.list.input(queryInput).queryOptions())
}
