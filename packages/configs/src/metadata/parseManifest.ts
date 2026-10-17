import * as ts from '@typescript/typescript6'
import { readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

import type { WidgetConfig } from '../interfaces/widget.types'
import resolveExpressionMap, {
  findNode,
  parseObjectLiteral,
  unwrapExpression
} from './ast-utils'
import parseWidgetConfig from './parseWidgetConfig'

export interface ParsedSubsection {
  label: string
  icon: string
  path: string
}
export interface ParsedWidget {
  filePath: string
  config: WidgetConfig
}
export interface ParsedManifest {
  hasProvider: boolean
  hidden?: boolean
  subsection?: ParsedSubsection[]
  widgets: ParsedWidget[]
}

function widgetSource(
  importName: string,
  directory: string
): string | undefined {
  const candidate = importName.startsWith('@/')
    ? join(directory, 'src', importName.slice(2))
    : resolve(directory, importName)
  return [
    candidate,
    candidate + '.tsx',
    candidate + '.ts',
    join(candidate, 'index.tsx'),
    join(candidate, 'index.ts')
  ].find(file => {
    try {
      return statSync(file).isFile()
    } catch {
      return false
    }
  })
}

function widgets(
  expression: ts.Expression | undefined,
  directory: string
): ParsedWidget[] {
  if (!expression || !ts.isArrayLiteralExpression(expression)) return []
  const result: ParsedWidget[] = []
  for (const element of expression.elements) {
    const call = findNode(
      element,
      node =>
        ts.isCallExpression(node) &&
        node.expression.kind === ts.SyntaxKind.ImportKeyword
    ) as ts.CallExpression | null
    const argument = call?.arguments[0]
    if (!argument || !ts.isStringLiteralLike(argument)) continue
    const filePath = widgetSource(argument.text, directory)
    const config = filePath && parseWidgetConfig(filePath)
    if (filePath && config) result.push({ filePath, config })
  }
  return result
}

function sections(
  expression: ts.Expression | undefined
): ParsedSubsection[] | undefined {
  if (!expression || !ts.isArrayLiteralExpression(expression)) return undefined
  const result: ParsedSubsection[] = []
  for (const element of expression.elements) {
    const value = unwrapExpression(element)
    if (!ts.isObjectLiteralExpression(value)) continue
    const { label, icon, path } = resolveExpressionMap(
      parseObjectLiteral(value)
    )
    if (
      typeof label === 'string' &&
      typeof icon === 'string' &&
      typeof path === 'string'
    )
      result.push({ label, icon, path })
  }
  return result.length ? result : undefined
}

export default function parseManifest(filePath: string): ParsedManifest {
  const empty = (): ParsedManifest => ({ hasProvider: false, widgets: [] })
  try {
    const source = ts.createSourceFile(
      filePath,
      readFileSync(filePath, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX
    )
    const call = findNode(
      source,
      node =>
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === 'defineAddon'
    ) as ts.CallExpression | null
    const argument = call?.arguments[0] && unwrapExpression(call.arguments[0])
    if (!argument || !ts.isObjectLiteralExpression(argument)) return empty()
    const properties = parseObjectLiteral(argument)
    const { hidden } = resolveExpressionMap(properties)
    return {
      hasProvider: Object.hasOwn(properties, 'provider'),
      hidden: typeof hidden === 'boolean' ? hidden : undefined,
      subsection: sections(properties.subsection),
      widgets: widgets(properties.widgets, dirname(filePath))
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT')
      console.error('Cannot read addon manifest', filePath, error)
    return empty()
  }
}
