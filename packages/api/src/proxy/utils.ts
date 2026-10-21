// SPDX-License-Identifier: 0BSD
type Fields = Record<string, any>
const reserved = ['__proto__', 'constructor', 'prototype']
function dictionary(value: unknown): value is Fields {
  if (!value || typeof value !== 'object') return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === null || prototype === Object.prototype
}

export function joinObjectsRecursively(target: Fields, source: Fields): Fields {
  const visiting = new WeakSet<object>()
  function merge(destination: Fields, incoming: unknown) {
    if (!dictionary(incoming)) return
    if (visiting.has(incoming))
      throw new TypeError('Query input contains a cycle')
    visiting.add(incoming)
    try {
      for (const key of Object.keys(incoming)) {
        if (reserved.includes(key)) continue
        const value = incoming[key]
        if (!dictionary(value)) {
          destination[key] = value
          continue
        }
        const nested =
          Object.hasOwn(destination, key) && dictionary(destination[key])
            ? destination[key]
            : {}
        merge(nested, value)
        destination[key] = nested
      }
    } finally {
      visiting.delete(incoming)
    }
  }
  merge(target, source)
  return target
}

const upload = (value: unknown): value is Blob =>
  typeof Blob !== 'undefined' && value instanceof Blob
export function hasFile(data: Fields | undefined): boolean {
  for (const value of Object.values(data ?? {})) {
    if (upload(value) || (Array.isArray(value) && value.some(upload)))
      return true
  }
  return false
}
function encodedField(value: unknown): string {
  if (value === undefined || typeof value === 'string') return String(value)
  const type =
    value instanceof Date
      ? 'date'
      : Array.isArray(value)
        ? 'array'
        : typeof value
  return '__type:' + type + ';' + JSON.stringify(value)
}
export function getFormData(data: Fields | undefined): FormData {
  const result = new FormData()
  const attachments = new FormData()
  for (const [name, value] of Object.entries(data ?? {})) {
    const files = upload(value)
      ? [value]
      : Array.isArray(value) && value.some(upload)
        ? value
        : null
    if (!files) {
      result.append(name, encodedField(value))
      continue
    }
    if (!files.every(upload))
      throw new TypeError('Array contains a mix of File and non-File values')
    for (const file of files) attachments.append(name, file)
  }
  attachments.forEach((file, name) => result.append(name, file))
  return result
}
