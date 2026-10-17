# Monolith documentation

The product website and published documentation live in [`apps/site`](../apps/site/README.md).
Run `pnpm site:dev` to edit them and `pnpm site:check` to verify their links and metadata.

This directory holds maintained product guides, release procedures and product screenshots.
Current entry points include [features](FEATURES.md), [releasing](RELEASING.md),
[updates](UPDATES.md), [agent tools](AGENT-TOOLS.md) and
[data migration](MONOLITH-POCKETBASE-MIGRATION.md).

`pnpm monolith changelog create` writes plain Markdown release notes under `docs/changelog`.
