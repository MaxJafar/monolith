# Monolith system search

The core `/search` feature uses the backend-only shared Mac mini inference client.
No inference credentials are shipped to browsers. Existing Golden Retriever
configuration is independent of this implementation.

Pipeline: authorized content → Unicode-safe overlapping chunks → 768-dimensional
EmbeddingGemma vectors → BM25 + cosine retrieval → reciprocal rank fusion → Laya
relevance/confidence → Gemma answers with validated evidence IDs. Image descriptions
use the same Mac mini vision API and are labeled as AI interpretations. Text-based
PDFs retain page markers.

`search__documents` and `search__chunks` persist per-account cache under forced
PostgreSQL row-level security. Every query resolves current source permissions and
fingerprints before using the cache and rechecks evidence after inference. Shared
workspace access is verified before switching the database actor to its owner;
queries under that switch are restricted to that workspace's bases. Existing
native-to-canonical records are deduplicated. Content adapters select named fields;
credentials, settings and raw agent execution snapshots are excluded.

Indexing commits at most eight passages from one source per request. Repeated calls
resume missing passages; content edits and embedding version changes invalidate
old vectors. A stopped browser loop completes only its current authorized batch.
Model failures return current keyword evidence and explicit coverage warnings.

## Activation

Start the PostgreSQL instance configured in `env/.env.local`. Then, from the
repository root, add only the two search tables and their isolation policies:

```powershell
pnpm exec node --import tsx tools/search/migrate.mjs
```

On this Windows PC, `local:setup` restarts the active Windows cluster in
`.temp/monolith-review-postgres/data` on port 55432. If that cluster is absent, it
initializes `.temp/monolith-postgres-windows/data`. The previous Mac cluster in
`.temp/zillion-postgres/data` is retained separately. The portable PostgreSQL 17
runtime lives in `.temp/search-verification/pgsql/bin`; `POSTGRES_BIN` can override
it. Both database roles use the existing private `env/.env.local` credentials.
On an empty database, apply all application schemas with `pnpm db:push` first.

The normal `pnpm db:push` also discovers this schema. The scoped command avoids
applying unrelated pending schemas. The API and web app must use the newly built
core contract. Existing shared host configuration is in `tools/ai-host/README.md`.

`SHARED_AI_INDEX_VERSION` defaults to `1`. Bump it when replacing embedding weights
under the same model alias; otherwise cached vectors could span different models.

## Boundaries

Per selected scope: 6,000 sources, 4 million source characters, 100,000 characters
per document and 12,000 passages. The stored account cache also caps at 6,000
documents / 12,000 vectors. Larger selections fail explicitly; narrow the scope or
clear the account's search cache. Files above 12 MiB and unsupported formats have
metadata-only search. PDF extraction covers up to 80 pages / 100,000 characters;
scanned PDFs currently have a coverage warning. Images are decoded with a 24-million
pixel cap and resized to 1400 pixels before inference. Workspace scope covers
canonical records, pages and imported knowledge; personal module files are indexed
in the unrestricted or module scope. Source links for native-only content open
the containing module; canonical records link directly to their record.

## Verification

```powershell
pnpm exec node --import tsx --test tools/search/retrieval.test.ts tools/search/inference.test.ts tools/search/files.test.ts
```

`verify.mjs` exercises real Mac mini embedding, vision, Laya and answer generation,
plus database isolation, membership revocation, stale-vector rejection and offline
fallback. It uses synthetic data only in an isolated local PostgreSQL cluster on
port 55433, initialized with administrator `search_test_admin`. Run it from
`apps/api` so the TS loader uses that application's aliases:

```powershell
pnpm exec node --import tsx ../../tools/search/verify.mjs
```

The runner creates a fresh database and restricted application role and removes
both in `finally`. It never connects to the configured Monolith database.
