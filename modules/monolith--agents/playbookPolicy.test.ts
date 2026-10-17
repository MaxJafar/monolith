import { describe, expect, it } from 'vitest'

import {
  compilePlaybookInstructions,
  requiredChecks,
  validateQualityEvidence
} from './playbookPolicy'
import type { PlaybookSnapshot } from './shared'

const book: PlaybookSnapshot = {
  id: '7d15d9d4-8e1b-4264-852c-8bdf5f92b4bb',
  name: 'Verification',
  description: '',
  instructions: 'Verify behavior.',
  checks: ['Build succeeds', 'Changed flow works'],
  require_review: true,
  revision: 3
}
const evidence = requiredChecks([book]).map(check => ({
  check_id: check.id,
  passed: true,
  evidence: 'pnpm build exited 0; focused checks passed.'
}))

describe('Immutable playbook completion policies', () => {
  it('keeps legacy instructions unchanged when no playbooks are assigned', () => {
    expect(compilePlaybookInstructions('Existing instructions', [])).toBe(
      'Existing instructions'
    )
    expect(validateQualityEvidence([], [])).toBeNull()
  })
  it('compiles assigned instructions with revision, stable IDs and access boundaries', () => {
    const instructions = compilePlaybookInstructions('Keep the scope narrow.', [
      book
    ])
    expect(instructions).toContain('Keep the scope narrow.')
    expect(instructions).toContain('Verification · revision 3')
    expect(instructions).toContain(`${book.id}:0`)
    expect(instructions).toContain('does not expand project access')
  })
  it('requires evidence for every check', () => {
    expect(validateQualityEvidence([book], evidence)).toBeNull()
    expect(validateQualityEvidence([book], evidence.slice(0, 1))).toContain(
      'Changed flow works'
    )
    expect(
      validateQualityEvidence(
        [book],
        [{ ...evidence[0]!, passed: false }, evidence[1]!]
      )
    ).toContain('Build succeeds')
    expect(
      validateQualityEvidence(
        [book],
        [{ ...evidence[0]!, evidence: '   ' }, evidence[1]!]
      )
    ).toContain('Build succeeds')
  })
  it('rejects duplicate and invented IDs rather than accepting an apparent pass count', () => {
    expect(
      validateQualityEvidence([book], [evidence[0]!, evidence[0]!])
    ).toContain('exactly once')
    expect(
      validateQualityEvidence(
        [book],
        [...evidence, { check_id: 'invented', passed: true, evidence: 'Done' }]
      )
    ).toContain('outside')
  })
  it('separates identical check labels across assigned playbooks', () => {
    const second = { ...book, id: '3c1d30d4-428d-41fc-8eae-d8a081f86885' }
    expect(
      new Set(requiredChecks([book, second]).map(check => check.id)).size
    ).toBe(4)
    expect(validateQualityEvidence([book, second], evidence)).toContain(
      'Build succeeds'
    )
  })
})
