// SPDX-License-Identifier: 0BSD
import type { AST, Rule } from 'eslint'

type Statement = AST.Program['body'][number]
type Expression = Extract<
  Statement,
  { type: 'ExpressionStatement' }
>['expression']
function hook(expression: Expression | null | undefined): boolean {
  if (expression?.type !== 'CallExpression') return false
  const target = expression.callee
  const name =
    target.type === 'Identifier'
      ? target.name
      : target.type === 'MemberExpression' &&
          !target.computed &&
          target.property.type === 'Identifier'
        ? target.property.name
        : ''
  return /^use[A-Z]/.test(name)
}
function category(statement: Statement) {
  const simple =
    statement.type === 'VariableDeclaration' ||
    statement.type === 'ExpressionStatement'
  const invokes =
    statement.type === 'ExpressionStatement'
      ? hook(statement.expression)
      : statement.type === 'VariableDeclaration' &&
        statement.declarations.some(item => hook(item.init))
  return {
    hook: invokes && statement.loc?.start.line === statement.loc?.end.line,
    adjacent:
      simple &&
      (statement.type !== 'VariableDeclaration' || statement.kind === 'const')
  }
}
const rule: Rule.RuleModule = {
  meta: {
    type: 'layout',
    docs: {
      description:
        'Group adjacent one-line hooks and separate them from other declarations.'
    },
    schema: [],
    fixable: 'whitespace',
    messages: {
      group: 'Keep consecutive one-line hooks together.',
      separate: 'Separate hooks from neighboring statements with a blank line.'
    }
  },
  create(context) {
    const source = context.sourceCode
    function inspect(statements: Statement[]) {
      for (let index = 1; index < statements.length; index++) {
        const first = statements[index - 1]!,
          second = statements[index]!,
          before = category(first),
          after = category(second)
        if (!first.range || !second.range || !first.loc || !second.loc) continue
        const group = before.hook && after.hook,
          apart =
            !group &&
            ((before.hook && after.adjacent) || (before.adjacent && after.hook))
        if (!group && !apart) continue
        const blank = source.lines
          .slice(first.loc.end.line, second.loc.start.line - 1)
          .some(line => !line.trim())
        if (group === !blank) continue
        const range: [number, number] = [first.range[1], second.range[0]],
          gap = source.text.slice(...range)
        context.report({
          node: second,
          messageId: group ? 'group' : 'separate',
          fix(fixer) {
            if (group)
              return fixer.replaceTextRange(
                range,
                gap.replace(/(\r?\n)[ \t]*(?=\r?\n)/g, '')
              )
            const newline = source.text.includes('\r\n') ? '\r\n' : '\n',
              indent =
                source.lines[second.loc!.start.line - 1]!.match(
                  /^[ \t]*/
                )?.[0] ?? ''
            return fixer.replaceTextRange(
              range,
              gap.replace(/[ \t]*$/, '') +
                (first.loc!.end.line === second.loc!.start.line
                  ? newline
                  : '') +
                newline +
                indent
            )
          }
        })
      }
    }
    return {
      Program(node) {
        inspect(node.body)
      },
      BlockStatement(node) {
        inspect(node.body)
      }
    }
  }
}
export default rule
