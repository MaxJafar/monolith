# Monolith application updates

Monolith's Windows client, universal macOS client and single-host Linux Docker deployment use signed GitHub Releases. **Settings → Updates** shows the installed version, release notes, actual downloaded bytes, installation/restart status and recovery results. A notification appears when a release is available or an installation needs attention. Desktop onboarding also has an Updates button.

Starting with 0.1.5, automatic updates work with unsigned Windows installers and ad-hoc signed, unnotarized Mac apps. The update manifest is still signed with Monolith’s pinned Ed25519 key. OS publisher signing is a separate release option. Existing 0.1.3 and preview clients need the new installer once because their update key was omitted; future releases use the updater. Existing servers need the external supervisor described below.

## Automatic behavior

| Setting                | Behavior                                                                                                                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Release checks         | At supervisor startup and every six hours; manual checks are available. Errors back off instead of continuously requesting GitHub.                                                          |
| Download automatically | On by default once signing is configured. A failed installation's version is not automatically retried.                                                                                     |
| Install automatically  | On by default for new updater-enabled installations. Existing configured preferences are preserved. Disable independently on each client or server.                                         |
| Desktop installation   | Waits until the app is in the background and has had no keyboard/pointer input for two minutes. Editor save guards and native persisted-draft checks must pass.                             |
| Server installation    | Installs a verified download during the chosen one-hour UTC maintenance window. Host administrators can also install immediately.                                                           |
| Browser refresh        | When server automatic installation is enabled, an outdated browser tab reloads after two minutes of idle time in the background, subject to save guards. A manual reload is also available. |
| Channels               | Stable uses GitHub's latest stable release. Beta selects the highest eligible version from the latest 30 published releases, including stable releases. No automatic downgrade occurs.      |

The updater currently reads public GitHub release assets. It does not embed a GitHub token in clients. A private repository, enterprise GitHub host or a mirrored release service needs an explicit transport extension.

## Build and publish a release

The workflow `.github/workflows/platform-releases.yml` runs for `v<semver>` tags. It aligns root/web/API/Windows/macOS versions with the tag, tests the updater, builds both native clients and both Linux architectures, signs a complete release manifest and optionally signs/notarizes clients. Set the repository variable `MONOLITH_RELEASE_MODE=unsigned` to keep Windows installers unsigned and Mac apps ad-hoc signed without notarization. The same verified update archives are published in either mode. It creates a draft GitHub release, uploads every artifact, uploads the manifest last, and publishes only after all uploads succeed. A failed upload leaves a draft that can be retried; an already published version is never overwritten.

The **release** GitHub environment holds the main manifest-signing private key. The repository variable `MONOLITH_RELEASE_PUBLIC_KEY` must match `release/keys/app-release.pem`; preflight rejects accidental key rotation. Configure the remaining secrets in that environment or as repository secrets. Never paste private keys or passwords into issues, documentation or chat.

The workflow runs `pnpm release:preflight` before starting builds and reports missing credential names without their values. Running **Publish Monolith releases** manually checks credentials only; publishing still requires a version tag. It then verifies trusted, timestamped Windows signatures, validates the stapled Apple notarization tickets, packages the server installation kit, CLI/MCP and signed add-on catalog, and verifies the full download inventory before publishing.

The three `MONOLITH_*` signing keys are required in both modes. OS certificate/provider credentials below are required only when `MONOLITH_RELEASE_MODE` is not `unsigned`. Changing to certificate signing later keeps the same update key and feed. Once a Developer ID team is installed, the Mac updater requires that team and refuses an ad-hoc downgrade.

Required settings:

| Name                                           | Kind                          | Purpose                                                                     |
| ---------------------------------------------- | ----------------------------- | --------------------------------------------------------------------------- |
| `MONOLITH_RELEASE_PUBLIC_KEY`                  | Repository variable           | Ed25519 public PEM embedded in clients and used by the host supervisor.     |
| `MONOLITH_RELEASE_PRIVATE_KEY`                 | `release` environment secret  | Matching private PEM for signing and the credential preflight check.        |
| `WINDOWS_SIGNING_PROVIDER`                     | Repository variable           | `esigner` (default) or `pfx`.                                               |
| `ESIGNER_USERNAME`, `ESIGNER_PASSWORD`         | Repository or release secrets | SSL.com eSigner account credentials for cloud signing.                      |
| `ESIGNER_CREDENTIAL_ID`, `ESIGNER_TOTP_SECRET` | Repository or release secrets | Enrolled code-signing certificate ID and automation TOTP secret.            |
| `WINDOWS_CERTIFICATE_P12`                      | Repository or release secret  | PFX provider only: base64-encoded Authenticode certificate and private key. |
| `WINDOWS_CERTIFICATE_PASSWORD`                 | Repository or release secret  | PFX provider only: certificate password.                                    |
| `MACOS_CERTIFICATE_P12`                        | Repository or release secret  | Base64-encoded Developer ID Application certificate and private key.        |
| `MACOS_CERTIFICATE_PASSWORD`                   | Repository or release secret  | Certificate password.                                                       |
| `MACOS_SIGN_IDENTITY`                          | Repository or release secret  | Developer ID Application signing identity.                                  |
| `MACOS_TEAM_ID`                                | Repository or release secret  | Ten-character Apple Developer team ID.                                      |
| `APPLE_ID`, `APPLE_APP_PASSWORD`               | Repository or release secrets | Apple notarization credentials.                                             |

`MONOLITH_ADDON_CATALOG_PRIVATE_KEY` is the separate repository secret used to sign the add-on catalog against `release/keys/addon-catalog.pem`. Keep both signing keys backed up securely outside Git.

The default Windows provider is SSL.com eSigner cloud signing. Enroll the appropriate IV/OV certificate in eSigner, enable its CI automation and set the four `ESIGNER_*` secrets above. The workflow uses the [official eSigner action](https://github.com/SSLcom/esigner-codesign) pinned to a commit, stages only the expected application/helper or installer files, and requires trusted, timestamped signatures before collecting them. The private signing key stays in the provider's HSM. Account issuance and a real signed-build rehearsal are still required; this configuration alone does not establish a trusted release. See [SSL.com's GitHub integration](https://www.ssl.com/how-to/cloud-code-signing-integration-with-github-actions/).

An existing compatible P12/PFX setup can select `WINDOWS_SIGNING_PROVIDER=pfx` and supply the two `WINDOWS_CERTIFICATE_*` secrets instead. This fallback is not a recommendation to purchase an exportable certificate: modern public Windows code-signing offerings commonly use hardware or cloud key custody. Other signing services need an adapter before release. The macOS job imports credentials into a temporary keychain on an ephemeral runner and removes it even when a later step fails.

For Windows, the release owner must supply the legal publisher identity, individual/company status, country and chosen signing provider. Cloud signing normally needs scoped CI access and a certificate profile; a hardware token needs an appropriately connected signing runner. Check [Microsoft's signing options](https://learn.microsoft.com/windows/apps/package-and-deploy/code-signing-options) and [Artifact Signing eligibility](https://learn.microsoft.com/en-us/azure/artifact-signing/quickstart) before selecting a service. A valid signature does not guarantee immediate SmartScreen reputation.

For macOS, supply an active Apple Developer Program membership, a **Developer ID Application** certificate with its private key exported as a password-protected `.p12`, its exact signing identity and Team ID. The current notarization integration uses an Apple ID and an **app-specific password**, not the account password. The Account Holder creates the Developer ID certificate; see [Apple's certificate instructions](https://developer.apple.com/help/account/certificates/create-developer-id-certificates/) and [notarization workflow](https://developer.apple.com/documentation/security/customizing-the-notarization-workflow). A Developer ID Installer certificate is unnecessary for the current DMG distribution.

For a release prepared locally, use the appropriate build host:

```sh
pnpm release:version 1.0.0
pnpm updater:test
pnpm desktop:windows:build
# After signing the Windows binaries:
pnpm release:platform client windows-amd64

# On macOS, with signing and notarization configured:
pnpm desktop:bundle
pnpm exec node tools/macos-build.mjs
pnpm release:platform client darwin-universal

# On the Linux Docker build host:
pnpm release:platform server linux-amd64
pnpm release:platform server linux-arm64

# With all four artifacts collected and release keys configured:
pnpm release:platform manifest
# After packaging the matching signed add-on catalog, CLI and server kit:
pnpm release:downloads extras
pnpm release:downloads manifest
```

`GITHUB_REPOSITORY` selects the release repository; otherwise the root package's repository is used. The workflow generates release notes with the [GitHub Releases API](https://docs.github.com/en/rest/releases/releases#generate-release-notes-content-for-a-release) and includes the same text in the signed manifest and published release. `MONOLITH_RELEASE_NOTES_FILE` can supply a UTF-8 file when packaging locally. Version and schema changes are not chosen automatically for you. Tag only a reviewed, tested commit. Unconfigured development builds expose update setup information and cannot install updates without a trusted release key. Installer publisher signatures are independent of the mandatory manifest signature.

Outputs are under `dist/platform-releases/v<version>/`. `monolith-release.json` contains a base64 payload plus an Ed25519 signature. Its payload binds the version, channel, updater protocol, database-schema fingerprint, platform, exact size, SHA-256 and GitHub asset URL. Server artifacts also pin an immutable Docker image ID. Large Docker archives are split into parts below [GitHub's 2 GiB per-asset limit](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases); the updater verifies each part and the complete reassembled archive. `release-downloads.json` inventories installers, update archives, server supervisors, the installation kit, CLI/MCP and add-ons. `SHA256SUMS` covers every published download. The publisher checks that the archive checksums in the inventory still match the signed update manifest.

## Rehearse server updates

The stable pipeline builds natively on x64 and ARM64 and runs the actual packaged server with disposable Compose services. It creates a temporary rollback baseline from the candidate image, exercises automatic download/activation and explicit rollback, then pauses the replacement API to verify failed-health recovery. Database rows, uploaded files and database/migration container identities must survive. This validates deployment mechanics against the current package; it does not substitute for a real previous-release compatibility rehearsal.

The **Rehearse server automatic updates** Actions workflow runs this check without publishing or requiring platform certificates. Its version is local to the runner. Native signed installer-to-installer upgrade testing and a backup/recovery rehearsal on the intended host remain prerequisites for the first stable tag.

## Connect the hosted server

The supervisor runs **on the Docker host, outside the replaceable containers**. It manages the `server` and `gateway` services in this repository's Compose deployment. It is not a Kubernetes operator, multi-host rollout controller or bare-process API updater.

1. Bootstrap one healthy release image with `org.opencontainers.image.version` and `app.monolith.schema` labels. The platform release builder supplies both. Do the initial database migration and verify the deployment using the [container guide](MONOLITH-CONTAINERS.md). The old development image with the `development` schema label cannot be used as a rollback baseline.
2. Install the matching `monolith-updater-linux-amd64` or `monolith-updater-linux-arm64` release asset as `/usr/local/bin/monolith-updater`, executable by the service user. Verify it against the release checksums obtained from your trusted release.
3. Create the `monolith-updater` service user/group, with access to Docker and read access to the deployment's Compose files and environment file. The supervisor needs Docker deployment privileges; these credentials stay on the host.
4. Copy `docker/updates/config.example.json` to `/etc/monolith-updater/config.json`. Set the repository, pinned public PEM, installed version/schema label, architecture, absolute Compose/env-file paths, actual Compose project name and reachable gateway `/healthz` URL. Public PEM newlines can be JSON-escaped. The supervisor checks running image labels and health instead of trusting a stale version in configuration.
5. Put a cryptographically random token of at least 48 characters in `/etc/monolith-updater/token`, readable only by the service. Use the same token in the API environment below. Bind the listener to a private address reachable from the API container; firewall port 6169 to that container/network. Do not expose it through your public reverse proxy.
6. Install `docker/updates/monolith-updater.service` as a systemd unit, reload systemd and enable/start it. The unit maintains state in `/var/lib/monolith-updater`. Its shutdown allowance lets an interrupted operation finish recovery.
7. Add the following to `env/.env.docker` and recreate the API container once to apply it. `host.docker.internal` is mapped to the Docker host by the supplied Compose file.

```dotenv
MONOLITH_UPDATER_URL=http://host.docker.internal:6169
MONOLITH_UPDATER_TOKEN=THE_SAME_RANDOM_TOKEN_AS_THE_HOST_TOKEN_FILE
MONOLITH_UPDATE_ADMIN_IDS=HOST_ADMIN_USER_UUID
```

Use a comma-separated list for multiple administrators. Workspace ownership alone does not grant host deployment rights. Authenticated users can see update status; only these explicit administrators can check, download, install, roll back or change server settings. The browser never receives the supervisor token. The API calls its configured supervisor with a fixed action allowlist; the supervisor additionally requires its bearer token and rejects browser-origin requests.

Once connected, use **Settings → Updates → Hosted server** to choose a channel, enable automatic installation and set its UTC maintenance hour. The supervisor continues operating when no clients are open.

The active immutable image override is `/var/lib/monolith-updater/active-compose.json`. Include it with the original Compose files for subsequent operational `docker compose` commands; otherwise a manual `up` can replace the selected release with the source file's image. Never prune the retained previous image while rollback is available. Keep the supervisor state with your deployment backups.

## Installation and rollback

Downloads enter a temporary file. Signature, repository/tag binding, platform, size and hash checks must pass before activation. Settings and transaction journals are written atomically. A process-level file lock prevents multiple supervisors from mutating one installation. Interrupted downloads can be retried; they restart from byte zero.

**Windows:** the helper runs from the user's application-data directory, outside the installation it replaces. It stages the candidate next to the installed app, preserves installer registration and backs up the previous files. It waits for the app to exit and atomically replaces individual files while preserving the launch path. The durable journal restores a mixed file set after interruption. Use the per-user NSIS installation; a non-writable system installation requires a manual installer.

**macOS:** ad-hoc installations verify the Ed25519 release, sealed bundle contents and application identifier without requiring an Apple account. They can transition to a notarized Developer ID release authenticated by the same update key. A Developer ID installation requires its original team and notarization for every subsequent update. The helper atomically exchanges the `.app` bundles on the same volume, preserving the old bundle. Install in a writable directory rather than launching from the DMG.

Both clients launch the candidate and require its native version/PID and mounted workspace or onboarding UI to acknowledge readiness within two minutes. An early exit, launch error or missing acknowledgement triggers restoration and relaunch of the old version. **Restore previous version** provides manual rollback after success. Credentials, drafts and settings remain in application-data storage outside the replaced application.

**Server:** the supervisor loads the verified archive, validates image identity/architecture/version/schema labels and switches only `server` and `gateway`, with `--no-deps --no-build --pull never`. It waits for Compose health and checks the gateway's expected version, database connection, API version and managed-addon registration. Failure reapplies the retained image IDs and checks the old server's health. It never removes database/storage volumes or runs the migration service. Single-host replacement entails a short service interruption; already-open clients reconnect and report the outcome.

After a supervisor crash, the pending journal restores the previous release before any new update action. If recovery itself fails, the journal and previous files/images stay intact and the error remains visible; correct the disk/permissions/Docker problem and restart the supervisor to retry recovery. Rollback is startup/health recovery, not a guarantee against every later application regression. Desktop backups and downloaded artifacts are retained; budget disk space and remove obsolete generated backups only after verifying recovery is no longer needed.

### Schema and compatibility boundaries

Automatic server installation requires an identical schema fingerprint and updater protocol. A release with changed schema sources or SQL migrations is shown as requiring a planned migration. Back up data, deploy/migrate and verify that release manually, then update the supervisor's schema configuration and restart it. Application rollback cannot undo a database migration.

The baseline and candidate must both pass startup health checks. Test installed addons against the new host before rollout, and publish matching addon packages where their declared host version changes. The current shop's exact-host package compatibility still applies. Native clients and the host select versions independently; coordinate your release channel when introducing changes to the shared application protocol. An updater-protocol change or signing-key rotation requires a planned bridge/manual release.

## Verification

```sh
pnpm updater:test
pnpm exec node --test tools/platform-release.test.mjs
pnpm gateway:test
pnpm --filter @monolith/client test
pnpm desktop:windows:test
pnpm --filter @monolith/client build
pnpm desktop:bundle
```

The Go suite tests signed metadata, hostile redirects/archives, truncated and corrupt downloads, multipart downloads, version/schema gates, atomic file replacement, failed launch/health, interrupted transactions, rollback failure retention, preferences, supervisor authentication and Docker command selection. The default Docker unit tests use a fake command runner and health transport. The separate Linux rehearsal opts into real Compose services, packaged images and persistent volumes.

The [release-preparation CI run](https://github.com/MaxJafar/monolith/actions/runs/39086140315) passed core/web/gateway checks, production builds, website browser checks, Windows native tests/builds and macOS native tests/universal builds. Focused coverage includes 50 web-client tests, 20 CLI/MCP tests and nine release-packaging/preflight tests. UI acceptance covers administrator and viewer permissions, notifications, download progress, recovery errors, light/dark themes and mobile layouts. Native CI builds are development distributions; they do not establish trusted signing, Apple notarization or installed-client upgrade compatibility.

For UI/API acceptance, start an isolated fixture API with `pnpm --filter @monolith/server exec tsx ../../tools/fixtures/updates-host.mts`, run the web preview on port 5187 with `VITE_API_HOST=http://localhost:3638`, then run `pnpm exec node tools/updates-smoke.mjs`. It creates and removes synthetic accounts in the guarded local development database. The privileged supervisor is simulated; the real API authentication, proxy, frontend polling and controls are exercised. Screenshots go to `.temp/update-acceptance`.

Before publishing the first release, run signed installer-to-installer upgrades on Windows/macOS and a real Linux Docker installation/rollback rehearsal with the production signing configuration. Cross-compilation and mock transport tests do not replace those distribution checks.
