import { useQuery } from '@tanstack/react-query'

import { workspaceAPI } from '@/manifest'

import useFilter from './useFilter'

export default function useTransactionsQuery() {
  const {
    searchQuery,
    type,
    category,
    platform,
    asset,
    ledger,
    startDate,
    endDate,
    page
  } = useFilter()

  return useQuery(
    workspaceAPI.transactions.list
      .input({
        q: searchQuery || undefined,
        type: type ? (type as 'income' | 'expenses' | 'transfer') : undefined,
        category: category || undefined,
        platform: platform || undefined,
        asset: asset || undefined,
        ledger: ledger || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page: String(page)
      })
      .queryOptions()
  )
}
