# Automations

Monolith's visual workflow addon. Enable it in the addon manager for a workspace, then open **Automations**. Start from a template, add and connect nodes, configure fields, save, and run with JSON input. Execution history shows the input, output, duration and error of each visited node.

Included nodes: trigger, field assignment, condition, HTTP GET/POST, short delay and output. Drag nodes or use the arrow keys. Click an output port followed by an input port to connect them. Escape cancels a connection or drag. The inspector removes connections; undo/redo applies to graph edits.

Workflows begin paused. Manual runs work while paused; authenticated event calls and schedules require an enabled workflow. Saving an interval schedules the next run relative to that save. Zero disables scheduling. Viewers can inspect; editors and owners can modify and run workflows. Export JSON to keep a draft before resolving a conflicting save.

```sh
pnpm install
pnpm --filter @monolith/automations contract
pnpm --filter @monolith/automations typecheck
pnpm --filter @monolith/automations test
pnpm --filter @monolith/automations build
pnpm monolith db push
```

For interval schedules, set `MONOLITH_AUTOMATIONS_USER_ID` to the owning account UUID, supply the ordinary restricted `DATABASE_URL` (never an administrative database role), then run:

```sh
pnpm --filter @monolith/automations worker
```

The authenticated `flows/run` API accepts `workspace_id`, workflow `id`, and `{ input, expected_revision, trigger: "event" }`. Its module route comes from the installed manifest; use the generated client contract. Requests use the same account authentication and workspace authorization as the rest of Monolith.

Imports support Monolith's native JSON and a limited, explicit subset of n8n/Node-RED. Unsupported nodes produce an error. HTTP nodes target public services only; credentials, shell/code execution and upstream connector catalogs are not included. See the [Automations guide](https://monolith-site-maxjafars-projects.vercel.app/docs/automations) for supported imports and execution behavior.
