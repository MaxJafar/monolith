import ClientError from '../response/ClientError'

/** Unwrap driver errors without following cycles or exposing SQL and values. */
export function mapDatabaseError(error: unknown): ClientError | null {
  const visited = new Set<object>()
  let cursor = error
  while (cursor && typeof cursor === 'object' && !visited.has(cursor)) {
    visited.add(cursor)
    const candidate = cursor as {
      code?: unknown
      detail?: unknown
      cause?: unknown
    }
    const detail = typeof candidate.detail === 'string' ? candidate.detail : ''
    if (candidate.code === '23505') {
      const field = /Key \(([^)]+)\)=/.exec(detail)?.[1]
      return new ClientError(
        field ? `Duplicate value for "${field}"` : 'Duplicate value',
        409
      )
    }
    if (candidate.code === '23503') {
      const field = /Key \(([^)]+)\)=/.exec(detail)?.[1]
      const table = /is not present in table "([^"]+)"/.exec(detail)?.[1]
      return new ClientError(
        table && field
          ? `Related "${table}" record not found (${field})`
          : 'Related record not found',
        404
      )
    }
    cursor = candidate.cause
  }
  return null
}
