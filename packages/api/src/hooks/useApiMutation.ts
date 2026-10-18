import {
  type QueryKey,
  type UseMutationResult,
  useMutation,
  useQueryClient
} from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import type { EndpointClient } from '../proxy'
import type { InferRawInput, InferRawOutput } from '../types/socket'

let _errorHandler: ((message: string) => void) | null = null

export function setApiMutationErrorHandler(
  handler: (message: string) => void
) {
  _errorHandler = handler
}

interface UseApiMutationOptions {
  action: string
  queryKey?: QueryKey | QueryKey[]
  onSuccess?: () => void
  onError?: (error: Error) => void
}

export function useApiMutation<T extends { __isEndpointContract: true }>(
  endpoint: EndpointClient<T>,
  options: UseApiMutationOptions
): UseMutationResult<InferRawOutput<T>, Error, InferRawInput<T>['body']> {
  const queryClient = useQueryClient()
  const { t, i18n } = useTranslation(['common.fetch'])

  const actionFormatted =
    'exists' in i18n && i18n.exists(`common.fetch:action.${options.action}`)
      ? t(`common.fetch:action.${options.action}`)
      : options.action

  return useMutation(
    endpoint.mutationOptions({
      onSuccess: () => {
        if (Array.isArray(options.queryKey?.[0])) {
          for (const key of options.queryKey as QueryKey[]) {
            queryClient.invalidateQueries({ queryKey: key })
          }
        } else if (options.queryKey) {
          queryClient.invalidateQueries({
            queryKey: options.queryKey
          })
        }
        options.onSuccess?.()
      },
      onError: error => {
        console.error(`[useApiMutation] ${options.action} failed:`, error)

        if (options.onError) {
          options.onError(error)
        } else {
          _errorHandler?.(
            t('common.fetch:failure', {
              action: actionFormatted
            })
          )
        }
      }
    })
  )
}
