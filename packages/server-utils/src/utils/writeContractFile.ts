// SPDX-License-Identifier: 0BSD
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { basename, join, resolve } from 'node:path'
import { format } from 'prettier'

import { isSuccessOutputKey } from '../response'

// These records accept Zod instances as well as already serialized metadata.
type Dictionary = Record<string, any>
function record(value: unknown): value is Dictionary {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
function normalizeSchema(value: unknown, inIntersection = false): any {
  if (Array.isArray(value))
    return value.map(item => normalizeSchema(item, inIntersection))
  if (!record(value)) return value
  const copy: Dictionary = Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      normalizeSchema(item, inIntersection || key === 'allOf')
    ])
  )
  if (copy.type === 'object' && record(copy.propertyNames)) {
    const keys: unknown = copy.propertyNames.enum
    if (Array.isArray(keys) && record(copy.additionalProperties)) {
      copy.properties = {
        ...copy.properties,
        ...Object.fromEntries(
          keys
            .filter(key => typeof key === 'string')
            .map(key => [key, copy.additionalProperties])
        )
      }
      copy.additionalProperties = false
    } else if (!Array.isArray(keys)) delete copy.propertyNames
  }
  if (inIntersection) delete copy.additionalProperties
  return copy
}
function schemaJSON(value: unknown): any {
  if (!record(value) || typeof value.toJSONSchema !== 'function') return value
  return normalizeSchema(
    value.toJSONSchema({
      unrepresentable: 'any',
      override: ({
        zodSchema,
        jsonSchema
      }: {
        zodSchema: Dictionary
        jsonSchema: Dictionary
      }) => {
        if (zodSchema?._zod?.def?.type === 'date') {
          Object.assign(jsonSchema, { type: 'string', format: 'date-time' })
        }
      }
    })
  )
}
export function serializeEndpointValue(value: Dictionary) {
  let output = value.output
  if (record(output)) {
    output = Object.fromEntries(
      Object.entries(output)
        .filter(([key]) => isSuccessOutputKey(key))
        .map(([key, schema]) => [key, schemaJSON(schema)])
    )
  }
  return {
    method: value.method,
    description: value.description,
    noAuth: value.noAuth,
    encrypted: value.encrypted,
    isDownloadable: value.isDownloadable,
    media: value.media ?? null,
    input: {
      query: schemaJSON(value.schema?.query),
      body: schemaJSON(value.schema?.body)
    },
    output
  }
}
export function serializeRoutes(tree: unknown): any {
  const ancestors = new Set<object>()
  function visit(value: unknown): any {
    if (!record(value)) return value
    if (typeof value.getValue === 'function')
      return serializeEndpointValue(value.getValue())
    if (ancestors.has(value))
      throw new TypeError('A route tree cannot contain a cycle')
    ancestors.add(value)
    const children = Object.entries(value).map(
      ([key, child]) => [key, visit(child)] as const
    )
    ancestors.delete(value)
    return Object.fromEntries(children.filter(([, child]) => record(child)))
  }
  return visit(tree)
}
export async function writeContractFileToClient(
  routes: unknown,
  serverRootDir: string,
  clientDir = '../client'
): Promise<void> {
  if (
    process.env.NODE_ENV === 'production' ||
    basename(serverRootDir) === 'dist'
  )
    return
  const destination = resolve(serverRootDir, clientDir)
  const output = join(destination, 'contract.ts')
  const content = await format(
    'export const contract = ' +
      JSON.stringify(serializeRoutes(routes), null, 2) +
      ' as const\n\nexport default contract\n',
    {
      parser: 'typescript',
      printWidth: 80,
      singleQuote: true,
      semi: false,
      trailingComma: 'none'
    }
  )
  try {
    if ((await readFile(output, 'utf8')) === content) return
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
  await mkdir(destination, { recursive: true })
  const temporary = output + '.' + randomUUID() + '.tmp'
  try {
    await writeFile(temporary, content, { flag: 'wx' })
    await rename(temporary, output)
  } finally {
    await unlink(temporary).catch(error => {
      if (error.code !== 'ENOENT') throw error
    })
  }
}
