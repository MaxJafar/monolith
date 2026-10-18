# Atlas

Atlas is Monolith's connected knowledge addon. Enable it in workspace settings, then open **Addons → Atlas**. It uses the existing workspace pages and database items, including canonical BlockSuite bodies, rather than creating a separate note store.

Explore a force-directed graph or a radial mind map, focus on a page's neighborhood, filter by title, source, type or tag, and follow backlinks. Select a node to preview it; double-click or use **Open page** to edit the original. Page mentions, database relations and page hierarchy appear automatically. Owners and editors can also add named connections; viewers can explore without changing content.

Atlas also connects tasks, projects, notes, events, ideas and imported knowledge through tag hubs and recurring topics. Explicit record tags and inline `#hashtags` form shared hubs. Context discovery derives weighted phrase matches and reuses fresh embeddings from the existing RAG search index, without generating or storing new content. It analyzes up to 600 accessible sources, 160 tags and 48 topics, with up to four contextual neighbors per source. Coverage is displayed in the workbench; these bounded suggestions are not an exhaustive semantic index.

Every node and edge has a stable identity color; switch to **By type** for grouped colors. Toggle tag/topic/context layers, adjust minimum similarity, or select a line to see why two sources connect. Dotted context links are suggestions. **Save connection** turns a suggestion between real pages into a durable, permission-checked relationship. **Search knowledge** runs workspace-scoped hybrid RAG retrieval and opens evidence directly on the map. Keyword retrieval remains available while the model host or embeddings are unavailable; **Manage search index** opens the existing index controls for the same workspace.

Drag nodes or the background, scroll to zoom, or use the zoom/fit buttons. Keyboard users can select nodes with Enter and open them with Ctrl/Cmd+Enter. Graph motion can be paused and follows the system reduced-motion setting. Large workspaces show up to 600 matching nodes with a visible limit notice; use search, filters or a neighborhood to narrow the map.

From the Monolith root:

```sh
pnpm install
pnpm --filter @monolith/atlas typecheck
pnpm --filter @monolith/atlas test
pnpm --filter @monolith/atlas build
```

Atlas depends on Monolith's built-in Databases workspace service. Its server reuses that service's permission-checked routes and adds a bounded, plain-text preview endpoint. No new tables or migrations are required. Client query caches include workspace and account identity. Shared graph rendering lives in `packages/ui`; frontend conventions live in `packages/ui/DESIGN.md`. All copy is supplied in English, Malay, Simplified Chinese and Traditional Chinese.

Context discovery uses the core `/search/map` contract and existing search storage. Core search sources now include canonical record tags, so editing a tag invalidates the corresponding search fingerprint. Test discovery and permissions with `pnpm --filter @monolith/server exec vitest run src/tests/atlas-context.test.ts` and the isolated-database Atlas integration suite. `pnpm exec node tools/atlas-context-smoke.mjs` exercises colored maps, evidence, saved suggestions and RAG navigation using disposable synthetic records that it removes afterward.

The addon is automatically included in the desktop bundle. Existing workspaces opt in through their addon settings; new personal workspaces include it by default. Run `pnpm monolith addons pack monolith--atlas` to package its source for a compatible Monolith installation. The repository's existing license applies.
