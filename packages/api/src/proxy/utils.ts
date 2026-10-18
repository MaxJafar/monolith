type Data = Record<string, any>
const blocked = new Set(['__proto__', 'prototype', 'constructor'])

function record(value: unknown): value is Data {
  return (
    value !== null &&
    typeof value === 'object' &&
    (Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null)
  )
}

export function joinObjectsRecursively(target: Data, source: Data): Data {
  const work = [{ into: target, from: source, ancestors: new Set<object>() }]
  while (work.length) {
    const { into, from, ancestors } = work.pop()!
    if (!record(from)) continue
    if (ancestors.has(from)) throw new TypeError('Query input contains a cycle')
    const branch = new Set(ancestors).add(from)
    for (const [name, value] of Object.entries(from)) {
      if (blocked.has(name)) continue
      if (record(value)) {
        if (!record(into[name])) into[name] = {}
        work.push({ into: into[name], from: value, ancestors: branch })
      } else into[name] = value
    }
  }
  return target
}

function binary(value: unknown): value is Blob {
  return typeof Blob !== 'undefined' && value instanceof Blob
}

export function hasFile(data: Data | undefined): boolean {
  return Object.values(data ?? {}).some(
    value => binary(value) || (Array.isArray(value) && value.some(binary))
  )
}

export function getFormData(data: Data | undefined): FormData {
  const form = new FormData()
  const uploads: Array<[string, Blob]> = []
  for (const [name, value] of Object.entries(data ?? {})) {
    if (binary(value)) {
      uploads.push([name, value])
      continue
    }
    if (Array.isArray(value) && value.some(binary)) {
      if (!value.every(binary))
        throw new TypeError('Array contains a mix of File and non-File values')
      for (const file of value) uploads.push([name, file])
      continue
    }
    let encoded: string
    if (typeof value === 'string') encoded = value
    else if (value === undefined) encoded = 'undefined'
    else {
      const kind =
        value instanceof Date
          ? 'date'
          : Array.isArray(value)
            ? 'array'
            : typeof value
      encoded = '__type:' + kind + ';' + JSON.stringify(value)
    }
    form.append(name, encoded)
  }
  for (const [name, file] of uploads) form.append(name, file)
  return form
}
