---
title: Troubleshooting
description: Resolve common installation, integration and update problems.
section: Host & build
order: 33
---

Start with the relevant service’s logs and the exact error. Use your current checkout’s configuration and avoid sharing secrets in issue reports.

## The development database does not start

Confirm PostgreSQL 17 is installed, `POSTGRES_BIN` points to its binary directory and port 55432 is available. Run `pnpm local:setup` from the repository root. Existing data should be backed up before trying a fresh setup or migration.

## The page opens but API requests fail

Check that the API is running and that the browser points to the intended host. In local development, the browser and API use different ports. In a hosted installation, use the public gateway HTTPS origin; the private domain API should not be exposed as the client host.

Inspect migration and service logs. A failed migration intentionally prevents the API from starting.

## An addon or widget is missing

Check three separate things: whether its package is installed on the host, whether it is enabled for the current workspace, and whether your account can access the underlying data. Some widgets are supplied by an addon and only appear when that addon is available.

If downloads or update actions are unavailable, check the signed catalog configuration and package compatibility with the host version.

## An automation schedule does not run

New workflows are paused. Enable the workflow, set a nonzero interval and verify that the automation worker is running with the owning account and a restricted database connection. Manual runs can still work while the workflow is paused.

## The MCP catalog returns 404

Restart or redeploy the API with the integration catalog implementation. The bridge cannot discover tools from an older API. Verify the gateway URL and run:

```sh
pnpm --silent agent doctor
pnpm --silent agent tools list
```

A missing individual tool may also reflect an unavailable module or disabled bridge write options. Inspect the schema and permissions rather than guessing an API request.

## A save reports a conflict

Read the latest revision and reconcile your draft. Do not repeatedly submit an old expected revision or overwrite another save without reviewing it. Preserve an export or copy of important draft work during resolution.

## An update failed

Read Settings → Updates for download, verification or recovery errors. Check disk space, host permissions and Docker availability as relevant. A schema mismatch requires a planned migration. If recovery itself failed, preserve the update journal and previous files/images while resolving the host problem.

## Report a reproducible issue

Include your version, platform, steps, expected result and a sanitized error excerpt in a [GitHub issue](https://github.com/MaxJafar/monolith/issues). Do not attach environment files, credential profiles, private databases or sensitive workspace screenshots.
