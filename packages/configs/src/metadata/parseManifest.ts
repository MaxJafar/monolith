// SPDX-License-Identifier: 0BSD
import * as ts from '@typescript/typescript6'
import { readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'

import { navigationSectionSchema } from '../interfaces/module.types'
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
  widgets: ParsedWidget[]
  subsection?: ParsedSubsection[]
  hidden?: boolean
}

function definition(
  source: ts.SourceFile
): ts.ObjectLiteralExpression | undefined {
  const declarations = new Map<string, ts.Expression>()
  let exported: ts.Expression | undefined
  for (const statement of source.statements) {
    if (ts.isExportAssignment(statement) && !statement.isExportEquals)
      exported = statement.expression
    if (ts.isVariableStatement(statement)) {
      for (const item of statement.declarationList.declarations) {
        if (ts.isIdentifier(item.name) && item.initializer)
          declarations.set(item.name.text, item.initializer)
        else if (ts.isObjectBindingPattern(item.name) && item.initializer) {
          for (const binding of item.name.elements) {
            if (binding.dotDotDotToken && ts.isIdentifier(binding.name))
              declarations.set(binding.name.text, item.initializer)
          }
        }
      }
    }
  }
  const seen = new Set<string>()
  const chase = (input?: ts.Expression): ts.Expression | undefined => {
    if (!input) return
    const expression = unwrapExpression(input)
    if (!ts.isIdentifier(expression)) return expression
    if (seen.has(expression.text)) return
    seen.add(expression.text)
    return chase(declarations.get(expression.text))
  }
  const call = chase(exported)
  if (
    !call ||
    !ts.isCallExpression(call) ||
    !ts.isIdentifier(call.expression) ||
    call.expression.text !== 'defineAddon'
  )
    return
  const argument = chase(call.arguments[0])
  return argument && ts.isObjectLiteralExpression(argument)
    ? argument
    : undefined
}

function widgetFile(root: string, specifier: string): string | undefined {
  if (!specifier.startsWith('@/') && !specifier.startsWith('.')) return
  const base = resolve(
    root,
    specifier.startsWith('@/') ? 'src/' + specifier.slice(2) : specifier
  )
  const local = relative(resolve(root), base)
  if (local === '..' || local.startsWith('..' + sep)) return
  for (const candidate of [
    base,
    base + '.tsx',
    base + '.ts',
    join(base, 'index.tsx'),
    join(base, 'index.ts')
  ]) {
    try {
      if (statSync(candidate).isFile()) return candidate
    } catch {
      /* Try the next extension. */
    }
  }
}

function readWidgets(
  expression: ts.Expression | undefined,
  root: string
): ParsedWidget[] {
  if (!expression || !ts.isArrayLiteralExpression(expression)) return []
  return expression.elements.flatMap(element => {
    const node = findNode(
      element,
      item =>
        ts.isCallExpression(item) &&
        item.expression.kind === ts.SyntaxKind.ImportKeyword
    )
    if (!node || !ts.isCallExpression(node)) return []
    const requested = node.arguments[0]
    if (!requested || !ts.isStringLiteralLike(requested)) return []
    const filePath = widgetFile(root, requested.text)
    const config = filePath ? parseWidgetConfig(filePath) : null
    return filePath && config ? [{ filePath, config }] : []
  })
}

function readSections(
  expression: ts.Expression | undefined
): ParsedSubsection[] | undefined {
  if (!expression || !ts.isArrayLiteralExpression(expression)) return
  const sections = expression.elements.flatMap(element => {
    const value = unwrapExpression(element)
    if (!ts.isObjectLiteralExpression(value)) return []
    const section = navigationSectionSchema.safeParse(
      resolveExpressionMap(parseObjectLiteral(value))
    )
    return section.success ? [section.data] : []
  })
  return sections.length ? sections : undefined
}

export default function parseManifest(filePath: string): ParsedManifest {
  const empty = { hasProvider: false, widgets: [] }
  try {
    const source = ts.createSourceFile(
      filePath,
      readFileSync(filePath, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX
    )
    const object = definition(source)
    if (!object) return empty
    const expressions = parseObjectLiteral(object)
    const values = resolveExpressionMap(expressions)
    return {
      hasProvider: Object.hasOwn(expressions, 'provider'),
      hidden: typeof values.hidden === 'boolean' ? values.hidden : undefined,
      subsection: readSections(expressions.subsection),
      widgets: readWidgets(expressions.widgets, dirname(filePath))
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT')
      console.error('Add-on metadata could not be read', { filePath, error })
    return empty
  }
}
