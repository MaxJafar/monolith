# Monolith interface guide

This is the maintained reference for the shared UI package and workspace surfaces. Component stories beside each implementation demonstrate the supported API. Review those examples before using or changing a control.

## Building a surface

Use `Box`, `Flex`, `Stack`, `Grid`, `Text`, and `Icon` from `@monolith/ui` for structure. Select semantic elements with `as`; `asChild` composes props onto one child without adding an unnecessary wrapper. Keep refs and accessible names intact when composing.

Primitive props cover spacing, dimensions, alignment, typography, color, corners, and responsive values. Prefer them to inline styles. Use plain CSS with project custom properties when an external library or genuinely dynamic geometry needs it. Do not use Tailwind utilities, directives, or functions. Shared third-party controls must be exported through this package.

The styling implementation uses Vanilla Extract with token and responsive resolvers. Token definitions in `src/system` are authoritative; do not reproduce a second token scale in a feature. Color props accept the theme/state forms illustrated in stories. Use semantic surfaces and selection colors instead of hardcoded blue highlights. Account preferences may change font size, corner scale, theme, and background.

## Identity and hierarchy

The source mark is `apps/web/public/brand/monolith-mark.svg`. It is the same mark in both themes. Regenerate its desktop, favicon, and website variants with `pnpm brand:assets`; preserve transparency outside the tile.

The workspace uses neutral opaque surfaces, restrained borders, and modest shadows. Inter is the default interface font and JetBrains Mono is the technical font. Both ship locally with their font licenses. User-selected hosted fonts are optional and must not block the default interface.

Primary actions use the interactive foreground/background tokens. Reserve red and amber for error or warning meaning; data properties may have categorical colors. Keep important text readable in both themes. Use compact control corners and reserve pill shapes for switches or badges.

Use the established spacing rhythm, fluid page gutters, and phone reflow. Standard writing pages have a readable measure; Full width fills the available pane. Embedded databases may scroll horizontally. Avoid nesting viewport-height workspaces, which clips the account controls below the main chrome.

## Inputs and saving

Use the shared Button, TextInput, ListboxInput, ComboBox, Switch, Checkbox, Slider, date, icon, color, and file controls. Do not introduce a second native-select appearance in settings or dashboards. A control's label must remain available to assistive technology even when its visual layout is compact.

Check whether the control translates labels internally. Explicit translation is for plain text or controls without this behavior. Namespace-relative keys must be present in all four supported languages.

`FormModal` owns its form, pending state, and submission. Return the save promise from its handler. Do not nest forms. A failed save keeps the draft and displays the error; a completed save may close the form. Confirmation dialogs also await their handler. Disable duplicate actions during an outstanding write.

Use contract-derived query options and invalidation keys. Include account/workspace scope where the endpoint requires it. Optimistic changes must restore previous data on failure. Native draft recovery and revision conflicts remain part of the shared persistence flow.

## Popovers and menus

`FloatingPopover` is the default for contextual editors such as event details, names, icons, and properties. Anchor it to the invoking object, keep the page layout stable, constrain it to the viewport, and allow nested controls to work.

`HoverCard` with `useHoverCard` previews an item on hover or keyboard focus without moving focus, for example a calendar day or event. It opens after a short delay, follows the pointer between neighbouring triggers, stays open while the pointer rests on it, and leaves touch taps to the trigger's own action. Never put the only route to an action inside a hover card.

`ContextMenu` handles action menus. A `contextTarget` supports right-click and Shift+F10. Search and settings use the shared modal stack. Escape closes the foremost surface, focus stays inside modal dialogs, and dismissal restores focus to the opener. Keep an accessible close action on every modal surface.

Use the compact icon/color palette for ordinary page and folder editing. Prefer a local popover over a full-screen picker. Shared confirmation behavior must preserve drafts when the user cancels.

Page headers use `PageIdentity`: the page icon is shown large above the title and rests on the cover's lower edge when a cover is present. Add icon and Add cover appear only while the page is hovered or focused, and only for what is missing.

## Documents and databases

Canonical pages, database records, relations, and document identities are the common data source. A dashboard or widget shows those records; it must not maintain a second task/project store. Preserve historical IDs and aliases needed to open existing content.

The shared page editor owns title, icon, properties, comments, and content. Support side, center, and full-page presentation without creating different document copies. Inline databases may appear inside callouts. Background changes belong to the document and participate in undo.

Text selection keeps the browser's text menu. Block-level actions appear only when the user targets a block. Each block has one grip and selection gutter. Editable titles should feel like text rather than a large boxed input.

Views share property schemas, tag colors, and color rules. Keep labels and status readable without color. Missing values use neutral fallbacks, multiple tags use a deterministic choice, and completed status takes precedence over stale active status.

## Native workspace features

Calendar, Projects, Actions, Journal, Docs, Rooms, and database views belong to the platform. Native feature routes must work without an optional addon implementation.

Calendar edits use anchored popovers and may open the full record. Day/week gestures move and resize the same event records, with preview, cancellation, keyboard equivalents, recurrence rules, permissions, and conflict handling. Date properties can project records into a calendar without duplicating them.

Projects show canonical project records; actions relate to individual projects through saved relations. Progress is derived from those actions. Journal uses native dated writing records and the common editor. Dashboards offer connected views and editable widget layouts.

The sidebar stores device/workspace preferences separately from shared navigation. Width is bounded to 220–420px. Persist a resize once on release; Escape restores its starting value. Shared group order, names, and archive state use revision checks. Archiving a parent hides descendants without deleting their documents.

## Addons and widgets

An addon contributes an installed experience; a widget is a connected block on an allowed surface. Manifests describe experience kinds and supported surfaces, not elevated runtime privileges. Widget-only experiences belong in widget catalogs rather than the primary route list.

Catalog filters combine search, type, category, and installation state. Package cards explain the tool and its availability. Licensing and source attribution remain in notices. Owner-only changes show progress, announce success/failure, and retain the previous value when a write fails.

`WidgetBoard` is shared across web, Windows, and macOS. Dashboard catalogs combine native blocks with installed widgets. Area canvases set `widgetScope`; addon canvases offer only the widgets registered for that addon. Viewer layouts expose no editing, template, drag, or resize actions.

Layouts preserve IDs and undo. Keep historical page content full-width without a duplicate heading or irrelevant widget-size controls. Width is full/half/third; height is automatic (zero) or at most 1000px. Apply those bounds in Go, Rust, and Swift as well as the browser. Menus must remain above adjacent tiles and container-query stacking contexts.

## Graphs, agents, and services

Atlas is an optional dashboard over canonical pages and records. Keep the application sidebar and ordinary editors; do not create a nested vault, tab system, or second editor. Graph nodes open their canonical routes. Derived mentions, membership, hierarchy, and inline embeds are read-only evidence; only explicitly authored semantic links can be removed.

The graph provides an accessible entity list, selection/neighbor emphasis, fitting, layout controls, and reduced-motion behavior. Keep distant nodes legible and suppress cluttered labels. Stop simulations, listeners, and pointer interactions on cleanup.

Contextual Atlas suggestions reuse authorized search passages. Label inferred topics and similarity scores, explain coverage limits, and do not save suggestions as authored links automatically. Do not create another background index or send inference requests merely to render the graph. Discard late responses after account/workspace/query changes. Refresh saved content on identity notifications, focus, and the existing visible polling cadence.

Agent work surfaces show actual task, run, approval, and usage state from the server. Keep instructions, knowledge sources, execution evidence, and approvals distinguishable. Tech Lab integrations, Gym records, Automations, and Redraw use their own declared capabilities while linking back to canonical workspace entities where appropriate.

## Motion and input

The shared spring model uses seconds, bounded timesteps, and cleanup on suspension. Gesture visuals may lag at most 24px; the logical pointer target remains immediate. Reorders use FLIP and resize commits once. Native scroll remains native, with only a bounded edge spring.

Every drag action has a keyboard alternative. Cancel on Escape, capture loss, blur, unmount, or lost permission. Cancelled gestures restore previews without persisting. Reduced motion removes decorative lag, deformation, and overshoot while retaining all functionality.

Use `setInternalDragData`, `hasInternalDragData`, and `getInternalDragData` for internal HTML dragging. Their same-document fallback supports WebKit when it omits custom MIME data. Clear the gesture on completion or cancellation. A text payload is never authorization to move a record; validate workspace membership and permission at the destination.

Menus and popovers animate opacity/transform briefly, without shifting layout. Hover feedback must also appear for keyboard focus and remain usable on touch. Preserve touch target sizes and clear focus indicators.

The directly distributed macOS host conditionally opts into its high-refresh rendering policy. That private platform preference must be omitted from an App Store build until a supported equivalent exists. Measure frame delivery and interaction latency rather than assuming the display's advertised rate.

## Verification

Check light/dark themes, keyboard traversal, reduced motion, phone layout, loading/error/empty states, and viewer permissions. Exercise save failure and retry without duplicated records. Test the same scope and persistence behavior in native clients. Use local icons via `registerWorkspaceIcons()`; refresh the bundled collections with `pnpm exec node tools/desktop-assets.mjs` and retain their notices.
