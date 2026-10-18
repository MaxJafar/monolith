import { type InferOutput, contract, createApiClient } from '@monolith/api'

const api = createApiClient(contract)
export type CategoryOrder = Record<string, Record<string, string>>
export type FederatedModule = InferOutput<
  typeof api.modules.manifest
>['modules'][number]

async function optional<T>(
  operation: () => Promise<T>,
  fallback: T,
  label: string
): Promise<T> {
  try {
    return (await operation()) ?? fallback
  } catch (error) {
    console.warn('Unable to load ' + label, error)
    return fallback
  }
}

export function fetchCategoryOrder(host: string): Promise<CategoryOrder> {
  return optional(
    () => api.modules.categories.list.setHost(host).query(),
    {},
    'addon categories'
  )
}
export function fetchModuleManifest(host: string): Promise<FederatedModule[]> {
  return optional(
    async () => (await api.modules.manifest.setHost(host).query()).modules,
    [],
    'addon manifest'
  )
}
