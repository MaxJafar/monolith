// SPDX-License-Identifier: 0BSD
import * as ts from '@typescript/typescript6'
import { describe, expect, it } from 'vitest'

import readValues, { findVariableDeclaration } from '../ast-utils'

const parse = (source: string) => {
  const syntax = ts.createSourceFile(
    'widget.ts',
    source,
    ts.ScriptTarget.Latest,
    true
  )
  return readValues(findVariableDeclaration(syntax, 'config') ?? {})
}
describe('metadata literal boundaries', () => {
  it('accepts scalar literals behind type wrappers without evaluating code', () => {
    expect({
      ...parse(`const config = ({
      id: 'session', minW: +2, offset: -7, ready: true, disabled: false,
      generated: createSomething(), nested: {code:'unused'}
    } as const) satisfies WidgetConfig`)
    }).toEqual({
      id: 'session',
      minW: 2,
      offset: -7,
      ready: true,
      disabled: false
    })
  })
  it('treats prototype-like names as data and ignores computed or spread properties', () => {
    const result = parse(
      "const config = { '__proto__': 'data', id:'one', [execute()]: 1, ...other }"
    )
    expect(Object.getPrototypeOf(result)).toBeNull()
    expect(Object.entries(result)).toEqual([
      ['__proto__', 'data'],
      ['id', 'one']
    ])
  })
})
