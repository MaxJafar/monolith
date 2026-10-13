# ECC and WeKnora integration

Implemented in monolith on 2026-10-13, within its existing Agents and Databases modules. The implementations are original adaptations of the source models below, with no separate upstream application runtime.

## Sources and provenance

| Source                                                                                      | Pinned revision                            | License                                                                                                                            | Applied patterns                                                                                             |
| ------------------------------------------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| [ECC](https://github.com/affaan-m/ECC/tree/b92f181b3b748d1abbc2afd94af6aa7d8c8fca29)        | `b92f181b3b748d1abbc2afd94af6aa7d8c8fca29` | [MIT](https://github.com/affaan-m/ECC/blob/b92f181b3b748d1abbc2afd94af6aa7d8c8fca29/LICENSE)                                       | Reusable agent instructions, research/verification workflows, predefined evidence checks and review policies |
| [WeKnora](https://github.com/Tencent/WeKnora/tree/2511a1f932a7a0dc0e9a04edb62986df0b147cca) | `2511a1f932a7a0dc0e9a04edb62986df0b147cca` | [MIT](https://github.com/Tencent/WeKnora/blob/2511a1f932a7a0dc0e9a04edb62986df0b147cca/LICENSE), with upstream third-party notices | Scoped knowledge collections, documents, overlapping chunks, ranked retrieval and source citations           |

ECC source inspection covered [research-first](https://github.com/affaan-m/ECC/blob/b92f181b3b748d1abbc2afd94af6aa7d8c8fca29/skills/search-first/SKILL.md), [verification](https://github.com/affaan-m/ECC/blob/b92f181b3b748d1abbc2afd94af6aa7d8c8fca29/skills/verification-loop/SKILL.md), [evaluation](https://github.com/affaan-m/ECC/blob/b92f181b3b748d1abbc2afd94af6aa7d8c8fca29/skills/eval-harness/SKILL.md) and [memory provenance](https://github.com/affaan-m/ECC/blob/b92f181b3b748d1abbc2afd94af6aa7d8c8fca29/docs/design/ecc-memory-vault.md). WeKnora inspection covered [knowledge-base configuration](https://github.com/Tencent/WeKnora/blob/2511a1f932a7a0dc0e9a04edb62986df0b147cca/internal/types/knowledgebase.go), [access resolution](https://github.com/Tencent/WeKnora/blob/2511a1f932a7a0dc0e9a04edb62986df0b147cca/internal/application/access/knowledgebase.go), [search](https://github.com/Tencent/WeKnora/blob/2511a1f932a7a0dc0e9a04edb62986df0b147cca/internal/application/service/knowledgebase_search.go) and [retrieval tools](https://github.com/Tencent/WeKnora/blob/2511a1f932a7a0dc0e9a04edb62986df0b147cca/internal/mcpserver/tools_retrieve.go).

## Actual Ghidra analysis

Used [official Ghidra 12.1.4](https://github.com/NationalSecurityAgency/ghidra/releases/tag/Ghidra_12.1.4_build), verifying the official archive SHA-256, with an isolated compatible Temurin JDK. The release omits its macOS ARM64 native decompiler, so that component was compiled from the verified release source using existing Xcode tools.

The WeKnora release has no compiled binary assets. Five unchanged document-profiling/chunking source files from the pinned revision were compiled with a local, nonexecuted harness into an unstripped Linux x86-64 ELF. Headless analysis recovered **3,708 functions**, including the Go runtime; **all 19 selected functions decompiled successfully**. This is a bounded component analysis, not decompilation of the full WeKnora server. Ghidra reports Go 1.26.5 RTTI recovery as untested; DWARF symbols, static disassembly and source corroboration provided the mapping.

Target SHA-256: `c3541569cefbcf392a925363cc862af8bc29cf786804c23a4326f3dc89b61c0a`.

Evidence retained under ignored `.temp/ghidra-analysis`:

- [Detailed report](../.temp/ghidra-analysis/REA-REPORT.md)
- [Download, source-file and target provenance](../.temp/ghidra-analysis/provenance.json)
- [Function inventory](../.temp/ghidra-analysis/reports/functions.tsv)
- [Actual decompiled C-like output](../.temp/ghidra-analysis/reports/weknora-profile-decompiled.c)

The recovered profiler recognizes Markdown headings, fenced code, tables, language hints and heading hierarchy. Its language-based token estimates are approximate and are never used as billed usage. ECC's Markdown/config/script assets were directly source-analyzed; native disassembly adds no useful representation for them. Upstream executables, installers and hooks were not run.

## Delivered behavior

**Agents → Playbooks:** create, revise and archive reusable policies; assign up to eight to an agent; capture their immutable revisions at dispatch. Review-required policies override automatic completion. Each required check uses `<playbook UUID>:<zero-based index>` and requires one passing report with nonempty evidence. Missing, duplicate, unknown, failed or invalid evidence prevents completion. Evidence is worker-reported and available for review; it does not prove independent server execution. The local planner accepts instructions-only policies and refuses executable verification requirements.

CLI, Codex, OpenClaw and OpenAI workers receive snapshots and check IDs. Checked runs use structured result/evidence output; ordinary runs retain plain output compatibility. Failed completion retains known measured tokens and accrued cost through the existing lease/failure/usage ledger. OpenAI transport verification uses mocked responses, without paid provider calls. See [ECC detail](../modules/zillion--agents/ECC-REA.md).

**Databases → Knowledge Library:** create named collections; link current workspace pages or canonical records; import plain text or Markdown from pasted content or `.txt`, `.md`, `.markdown` files. Search ranks overlapping passages using deterministic lexical matching and provides source citations. It requires no embedding model or AI credential. Linked bodies remain canonical and are read fresh; deleted sources disappear through foreign-key cascades. Imported content is stored once. Canonical citation links open the original page/record.

Workspace owners/editors manage the library; viewers can retrieve and follow citations. RLS, owner/workspace foreign keys and route checks enforce isolation. The omitted collection filter means all collections; an explicit empty array means none. Limits are 100 collections, 500 sources, 200,000 characters per imported or retrieved source, 8 million aggregate retrieval characters and 20 result passages. Retrieval checks serialized sizes before loading bodies and reads canonical documents in batches of eight. Metadata snapshots discard bodies while retaining exact character/passage counts, so oversized linked sources remain visible and removable even when search rejects them. Source quotas are checked under a workspace lock. Query/page/source IDs are not global account lookup privileges.

Forms preserve failed drafts, guard workspace/collection navigation and retain drafts if a collection/source becomes unavailable after refresh. Permission changes disable writes while allowing cancellation. Committed saves are independent of metadata-refresh failure. All four locales are supported; responsive layouts use the existing UI primitives and scoped CSS.

## Deliberate limits

This delivers an integrated first feature set, not full ECC or WeKnora parity. It does not include WeKnora's vector/hybrid search, reranking, PDF/OCR/media parsing, external connectors, generated Wiki, model-driven chat or ingestion jobs. Retrieval computes bounded chunks in process without a persistent search/vector index. Imported text is replaced by removing/reimporting its library source; no revisioned full-text editor is provided. Embedded widgets/database rows are not recursively copied into page citations. Playbooks do not execute hooks, expand permissions or independently attest evidence.

## Verification

Scoped checks cover collection/source persistence, fresh canonical content and cascade behavior, workspace membership, viewer retrieval and write rejection, unrelated-owner/sibling-workspace isolation, raw RLS and foreign keys, retrieval boundaries, immutable playbook policy revisions, review override, evidence gates, legacy run behavior and usage-preserving provider failures. Fixtures use only `127.0.0.1:55432/zillion_dev`, and refuse production/nonlocal database targets. Browser checks verify real creation, import, guarded navigation and cited retrieval through the local application.

Verification passed: **194 scoped tests**, **27 workspace typechecks**, and **31 workspace build tasks**, followed by a rebuild of the final Databases server bundle and API. Test totals comprise 31 Agents/policy integrations, 33 worker/adapter tests, 25 database model/retrieval tests, 96 client tests, and nine isolated Postgres knowledge integrations. Temporary browser fixtures were removed after verification. Provider transports were mocked; no paid AI run or actual mobile-device session was performed.
