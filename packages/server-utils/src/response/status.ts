// SPDX-License-Identifier: 0BSD
function status<
  const N extends number,
  const K extends string,
  const T extends 'success' | 'error'
>($status: N, key: K, kind: T) {
  return { $status, key, kind }
}
function data<const T extends object>(entry: T) {
  return { ...entry, hasPayload: true as const }
}

export const Output = {
  OK: data(status(200, 'ok', 'success')),
  CREATED: data(status(201, 'created', 'success')),
  ACCEPTED: status(202, 'accepted', 'success'),
  NO_CONTENT: status(204, 'noContent', 'success'),
  BAD_REQUEST: data(status(400, 'badRequest', 'error')),
  UNAUTHORIZED: status(401, 'unauthorized', 'error'),
  FORBIDDEN: status(403, 'forbidden', 'error'),
  NOT_FOUND: status(404, 'notFound', 'error'),
  CONFLICT: status(409, 'conflict', 'error')
}
export type OutputType = typeof Output
type NamesOfKind<T> = {
  [K in keyof OutputType]: OutputType[K]['kind'] extends T ? K : never
}[keyof OutputType]
export type SuccessOutputKey = NamesOfKind<'success'>
export type ErrorOutputKey = NamesOfKind<'error'>

const descriptions = new Map<number, string>(
  Object.entries(Output).map(([name, entry]) => [
    entry.$status,
    name
      .toLowerCase()
      .replace(
        /(^|_)([a-z])/g,
        (_, gap: string, letter: string) =>
          (gap ? ' ' : '') + letter.toUpperCase()
      )
  ])
)
export function getStatusMessage(code: number): string {
  return descriptions.get(code) ?? 'Error'
}
export function isSuccessOutputKey(name: string): name is SuccessOutputKey {
  return (
    Object.hasOwn(Output, name) &&
    Output[name as keyof OutputType].kind === 'success'
  )
}
