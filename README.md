<!-- monolith-product-links -->
<p align="center">
  <a href="https://monolith-site-maxjafars-projects.vercel.app"><strong>Monolith website ↗</strong></a> ·
  <a href="https://monolith-site-maxjafars-projects.vercel.app/docs"><strong>Documentation ↗</strong></a> ·
  <a href="https://monolith-site-maxjafars-projects.vercel.app/addons"><strong>Addons and Widgets ↗</strong></a>
</p>

The product site documents the current development workspace; the default branch may lag behind those features. See [release availability](https://monolith-site-maxjafars-projects.vercel.app/docs/availability).
<!-- /monolith-product-links -->

# monolith

A personal workspace built on LifeForge, with twelve personal tools, connected databases, block documents, a visual knowledge map and an agent team. Monolith uses a black and white identity, quiet surfaces, compact controls and an original geometric M mark. Light and dark themes share a Notion-inspired page tree, canvas and board experience.

## Local development

Use Node 22.23 or newer and pnpm. The repository declares pnpm 11.21.0. PostgreSQL 17 must already be available. Set `POSTGRES_BIN` to its bin directory (for example, `$env:POSTGRES_BIN='C:\Program Files\PostgreSQL\17\bin'` in PowerShell). The macOS default is `/opt/homebrew/opt/postgresql@17/bin`. Store database timestamps in UTC.

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm local:setup
pnpm db:push
pnpm dev
```

Open [monolith](http://localhost:5173). The API listens at `http://localhost:3636`; the isolated development database uses `127.0.0.1:55432/zillion_dev`. On a new database, onboarding creates the first profile. The existing verification database contains synthetic preview data. Local verification credentials are stored privately in ignored `.temp/preview-login.json`.

`local:setup` creates ignored `env/.env.local` with random secrets, an administrative schema role and a restricted application role. Never use a superuser or BYPASSRLS role for `DATABASE_URL`: API startup checks this. `DATABASE_ADMIN_URL` is for schema management and rehearsal tooling. The setup command refuses a different host, port or database; it does not manage other installations.

For separate terminals, use `pnpm --filter @lifeforge/server dev` and `pnpm --filter @lifeforge/client dev --strictPort`. Stop those terminals with Ctrl+C. `pnpm local:stop` stops this checkout’s database while retaining its files under `.temp`. Windows uses a separate native cluster so an existing macOS cluster is preserved.

## What is included

Todo List, Idea Box, Calendar, Pomodoro Timer, Code Time, Achievements, Blog, Projects, Notes, Flashcards, Wallet and Wishlist use current contracts, PostgreSQL and the shared UI. The database module adds typed properties, record pages, table, Kanban and calendar views, saved filters/sorts and reciprocal relations across bases. Date, tags and owner shortcuts create typed properties; owners can be the current account or owned workspace agents. Filters combine all/any groups, exact tag membership and relative dates such as this week or overdue.

[Calendar](http://localhost:5173/calendar) combines native calendars, ICS and module events with saved database calendar views. Select multiple calendars and categories, search, or filter by source, event type, date range, tags and owner. Filter selections are kept in the URL. Database calendar views bind a Date property and optional end Date property, offer month/week/agenda layouts, retain undated pages, and move date ranges without overwriting competing edits. Database dates are civil days; time-specific appointments use native Calendar events.

[Documents](http://localhost:5173/databases?section=documents) adds nested pages with headings, lists, checklists, quotes, code, dividers, block movement/duplication, undo/redo and Markdown export. Documents, database record pages and Notes share the same block editor. Existing plain text is retained until explicitly saved; Markdown in old content remains literal text.

[Knowledge map](http://localhost:5173/databases?section=graph) connects documents, records and notes through stable page links, `[[Title|alias]]` references, live backlinks, database relations and labeled manual connections. Explore global/local neighborhoods with search, type/orphan filters, zoom, pan and draggable nodes. Page links resolve only within the signed-in account; duplicate titles require an explicit page choice. Document revisions, record/note timestamps and relation baselines reject stale saves. Editors warn before discarding drafts.

[Agents](http://localhost:5173/agents) adds assignable agent profiles, roles, reporting lines, project grants, dependencies, linked page context, budgets, execution leases, review and durable token history. Agents share existing Projects tasks. Choose a local planner, OpenAI worker, custom CLI, Codex CLI or OpenClaw runtime. Per-task automation can dispatch ready work and complete successful tasks; configured workers must remain running. `pnpm agents:worker` uses private scoped credentials, your installed runtime/model and token rates. See [Multica/Paperclip REA, architecture and worker setup](docs/ZILLION-AGENTS-RESEARCH.md). Live provider execution requires your configuration.

Internal `@lifeforge/*` package names and database table prefixes remain compatible. The user-facing product is monolith. English, Malay, Simplified Chinese and Traditional Chinese locale packs are included.

## Verification and migration

See [the local verification report](docs/ZILLION-VERIFICATION.md), [AFFiNE/REA research and relation semantics](docs/ZILLION-AFFINE-RESEARCH.md), [agent systems research and runtime protocol](docs/ZILLION-AGENTS-RESEARCH.md), [PocketBase migration rehearsal](docs/ZILLION-POCKETBASE-MIGRATION.md) and [container setup](docs/ZILLION-CONTAINERS.md).

```sh
pnpm typecheck
pnpm --filter @lifeforge/server-utils test
pnpm --filter @lifeforge/api test
pnpm --filter @lifeforge/blocks test
pnpm exec cross-env ZILLION_INTEGRATION=1 pnpm --filter @lifeforge/server exec vitest run src/tests
pnpm exec cross-env ZILLION_INTEGRATION=1 pnpm exec vitest run tools/src/zillion/migratePocketBase.test.ts
```

Integration tests are restricted to the isolated local development/test services. PocketBase migration defaults to dry-run, requires explicit owner mapping and supports guarded local apply/rollback. Existing bcrypt passwords are verified and rehashed to argon2 only after a successful login. Production data and deployment were outside this local task and were not changed.

External AI/OAuth/API integrations require the owner’s credentials. Code Time accepts authenticated tracking data; installing/configuring an external editor integration is separate. Container sources are prepared and statically checked; container execution remains unverified. Maintained source formatting is checked separately from archived reference evidence. Repository-wide ESLint still reports legacy typing and conditional-check debt; the [verification report](docs/ZILLION-VERIFICATION.md) distinguishes global results from passing checks for the new runtime and repaired navigation code.

## Attribution and licenses

monolith is a modified LifeForge fork. [LifeForge](https://github.com/LifeForge-app/lifeforge) was initiated by [Melvin Chia](https://github.com/melvinchia3636) and is licensed under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/). The original license and package/module notices are retained. Some packages have their own licenses; consult their LICENSE files. Original upstream development documentation remains available through the LifeForge repository and its [documentation](https://docs.lifeforge.dev).

AFFiNE source was researched with REA; its CRDT/collaboration implementation was not copied. The independent database, document and graph implementation and source/license references are documented in the research report. Notion, Outline and Obsidian informed interaction patterns; their source code and assets were not copied. Multica and Paperclip informed the independent agent/project/run design; [their pinned licenses and analysis limits](docs/ZILLION-AGENTS-RESEARCH.md#licenses) are recorded without vendoring their code. Rich editing uses Tiptap 3.31.4 and graph layout uses d3-force 3.0.0 through the shared UI library. This implementation does not provide full upstream feature parity, collaboration or offline synchronization. The Monolith logo is an original SVG; no reference product logo or assets were copied.
