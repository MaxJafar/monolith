# ECC integration evidence

Source studied: [affaan-m/ECC](https://github.com/affaan-m/ECC/tree/b92f181b3b748d1abbc2afd94af6aa7d8c8fca29), pinned to `b92f181b3b748d1abbc2afd94af6aa7d8c8fca29` on 2026-10-13. ECC is licensed under [MIT](https://github.com/affaan-m/ECC/blob/b92f181b3b748d1abbc2afd94af6aa7d8c8fca29/LICENSE), copyright 2026 Affaan Mustafa.

ECC is a source-based agent harness toolkit. Its Markdown roles, skills, rules, configuration and hook scripts are directly inspectable. Binary disassembly does not expose a better representation of those assets. Ghidra findings and its bounded WeKnora analysis are recorded in the task's overall reverse-engineering report.

## Source-to-feature mapping

| Primary source                                                                                                                       | Reconstructed behavior in monolith                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [Research-first skill](https://github.com/affaan-m/ECC/blob/b92f181b3b748d1abbc2afd94af6aa7d8c8fca29/skills/search-first/SKILL.md)   | An editable research playbook template: inspect current behavior, identify primary sources and applicable versions, compare approaches, disclose assumptions.                                          |
| [Verification loop](https://github.com/affaan-m/ECC/blob/b92f181b3b748d1abbc2afd94af6aa7d8c8fca29/skills/verification-loop/SKILL.md) | An editable verification template and explicit completion checks with evidence. No commands run merely because a playbook names them.                                                                  |
| [Evaluation harness](https://github.com/affaan-m/ECC/blob/b92f181b3b748d1abbc2afd94af6aa7d8c8fca29/skills/eval-harness/SKILL.md)     | Checks are defined before dispatch, copied into the immutable run policy, and evaluated against the worker's structured report before completion. Human-review policies override automatic completion. |
| [Codex configuration](https://github.com/affaan-m/ECC/blob/b92f181b3b748d1abbc2afd94af6aa7d8c8fca29/.codex/config.toml)              | Harness-independent stored instructions accompany monolith's existing Codex, CLI, OpenClaw and external adapters. This does not install or mutate a developer's global harness configuration.          |

The templates and implementation are original monolith code and wording informed by those patterns. No upstream shell hooks, installers or agent configuration were executed or installed.

## Data and execution contract

- `zillion_agents__playbooks` stores owner-scoped names, descriptions, instructions, required checks, review policy, archival state and revision.
- `zillion_agents__playbook_bindings` links an agent to a reusable playbook by foreign key. Position preserves selection order. Agents and playbooks remain account-scoped; project grants, workspace selection, credentials, budgets and leases retain their existing boundaries.
- An agent can select at most eight playbooks. Each playbook supports ten unique checks; instructions are limited to 6,000 characters and each check to 240 characters.
- Dispatch snapshots active playbooks with their revision into `runs.playbook_snapshot`. The compiled instructions are delivered through `runtime.claim`, together with the structured `playbooks` array. Editing, archiving or reassigning a playbook changes future dispatches only.
- Any assigned `require_review` policy disables automatic completion for that run. An instructions-only playbook works with the deterministic local planner. Required executable checks need a connected worker; the local planner cannot produce verification evidence.
- `runtime.complete` accepts optional `quality_report` entries with `check_id`, `passed` and `evidence`. IDs use `<playbook UUID>:<zero-based check index>`. Every required check must appear once, pass and include concrete nonempty evidence, with a maximum of 4,000 characters. Unknown and duplicate IDs are rejected. Evidence is retained on the completed run.

Example report:

```json
{
  "quality_report": [
    {
      "check_id": "7d15d9d4-8e1b-4264-852c-8bdf5f92b4bb:0",
      "passed": true,
      "evidence": "pnpm build exited 0; focused changed-flow verification passed."
    }
  ]
}
```

Evidence is a worker claim, not independent proof that monolith ran the checks. Human review is the default template policy. A worker whose completion report is rejected must report failure with accrued costs and usage through the existing failure/lease mechanism; heartbeat reporting retains in-progress metering. Existing runs and agents without playbooks retain their existing behavior.

## Scope and verification

This integration provides reusable instructions, templates, assignment, revision protection, archival controls, dispatch snapshots, structured evidence gates and review policies. It does not replicate ECC's entire skill catalog, auto-install harness hooks, execute arbitrary imported shell commands, learn autonomous instincts, benchmark models, or provide independent verification of worker evidence.

`playbookPolicy.test.ts` covers stable check IDs, instruction compilation, legacy compatibility, missing/failed/blank evidence, duplicate/unknown IDs and multiple playbooks. `apps/api/src/tests/agent-playbooks.integration.test.ts` covers bounded contracts and isolated database flows for owner isolation, bindings, revisions, immutable snapshots, forced review, evidence retention and archival controls. Database tests refuse nonlocal databases and require the explicit integration flag on port 55432.
