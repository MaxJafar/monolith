# Working on Monolith

## Scope and ownership

Follow the user's current request. Run commands, edit files, install dependencies, and remove material only as needed for work they have explicitly requested. Do not expand a specific fix into unrelated cleanup. If a reference such as "this" has no clear target, ask before changing it.

Read a file again immediately before editing. Preserve edits made by the user or another contributor; do not revert them merely because they differ from an earlier version. A breaking refactor does not authorize changing its consumers unless the request includes that work. Changes to this guide require the user's explicit approval.

## Tooling

Use pnpm for every project command, including installs, development, builds, tests, and typechecks. Do not substitute another package manager. Observe the repository's build guard and use an appropriate verification host for resource-intensive checks.

For reverse-engineering requests, load the reverse-engineer skill and its REA and Ghidra references. Use REA for evidence gathering, evaluate Ghidra for native artifacts, and describe only the tools and analyses actually used. Installed CLI fallbacks are available when the MCP provider is unavailable.

## Frontend contracts

The shared UI package is `@monolith/ui`. Its usage guide is `packages/ui/DESIGN.md`; update that guide rather than adding competing UI rules. Inspect a component's Storybook examples before using it.

Use the UI primitives and their props for ordinary layout and styling. Plain CSS and custom properties cover cases the primitives cannot express. Tailwind syntax and utilities are prohibited, including `@apply`, `@reference`, `@layer`, and `theme()`. Third-party class-name props take ordinary CSS class names.

Shared third-party UI dependencies belong in the UI package. Consume its existing re-exports, and expose a new cross-cutting dependency there before using it throughout the application.

The `@` import alias refers to the current package's `src` directory. Use short relative imports for nearby files and the alias for distant files.

## Translation and queries

Check a control's built-in translation behavior before calling `t()`. Buttons, modal and module headers, menu items with labels, and form fields already resolve their labels. Translate plain text or controls that do not do this themselves.

Keys passed to `useModuleTranslation()` are relative to the module namespace. Add each new key to English, Malay, Simplified Chinese, and Traditional Chinese.

Query keys come from the typed API contracts: use the relevant `workspaceAPI` endpoint's `key` or query options. Replace literal query-key arrays in files being refactored with their contract equivalents.

## Component state

Use React 19 context provider elements: `<Context value={value}>`. A provider replacing prop drilling owns its state, effects, refs, and update functions; consumers read that context instead of maintaining duplicate state.

When extracting a component, move the values, effects, helpers, and state used only by that component into its own file. Keep shared behavior in the appropriate provider or shared module.
