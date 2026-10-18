# Monolith release preparation

Monolith has one maintained source tree: `apps/web`, `apps/api`, `apps/gateway`, the Windows shell in `apps/desktop`, the macOS shell in `apps/desktop-macos`, shared `packages`, and optional `modules`. Build outputs, downloaded packages, database clusters and credentials stay outside Git. The current distribution is **0.1.1**, an unsigned release with manual installation. Set the GitHub repository variable `MONOLITH_RELEASE_MODE=unsigned` to publish this explicit distribution through **Publish Monolith unsigned installers**. Remove that variable or set it to `signed` once platform credentials are configured; **Publish Monolith releases** will then require signing and notarization before publishing automatic updates. Published artifacts are immutable. A failed, unpublished tag does not become an installable release.

## Build and verify

Use Node 22.23+ and the pnpm version declared in `package.json`.

```sh
pnpm install --frozen-lockfile
pnpm core:check
pnpm typecheck
pnpm build
pnpm gateway:test
pnpm desktop:bundle
pnpm desktop:windows:test
```

Build Windows installers with `pnpm desktop:windows:build`. Build and test the macOS application on a Mac with `pnpm exec node tools/macos-build.mjs --test` and `pnpm exec node tools/macos-build.mjs`. Use your own distribution certificates for Windows signing and macOS signing/notarization. The Monolith workflow checks the core, web, gateway and both native targets; **Prepare addon releases** separately produces signed package artifacts. **Publish Monolith releases** builds and publishes complete signed main-application releases for version tags once its credentials are configured. See the [automatic update guide](UPDATES.md) for the workflow, native update lifecycle and independent host supervisor.

Before choosing the first public version, align the root/web/API/native version metadata with `pnpm release:version <version>`, review the license, run the supported-platform checks, rehearse the database migration against a backup, and prepare release notes. The tagged workflow also aligns metadata from its tag. Version 0.0.0 artifacts are for development verification.

## Package addons and widgets

Each package has its own `version` in `modules/<id>/package.json`. A separate repository is optional. Packages in this monorepo can still be versioned and released independently.

```sh
# Build every optional package with portable asset URLs, then package it.
pnpm release:addons

# Or build one package independently.
pnpm release:addons monolith--atlas
```

Outputs live in `dist/releases/v<host-version>/`:

- `<id>-<version>.monolith-addon`: a compressed, validated runtime package containing client/server bundles, locale files, metadata and applicable license.
- `addon-catalog.json`: human-readable release metadata.
- `addon-catalog.signed.json`: an Ed25519-signed envelope, when the private signing key is configured.
- `addon-schemas.json`: host-side schema fingerprints. This is a migration approval artifact, **not** permission to run a migration.
- `SHA256SUMS`: checksums of the downloadable packages.

The packer rejects stale/nonportable client builds. It excludes source maps, dependency folders, symlinks, environment files and private-key extensions. Server bundles include addon-specific dependencies and share the host's Monolith runtime. The archive has no install scripts. `pnpm monolith addons pack` is still available for sharing **source**; its tarball is a different format and cannot be installed through the runtime shop.

`GITHUB_REPOSITORY` selects the release repository; `MONOLITH_RELEASE_TAG` overrides the tag in download URLs. Defaults are the repository's configured GitHub name and `v<host-version>`. A selected-package build creates a catalog containing only that selection: publish a complete catalog for the collection your host should offer.

## Connect a GitHub release catalog

Create an Ed25519 keypair using your key-management process. Keep the private PEM as the GitHub Actions secret `MONOLITH_RELEASE_PRIVATE_KEY`; keep only the public PEM on the server. The release workflow consumes the private key only during packaging. Upload the resulting package files and signed catalog to the matching GitHub release after reviewing the artifacts.

Configure the host:

```dotenv
MONOLITH_ADDON_CATALOG_URL=https://github.com/YOUR_ORG/YOUR_REPO/releases/download/vHOST_VERSION/addon-catalog.signed.json
MONOLITH_ADDON_CATALOG_PUBLIC_KEY=PUBLIC_PEM_WITH_ESCAPED_NEWLINES
MONOLITH_ADDON_ADMIN_IDS=HOST_ADMIN_USER_UUID
MONOLITH_CORE_ONLY=1
```

`MONOLITH_ADDON_ADMIN_IDS` is a comma-separated list of explicit host administrators. Workspace ownership does not grant executable-code installation rights. Workspace owners enable installed packages for their own workspace; viewers can browse and personalize their own sidebar.

For offline development, `MONOLITH_ADDON_CATALOG_FILE` can point to a host-controlled unsigned catalog. Do not configure it alongside the network URL in a published deployment: the local file takes precedence. Set the exact release URL matching the host version. Preview releases are not served through GitHub’s latest-stable download alias.

Packages are stored under `<root>/storage/addons`, with immutable version slots and an atomic `installed.json` pointer. `MONOLITH_ADDON_STATE_ROOT` can select a separate persistent root. Back up that directory with the application database and uploaded files. Use a single API writer for package activation; this implementation does not coordinate a multi-instance deployment.

## Install, update and recover

The shop refreshes metadata while open, marks newer versions, and provides **Check for updates**, **Download** and **Update** controls. Downloads display actual received bytes, followed by verification and activation. The host verifies the signed catalog, HTTPS release host, redirect destination, package length, SHA-256, archive paths, identity and exact host compatibility before activating code.

The loader checks that the candidate imports and registers the expected version. If activation fails, it restores the previous pointer and route registrations. A pending journal restores the earlier slot after an interrupted activation. The prior managed version's hashed assets remain available while clients reload. These are import/registration checks, not a complete functional health check of every addon. The test suite covers checksum failures, invalid paths/signatures, incompatible versions, failed activation and crash recovery.

Clients reload after a successful addon install so new manifests and widgets become available. Unsaved-change guards run before the reload. Disabling a package in a workspace retains its data. There is no automatic deletion of user data or package slots. Addon uninstall/garbage collection and scheduled addon installation are not included. Main-client and single-host server automatic updates are implemented separately in the [application updater](UPDATES.md); multi-host rollout coordination remains outside its scope.

### Database and background services

Schema changes are never applied during a shop download. An update with the same schema hash as the installed package can activate live. A first install with a schema, or a changed schema, needs the matching host migration first. After applying and verifying that migration, place its exact `addon-schemas.json` on the host and set `MONOLITH_ADDON_SCHEMA_FILE` to its absolute path. Never approve a schema artifact before its migration succeeds. Rolling back package files cannot roll back a database migration.

Atlas uses existing core records and can be installed without a new schema. Gym notifications and Tech Lab monitoring start with the host; restart the API after first installing those packages to activate their background dispatchers. Keep deployment backups and schedule that restart explicitly.

### Core profile and desktop clients

`MONOLITH_CORE_ONLY=1` loads Calendar, Projects, Actions, Docs and Databases storage modules plus native Rooms/Dashboard functionality. Optional packages, including Atlas, load only from managed installation storage. Without this setting, a developer checkout continues to load its source modules.

The desktop web bundle includes only the five core module manifests. Optional addon UI loads from the connected HTTPS host through module federation; scripts and styles use that host, and package catalog URLs are not used as client code URLs. Keep desktop clients, their host and its addons on the same Monolith runtime version. Package installation checks the host version; it does not upgrade or negotiate an older desktop client's shared runtime. Browser verification and the desktop web build do not replace native Windows/macOS release testing.

The container currently retains the source/schema toolchain for migrations. Core-only **runtime loading** does not yet mean a minimal container image. See [container deployment](MONOLITH-CONTAINERS.md) for volumes, origin configuration and the migration service.

## Repository hygiene

Keep `dist`, `node_modules`, native targets, `.temp`, runtime storage and credentials ignored. Do not commit screenshots containing real accounts or private workspace content; the README screenshots use disposable synthetic fixtures. Run `pnpm exec node tools/shop-smoke.mjs` against an isolated local API/web preview to reproduce them. `pnpm exec tsx tools/shop-package-smoke.mts` checks a real Atlas package without touching live package storage.

Keep the root license, source provenance and package-specific notices with distributed material. Product identity checks do not establish independent source authorship.

## Preview distribution

The preview workflow builds Windows installers, a universal macOS DMG, Linux server images for amd64 and arm64, a server setup bundle, and optional addon packages. Preview installers are not publisher-signed or Apple-notarized. They are identified as previews and are installed manually. No signed application update manifest is published for an unsigned preview. The stable workflow retains its complete-artifact and signing requirements.

Publish only after every target succeeds and the release bundle passes checksum and inventory checks. A failed build or upload must leave the release unpublished.
