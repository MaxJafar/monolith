# Client synchronization verification — 2026-11-10

Status: development client verified on a physical Pixel; full feature parity and
release acceptance remain incomplete. See the feature matrix in [README.md](README.md).

## Environment

- Pixel 10a, Android 17, native Kotlin / Compose app `app.monolith.android`.
  The installed development APK reports version 0.1.23, version code 1; its fixes
  were built from the working tree during this session.
- OptiPlex at `https://optiplex-server.tail8320dd.ts.net:8459`; gateway, server
  and database healthy. Published gateway/server version: 0.1.23.
- Windows updated through its normal updater from 0.1.20 through 0.1.23 to
  **0.1.24**, confirmed from the installed executable. That published build does
  not contain this session's uncommitted desktop refresh changes.
- The Linux updater found 0.1.24 but blocked installation because its Finance
  tables require a verified database migration. The existing 0.1.23 services
  remain healthy; no server update, schema bypass or Personal migration was made.
- Both clients use the authorized main account. Mutating acceptance checks use
  the newly created **Client sync verification** workspace. Personal documents
  were not edited. Its migration preview reported 30 existing canonical sources
  and zero conversions; only the temporary workspace was migrated.
- Actual phone input used Google's [Artemis](https://github.com/google/artemis)
  `AccessibilityClient`, helper 1.2.0, over wireless ADB. Checkout:
  `351ca8422f7b5b54e80a9c1ce03a222e02415b6b`. The local accessibility engine was
  used directly; no autonomous Artemis model or external model key was configured.

## Verified results

| Check                                                           | Result                                                                                                           |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| HTTPS discovery, authorized session resume, encrypted requests  | Passed on physical phone and OptiPlex                                                                            |
| Windows creates and renames a document; phone reads it          | Passed                                                                                                           |
| An open phone document receives a later Windows save            | Passed after foreground-refresh fix                                                                              |
| Phone edits and saves; Windows reopens the same document        | Passed; server revision advanced and Windows showed phone title                                                  |
| Stale Windows edit after phone save                             | Conflict shown; local draft retained until explicit resolution                                                   |
| Unsaved phone body versus a new Windows revision                | Conflict shown automatically; local body preserved                                                               |
| Force-stop/relaunch with that conflicting phone draft           | Draft and conflict restored                                                                                      |
| Recover phone draft as a separate page                          | Passed; distinct source ID and body verified on server; original unchanged                                       |
| Windows opens the recovered phone draft                         | Passed; body displayed correctly                                                                                 |
| Clean open editor/sidebar in published Windows 0.1.24           | Failed to update automatically after a newer remote save; source fix awaits build and installation               |
| Keyboard while editing on Pixel                                 | Fixed double-consumed insets; title, body and toolbar visible while typing                                       |
| Installed addon availability                                    | Redraw and Tech Lab offered; absent Atlas, Automations and Gym hidden; disabled Agents hidden                    |
| Workspace, pages, calendar, rooms, Redraw, Tech Lab, uRPG reads | Passed through live API                                                                                          |
| Redraw project creation, rectangle, undo/redo and save          | Passed in the native Pixel UI; server revision 3 with one object; Windows displayed the project and object count |
| Tech Lab devices/services/health                                | Native lists loaded; health labels displayed service names after the fix; no service configuration changed       |
| Monolith crash-buffer scan on Pixel                             | No matching AndroidRuntime crash entries during checks                                                           |

Android polls while the activity is visible, preserves dirty editors when a newer
revision arrives, and refuses to regress a just-saved revision when an older read
finishes late. This does not provide background sync or collaborative cursors.

## Fixes in this change

- Lifecycle-bound Android workspace/document refresh with scope and revision checks.
- Addon destinations follow installed host modules and workspace enablement.
- Scaffold insets are consumed before the editor applies keyboard insets.
- Redraw creation has a direct **New project** control and a title-only form;
  internal document fields are initialized by the native editor.
- Tech Lab health rows resolve service names rather than displaying blank titles.
- Desktop draft controller can adopt clean remote revisions without overwriting
  concurrent local typing. Active editors refresh on foreground/focus and every
  five seconds when not focused for input. Sidebar navigation/page queries refresh
  periodically through their existing typed contracts.

## Automated verification and build limits

- Android: 16 unit tests passed; lint passed with 0 errors and 19 warnings.
  Assemble, unit tests and lint ran in the isolated Mac verification directory
  through the repository build guard with a 2 GiB process-tree budget.
- Desktop draft controller: 15 tests passed on the Mac, including new clean
  refresh, focus guard, pending local typing and out-of-order read cases.
- Windows production build is **blocked**. The 3 GiB guarded attempt transformed
  5,203 modules, then stopped during chunk rendering when the system RAM reserve
  was reached (2,561 MiB peak tree commit; 6,501 MiB minimum free RAM).
  A smaller guarded typecheck was also refused at startup. No guard was disabled.
  The new desktop polling changes are source changes only, not installed fixes.
  Free approximately 10 GiB RAM before retrying, or use another Windows build host.
- A separate frontend build was attempted on the Mac to reduce the Windows
  workload. Available memory dropped while preparing it; the 3 GiB guard refused
  startup and a 2 GiB attempt stopped during dependency installation (exit 130).
  No frontend artifact was produced. Rebuild the shared packages before the
  desktop bundle so the new API/UI code is included; the package entry points use
  their generated `dist` output.
- The optional pairing instrumentation correctly refused to overwrite an already
  signed-in phone session; it is not counted as a passing acceptance test.

One debug `gfxinfo` sample contained 410 frames and 55 janky frames (13.41%). It
included startup and instrumented interaction, so it is neither a release
performance benchmark nor evidence that all animations meet frame deadlines.

## Installed artifact and cleanup

APK: `app/build/outputs/apk/debug/app-debug.apk` (development signing).

SHA-256: `FA96AD55C56B6082A24C471A6D6D1AF925925F55FB59231CEBE145544B7DE159`.

Both clients were returned to Personal. The two verification pages were removed
through the normal API after checking their identities and revisions. The
temporary workspace and drawing were then removed with scoped guards; subsequent
database checks found zero remaining test pages, canonical documents, drawings or
workspace-scoped rows. The temporary verifier session was revoked, while the
normal Windows and Pixel sessions remain active. Artemis was disconnected and the
separate Android test APK was uninstalled. The main Android app remains installed.

## Remaining acceptance work

Install and verify the new Windows build, then repeat clean open-editor and
sidebar refresh in both directions. The 0.1.24 server update separately needs a
backup, migration rehearsal and deployment verification. Full addon workflows, calls/media,
notifications, background/offline startup, collaborator/viewer access and release
frame pacing still need dedicated verification and, in several cases, native
implementation. A generated API form is not equivalent to a complete native UI.
