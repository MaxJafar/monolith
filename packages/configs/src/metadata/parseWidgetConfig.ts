// SPDX-License-Identifier: 0BSD
import * as ts from '@typescript/typescript6'
import { readFileSync } from 'node:fs'

import {
  type WidgetConfig,
  widgetConfigSchema
} from '../interfaces/widget.types'
import resolveExpressionMap, {
  parseObjectLiteral,
  unwrapExpression
} from './ast-utils'

export default function parseWidgetConfig(
  filePath: string
): WidgetConfig | null {
  try {
    const source = ts.createSourceFile(
      filePath,
      readFileSync(filePath, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX
    )
    for (const statement of source.statements) {
      if (!ts.isVariableStatement(statement)) continue
      for (const declaration of statement.declarationList.declarations) {
        if (
          !ts.isIdentifier(declaration.name) ||
          declaration.name.text !== 'config' ||
          !declaration.initializer
        )
          continue
        const expression = unwrapExpression(declaration.initializer)
        if (!ts.isObjectLiteralExpression(expression)) return null
        const parsed = widgetConfigSchema.safeParse(
          resolveExpressionMap(parseObjectLiteral(expression))
        )
        return parsed.success ? parsed.data : null
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT')
      console.error('Widget metadata could not be read', { filePath, error })
  }
  return null
}
