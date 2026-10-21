// SPDX-License-Identifier: 0BSD
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import extractModuleMetadata from '../extractModuleMetadata'
import parseManifest from '../parseManifest'

let root: string
const write = (name: string, value: string) => {
  const file = path.join(root, name)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, value)
  return file
}
beforeEach(() => {
  root = fs.mkdtempSync(path.join(tmpdir(), 'monolith-manifest-probe-'))
})
afterEach(() => {
  const resolved = path.resolve(root)
  assert.equal(path.dirname(resolved), path.resolve(tmpdir()))
  assert.ok(path.basename(resolved).startsWith('monolith-manifest-probe-'))
  fs.rmSync(resolved, { recursive: true, force: true })
})

describe('static manifest discovery', () => {
  it('follows the exported destructured manifest and reads widget metadata without executing source', () => {
    const widget = write(
      'client/src/widgets/Progress.tsx',
      `
      throw Error('Widget code must not run');
      export const config = ({id:'progress', icon:'lucide:chart', minW:3, maxH:4} as const) satisfies WidgetConfig;
    `
    )
    const file = write(
      'client/manifest.ts',
      `
      function unrelated() { return defineAddon({hidden: false}) }
      throw Error('Manifest code must not run');
      const configuration = {
        routes: {}, hidden: true, provider: lazy(() => import('./provider')),
        widgets: [() => import('@/widgets/Progress')],
        subsection: [{label:'Overview', icon:'lucide:chart', path:'overview'}]
      } as const;
      const {workspaceAPI, ...manifest} = defineAddon(configuration);
      export default manifest;
    `
    )
    expect(parseManifest(file)).toEqual({
      hasProvider: true,
      hidden: true,
      subsection: [
        { label: 'Overview', icon: 'lucide:chart', path: 'overview' }
      ],
      widgets: [
        {
          filePath: widget,
          config: { id: 'progress', icon: 'lucide:chart', minW: 3, maxH: 4 }
        }
      ]
    })
  })

  it('ignores nonliteral values, invalid widgets and widget paths outside the client', () => {
    write(
      'outside.tsx',
      "export const config = {id:'outside', icon:'lucide:box'}"
    )
    write(
      'client/src/Invalid.tsx',
      "export const config = {id:'invalid', icon:'lucide:box', minW:0}"
    )
    const file = write(
      'client/manifest.ts',
      `
      export default defineAddon({
        routes:{}, hidden: (()=>true)(),
        widgets: [()=>import('../outside'), ()=>import('@/Invalid'), ()=>import(variable)],
        subsection:[{label:'Missing fields'}, {label:'Valid',icon:'lucide:box',path:''}]
      })
    `
    )
    expect(parseManifest(file)).toEqual({
      hasProvider: false,
      hidden: undefined,
      widgets: [],
      subsection: [{ label: 'Valid', icon: 'lucide:box', path: '' }]
    })
  })

  it.each([
    'export default {}',
    'const cycle = other; const other = cycle; export default cycle',
    "export default defineAddon('invalid')",
    'function example(){return defineAddon({hidden:true})}; export default example'
  ])(
    'does not treat an unrelated or unresolved expression as the manifest: %s',
    source => {
      expect(parseManifest(write('client/manifest.ts', source))).toEqual({
        hasProvider: false,
        widgets: []
      })
    }
  )

  it('returns an empty discovery result for a missing file', () => {
    expect(parseManifest(path.join(root, 'missing.ts'))).toEqual({
      hasProvider: false,
      widgets: []
    })
  })

  it('emits validated, serializable package metadata and an actual server-directory flag', () => {
    const pkg = {
      name: '@monolith/probe',
      displayName: 'Probe',
      version: '1.0.0',
      description: 'Fixture',
      author: 'Monolith',
      monolith: { icon: 'lucide:box', category: 'Tools' }
    }
    write('package.json', JSON.stringify(pkg))
    write(
      'client/manifest.ts',
      "export default defineAddon({routes:{}, widgets:[()=>import('./src/Widget')]})"
    )
    write(
      'client/src/Widget.tsx',
      "export const config = {id:'one', icon:'lucide:clock'}"
    )
    write('server', 'not a directory')
    const result = extractModuleMetadata(root)
    expect(result.hasServer).toBe(false)
    expect(result.widgets).toEqual([
      { id: 'one', icon: 'lucide:clock', componentName: 'Widget' }
    ])
    expect(JSON.parse(JSON.stringify(result)).package).toEqual(pkg)
    fs.unlinkSync(path.join(root, 'server'))
    fs.mkdirSync(path.join(root, 'server'))
    expect(extractModuleMetadata(root).hasServer).toBe(true)
  })
})
