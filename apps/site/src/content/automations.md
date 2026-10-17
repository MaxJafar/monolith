---
title: Automations
description: Connect workflow steps, run them and inspect the results.
section: Extend Monolith
order: 22
---

Automations is Monolith’s visual workflow addon. Enable it in a workspace, open the tool and start from a template or a new workflow.

## Build your first flow

1. Add a trigger and the steps you need.
2. Click an output port followed by an input port to connect steps.
3. Configure fields in the inspector and save the workflow.
4. Run it manually with JSON input.
5. Open execution history to inspect each visited step’s input, output, duration and error.

Drag nodes or use the arrow keys. Escape cancels a connection or drag. The inspector can remove connections, and undo/redo applies to graph edits.

## Available steps

The current set includes trigger, field assignment, condition, HTTP GET/POST, short delay and output nodes. Use a condition to branch and field assignment to prepare data for later steps.

HTTP nodes target public services. The current implementation does not include shell execution, arbitrary code nodes, a general credential vault or the connector catalogs of other workflow products.

## Manual, event and scheduled runs

New workflows begin paused. Manual runs are available while paused. Authenticated event calls and interval schedules require the workflow to be enabled.

Saving an interval schedules the next run relative to that save. Setting the interval to zero disables scheduling. To execute schedules, configure `MONOLITH_AUTOMATIONS_USER_ID` with the owning account UUID and provide the normal restricted `DATABASE_URL` to the worker:

```sh
pnpm --filter @monolith/automations worker
```

The worker is part of your host configuration; saving a scheduled workflow alone does not start it. Never use a database administrator role for this process.

## Imports and permissions

Export native JSON to keep a portable workflow definition or a draft before resolving a conflicting save. Imports support native Monolith JSON and a limited, explicit subset of n8n and Node-RED. Unsupported node types produce an error rather than a silently incomplete workflow.

Viewers can inspect workflows. Editors and owners can modify and run them. Event requests use ordinary account authentication and workspace authorization. Check the installed module’s generated API contract before invoking it programmatically.
