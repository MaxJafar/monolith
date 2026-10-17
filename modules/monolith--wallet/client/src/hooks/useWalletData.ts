import { useQuery } from '@tanstack/react-query'

import type { InferOutput } from '@monolith/api'

import { workspaceAPI } from '@/manifest'

export type WalletTransaction = InferOutput<
  typeof workspaceAPI.transactions.list
>['groups'][number]['items'][number]

export type WalletAsset = InferOutput<typeof workspaceAPI.assets.list>[number]

export type WalletLedger = InferOutput<typeof workspaceAPI.ledgers.list>[number]

export type WalletCategory = InferOutput<
  typeof workspaceAPI.categories.list
>[number]

export type WalletPlatform = InferOutput<typeof workspaceAPI.platforms.list>[number]

export type WalletTemplate = InferOutput<typeof workspaceAPI.templates.list>[
  'income' | 'expenses'][number]

export function useWalletData() {
  const transactionsQuery = useQuery(workspaceAPI.transactions.list.queryOptions())
  const assetsQuery = useQuery(workspaceAPI.assets.list.queryOptions())
  const ledgersQuery = useQuery(workspaceAPI.ledgers.list.queryOptions())
  const categoriesQuery = useQuery(workspaceAPI.categories.list.queryOptions())
  const platformsQuery = useQuery(workspaceAPI.platforms.list.queryOptions())
  const templatesQuery = useQuery(workspaceAPI.templates.list.queryOptions())

  const typesCountQuery = useQuery(
    workspaceAPI.analytics.getTypesCount.queryOptions()
  )

  return {
    transactionsQuery,
    assetsQuery,
    ledgersQuery,
    categoriesQuery,
    platformsQuery,
    templatesQuery,
    typesCountQuery
  }
}
