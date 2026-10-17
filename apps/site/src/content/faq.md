---
title: Questions and answers
description: Practical answers about hosting, clients, extensions and integrations.
section: Start here
order: 9
---

## Is Monolith a hosted service?

Monolith is a workspace you can run on your own host. This Vercel website contains product information and documentation. It is not a login portal for a managed workspace subscription.

## Where should I start?

Use [Installation](/docs/installation) to set up a development host, then follow [Your first workspace](/docs/quickstart) to create a page, plan a project and arrange your dashboard. If you are evaluating the implementation, start with [Architecture](/docs/architecture).

## Where do I download the desktop clients?

Check [GitHub Releases](https://github.com/MaxJafar/monolith/releases) for published artifacts. The current source is a development version, and signed public desktop releases require configured distribution credentials and verification. You can build the source on the appropriate platform. See [release availability](/docs/availability).

## Do I need every addon?

No. Native sections provide the foundation. Install the optional packages you need and enable them per workspace. Hosts can browse configured release catalogs without preloading every tool into the core experience.

## Is a widget a small addon?

A widget is a compact connected view on your dashboard, sidebar or supported addon canvas. Some widgets come from their own package; others are supplied by the core or another addon. Full addons have their own application surfaces. See [widgets and dashboards](/docs/widgets).

## Do addons each need a separate repository?

No. Packages can have independent versions and releases in the same repository. Separate repositories can be useful for independent maintainers, but they are not a requirement for versioned downloads.

## Does MCP require the Agents addon?

No. The [MCP and CLI bridge](/docs/agents) is a separate integration for external clients such as Codex and Claude Code. The [Agents addon](/docs/agents-addon) organizes assignments executed by configured workers.

## Will automatic updates migrate my database?

No. Automatic server installation requires a compatible schema fingerprint. Schema-changing releases require a planned migration and backup. Runtime rollback cannot undo database changes. See [updates and recovery](/docs/updates).

## Can I work fully offline or co-edit live?

Monolith has native draft and conflict recovery, but does not currently promise general offline synchronization or simultaneous live document co-editing. Treat those as separate capabilities rather than inferring them from the document engine.

## What languages are supported?

The workspace maintains English, Malay, Simplified Chinese and Traditional Chinese locale packs. This public documentation site is currently in English.

## How can I contribute?

Start with [development and releases](/docs/development), the repository’s contributor instructions and its applicable license terms. Use [GitHub issues](https://github.com/MaxJafar/monolith/issues) for reproducible bugs and focused proposals.
