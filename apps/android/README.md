# Monolith for Android

A Kotlin / Jetpack Compose companion with native navigation, controls, text editing,
canvas drawing and cryptography. It contains no WebView, bundled web application,
JavaScript editor, or remotely executed addon UI.

**Status: runnable development client; full Windows feature parity is not complete.**
Generated API coverage is not equivalent to an implemented, verified product flow.
The table below records that distinction so this build is not mistaken for a
finished replacement for the desktop client.

## Build

Use pnpm from the repository root. Install JDK 17 or 21, Gradle 8.13, Android SDK
Platform 36, Build Tools 35.0.0 and platform-tools. Set `JAVA_HOME`, `ANDROID_HOME`
and `MONOLITH_GRADLE_HOME` if `android:doctor` cannot discover them. The Gradle home
is the extracted `gradle-8.13` directory, not its `bin` directory.

```sh
pnpm android:doctor
pnpm android:contracts
pnpm android:test
pnpm android:lint
pnpm android:build
pnpm android:install
```

The APK is `apps/android/app/build/outputs/apk/debug/app-debug.apk`. Android 8.0
(API 26) is the minimum. Set `ANDROID_SERIAL` when multiple devices are attached.
The current artifact is a development-signed APK; distribution signing, release
channels and Play delivery are not configured.

Compilation, tests and Android lint use the repository build guard, one Gradle
worker and an in-process Kotlin compiler. A memory refusal must be resolved by
freeing resources or moving verification to an appropriate host. Android tasks
are deliberately not named `build` or `test` inside the workspace, so existing
web/desktop Turbo tasks do not suddenly require an Android SDK.

`tools/android-contracts.mjs` generates the packaged endpoint/schema catalogue
from the current TypeScript contracts and canonical addon identities. Do not
edit `app/src/main/assets/contracts.json`; it is generated and ignored. To check
drift, run `pnpm exec tsx tools/android-contracts.mjs --check` after generation.

## Connection and storage

The host must expose discovery, device sessions and editor v2. Enter its HTTPS
origin including a custom port. OptiPlex's discovered origin is
`https://optiplex-server.tail8320dd.ts.net:8459`; the Android device also needs a
network route to the tailnet, normally through its Tailscale connection.

Canonical editing also requires that the selected workspace has completed the
gateway's editor migration. A newly created workspace is not automatically opted
in by the host. The gateway's `migrate --actor <owner-id> --workspace <workspace-id>`
command previews this conversion; `--apply` commits it. Android currently reports
the host's disabled-rollout error instead of supplying a legacy editor. Existing
workspaces must be reviewed before migrating them. Live verification migrated
only the temporary workspace created by the test.

Sign-in supports the host's TOTP challenge and rotating refresh credentials.
The transport refuses redirects and origin changes, verifies discovery identity,
and uses the existing RSA-OAEP-SHA256 / AES-GCM API envelope where required.
Only a debug build permits cleartext loopback/emulator fixture connections.

Android Keystore protects refresh credentials, room identities, cached snapshots
and drafts using AES-GCM. Storage is scoped to server/account/workspace, excluded
from backup, and written atomically. Permission/authentication errors do not fall
back to cached reads. Offline reads work for previously cached responses while
the app has a session; cold-start authentication currently requires the host.
Document and drawing drafts survive navigation; document drafts use generation
checks. Sign-out is prevented while indexed drafts remain dirty.

## Implemented surfaces and remaining parity work

| Area                        | Native implementation                                                                                                                                                    | Remaining work                                                                                                                             |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Shell and design            | Phone dock, section sheet, tablet rail, light/dark palette, bundled fonts, press springs/tilt, haptics, reduced motion, system insets, text sharing                      | Complete accessibility audit, hardware keyboard/drag parity and measured frame pacing across devices                                       |
| Workspace                   | Host discovery, sign-in/TOTP, refresh, workspace switching, role-aware controls, encrypted cache                                                                         | Invitations/deep links, full offline startup, background sync and device-management UX                                                     |
| Records and databases       | Actions/projects/notes, create/edit forms, task completion, filters, list/board/table/date grouping, fields/view configuration through native forms                      | Drag/drop boards, full timeline/Gantt, charts, galleries, formulas/rollups, rich relations/files, templates and desktop view preferences   |
| Documents                   | Canonical block trees, title/text/headings/lists/checklists/code/callouts/dividers, bold/italic/underline, ordering, undo/redo, local drafts, revision-conflict recovery | Full column layout editing, image/file/audio/video controls, tables, selection/link menus, all embedded widgets and collaborative presence |
| Calendar                    | Month/week/agenda, recurring events, civil time zones, DST gaps, invalid monthly days, moved/cancelled exceptions, native schedule forms                                 | Drag/resizing, richer recurrence controls, complete notification preferences, background alarms/push                                       |
| Rooms                       | Native timeline, threads, text send, pins, reactions, receipts, identity enrollment, recovery import/export, interoperable E2EE                                          | Attachments, message edit/delete UX, pagination, typing/presence, calls, screen sharing and background notifications                       |
| Atlas                       | Native pan/zoom graph, list/detail and declared operations                                                                                                               | Desktop graph layout, filters, authored links, drag selection and inference workflows                                                      |
| Redraw                      | Native canvas, pages, selection/movement, basic shapes/text, properties, undo/redo, encrypted drafts and revision-guarded save                                           | Full vector/path engine, images, components, constraints, auto-layout, connectors/prototypes and export parity                             |
| Automations                 | Native flow preview and contract-backed create/edit/run/history forms                                                                                                    | Full visual graph editor, typed node controls, live run/debug experience                                                                   |
| Agents, Gym, Tech Lab, uRPG | Native collections/details and schema-backed operation forms                                                                                                             | Dedicated execution/approval screens, workout timers, service controls and complete addon workflows                                        |
| Other/installed addons      | Build-time contracts can be generated                                                                                                                                    | Arbitrary addon UIs cannot be rendered from their JavaScript bundles; each requires a Kotlin implementation                                |
| Localization                | Shell and core controls in English, Malay, Simplified and Traditional Chinese                                                                                            | API descriptions, dynamic schema labels and some diagnostics still use English/fallback labels                                             |

Unsupported document blocks and inline objects are preserved. They are not
flattened into plain text or silently deleted to make a save succeed. Their
native preview is limited. A block's presence in the document does not mean its
interactive editor has been ported.

Native design rules extend the shared [UI guide](../../packages/ui/DESIGN.md).
Font notices are bundled as `app/src/main/assets/Inter-OFL.txt` and
`app/src/main/assets/JetBrainsMono-OFL.txt`.

## Verification

Unit tests cover encrypted API envelopes, same-origin transport, serialized token
refresh, browser/native Rooms interoperability, recovery identity validation,
tamper rejection, historical signing-key selection, draft isolation/CAS, rich-text preservation, schema constraints
and calendar recurrence edge cases. The room fixture contains synthetic test keys.

```sh
pnpm android:test
pnpm exec tsx tools/android-room-fixtures.mts --verify-native
```

The second command decrypts the Kotlin-generated envelope with the existing web
cryptography implementation. It must run after the unit suite.

For repeatable development UI checks, `pnpm exec tsx tools/android-test-host.mts`
starts a synthetic encrypted API host at `http://127.0.0.1:18764`. Connect an
emulator to `http://10.0.2.2:18764`. Any email/password are accepted by this local
fixture only. It stores mutation evidence under `.temp/android-test-host` and
does not touch an actual Monolith server. Many addon endpoints are deliberately
unimplemented in this fixture; a fixture pass does not establish addon parity.

On 2026-11-10, all 13 unit tests and browser/native encryption verification passed.
Final Android lint passed with 0 errors and 19 dependency/API/style warnings in
an isolated Mac build directory under a 3 GiB guard cap after the PC's memory
reserve stopped its rerun. The debug APK built on Windows under the repository
memory guard and was installed for the final emulator checks.

An Android 15 emulator verified sign-in against the fixture, encrypted workspace
loading, task completion, document title/body saving, and unsaved document
restoration after force-stop/relaunch. On the real OptiPlex host, a separately
authorized, temporary device session verified refresh, encrypted API calls,
creation of an isolated workspace/page, document save/readback, stale-revision
rejection and recovery into a distinct page. Native UI forms also created a
database and task on that host. Light/dark phone layouts, the tablet rail and
reduced-motion controls were inspected; AndroidRuntime reported no crashes.
The native deletion test removed the task, database and three test pages. Native
sign-out revoked the temporary session; the empty test workspace and its migration
records were then removed. The isolated emulator's app data was cleared afterward.

The live test is `HostAcceptanceTest` in `app/src/androidTest`. It requires an
explicitly supplied temporary session in the isolated app's private
`files/acceptance-session.json`, consumes that import file, and records the created
workspace in `files/acceptance-result.json`. It never bundles credentials or
changes existing workspaces. Build its separate test APK with
`pnpm --dir apps/android run test:device:build`. The runner dependencies follow the
[AndroidX Test setup](https://developer.android.com/jetpack/androidx/releases/test).

The separate `removeAcceptanceContents` test requires the runner argument
`-e monolithCleanup true` and the previously recorded workspace marker. It checks
ownership, name and description before deleting that workspace's records, bases
and pages through their normal APIs. Host-side removal of the empty workspace and
revocation of the temporary device session are separate cleanup steps. Never use
an existing personal workspace for this test.

The subsequent Pixel 10a / Windows / OptiPlex session verified two-way document
saves, foreground refresh on Android, competing edits, restart-safe drafts,
recovery into a separate page and native Redraw create/save/undo/redo. It added three reconciliation tests (16 Android
unit tests total). The physical-device fixes, installed artifact and remaining
desktop build and server migration blockers are recorded in [VERIFICATION.md](VERIFICATION.md).

Full addon services, release performance, viewer/collaborator behavior,
calls/media and background operation have not been accepted for release. These
checks do not establish full Windows feature parity.
