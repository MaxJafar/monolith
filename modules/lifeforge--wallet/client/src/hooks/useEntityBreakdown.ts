import { useQuery } from '@tanstack/react-query'

import { forgeAPI } from '@/manifest'
import { useWalletRange } from '@/providers/RangeProvider'

export type EntityBreakdown = Record<
  string,
  { income: number; expenses: number; count: number }
>

export default function useEntityBreakdown() {
  const { queryInput } = useWalletRange()

  return useQuery(
    forgeAPI.analytics.getEntityBreakdown.input(queryInput).queryOptions()
  )
}
