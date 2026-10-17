import * as ts from '@typescript/typescript6'
import { describe, expect, it } from 'vitest'

import resolveExpressionMap, { findVariableDeclaration } from '../ast-utils'

function read(source: string) {
  const file = ts.createSourceFile(
    'config.ts',
    source,
    ts.ScriptTarget.Latest,
    true
  )
  return resolveExpressionMap(findVariableDeclaration(file, 'config') ?? {})
}

describe('static addon metadata', () => {
  it('reads typed literal configuration without evaluating expressions', () => {
    const result = read(`const config = ({
      id: 'timer', minW: 2, minH: +1, offset: -3,
      hidden: false, unsafe: (() => { throw new Error('not evaluated') })()
    } as const) satisfies WidgetConfig`)
    expect({ ...result }).toEqual({
      id: 'timer',
      minW: 2,
      minH: 1,
      offset: -3,
      hidden: false
    })
  })

  it('ignores executable keys and does not change the metadata object prototype', () => {
    const result = read(
      `const config = { ['computed']: 1, ...source, '__proto__': 'literal', id: 'clock' }`
    )
    expect(Object.getPrototypeOf(result)).toBeNull()
    expect(result.id).toBe('clock')
    expect(result.__proto__).toBe('literal')
    expect(result.computed).toBeUndefined()
  })
})
