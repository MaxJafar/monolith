// SPDX-License-Identifier: 0BSD
import * as ts from '@typescript/typescript6'

export function unwrapExpression(expression: ts.Expression): ts.Expression {
  switch (expression.kind) {
    case ts.SyntaxKind.ParenthesizedExpression:
    case ts.SyntaxKind.AsExpression:
    case ts.SyntaxKind.TypeAssertionExpression:
    case ts.SyntaxKind.SatisfiesExpression:
    case ts.SyntaxKind.NonNullExpression:
      return unwrapExpression(
        (expression as ts.ParenthesizedExpression).expression
      )
    default:
      return expression
  }
}

export function findNode(
  root: ts.Node,
  predicate: (node: ts.Node) => boolean
): ts.Node | null {
  const visit = (node: ts.Node): ts.Node | undefined =>
    predicate(node) ? node : ts.forEachChild(node, visit)
  return visit(root) ?? null
}

export function parseObjectLiteral(
  node: ts.ObjectLiteralExpression
): Record<string, ts.Expression> {
  const fields = Object.create(null) as Record<string, ts.Expression>
  for (const field of node.properties) {
    if (
      !ts.isPropertyAssignment(field) ||
      ts.isComputedPropertyName(field.name)
    )
      continue
    fields[field.name.text] = unwrapExpression(field.initializer)
  }
  return fields
}

export function findVariableDeclaration(
  root: ts.Node,
  name: string
): Record<string, ts.Expression> | null {
  const declaration = findNode(
    root,
    node =>
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === name
  )
  if (
    !declaration ||
    !ts.isVariableDeclaration(declaration) ||
    !declaration.initializer
  )
    return null
  const expression = unwrapExpression(declaration.initializer)
  return ts.isObjectLiteralExpression(expression)
    ? parseObjectLiteral(expression)
    : null
}

type Scalar = string | number | boolean
function readScalar(source: ts.Expression): Scalar | undefined {
  const expression = unwrapExpression(source)
  if (ts.isStringLiteralLike(expression)) return expression.text
  if (ts.isNumericLiteral(expression)) return Number(expression.text)
  switch (expression.kind) {
    case ts.SyntaxKind.TrueKeyword:
      return true
    case ts.SyntaxKind.FalseKeyword:
      return false
  }
  if (
    ts.isPrefixUnaryExpression(expression) &&
    ts.isNumericLiteral(expression.operand)
  ) {
    const sign =
      expression.operator === ts.SyntaxKind.MinusToken
        ? -1
        : expression.operator === ts.SyntaxKind.PlusToken
          ? 1
          : undefined
    if (sign !== undefined) return sign * Number(expression.operand.text)
  }
}

export default function resolveExpressionMap(
  expressions: Record<string, ts.Expression>
): Record<string, Scalar> {
  const output: Record<string, Scalar> = Object.create(null)
  for (const [name, expression] of Object.entries(expressions)) {
    const value = readScalar(expression)
    if (value !== undefined) output[name] = value
  }
  return output
}
