import { ClientError } from '@monolith/server-utils'

export function ownerId(res: { locals: Record<string, unknown> }): string {
  const id = res.locals.userId

  if (
    typeof id !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  )
    throw new ClientError('Authentication required', 401)

  return id
}

/** Reject a write based on a version the client no longer has. */
export function checkUpdated(actual: Date, expected?: string) {
  if (!expected || actual.getTime() !== Date.parse(expected))
    throw new ClientError(
      'This item changed elsewhere. Reload before saving.',
      409
    )
}

/** A strictly increasing version, even within one millisecond. */
export function nextUpdated(previous?: Date, now = new Date()) {
  return new Date(Math.max(now.getTime(), (previous?.getTime() ?? 0) + 1))
}

export function notFound(what: string): never {
  throw new ClientError(`${what} not found`, 404)
}
