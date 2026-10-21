// SPDX-License-Identifier: 0BSD
import { Linter } from 'eslint'
import { expect, it } from 'vitest'

import rule from './padding-react-hooks'

function format(code: string) {
  return new Linter().verifyAndFix(code, [
    {
      languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
      plugins: { monolith: { rules: { spacing: rule } } },
      rules: { 'monolith/spacing': 'error' }
    }
  ])
}
it('keeps one-line hook groups together and preserves comment text', () => {
  const input =
    'function View(){\n  const a = useState(0);\n\n  // Preserve this explanation\n\n  useEffect(work);\n}'
  const result = format(input)
  expect(result.messages).toEqual([])
  expect(result.output).toContain(
    '// Preserve this explanation\n  useEffect(work)'
  )
  expect(result.output).not.toContain('\n\n')
})
it('separates hooks from neighboring declarations while preserving indentation', () => {
  const result = format(
    'function View(){\n  const label = "a";\n  const value = useState(0);\n  render(value);\n}'
  )
  expect(result.messages).toEqual([])
  expect(result.output).toContain('label = "a";\n\n  const value')
  expect(result.output).toContain('useState(0);\n\n  render')
})
it('recognizes React member hooks without treating computed properties as hooks', () => {
  expect(
    format('const a=React.useState(0);\n\nconst b=React.useMemo(work);').output
  ).toBe('const a=React.useState(0);\nconst b=React.useMemo(work);')
  const other = 'const a = object[useState](0);\nconst b = 2;'
  expect(format(other).output).toBe(other)
})
it('does not group multi-line hook expressions', () => {
  const code = 'const a = useMemo(\n  work\n);\nconst b = 2;'
  expect(format(code).output).toBe(code)
})
it('keeps CRLF endings and converges after a single fix pass', () => {
  const first = format('const a=1;\r\nconst b=useState(0);\r\nconst c=2;')
  expect(first.messages).toEqual([])
  expect(first.output).toBe(
    'const a=1;\r\n\r\nconst b=useState(0);\r\n\r\nconst c=2;'
  )
  expect(format(first.output).fixed).toBe(false)
})

it('keeps export declarations as hook-group boundaries', () => {
  const code =
    'const a=useState(0);\n\nexport const marker=1;\n\nconst b=useState(0);'
  expect(format(code).output).toBe(code)
})
