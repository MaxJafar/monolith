---
title: Architecture
description: How Monolith clients, the gateway, domain API, storage and extensions fit together.
section: Host & build
order: 33
---

Monolith uses a shared workspace interface with a public gateway, a private domain API and persistent storage. The product website is a separate static application.

## Clients connect to one host

| Client  | Implementation                      | Connection                                           |
| ------- | ----------------------------------- | ---------------------------------------------------- |
| Browser | React 19 workspace                  | The public gateway serves the built client.          |
| Windows | Tauri and WebView2 shell            | Connects to the configured HTTPS host.               |
| macOS   | AppKit and WKWebView shell          | Connects to the same HTTPS host.                     |
| Agents  | Local stdio MCP bridge and JSON CLI | Uses a revocable device session against the gateway. |

Native credentials and recovery drafts live outside replaceable application files. The MCP bridge runs on the agent's machine and has no public HTTP MCP listener. See [MCP and CLI](/docs/agents) for access modes and supported configuration formats.

## Gateway, API and storage

The **Go gateway** is the public entry point. It serves browser assets, manages device sessions and canonical document operations, and forwards domain requests to the private TypeScript API.

The **domain API** implements workspace records, authentication and addon lifecycle operations. **PostgreSQL 17** stores persistent application data; uploaded files and host configuration also need persistent storage and backups.

The container setup separates the schema-management role from the normal application role. See [self-hosting](/docs/self-hosting) for the exact services, ingress and volume configuration.

## Documents and connected views

The canonical editor uses **BlockSuite and Yjs**. Gateway operations persist document state with revision checks so a stale save can be rejected instead of replacing newer work.

Pages, database records, projects and tasks have stable identities. A project board, calendar or dashboard widget can show an existing record without creating a separate copy.

These building blocks do not imply general offline synchronization or simultaneous live document co-editing. Draft and conflict recovery have their own specific behavior.

## Native sections, addons and widgets

- **Native sections** provide Calendar, Projects, Actions, Rooms, Docs, Dashboard and Databases.
- **Addons** are independently versioned packages with optional workspace surfaces, such as Atlas and Automations.
- **Widgets** are registered compact views for dashboards, supported addon canvases and sidebar placements.

Package installation belongs to the host; enablement belongs to a workspace. Addons execute trusted application code and are not sandboxed. The [addon guide](/docs/addons) describes signed catalogs, compatibility and installation states.

Scheduled automations and agent assignments require their respective workers. The [Automations guide](/docs/automations) and [Agents addon guide](/docs/agents-addon) describe their setup.

## Updates run outside replaceable services

Desktop and server supervisors discover signed GitHub releases, verify downloads and activate compatible packages. The host supervisor runs outside the containers it replaces.

A failed startup or health check can restore a previous runtime. A changed database schema requires a planned migration; application rollback does not reverse stored-data changes. Read [updates and recovery](/docs/updates) before enabling automatic installation.

## Repository map

| Path                                 | Responsibility                                               |
| ------------------------------------ | ------------------------------------------------------------ |
| `apps/web`                           | Shared browser workspace                                     |
| `apps/api`                           | Domain API and addon lifecycle                               |
| `apps/gateway`                       | Public gateway, documents and device sessions                |
| `apps/desktop`, `apps/desktop-macos` | Windows and macOS shells                                     |
| `packages`                           | Shared UI, contracts, editor blocks, runtime and agent tools |
| `modules`                            | Core storage modules and optional tools                      |
| `apps/site`                          | Product landing pages and public documentation               |
| `docs`                               | Engineering, deployment and verification guides              |
| `tools`                              | Development, migrations, packaging and verification          |

The website builds to static Astro output and runs on Vercel without a workspace database or account service. It describes the development product; publishing documentation does not publish a new application release. Continue with [development and releases](/docs/development).
