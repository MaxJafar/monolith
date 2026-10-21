// SPDX-License-Identifier: 0BSD
import { type InferOutput, contract, createApiClient } from '@monolith/api'

const client = createApiClient(contract)

export type CategoryOrder = Record<string, Record<string, string>>
export type FederatedModule = InferOutput<
  typeof client.modules.manifest
>['modules'][number]

export async function fetchCategoryOrder(host: string): Promise<CategoryOrder> {
  try {
    return (await client.modules.categories.list.setHost(host).query()) ?? {}
  } catch (error) {
    console.warn('Add-on category request failed', error)
    return {}
  }
}
export async function fetchModuleManifest(
  host: string
): Promise<FederatedModule[]> {
  try {
    const response = await client.modules.manifest.setHost(host).query()
    return response.modules ?? []
  } catch (error) {
    console.warn('Add-on manifest request failed', error)
    return []
  }
}
