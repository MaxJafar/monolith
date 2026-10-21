// SPDX-License-Identifier: 0BSD
import ClientError from '../response/ClientError'

function constraintFailure(code: unknown, detail: string): ClientError | null {
  if (code !== '23503' && code !== '23505') return null
  const field = detail.match(/Key \(([^)]+)\)=/)?.[1]
  if (code === '23505')
    return new ClientError(
      field ? 'Duplicate value for "' + field + '"' : 'Duplicate value',
      409
    )
  const table = detail.match(/is not present in table "([^"]+)"/)?.[1]
  return new ClientError(
    table && field
      ? 'Related "' + table + '" record not found (' + field + ')'
      : 'Related record not found',
    404
  )
}
/** Use SQLSTATE and column names; never return driver SQL, parameter values or stack traces. */
export function mapDatabaseError(error: unknown): ClientError | null {
  const seen = new WeakSet<object>()
  for (let item = error; item !== null && typeof item === 'object';) {
    if (seen.has(item)) break
    seen.add(item)
    const cause = item as { code?: unknown; detail?: unknown; cause?: unknown }
    const mapped = constraintFailure(
      cause.code,
      typeof cause.detail === 'string' ? cause.detail : ''
    )
    if (mapped) return mapped
    item = cause.cause
  }
  return null
}
