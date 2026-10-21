// SPDX-License-Identifier: 0BSD
import {
  type QueryKey,
  type UseMutationResult,
  useMutation,
  useQueryClient
} from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import type { EndpointClient } from '../proxy'
import type { InferRawInput, InferRawOutput } from '../types/socket'

let reportFailure: ((message: string) => void) | undefined
export function setApiMutationErrorHandler(
  handler: (message: string) => void
): void {
  reportFailure = handler
}
interface MutationPreferences {
  action: string
  queryKey?: QueryKey | QueryKey[]
  onSuccess?: () => void
  onError?: (error: Error) => void
}

export function useApiMutation<Contract extends { __isEndpointContract: true }>(
  endpoint: EndpointClient<Contract>,
  preferences: MutationPreferences
): UseMutationResult<
  InferRawOutput<Contract>,
  Error,
  InferRawInput<Contract>['body']
> {
  const cache = useQueryClient()
  const translation = useTranslation(['common.fetch'])
  const options = endpoint.mutationOptions()
  return useMutation({
    ...options,
    async onSuccess() {
      const requested = preferences.queryKey
      const keys: QueryKey[] = !requested
        ? []
        : Array.isArray(requested[0])
          ? (requested as QueryKey[])
          : [requested as QueryKey]
      await Promise.all(
        keys.map(queryKey => cache.invalidateQueries({ queryKey }))
      )
      preferences.onSuccess?.()
    },
    onError(error) {
      if (preferences.onError) {
        preferences.onError(error)
        return
      }
      const actionKey = 'common.fetch:action.' + preferences.action
      const label = translation.i18n.exists?.(actionKey)
        ? translation.t(actionKey)
        : preferences.action
      reportFailure?.(translation.t('common.fetch:failure', { action: label }))
    }
  })
}
