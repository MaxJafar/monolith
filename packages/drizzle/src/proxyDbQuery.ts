// SPDX-License-Identifier: 0BSD
const rawDatabase = Symbol.for('monolith.rawDb')

export function proxyDbQuery<T extends object>(
  database: T,
  names: Record<string, string>
): T {
  const aliases = new Map(Object.entries(names))
  const cache = new Map<PropertyKey, { source: unknown; result: unknown }>()
  const queryFacade = (queries: object) =>
    new Proxy(queries, {
      get(target, name) {
        return Reflect.get(
          target,
          typeof name === 'string' ? (aliases.get(name) ?? name) : name,
          target
        )
      }
    })
  return new Proxy(database, {
    get(target, name) {
      if (name === rawDatabase) return target
      const source = Reflect.get(target, name, target)
      const cached = cache.get(name)
      if (cached && cached.source === source) return cached.result
      let result: unknown = source
      if (name === 'query' && source && typeof source === 'object')
        result = queryFacade(source)
      else if (typeof source === 'function') {
        result =
          name === 'transaction'
            ? (callback: (tx: T) => unknown, ...args: unknown[]) =>
                Reflect.apply(source, target, [
                  (tx: T) => callback(proxyDbQuery(tx, names)),
                  ...args
                ])
            : source.bind(target)
      }
      cache.set(name, { source, result })
      return result
    }
  })
}

export function scopeDbForModule<T extends object>(
  database: T,
  names: Record<string, string> | undefined
): T {
  if (names === undefined) return database
  const underlying = Reflect.get(database, rawDatabase)
  return proxyDbQuery(
    underlying && typeof underlying === 'object' ? (underlying as T) : database,
    names
  )
}
