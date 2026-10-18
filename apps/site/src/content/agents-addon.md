---
title: The Agents addon
description: Organize agent profiles, assignments, execution and review.
section: Extend Monolith
order: 23
---

The Agents addon coordinates assigned work through configured execution workers. It is separate from the [MCP and CLI bridge](/docs/agents), which lets an external agent use Monolith tools.

## Organize the work

Create agent profiles, describe reporting relationships and assign project context. The addon records execution leases, review state and usage history so work can be inspected after it runs.

Only grant the context an assignment needs. A profile or playbook does not independently grant permission to access every workspace or execute arbitrary host commands.

## Connect a worker

Configured local, OpenAI or CLI workers execute assignments against granted project context. The worker, provider credentials and runtime must be configured by the host operator; creating an agent profile does not provision an AI service.

The repository includes the worker entry point:

```sh
pnpm agents:worker
```

Configure the intended runtime, account and database connection using the worker setup in your checkout before starting it. Keep provider credentials on the host, outside public source and agent prompts.

## Review evidence

Use execution history and review surfaces to inspect results and usage. Required checks need a connected worker to produce evidence. Worker-reported evidence remains subject to human review.

Playbooks hold reusable instructions and completion checks. Dispatch captures the relevant revision so later edits do not silently change an already assigned job. Playbook text is data, not permission to install shell hooks or expand access.

## Use the right integration

If your goal is to let Codex or Claude Code read and edit your pages from its own client, use [MCP and CLI](/docs/agents). That bridge does not require the Agents addon.
