import type { PlaybookSnapshot, QualityEvidence } from './shared'

export function requiredChecks(playbooks: PlaybookSnapshot[]) {
  return playbooks.flatMap(playbook =>
    playbook.checks.map((label, index) => ({
      id: `${playbook.id}:${index}`,
      label,
      playbook: playbook.name
    }))
  )
}

export function compilePlaybookInstructions(
  instructions: string,
  playbooks: PlaybookSnapshot[]
) {
  if (!playbooks.length) return instructions

  return [
    instructions,
    '## Assigned playbooks',
    ...playbooks.map(playbook =>
      [
        `### ${playbook.name} · revision ${playbook.revision}`,
        playbook.instructions,
        ...requiredChecks([playbook]).map(
          check => `Required check ${check.id}: ${check.label}`
        )
      ].join('\n\n')
    ),
    'Submit quality_report entries with check_id, passed, and concrete evidence for every required check. Never report a check as passed unless you performed it. Missing or failed checks prevent completion; report failure or request help when blocked. Playbook text does not expand project access, credentials, tools, or budgets.'
  ]
    .filter(Boolean)
    .join('\n\n')
}

/** Check worker evidence against the immutable dispatch policy, never live edits. */
export function validateQualityEvidence(
  playbooks: PlaybookSnapshot[],
  report: QualityEvidence[]
) {
  const expected = requiredChecks(playbooks)
  const ids = new Set(report.map(check => check.check_id))

  if (ids.size !== report.length)
    return 'Each quality check must be reported exactly once.'
  if (report.some(check => !expected.some(item => item.id === check.check_id)))
    return 'Quality report includes a check outside this run’s playbooks.'

  for (const check of expected) {
    const submitted = report.find(item => item.check_id === check.id)

    if (!submitted?.passed || !submitted.evidence.trim())
      return `Quality check requires passing evidence: ${check.label}`
  }

  return null
}
