import { Output } from './status'
import type { OutputDefinition, OutputHelpers } from './types'

/** Every route receives error helpers and only its declared success helpers. */
export function createOutputHelpers<T extends OutputDefinition | 'custom'>(
  definition: T
): OutputHelpers<T> {
  const methods =
    definition === 'custom'
      ? []
      : Object.entries(Output)
          .filter(
            ([name, entry]) =>
              entry.kind === 'error' || Object.hasOwn(definition, name)
          )
          .map(([, entry]) => [
            entry.key,
            (value?: unknown) => {
              const result: { $status: number; payload?: unknown } = {
                $status: entry.$status
              }
              if ('hasPayload' in entry && entry.hasPayload)
                result.payload = value
              return result
            }
          ])
  return Object.fromEntries(methods) as OutputHelpers<T>
}
