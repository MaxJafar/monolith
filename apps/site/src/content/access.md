---
title: Access and data
description: Workspace roles, host administration and the boundaries around your data.
section: Your workspace
order: 16
---

Monolith separates workspace access from host administration. Configure both deliberately when more than one person uses an installation.

## Workspace roles

Owners, editors and viewers have different capabilities. Viewers can inspect accessible content; editing and mutation controls depend on the underlying endpoint and workspace role.

Search, widgets, linked views and addons do not create a new permission system. They must use the same authorized data as the original workspace surface.

## Host administration

The host administrator manages package installation, release catalogs and server updates. Being an owner of one workspace does not by itself confer package-administration rights on the whole host.

Database application connections use a restricted role. Schema management uses a separate administrator connection. Never configure the ordinary API or an automation worker with a superuser or `BYPASSRLS` application connection.

## Agent sessions

The [MCP bridge](/docs/agents) signs in with a revocable device session. Its read/write/deletion switches constrain the bridge’s exposed operations. The underlying session retains the signed-in account’s normal permissions; those switches are not server-enforced reduced-scope credentials.

Credential files live outside the repository and contain refresh credentials. Keep their directory private and revoke unused sessions.

## Trusted extensions

Addons run trusted application code. Package signatures and checksums establish integrity and publisher trust; they do not turn an addon into a sandboxed program. Review the source and permissions before installing packages from another publisher.

## Backups and recovery

Back up the database, uploaded files and required configuration. Preserve encryption and signing configuration when moving a host. Test restoration on a separate installation.

Automatic update rollback restores the previous compatible runtime. It does not recover arbitrary data deletion or reverse a database migration. See [updates and recovery](/docs/updates).
