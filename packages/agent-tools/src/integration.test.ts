import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { type Server, createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { MonolithClient } from './client.js'
import { agentConfig } from './config.js'
import { request, serverOrigin } from './http.js'
import { ProfileStore } from './profiles.js'
import { ToolService } from './tools.js'
import type { Tool } from './types.js'

const entry = resolve('dist/cli.js')
const route = '/api/modules/' + 'a'.repeat(64) + '/workspaces/'
const id = randomUUID(),
  serverId = randomUUID(),
  accountId = randomUUID(),
  sessionId = randomUUID()
const fixtures: Tool[] = [
  {
    name: 'monolith_workspaces_list',
    access: 'read',
    method: 'GET',
    path: route + 'list',
    description: 'List workspaces',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false }
  },
  {
    name: 'monolith_pages_create',
    access: 'write',
    method: 'POST',
    path: route + 'createPage',
    description: 'Create page',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        query: {
          type: 'object',
          properties: { workspace_id: { type: 'string', format: 'uuid' } },
          required: ['workspace_id']
        },
        body: {
          type: 'object',
          properties: { title: { type: 'string' } },
          required: ['title']
        }
      },
      required: ['query', 'body']
    }
  },
  {
    name: 'monolith_pages_delete',
    access: 'delete',
    method: 'POST',
    path: route + 'removePage',
    description: 'Delete page',
    inputSchema: { type: 'object' }
  }
]
let directory: string,
  origin: string,
  server: Server,
  store: ProfileStore,
  client: MonolithClient
let refreshes: number,
  writes: number,
  access: string,
  refresh: string,
  revoked: boolean,
  requireTotp: boolean,
  hideCreate: boolean
const connections: Client[] = []

async function cli(args: string[], input = '') {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>(
    (resolve, reject) => {
      const child = spawn(process.execPath, [entry, ...args], {
        env: { ...process.env, MONOLITH_CONFIG_DIR: directory },
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe']
      })
      let stdout = '',
        stderr = ''
      child.stdout.on('data', chunk => {
        stdout += chunk
      })
      child.stderr.on('data', chunk => {
        stderr += chunk
      })
      child.on('error', reject)
      child.on('close', code => resolve({ code, stdout, stderr }))
      child.stdin.end(input)
    }
  )
}
async function mcp(writable = false) {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [entry, ...(writable ? ['--allow-writes'] : []), 'mcp'],
    env: { MONOLITH_CONFIG_DIR: directory },
    stderr: 'pipe'
  })
  const client = new Client({
    name: 'monolith-protocol-test',
    version: '1.0.0'
  })
  connections.push(client)
  await client.connect(transport)
  return client
}
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'monolith-agent-test-'))
  refreshes = writes = 0
  access = 'access-0'
  refresh = 'refresh-0'
  revoked = requireTotp = hideCreate = false
  server = createServer(async (req, res) => {
    res.setHeader('content-type', 'application/json')
    let raw = ''
    for await (const chunk of req) raw += chunk
    const body = raw ? JSON.parse(raw) : undefined
    const path = new URL(req.url!, origin).pathname
    const send = (status: number, value: unknown) => {
      res.writeHead(status)
      res.end(JSON.stringify(value))
    }
    const tokens = () => ({
      accessToken: access,
      refreshToken: refresh,
      accountId,
      sessionId,
      expiresIn: 900
    })
    if (path === '/.well-known/monolith')
      return send(200, { serverId, apiVersion: 1, publicUrl: origin })
    if (path === '/api/v1/device-sessions' && req.method === 'POST') {
      if (body.password !== 'test-only-password')
        return send(401, { message: 'Wrong password' })
      return send(
        201,
        requireTotp
          ? { state: 'totp_required', challenge: 'challenge' }
          : tokens()
      )
    }
    if (path === '/api/v1/device-sessions/totp')
      return send(
        body.code === '123456' ? 201 : 401,
        body.code === '123456' ? tokens() : { message: 'Bad code' }
      )
    if (path === '/api/v1/device-sessions/refresh') {
      if (revoked || body.refreshToken !== refresh)
        return send(401, { code: 'refresh_reused' })
      refreshes++
      access = `access-${refreshes}`
      refresh = `refresh-${refreshes}`
      return send(200, tokens())
    }
    if (req.headers.authorization !== `Bearer ${access}` || revoked)
      return send(401, {})
    if (
      path === `/api/v1/device-sessions/${sessionId}` &&
      req.method === 'DELETE'
    ) {
      revoked = true
      res.writeHead(204)
      return res.end()
    }
    if (path === '/api/v1/device-sessions')
      return send(200, [{ id: sessionId, current: true }])
    if (path === '/api/integrations/catalog')
      return send(200, {
        state: 'success',
        data: {
          version: 1,
          tools: hideCreate
            ? fixtures.filter(tool => tool.access === 'read')
            : fixtures
        }
      })
    if (path === route + 'list')
      return send(200, {
        state: 'success',
        data: [{ id, name: 'Test workspace' }]
      })
    if (path === route + 'createPage') {
      writes++
      if (new URL(req.url!, origin).searchParams.get('workspace_id') !== id)
        return send(403, { message: 'Read-only workspace' })
      return send(201, { state: 'success', data: { id, title: body.title } })
    }
    if (path.startsWith('/api/v1/editor-documents/')) {
      if (req.method === 'PUT') {
        writes++
        return send(409, {
          code: 'revision_conflict',
          message: 'Newer version',
          current: { revision: 8 }
        })
      }
      return send(200, {
        revision: 7,
        workspaceId: id,
        snapshot: { meta: { id } }
      })
    }
    if (path === '/redirect') {
      res.writeHead(302, { location: 'https://example.invalid/steal' })
      return res.end()
    }
    return send(404, {})
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`
  store = new ProfileStore('default', directory)
  client = new MonolithClient(store)
  await client.login(
    origin,
    'test@example.invalid',
    'test-only-password',
    async () => '123456'
  )
})
afterEach(async () => {
  await Promise.all(connections.splice(0).map(connection => connection.close()))
  server.closeAllConnections()
  await new Promise<void>(resolve => server.close(() => resolve()))
  await rm(directory, { recursive: true, force: true })
})

describe('authentication and transport', () => {
  it('logs in over CLI, completes TOTP and never prints credentials', async () => {
    await store.remove()
    requireTotp = true
    const result = await cli(
      ['auth', 'login', '--server', origin, '--credentials-stdin'],
      JSON.stringify({
        email: 'test@example.invalid',
        password: 'test-only-password',
        code: '123456'
      })
    )
    expect(result.code).toBe(0)
    expect(JSON.parse(result.stdout)).toMatchObject({
      server: origin,
      sessionId
    })
    expect(result.stdout + result.stderr).not.toMatch(
      /test-only-password|access-0|refresh-0/
    )
  })
  it('does not overwrite a live profile', async () => {
    await expect(
      client.login(origin, 'a', 'test-only-password', async () => '')
    ).rejects.toMatchObject({ code: 'already_signed_in' })
  })
  it('serializes refresh across multiple MCP processes sharing one profile', async () => {
    await store.save({ ...(await store.read()), expiresAt: 0 })
    const a = await mcp(),
      b = await mcp()
    const results = await Promise.all([
      a.listTools(),
      b.listTools(),
      client.status()
    ])
    expect(results).toHaveLength(3)
    expect(refreshes).toBe(1)
    expect((await store.read()).refreshToken).toBe('refresh-1')
  })
  it('refreshes on an authentication rejection exactly once', async () => {
    access = 'changed'
    await client.status()
    expect(refreshes).toBe(1)
  })
  it('recovers an abandoned lock without racing two refreshes', async () => {
    await store.save({ ...(await store.read()), expiresAt: 0 })
    await writeFile(
      store.file + '.lock',
      JSON.stringify({ pid: 2147483647, nonce: 'abandoned-test' })
    )
    const a = await mcp(),
      b = await mcp()
    await Promise.all([a.listTools(), b.listTools()])
    expect(refreshes).toBe(1)
  })
  it('revokes the session and removes local credentials on logout', async () => {
    expect(await client.logout()).toEqual({ signedOut: true, revoked: true })
    expect(revoked).toBe(true)
    await expect(store.read()).rejects.toMatchObject({ code: 'not_signed_in' })
  })
  it('rejects revoked sessions', async () => {
    revoked = true
    await expect(client.status()).rejects.toMatchObject({ status: 401 })
    expect(await client.logout()).toEqual({ signedOut: true, revoked: true })
    await expect(store.read()).rejects.toMatchObject({ code: 'not_signed_in' })
  })
  it('refuses insecure remote origins, URL credentials and redirects', async () => {
    for (const url of [
      'http://example.com',
      'https://user:secret@example.com',
      'https://example.com/api',
      'https://example.com/?x=1'
    ])
      expect(() => serverOrigin(url)).toThrow()
    await expect(
      request(origin, '/redirect', { token: access })
    ).rejects.toMatchObject({ code: 'connection_failed' })
    expect(serverOrigin('https://example.com/')).toBe('https://example.com')
  })
  it('keeps credentials out of all generated configurations', async () => {
    for (const target of [
      'claude',
      'openclaw',
      'cursor',
      'vscode',
      'generic'
    ]) {
      const config = agentConfig(
        target,
        'default',
        { allowWrites: true, allowDeletes: false },
        entry
      )
      expect(() => JSON.parse(config)).not.toThrow()
      expect(config).not.toMatch(/access-0|refresh-0|test-only-password/)
    }
    expect(
      agentConfig(
        'codex',
        'default',
        { allowWrites: false, allowDeletes: false },
        entry
      )
    ).toContain('[mcp_servers.monolith]')
  })
})

describe('CLI and real stdio MCP protocol', () => {
  it('initializes, lists typed tools, reads a resource and calls a tool', async () => {
    const m = await mcp()
    expect(m.getServerVersion()?.name).toBe('monolith')
    expect((await m.listTools()).tools.map(tool => tool.name)).toContain(
      'monolith_workspaces_list'
    )
    expect((await m.listResources()).resources[0]?.uri).toBe('monolith://guide')
    expect(
      (await m.readResource({ uri: 'monolith://guide' })).contents[0]
    ).toHaveProperty('text')
    const result = await m.callTool({
      name: 'monolith_workspaces_list',
      arguments: {}
    })
    expect(result.structuredContent).toEqual({
      data: [{ id, name: 'Test workspace' }]
    })
  })
  it('hides and blocks write tools in the default mode', async () => {
    const m = await mcp()
    expect(
      (await m.listTools()).tools.some(
        tool => tool.name === 'monolith_pages_create'
      )
    ).toBe(false)
    const result = await m.callTool({
      name: 'monolith_pages_create',
      arguments: { query: { workspace_id: id }, body: { title: 'Blocked' } }
    })
    expect(result.isError).toBe(true)
    expect(writes).toBe(0)
  })
  it('creates data with write access and still excludes deletions', async () => {
    const m = await mcp(true)
    const list = await m.listTools()
    expect(
      list.tools.find(tool => tool.name === 'monolith_pages_create')
        ?.inputSchema
    ).toHaveProperty('required')
    expect(list.tools.some(tool => tool.name === 'monolith_pages_delete')).toBe(
      false
    )
    const result = await m.callTool({
      name: 'monolith_pages_create',
      arguments: { query: { workspace_id: id }, body: { title: 'MCP page' } }
    })
    expect(result.structuredContent).toEqual({
      data: { id, title: 'MCP page' }
    })
    expect(writes).toBe(1)
  })
  it('rejects malformed arguments before sending a mutation', async () => {
    const m = await mcp(true)
    const result = await m.callTool({
      name: 'monolith_pages_create',
      arguments: {
        query: { workspace_id: '../escape' },
        body: { title: 'Bad' }
      }
    })
    expect(result.isError).toBe(true)
    expect(writes).toBe(0)
  })
  it('preserves permission failures from the server', async () => {
    const m = await mcp(true)
    const result = await m.callTool({
      name: 'monolith_pages_create',
      arguments: {
        query: { workspace_id: randomUUID() },
        body: { title: 'Blocked' }
      }
    })
    expect(result.isError).toBe(true)
    expect(JSON.stringify(result)).toContain('403')
  })
  it('returns revision conflict details and does not retry document writes', async () => {
    const service = new ToolService(client, {
      allowWrites: true,
      allowDeletes: false
    })
    await expect(
      service.call('document_save', {
        workspaceId: id,
        kind: 'page',
        id,
        expectedRevision: 7,
        snapshot: {
          type: 'page',
          meta: { id, title: 'Test', createDate: 1, tags: [] },
          blocks: {
            type: 'block',
            id: 'root',
            flavour: 'affine:page',
            version: 2,
            props: {},
            children: []
          }
        }
      })
    ).rejects.toMatchObject({
      status: 409,
      code: 'revision_conflict',
      details: { revision: 8 }
    })
    expect(writes).toBe(1)
  })
  it('rechecks availability when an addon operation is removed', async () => {
    const service = new ToolService(client, {
      allowWrites: true,
      allowDeletes: true
    })
    expect((await service.list()).some(tool => tool.access === 'delete')).toBe(
      true
    )
    hideCreate = true
    await expect(service.call('pages_create', {})).rejects.toMatchObject({
      code: 'tool_unavailable'
    })
  })
  it('CLI reads JSON from stdin and returns machine-readable results', async () => {
    const result = await cli(
      ['--allow-writes', 'call', 'pages_create', '--file', '-'],
      JSON.stringify({
        query: { workspace_id: id },
        body: { title: 'CLI page' }
      })
    )
    expect(result.code).toBe(0)
    expect(JSON.parse(result.stdout)).toEqual({
      data: { id, title: 'CLI page' }
    })
    expect(result.stderr).toBe('')
  })
  it('CLI exits nonzero on errors and never prints a partial success', async () => {
    const result = await cli(['call', 'pages_create'])
    expect(result.code).toBe(1)
    expect(result.stdout).toBe('')
    expect(JSON.parse(result.stderr).error.code).toBe('tool_unavailable')
    expect(await readFile(store.file, 'utf8')).toContain('refreshToken')
  })
  it('CLI reports argument errors as JSON and keeps help successful', async () => {
    const bad = await cli(['--unknown-option'])
    expect(bad.code).toBe(1)
    expect(JSON.parse(bad.stderr).error.code).toBe('commander.unknownOption')
    const help = await cli(['--help'])
    expect(help.code).toBe(0)
    expect(help.stdout).toContain('monolith-agent')
    expect(help.stderr).toBe('')
  })
})
