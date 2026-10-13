# ZillionOS containers

The Compose stack builds the current pnpm workspace, serves the web shell through Nginx, and loads the compiled module client/server bundles from the API image. PostgreSQL and uploaded files use independent named volumes. Module folders are included in the image, so host source mounts cannot hide the production artifacts.

The image uses Node 22 and the repository's pnpm 11.21.0. Frozen lockfile installs include the workspace configuration and Drizzle patch. The BuildKit cache follows the [official pnpm Docker guidance](https://pnpm.io/docker). Workspace links, schema sources and the CLI remain in the API image because module bundles externalize shared packages and the migration service uses those schemas. This favors a reproducible workspace over image-size minimization. Upstream license and notice files are retained; the client image also includes the root license.

## Configure and run an isolated local stack

Docker Engine with Compose v2 and BuildKit is required. The existing host PostgreSQL development service is separate from this stack. The default web address is `http://localhost:8080`; PostgreSQL and the API have no host ports.

Create a Docker environment file with independent random secrets. This command fills empty values and preserves existing configured values:

```sh
pnpm exec node --input-type=module <<'NODE'
import { existsSync, readFileSync, writeFileSync, chmodSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
const path = 'env/.env.docker'
let text = readFileSync(existsSync(path) ? path : `${path}.example`, 'utf8')
for (const name of ['ZILLION_DB_ADMIN_PASSWORD', 'ZILLION_DB_APP_PASSWORD', 'MASTER_KEY', 'JWT_SIGNING_KEY']) {
  text = text.replace(new RegExp(`^${name}=$`, 'm'), `${name}=${randomBytes(32).toString('hex')}`)
}
writeFileSync(path, text)
chmodSync(path, 0o600)
NODE

sh scripts/docker-build.sh
docker compose --env-file env/.env.docker up -d
docker compose --env-file env/.env.docker ps
curl --fail http://localhost:8080/api/status
```

Set `ZILLION_HTTP_PORT` and `CORS_ALLOWED_ORIGINS` together if the browser address changes. Keep these credentials in the ignored environment file; builds exclude local environments, databases, uploads and source archives.

PostgreSQL initializes `zillion_admin` and a separate `zillion_app` login. Only the migration service receives the administrator URL. It applies the reviewed schema tool, then grants application table/sequence privileges. The API starts after a successful migration and uses the role without superuser or BYPASSRLS rights. The schema tool enables and forces ownership policies; existing rows without an explicit owner mapping stop the migration instead of receiving an inferred owner. PostgreSQL initialization scripts run when its data directory is empty; changing a password in the environment does not rotate an existing database role. This is the [official PostgreSQL image's initialization behavior](https://github.com/docker-library/docs/blob/master/postgres/README.md).

Nginx strips `/api/` for HTTP requests and serves module federation assets through that prefix. Socket.IO transports use `/socket.io/`; the shared socket URL helper resolves `/api` to the browser origin while preserving the default and `/qr-login` namespaces. Upload proxy size is 50 MiB. The API image includes Chromium for the Code Time image endpoint and PDF tooling for receipt conversion. AI, maps and other provider integrations still require configured credentials.

## Rebuild, restart and retain data

```sh
sh scripts/docker-build.sh
docker compose --env-file env/.env.docker up -d --force-recreate migrate server client
docker compose --env-file env/.env.docker logs --tail=100 migrate server
```

A migration failure prevents API startup. Inspect its report and complete the owner mapping or reviewed data migration before retrying. Normal shutdown retains both volumes:

```sh
docker compose --env-file env/.env.docker down
```

Before an upgrade, retain the previous image tags and back up PostgreSQL plus the uploaded-file volume. An application rollback uses those previous images; a schema rollback needs a matching database backup. Production PocketBase migration and switching the production service remain separate from this isolated container setup.

## Verification in this workspace

On 2026-10-12, all seven existing modern modules passed client/server typechecks and production builds. Their eight PostgreSQL integration scenarios passed against the isolated non-superuser application role, including owner isolation, owned foreign references, create/edit/delete, folder-cycle rejection, idea/event subtype changes, timer retries, concurrent coding heartbeats and wallet persistence through a new connection. The socket helper's four namespace/origin tests and targeted ESLint passed.

The container shell scripts passed `sh -n`. Compose YAML was parsed using the installed YAML parser and checked for Dockerfile paths, migration ordering, named persistence volumes and separation of administrator/application URLs. The Docker executable is unavailable on this Mac, so image builds, `docker compose config`, Linux native dependencies, Nginx configuration loading and container runtime smoke tests have not been executed. The commands above are the reproducible verification path once Docker is available; static checks are not a claim that container startup has passed.
