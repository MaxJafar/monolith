import { forgeAPI } from '@/manifest'

const scopedNames = new Set([
  'people',
  'snapshot',
  'createBase',
  'updateBase',
  'removeBase',
  'createRecord',
  'updateRecord',
  'removeRecord',
  'createField',
  'updateField',
  'removeField',
  'createView',
  'updateView',
  'removeView',
  'setLinks'
])

/** Bind the workspace before every request, including subsequent .input() calls. */
export function databaseAPI(workspaceId?: string): typeof forgeAPI {
  if (!workspaceId) return forgeAPI
  return new Proxy(forgeAPI, {
    get(target, key) {
      if (key === 'knowledge')
        return new Proxy(forgeAPI.knowledge, {
          get(_target, property) {
            const endpoint = Reflect.get(forgeAPI.workspaceGraph, property)
            const bound = endpoint.input({ workspace_id: workspaceId })
            return new Proxy(bound, {
              get(value, member) {
                if (member === 'input')
                  return (input: Record<string, unknown>) =>
                    endpoint.input({ ...input, workspace_id: workspaceId })
                const result = Reflect.get(value, member)
                return typeof result === 'function'
                  ? result.bind(value)
                  : result
              }
            })
          }
        })
      if (typeof key !== 'string' || !scopedNames.has(key))
        return Reflect.get(target, key)
      const endpoint = Reflect.get(forgeAPI.workspaceDatabases, key)
      const bind = (input: Record<string, unknown> = {}) => {
        const bound = endpoint.input({ ...input, workspace_id: workspaceId })
        return new Proxy(bound, {
          get(value, property) {
            if (property === 'input') return bind
            const member = Reflect.get(value, property)
            return typeof member === 'function' ? member.bind(value) : member
          }
        })
      }
      return bind()
    }
  })
}
