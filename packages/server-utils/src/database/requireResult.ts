import ClientError from '../response/ClientError'

/** Narrow a database result and report missing rows without unsafe assertions. */
export function requireResult<T>(
  value: T | undefined,
  message = 'Record not found',
  code = 404
): T {
  if (value === undefined) {
    throw new ClientError(message, code)
  }

  return value
}
