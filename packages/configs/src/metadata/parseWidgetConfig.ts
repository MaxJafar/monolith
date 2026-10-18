import * as ts from '@typescript/typescript6'
import { readFileSync } from 'node:fs'

import {
  type WidgetConfig,
  widgetConfigSchema
} from '../interfaces/widget.types'
import resolveExpressionMap, { findVariableDeclaration } from './ast-utils'

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
    const properties = findVariableDeclaration(source, 'config')
    if (!properties) return null
    const result = widgetConfigSchema.safeParse(
      resolveExpressionMap(properties)
    )
    return result.success ? result.data : null
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT')
      console.error('Cannot read widget metadata', filePath, error)
    return null
  }
}
