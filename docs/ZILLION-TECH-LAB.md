# ZillionOS Tech Lab

Tech Lab is a native ZillionOS module for device inventory, hosted services, game servers, bookmarks and observed service health. It uses the existing authentication, PostgreSQL isolation, API contracts, module federation and UI system. It does not embed Homepage or execute imported Homepage configuration.

This report records the implementation and official source research reviewed on 13 October 2026. Private dashboard addresses, credentials and inventory details are deliberately excluded.

## Research and scope

Homepage separates service launch links from monitor targets and integration widgets. Its grouped `services.yaml` supports `href`, descriptions, nested groups, independent `ping` and `siteMonitor` targets, and one or multiple widgets. These distinctions informed Tech Lab's separate launcher, explicit monitor and device association fields. [Homepage services documentation](https://gethomepage.dev/configs/services/)

Homepage bookmarks use grouped YAML with an array of details for each bookmark. They represent links and do not imply monitoring. Tech Lab imports these as `kind: link`, preserving the group path as the category. [Homepage bookmarks documentation](https://gethomepage.dev/configs/bookmarks/)

The following integration research establishes boundaries, rather than claiming every Homepage integration is implemented:

| Official source                                                                                                                                              | Relevant behavior and native boundary                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [Homepage GameDig](https://gethomepage.dev/widgets/services/gamedig/)                                                                                        | Protocol-specific game queries expose status, player counts, map and other optional fields. Tech Lab's implemented game protocol is Minecraft Java status; general GameDig integrations are not implemented. |
| [Homepage Minecraft](https://gethomepage.dev/widgets/services/minecraft/)                                                                                    | Homepage exposes player, version and status fields. Native Tech Lab obtains its supported values from an actual Java Server List Ping response.                                                              |
| [Homepage Glances information widget](https://gethomepage.dev/widgets/info/glances/) and [service widget](https://gethomepage.dev/widgets/services/glances/) | Glances provides host resource and uptime data through its API. Tech Lab reads selected metric plugins, rather than process lists or command lines.                                                          |
| [Homepage Uptime Kuma](https://gethomepage.dev/widgets/services/uptime-kuma/)                                                                                | The widget represents a configured status page. Tech Lab does not import its observations or backfill native check history from it.                                                                          |
| [Homepage Docker configuration](https://gethomepage.dev/configs/docker/)                                                                                     | Container discovery and status require a separate Docker connection. Tech Lab does not import socket access, credentials or container control permissions.                                                   |
| [Homepage Proxmox](https://gethomepage.dev/widgets/services/proxmox/) and [Pterodactyl](https://gethomepage.dev/widgets/services/pterodactyl/)               | Their documented API widgets require separate connections and credentials. These connectors are not part of the current native implementation.                                                               |

Homepage's environment and file placeholders are configuration substitution features. Tech Lab leaves them unresolved and reports an aggregate warning; importing a file never reads host environment variables or arbitrary files. [Homepage Docker installation documentation](https://gethomepage.dev/installation/docker/)

The official Homepage repository identifies its license as GPL-3.0. This implementation independently adapts documented formats and behaviors; Homepage runtime source, icons and other assets were not copied. Icon collections and third-party media require their own attribution and terms if used later. [Homepage repository](https://github.com/gethomepage/homepage)

## Native architecture

The workspace package is `@lifeforge/zillion--tech-lab`, located in `modules/zillion--tech-lab`. Its manifest registers the native `/tech-lab` route. Package metadata supplies the Utilities category and server icon; all four supported locale files are included. Client requests use the generated contract and owner-scoped, contract-derived query keys.

`server/index.ts` registers the inventory routes. `shared.ts` defines runtime-validated inputs and DTOs, while `server/store.ts` handles ownership, stale-edit checks, imports, check snapshots and retention. `server/network.ts`, `monitor.ts` and `telemetry.ts` contain the bounded read-only adapters. `server/collectors.ts` supplies the background collector and startup dispatcher.

The schema contains four tables:

| Table                        | Purpose and relationships                                                                                                                                                                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `zillion_tech_lab__devices`  | Static device specifications, host metadata, optional management and Glances links, tags and import provenance. Source keys are unique per owner.                                                                                          |
| `zillion_tech_lab__services` | Service, game or bookmark inventory, category, optional device association, launch URL, explicit monitor configuration and its revision. The device foreign key includes `owner_id`.                                                       |
| `zillion_tech_lab__checks`   | Timestamped observations with the service name, original identity, monitor configuration and revision captured at check time. The live service association is detached on deletion while historical snapshots remain subject to retention. |
| `zillion_tech_lab__settings` | One settings record per owner: client refresh, staleness multiplier and check retention.                                                                                                                                                   |

Every table has `owner_id`. The shared schema synchronization applies both `ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY`, with read/write policies tied to the transaction's `zillion.user_id`. API handlers derive that identity from authenticated request state; background collectors open fresh transactions and set the same owner context. Explicit owner predicates and composite foreign keys also prevent cross-owner relationships. Mutation locks and expected-update timestamps protect against stale saves and deletes.

## Import and export behavior

`importer.ts` exposes asynchronous `previewTechLabImport({ format, text })`. Supported formats are `homepage-services`, `homepage-bookmarks` and `native-json`. The preview returns validated devices and services, counts for devices/services/bookmarks/duplicates, and safe aggregate warnings. It performs no network requests or database writes.

Homepage imports allow static inventory fields and group paths. Widget/API configuration, credentials, custom scripts, unsupported fields and monitoring settings are omitted. Native JSON accepts inventory collections or the version 1 `zillion-tech-lab` backup shape. It preserves validated nonsecret monitor kind, target, port and interval, while forcing `monitor_enabled: false`.

HTTP/S launch links are normalized. Credential-free SMB URIs are retained as copy-only service addresses, including Homepage SMB `href` values; their HTTP launcher is empty. SMB imports neither launch a protocol handler nor make network requests. Embedded authentication, credential query parameters and any SMB fragment are rejected. Device hosts and TCP/Minecraft targets retain their separate host-only rules. Other unsupported schemes and unresolved placeholders are omitted with warnings.

Static device fields and tags are bounded. The parser accepts at most 1,048,576 characters, 50,000 tree nodes, depth 12, 500 devices and 2,000 service/link entries. YAML aliases, anchors, explicit tags, merge keys, duplicate mapping keys and multiple documents are rejected. Raw parser diagnostics and discarded values are never included in warnings.

Deterministic SHA-256 source keys make repeated previews stable. Duplicate entries collapse, while conflicting preserved source keys fail explicitly. Same-file device references are resolved to import source keys; missing, ambiguous or foreign references remain unassigned. The authenticated apply route validates the reviewed DTO again and merges it atomically with fresh native IDs. Existing source keys are skipped rather than overwriting edited inventory. Monitoring remains disabled after apply.

Native export includes owned inventory and settings. Check history is excluded. Import is an inventory merge: exported settings do not overwrite current settings, and historical observations are not restored or invented.

## Monitoring and metric semantics

The API startup dispatcher discovers owners and resumes enabled monitors without a Tech Lab page visit. An authenticated visit or enabled monitor save also registers the owner's collector. Monitoring continues after the page closes while the API process remains running; stopping the API stops collection. Previously recorded observations remain in PostgreSQL. Missing periods are not backfilled.

The collector has bounded capacity: 128 registered collectors, four actively collecting owners, four concurrent probes within a check batch, and at most 12 due monitors per batch. Discovery and ordinary collection ticks run every 30 seconds. Per-monitor intervals range from 60 to 86,400 seconds. These bounds do not promise collection while the API is offline or immediate execution at capacity.

| Adapter   | Meaning of a successful observation                                                                                                                                                                                                                                                                       |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HTTP      | Uses HEAD, with GET fallback for 405 or 501. Responses in the 200–399 range indicate availability. 401 and 403 also indicate a reachable service, with an explicit authentication-required message; they do not prove authenticated application functionality. Other HTTP statuses are down observations. |
| TCP       | Establishes a connection to the configured host and port. This verifies connection availability, not application correctness.                                                                                                                                                                             |
| Minecraft | Performs Java Server List Ping with bounded packet framing. Valid player counts and version text are observed response values. It does not log in, issue commands, list player identities or implement Bedrock queries.                                                                                   |
| Glances   | Requests CPU, memory, filesystem and uptime plugins from API v4, with v3 fallback when all v4 plugins return 404. Successful plugins survive partial failures. Malformed or impossible values remain absent rather than being replaced with plausible values.                                             |

Network targets are resolved, checked and pinned for each operation. Loopback, link-local, multicast, reserved translation forms and the known metadata endpoint covered by the policy are blocked. Intended private LAN and Tailscale targets remain usable. Requests do not follow redirects or forward browser cookies. DNS/request deadlines and response-size limits bound reads. No adapter grants server control access or supports imported API credentials.

Device uptime is actual Glances uptime in seconds. CPU is an observed percentage; memory and filesystem readings are bytes. Manually entered device RAM capacity is inventory metadata, not a live metric. A reachable endpoint with no valid telemetry does not become a healthy metric reading. Unconfigured, failed and missing values remain visibly distinct.

Service health distinguishes `disabled`, `unknown`, `stale`, `up`, `down` and `error`. A configuration change advances `monitor_revision`; the latest state and 24-hour aggregate use observations from the current revision. Old configuration observations remain historical evidence. Errors in the collector/database are not recorded as fabricated service outages.

The 24-hour percentage is **successful check samples divided by all recorded check samples**, including down and error samples. It is not time-weighted uptime, an SLA, or proof of continuous coverage. No samples means an unknown percentage. API downtime and gaps between checks are not counted as successful time. Check retention is configurable from 7 to 90 days; history responses are bounded and disclose truncation.

## Verification record

The combined scoped suites passed 209 tests. The integration suites use synthetic fixtures; their results cover ownership, persistence and route behavior without treating imported inventory as test data.

| Coverage                                             | Count | Status                                        |
| ---------------------------------------------------- | ----: | --------------------------------------------- |
| Importer and network/monitor/telemetry adapter tests |   148 | Passed, including safe SMB copy-only imports. |
| Model/collector unit tests                           |    19 | Passed.                                       |
| Client utility tests                                 |    26 | Passed.                                       |
| HTTP integration tests                               |     3 | Passed.                                       |
| PostgreSQL integration tests                         |    13 | Passed.                                       |
| Combined total                                       |   209 | Passed.                                       |

The full `pnpm build` completed 31 of 31 tasks, and `pnpm typecheck` completed 27 of 27 tasks. The schema synchronization completed 103 statements. Scoped lint and formatting checks passed for the Tech Lab module and the modified API entry point.

The adapter run uses mocked DNS/HTTP/Glances and local fixture sockets with an explicitly trusted test resolver. It does not contact the user's homelab.

Browser verification completed an authorized import of visible Homepage inventory into native Tech Lab: five devices and 21 service/link entries were created, with 19 device associations. Repeating the same file skipped all five devices and all 21 entries. Search narrowed the visible inventory to one of 21 entries. One explicitly enabled HTTP monitor, configured for a 60-second interval, recorded an actual HTTP 200 observation with a timestamp, latency and history; the other 20 imported monitors remained disabled.

The browser export download was inspected as native JSON: it contained the expected format, five devices, 21 service/link entries and the preserved copy-only SMB address. It contained neither `owner_id` nor check history. Desktop verification showed valid Glances CPU, memory, filesystem and host uptime readings. These are aggregate results; private topology and measurement values remain excluded from this report.

Both unsaved-draft navigation branches were exercised in the browser: keeping the editor retained its draft, and explicitly discarding it returned to the overview without creating an inventory record. Final UI review added keyboard-focusable, localized import preview regions and wrapping for long device and service names. The full build and typecheck passed again after these UI changes.

Mobile visual verification is unverified in this environment. The browser automation API reported a successful viewport change, but the observed DOM viewport remained 2,120 pixels wide. That result does not establish mobile layout behavior. Keyboard/accessibility interactions and visual rendering in all four locales have not been verified.

Background collection and restart resumption were verified. The Tech Lab tab was closed with three persisted check samples, then the API was stopped and restarted. With no subsequent Tech Lab page visit or request to its API, an owner-scoped read-only database check found a fourth sample containing a new HTTP 200 observation. All three prior samples, five devices, 21 service/link entries and the single enabled monitor were retained. This establishes that the startup dispatcher resumed collection after restart while the page remained closed.

Passing unit, integration and desktop checks does not substitute for the unverified mobile, keyboard/accessibility and four-locale visual checks above.
