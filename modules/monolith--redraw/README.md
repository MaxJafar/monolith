# Redraw

Redraw is a Monolith addon for visual planning and design. Its dashboard and editor run inside the existing application shell, use `@monolith/ui` primitives and theme tokens, and store projects in the active workspace.

## Open

Open `/redraw` in Monolith. To add it to a workspace's sidebar, enable **Redraw** in **Settings → Addons** (or that workspace's addon settings). Existing workspace choices are preserved.

The development checkout already contains the addon at `modules/monolith--redraw`. A deep link can specify `?workspace=<workspace-id>&project=<project-id>`; the server checks access independently of that URL.

## Included

| Blackboard                                           | Canvas                                        | Both modes                                        |
| ---------------------------------------------------- | --------------------------------------------- | ------------------------------------------------- |
| Mind-map nodes and branches                          | Rectangles, ellipses, diamonds and frames     | Multiple pages and mode switching                 |
| Curved or straight connectors, labels and arrowheads | Text, typography, colors, strokes and opacity | Pan, zoom, fit and grid snapping                  |
| Sticky notes and workshop templates                  | Freehand drawing and raster images            | Selection, move, resize and rotation              |
| Graph arrangement                                    | Landing-page and social-post templates        | Groups, alignment, layers, visibility and locking |

The dashboard supports search, mode filters, favorites, duplication, archive and restore. Edits have undo/redo and automatic saving. Export complete projects as `.redraw.json` for later import, or export the current page as SVG or PNG. Images can be PNG, JPEG or WebP.

Version 0.3 adds:

- **Comments:** open Comments, choose Pin a comment, and click an object or canvas point. Workspace editors can reply, resolve and reopen threads. Viewers can read threads. Authors can delete their own comments; the workspace owner can moderate through the API. Comments have trusted server authorship and persist separately from the design's undo history.
- **Prototypes:** select an object and set its click/hover action in Properties. Navigate to a page or frame, open an overlay, go back, or close an overlay. Choose an initial screen and use Present prototype to preview, including instant or dissolve transitions. Viewers can present too.
- **Vector editing:** use the vector pen for point-by-point paths, or Edit vector nodes on an existing shape. Select and drag anchors or Bézier handles, change corner/smooth/symmetric modes, split segments, delete nodes, and open or close contours. Imported SVG path commands, including quadratic curves and arcs, become editable cubic paths when within conversion limits. Freehand drawing remains available.
- **Fullscreen:** use Open fullscreen in the editor header. Browsers without the Fullscreen API use a focused full-window editor; Escape exits that fallback.
- **Workspace references:** add File tags with nothing selected. Tags are searchable in Redraw and the regular page mention picker. Type `@` in a canonical page to find a Redraw file by title or tag; the legacy page-link picker uses the same catalog. References use stable `/redraw/:id?workspace=…` URLs, appear as backlinks and tagged nodes in Atlas, and respect workspace access. Renaming a file preserves the reference; archived files leave the picker.
- **Improved native imports:** preserve supported gradients and their transforms, font families and text metrics, frame clipping, and click/hover navigation and overlay interactions. Fonts use locally available browser fonts, with fallback when unavailable. Review conversion differences before importing.

Version 0.2 adds:

- **Multiplayer:** workspace members share live edits, names, selections and cursors. Copy a project link to invite existing workspace members. Viewer and editor roles follow workspace permissions, including changes while a project is open.
- **Reusable components:** select objects, name a component in the Layers panel, and insert linked instances. Edit an individual part with Alt-click or a double-click on its layer. Update main component propagates changes across pages while preserving property overrides; reset and detach are available in Properties. Components and their internal connectors live in the current project's library and travel with JSON exports.
- **Nested auto-layout:** wrap a selection or enable layout on a frame. Set parent frames, horizontal/vertical direction, padding, gap, alignment, distribution, wrapping, and fixed/hug/fill dimensions. Frames move their descendants together.
- **Native import review:** choose `.penpot` or `.fig` in the dashboard, inspect page previews and conversion differences, then import into the active workspace. Conversion runs locally in a bounded worker; only the reviewed Redraw document is sent to the server.

Current Penpot ZIP exports and raw or ZIP-wrapped Figma Kiwi files are supported, including Deflate and Zstandard chunks. Pages, common shapes, text, hierarchy, raster assets, vector paths, component definitions and supported flex layouts become editable Redraw objects. Unsupported content is listed before import. Older binary Penpot exports must be opened in Penpot and exported again in its current ZIP format.

Drawing-tool icons are bundled and registered through the shared UI library, so they remain available without the icon CDN. Lucide's notices are in `client/ICONS-LICENSE.txt`.

Keyboard shortcuts apply only when the drawing surface has focus: V select, H pan, R rectangle, O ellipse, T text, N sticky, C connector, P vector pen, B freehand, F frame, 0 fit, Delete remove, arrows nudge (Shift for 10 pixels), Ctrl/⌘ Z undo, Shift Ctrl/⌘ Z redo, Ctrl/⌘ D duplicate, Ctrl/⌘ G group, Shift Ctrl/⌘ G ungroup. In node editing, arrows move the selected node, Delete removes it and Enter finishes. Otherwise Enter adds a Blackboard branch. Double-click a vector shape to edit its nodes, or a text object to focus its text inspector.

## Persistence and access

- Projects use the existing authenticated workspace and membership model. Owners and editors can edit; viewers can inspect and export.
- The client synchronizes through one serialized request approximately every 800 ms while connected. Server transactions lock the project row and merge changed properties. Independent edits combine; simultaneous edits to the same property use the last accepted value. Deletion wins over edits to an existing object. Undo applies only local changes and preserves conflicting remote changes.
- Sequenced session receipts make retries after a lost response idempotent. Failed saves retain the draft in memory with retry and JSON export. Navigation and sign-out protect unsaved changes. Reloading the browser can lose an unsaved draft; export it first. This is shared online editing, not an offline-first CRDT.
- Cache and editor identity include server endpoint, account, workspace and project. Imported documents are validated on both sides. Cross-page and dangling connections are rejected.
- The `redraw__projects` table has owner/workspace isolation and a cascading workspace foreign key. `redraw__sessions` stores presence and retry receipts with a cascading project foreign key. Presence expires after 12 seconds; receipts are pruned after seven days of inactivity when a project next synchronizes. Membership is checked on every request and when listing peers. Archiving is reversible.
- English, Malay, Simplified Chinese and Traditional Chinese are included. Editor panels adapt to narrow screens and honor reduced motion.

## Development and installation

Requires this Monolith workspace, its built-in `monolith--databases` workspace service, React 19, and the shared packages. No external Penpot server is required.

From the repository root:

```sh
pnpm install --filter @monolith/redraw --ignore-scripts
pnpm --filter @monolith/redraw contract
pnpm --filter @monolith/redraw typecheck
pnpm --filter @monolith/redraw test
pnpm --filter @monolith/redraw build
```

Use the repository's existing database migration flow to apply `server/schema.drizzle.ts` when installing or upgrading in another environment. Version 0.2 adds Redraw's sessions table; version 0.3 adds `redraw__comments` with cascading project/thread references. No other addon schema changes are required. The local development schema has been applied; no production deployment was performed. Older Redraw documents remain readable without a document migration.

Core page mentions require this checkout's accompanying changes in `packages/blocks`, the shared DocumentEditor, CanvasWidgetBridge, gateway legacy conversion and workspace graph catalog. Rebuild the shared UI, host and gateway when installing those changes. Updating only the addon archive does not update a different host's page editor. The core catalog checks for the addon table before querying, so hosts without Redraw continue to work.

The source archive includes `shared.ts`, `design.ts`, `vector.ts`, `import-fixtures.ts` and test scripts, which must accompany `client`, `server`, `locales` and `package.json`. Copy its contents to `modules/monolith--redraw` before building in this workspace. Do not install Penpot, REA, Ghidra or Java on the application server: they were research tools only.

## Verification

```sh
pnpm --filter @monolith/redraw test:security
pnpm --filter @monolith/redraw test:browser
pnpm --filter @monolith/redraw test:multiplayer
pnpm --filter @monolith/redraw test:features
```

These checks require the running local API on port 3636, web app on 5173, and isolated PostgreSQL database on 55432, configured in `env/.env.local`. The original browser check uses the repository's synthetic review account in `.temp/monolith-review-fixture.json`. The multiplayer check creates three isolated users; the feature check creates four and enables the canonical editor only for its disposable workspace. All scripts remove only their own fixtures. Screenshots and export samples are written to `.temp/redraw-acceptance`, `.temp/redraw-v2-acceptance` and `.temp/redraw-v3-acceptance`.

The feature check also needs the updated gateway, with `PUBLIC_URL=http://localhost:5173` for the browser's request origin. If the regular gateway uses another origin, run a separate local gateway and set `REDRAW_TEST_GATEWAY_URL` to its loopback origin for the test. This redirects only the test browser's gateway requests; it does not alter the running application's configuration.

Unit tests cover document integrity, graph operations, geometry, templates, locale coverage, concurrent merge/undo, component propagation, nested layout, native binary decoding, gradient transforms, imported prototypes and Bézier editing. HTTP checks cover authentication, workspace boundaries, viewer/editor permissions, revoked membership, concurrent edits, retry receipts, presence, validation, archive/restore, trusted comment authorship and workspace cleanup. Browser checks exercise editing, persistence, exports, narrow layouts, reconnects, three-user collaboration, component controls, auto-layout, native import review, fullscreen, prototype navigation, vector editing, comment threads and durable Redraw mentions in both page editors. Core block tests and gateway conversion tests cover stable Redraw references.

## Current boundaries

Redraw is independently implemented and does not claim full Penpot/Figma/Canva parity. Native imports are conversions, not lossless round trips: effects, shape masks, multiple fills, mixed text styles, advanced prototype actions and unsupported objects can change or be omitted. Missing fonts fall back; text wrapping is approximate. Original external library links expand into editable geometry; captured component definitions can be inserted as new Redraw instances. The review lists recognized conversion differences; proprietary Figma format variations can be rejected. Keep the original file.

Component libraries are per project. Auto-layout supports axis-aligned flex arrangements, not CSS grid, constraints or rotated container layout. Vector Boolean operations and PDF export remain unavailable. Prototype actions support one interaction per object, fixed frame/page scenes, navigation history and centered overlays; smart animation, conditional logic and scrolling prototypes remain unsupported. Long text can overflow its object; increase its height or reduce its font size. Comments are limited to 2,000 messages per project and 5,000 characters per message.

Projects support up to 40 pages, 2,000 elements and 4,000 connectors per page, 100 component definitions (500 elements each), 6,000 total objects, and a 4-million-character document envelope. Raster files are limited to 1.4 MB each; PNG export is bounded to 8,192 pixels per side and 16 million pixels. Native source files are limited to 32 MB, expanded archives/chunks to 96 MB, and worker processing to 15 seconds. Save history is an in-memory undo stack, not a durable server version archive. If concurrent changes cannot form a valid document, export the retained draft before reopening.

No Penpot source, branding, generated decompilation or renderer binaries are included in the application. Dependency and icon notices are distributed with the addon.
