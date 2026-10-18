import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const names = {
  createForgeContractBuilder: 'defineEndpoints',
  ForgeContractOptions: 'EndpointOptions',
  ForgeExpressContext: 'RequestContext',
  ForgeContext: 'EndpointContext',
  ForgeContract: 'EndpointContract',
  __isForgeContract: '__isEndpointContract',
  forge_contract: 'endpoint_contract',
  forgeContract: 'endpointContract',
  createForgeModule: 'defineAddon',
  createForgeProxy: 'createApiClient',
  createForge: 'createMonolith',
  ForgeEndpoint: 'EndpointClient',
  forgeEndpoint: 'endpointClient',
  ForgeRouter: 'EndpointTree',
  forgeRouter: 'defineRoutes',
  useForgeMutation: 'useApiMutation',
  UseForgeMutationOptions: 'UseApiMutationOptions',
  setForgeMutationErrorHandler: 'setApiMutationErrorHandler',
  mockForgeAPI: 'mockWorkspaceAPI',
  coreForgeAPI: 'coreWorkspaceAPI',
  forgeAPI: 'workspaceAPI',
  forgeCLI: 'cli',
  forgeBuilder: 'endpointBuilder',
  Forge: 'Monolith',
  forge: 'endpoints'
}
const identifiers = new RegExp(
  '\\b(' +
    Object.keys(names)
      .sort((a, b) => b.length - a.length)
      .join('|') +
    ')\\b'
)
const product = /lifeforge|melvinchia|melvin chia/i
const sourceFile =
  /\.(?:[cm]?[jt]sx?|css|scss|json|mdx?|html|ya?ml|svg|xml|go|rs|swift)$/
const listed = execFileSync(
  'git',
  ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
  {
    cwd: root,
    windowsHide: true,
    maxBuffer: 32 * 1024 * 1024
  }
)
  .toString()
  .split('\0')
const failures = []
let checked = 0
for (const file of new Set(listed)) {
  if (
    !/^(apps|packages|modules|locales)\//.test(file) ||
    !sourceFile.test(file)
  )
    continue
  // Historical licenses and project instructions are not product branding.
  if (/(^|\/)(?:NOTICE\.md|LICENSE(?:\.[^/]*)?|AGENTS\.md)$/.test(file))
    continue
  if (/(^|\/)(?:node_modules|dist|target|tsbuild|generated)\//.test(file))
    continue
  const absolute = path.join(root, file)
  if (!existsSync(absolute)) continue
  checked++
  const content = readFileSync(absolute, 'utf8')
  if (
    product.test(file) ||
    identifiers.test(file) ||
    product.test(content) ||
    identifiers.test(content) ||
    /\blf-/.test(content)
  )
    failures.push(file)
}
assert.equal(
  failures.length,
  0,
  'Retired product identity in maintained source:\n' + failures.join('\n')
)
console.info(
  'Monolith identity verified in ' +
    checked +
    ' maintained files. This checks naming, not source authorship.'
)
