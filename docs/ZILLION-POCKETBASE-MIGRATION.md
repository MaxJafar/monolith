# PocketBase migration rehearsal

`tools/src/zillion/migratePocketBase.ts` prepares and rehearses the old PocketBase data migration to Zillion OS PostgreSQL. The default is a read-only dry-run. Applying and rolling back are restricted to loopback databases named `zillion_dev` or `zillion_test` (optionally `zillion_test_<suffix>`). The tool cannot connect to a production PostgreSQL destination.

The real profile and production backup were not available during development. Verification uses generated users, bcrypt hashes, settings, note relations and text files in the local test database. Production transfer and switching the running installation remain separate work.

## Prepare an offline source

Use a consistent, private SQLite backup of `pb_data/data.db` with the matching `pb_data/storage` directory. A copy taken while SQLite is writing must include the corresponding WAL state or come from SQLite's backup facility. Work from this offline copy; the tool does not contact a PocketBase server or change the source database.

Keep this backup outside Git. Do not paste its records, credential hashes, tokens or private settings into documentation, terminal commands or chat. A normal PocketBase API record export omits the password hash and cannot preserve the original password. Older offline schemas use `passwordHash`; newer auth schemas use a password field containing the stored bcrypt hash. The reader normalizes both into the private migration input. See the [PocketBase password field implementation](https://github.com/pocketbase/pocketbase/blob/master/core/field_password.go) and [maintainer explanation of offline auth imports](https://github.com/pocketbase/pocketbase/discussions/2105).

Use the repository's supported Node runtime (Node 22.23 or newer with `node:sqlite`) and pnpm. Node 22 reports SQLite as experimental. Configure the isolated local database with the documented local setup, then synchronize its schema. `env/.env.local` supplies `DATABASE_ADMIN_URL`; its value is never printed by this tool.

## Dry-run

From the repository root:

```sh
pnpm exec tsx --tsconfig tools/tsconfig.json tools/src/zillion/migratePocketBase.ts \
  --pocketbase /private/offline-copy/pb_data/data.db \
  --owner LEGACY_USER_ID \
  --report .temp/migration/report.json
```

`--owner` is mandatory. Records without an explicit legacy owner are assigned to that selected profile; explicit owners and cross-owner references are checked. The storage source defaults to the `storage` directory beside the SQLite database; override it with `--files /private/offline-copy/storage` if needed.

The private report has mode `0600` and contains collection counts, a deterministic old-ID to UUID map, warnings and blockers. It excludes record values, email addresses, content and password hashes. Terminal output contains only counts. Dry-run reads the destination catalog and local source files without inserting rows or copying files.

Do not proceed while blockers remain. The planner checks missing mappings, required fields, unsupported hashes, dates, numbers, booleans, missing parents, cross-owner relations, cycles, invalid note parent types, absent files and paths escaping the file root. Unsupported fields are blockers, rather than discarded data. Skipped PocketBase system collections and SQL views are not user record destinations.

## Mapping unsupported collections or fields

Common collection aliases for all twelve selected modules are recognized, with explicit legacy mappings for Blog, Projects, Notes, Flashcards and Wishlist. Fields whose meaning or destination changed may still need an explicit mapping against the real offline schema. No claim of complete production compatibility is made without that dry-run.

For a custom mapping, use a private JSON snapshot instead of the SQLite input:

```json
{
  "version": 1,
  "collections": {},
  "mappings": {
    "legacy_collection": {
      "target": "notes__subjects",
      "fields": { "workspace": "workspace_id" },
      "defaults": { "description": "", "icon": "tabler:folder" },
      "relations": {},
      "ignoreFields": {
        "derived_total": "Recomputed from migrated child rows."
      }
    }
  },
  "files": []
}
```

`collections` must contain the actual private records, including the stored auth hash under `passwordHash` or `password_hash`. `relations` maps a destination array field to its source collection, allowing JSON relation arrays to use the same UUID map. Destination scalar foreign keys are inferred from PostgreSQL constraints. Every deliberate ignored field needs a reason. File manifest entries have `collection`, `record`, `field`, `path` relative to `--files`, and `mimeType`. Multiple files for one scalar destination field are blocked until a preserving mapping is implemented.

```sh
pnpm exec tsx --tsconfig tools/tsconfig.json tools/src/zillion/migratePocketBase.ts \
  --snapshot /private/offline-copy/snapshot.json \
  --files /private/offline-copy/storage \
  --owner LEGACY_USER_ID
```

The SQLite reader keeps its source snapshot only in memory. It never writes a raw export to the repository.

## Apply to the isolated local destination

Use the same source and owner after reviewing a clean dry-run:

```sh
pnpm exec tsx --tsconfig tools/tsconfig.json tools/src/zillion/migratePocketBase.ts \
  --pocketbase /private/offline-copy/pb_data/data.db \
  --owner LEGACY_USER_ID \
  --storage .temp/migration/storage \
  --journal .temp/migration/journal.json \
  --apply
```

The default storage is deliberately an isolated rehearsal directory. To exercise imported files through the local application, point its local file provider at that same directory, or explicitly choose another isolated local storage directory. The tool does not change application configuration.

Rows are inserted in parent order inside one PostgreSQL transaction. Original hashes are preserved; application authentication separately verifies bcrypt and rehashes on successful sign-in. File bytes are hashed during planning and checked again before copying. Files are created exclusively, and metadata receives the migrated owner. A changed source file aborts the transaction and removes files already copied by that attempt.

The private journal is written before commit and records only table names, generated IDs and digests. The batch fingerprint includes the snapshot, selected owner and file bytes. Repeating the same batch with the same journal skips known rows/files. A journal left before an interrupted commit can be retried without duplicate inventory. Existing IDs outside that journal are refused. Changed snapshots, owner selections or file bytes require a separate reviewed batch; the tool never overwrites an existing profile to make an import succeed.

## Rollback

```sh
pnpm exec tsx --tsconfig tools/tsconfig.json tools/src/zillion/migratePocketBase.ts \
  --storage .temp/migration/storage \
  --journal .temp/migration/journal.json \
  --rollback
```

Rollback verifies the current digest of every imported row and file and checks for new dependent records. If anything was edited, a password was rehashed after login, or new records/files depend on imported data, automatic rollback is refused. Review and preserve those changes before deciding how to recover. The tool will not delete new work through a cascade.

Unchanged imported rows are removed in reverse dependency order, their file metadata is deleted, copied files are removed, and the journal is renamed with `.rolled-back`. Other profiles and records are outside the journal and remain outside the rollback inventory.

## Verification

```sh
pnpm --filter lifeforge-cli typecheck
ZILLION_INTEGRATION=1 pnpm --filter lifeforge-cli exec vitest run src/zillion/migratePocketBase.test.ts
ZILLION_INTEGRATION=1 pnpm --filter @lifeforge/server exec vitest run src/tests/legacy-modules.integration.test.ts
```

Migration tests cover both PocketBase metadata versions and password column formats, read-only offline extraction, UUID/owner/parent mapping, preservation of bcrypt and settings, private reports/journals, path and cross-owner rejection, owner/file batch identity, atomic failure after source file changes, retry after an interrupted commit inventory, an actual local import, repeat application and guarded rollback. Module integration tests exercise persistent CRUD for the five restored modules, app-role RLS, invalid references/cycles, board moves, reviews, purchase timestamps, reconnect persistence and note attachment upload/removal/cascade cleanup.
