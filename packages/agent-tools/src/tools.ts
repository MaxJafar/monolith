import { fullFormats } from 'ajv-formats/dist/formats.js'
import { Ajv2020 } from 'ajv/dist/2020.js'
import { z } from 'zod'

import type { MonolithClient } from './client.js'
import { editorTools } from './editor-tools.js'
import {
  type JsonObject,
  MonolithError,
  type Policy,
  type Tool
} from './types.js'

const catalogSchema = z.object({
  version: z.literal(1),
  tools: z
    .array(
      z.object({
        name: z.string().regex(/^monolith_[a-z0-9_]{1,54}$/),
        description: z.string().max(4000),
        access: z.enum(['read', 'write', 'delete']),
        method: z.enum(['GET', 'POST']),
        path: z
          .string()
          .regex(
            /^\/api\/(modules\/[a-f0-9]{64}\/[a-zA-Z/]+|entities\/(search|resolve|context))$/
          ),
        inputSchema: z.object({ type: z.literal('object') }).passthrough()
      })
    )
    .max(200)
})
export function permitted(tool: Tool, policy: Policy) {
  return (
    tool.access === 'read' ||
    (policy.allowWrites && (tool.access !== 'delete' || policy.allowDeletes))
  )
}

export class ToolService {
  constructor(
    readonly client: MonolithClient,
    readonly policy: Policy
  ) {}
  async list(signal?: AbortSignal): Promise<Tool[]> {
    const catalog = catalogSchema.parse(
      await this.client.api(
        '/api/integrations/catalog',
        'GET',
        undefined,
        signal
      )
    )
    const tools: Tool[] = [...catalog.tools, ...editorTools]
    if (new Set(tools.map(tool => tool.name)).size !== tools.length)
      throw new MonolithError(
        'Server catalog contains duplicate tool names.',
        'invalid_catalog'
      )
    return tools.filter(tool => permitted(tool, this.policy))
  }
  async get(name: string, signal?: AbortSignal) {
    const fullName = name.startsWith('monolith_') ? name : `monolith_${name}`
    const tool = (await this.list(signal)).find(tool => tool.name === fullName)
    if (!tool)
      throw new MonolithError(
        'Tool is unavailable or disabled by the access policy. Run tools list; writes need --allow-writes and deletions also need --allow-deletes.',
        'tool_unavailable'
      )
    return tool
  }
  async call(
    name: string,
    args: unknown,
    signal?: AbortSignal
  ): Promise<unknown> {
    const tool = await this.get(name, signal)
    const ajv = new Ajv2020({
      strict: false,
      allErrors: true,
      validateFormats: true,
      formats: fullFormats
    })
    const validate = ajv.compile(tool.inputSchema)
    if (!validate(args))
      throw new MonolithError(
        `Invalid tool input: ${ajv.errorsText(validate.errors, { separator: '; ' })}`,
        'invalid_arguments'
      )
    const input = args as JsonObject
    let path = tool.path
    const params = new URLSearchParams()
    let body: unknown = input.body
    if (editorTools.some(editor => editor.name === tool.name)) {
      path = path
        .replace('{kind}', encodeURIComponent(String(input.kind)))
        .replace('{id}', encodeURIComponent(String(input.id)))
      params.set('workspaceId', String(input.workspaceId))
      body =
        tool.method === 'PUT'
          ? {
              expectedRevision: input.expectedRevision,
              snapshot: input.snapshot
            }
          : undefined
    } else {
      const query = (input.query ?? {}) as JsonObject
      for (const [key, value] of Object.entries(query)) {
        if (typeof value === 'object')
          throw new MonolithError(
            'Query parameters must be scalar values.',
            'invalid_arguments'
          )
        if (value !== undefined) params.set(key, String(value))
      }
      // POST endpoints with entirely optional bodies still expect an object.
      if (tool.method === 'POST' && body === undefined) body = {}
    }
    if (params.size) path += `?${params}`
    return this.client.api(path, tool.method, body, signal)
  }
}
