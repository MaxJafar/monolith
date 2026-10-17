import * as ts from '@typescript/typescript6'

/** Metadata is read as syntax. Nothing from an addon is evaluated during discovery. */
export function unwrapExpression(expression: ts.Expression): ts.Expression {
  let value = expression
  while (
    ts.isParenthesizedExpression(value) ||
    ts.isAsExpression(value) ||
    ts.isSatisfiesExpression(value) ||
    ts.isTypeAssertionExpression(value)
  )
    value = value.expression
  return value
}

export function findNode(
  root: ts.Node,
  predicate: (node: ts.Node) => boolean
): ts.Node | null {
  const pending: ts.Node[] = [root]
  while (pending.length) {
    const node = pending.pop()!
    if (predicate(node)) return node
    const children: ts.Node[] = []
    ts.forEachChild(node, child => {
      children.push(child)
    })
    for (let index = children.length - 1; index >= 0; index--)
      pending.push(children[index]!)
  }
  return null
}

export function parseObjectLiteral(
  node: ts.ObjectLiteralExpression
): Record<string, ts.Expression> {
  const properties: Record<string, ts.Expression> = Object.create(null)
  for (const property of node.properties) {
    if (!ts.isPropertyAssignment(property)) continue
    const name = property.name
    if (
      ts.isIdentifier(name) ||
      ts.isStringLiteral(name) ||
      ts.isNumericLiteral(name)
    )
      properties[name.text] = unwrapExpression(property.initializer)
  }
  return properties
}

export function findVariableDeclaration(
  root: ts.Node,
  name: string
): Record<string, ts.Expression> | null {
  const match = findNode(
    root,
    node =>
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === name
  ) as ts.VariableDeclaration | null
  const initializer = match?.initializer && unwrapExpression(match.initializer)
  return initializer && ts.isObjectLiteralExpression(initializer)
    ? parseObjectLiteral(initializer)
    : null
}

function literal(
  expression: ts.Expression
): string | number | boolean | undefined {
  const value = unwrapExpression(expression)
  if (ts.isStringLiteralLike(value)) return value.text
  if (ts.isNumericLiteral(value)) return Number(value.text)
  if (value.kind === ts.SyntaxKind.TrueKeyword) return true
  if (value.kind === ts.SyntaxKind.FalseKeyword) return false
  if (ts.isPrefixUnaryExpression(value) && ts.isNumericLiteral(value.operand)) {
    if (value.operator === ts.SyntaxKind.MinusToken)
      return -Number(value.operand.text)
    if (value.operator === ts.SyntaxKind.PlusToken)
      return Number(value.operand.text)
  }
  return undefined
}

export default function resolveExpressionMap(
  expressions: Record<string, ts.Expression>
) {
  const values: Record<string, string | number | boolean> = Object.create(null)
  for (const name of Object.keys(expressions)) {
    const value = literal(expressions[name]!)
    if (value !== undefined) values[name] = value
  }
  return values
}
