// SPDX-License-Identifier: 0BSD
import { Output } from './status'
import type { OutputDefinition, OutputHelpers } from './types'

export function createOutputHelpers<T extends OutputDefinition | 'custom'>(
  definition: T
): OutputHelpers<T> {
  const helpers: Record<string, (payload?: unknown) => object> = {}
  if (definition !== 'custom') {
    for (const name of Object.keys(Output) as Array<keyof typeof Output>) {
      const descriptor = Output[name]
      if (descriptor.kind === 'success' && !Object.hasOwn(definition, name))
        continue
      helpers[descriptor.key] =
        'hasPayload' in descriptor
          ? payload => ({ $status: descriptor.$status, payload })
          : () => ({ $status: descriptor.$status })
    }
  }
  return helpers as OutputHelpers<T>
}
