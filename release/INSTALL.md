# Install the Monolith preview

Download the files for the same version from [GitHub Releases](https://github.com/MaxJafar/monolith/releases). This preview is for manual installation. Windows executables are unsigned; the universal macOS application is ad-hoc signed and is not notarized. Signed automatic application updates are not enabled for this preview.

## Desktop clients

On Windows x64, run the `windows-amd64.exe` installer. On macOS, open the `darwin-universal.dmg` and drag Monolith to Applications. The Mac application supports Apple Silicon and Intel. Your operating system may block these preview downloads because they lack a trusted publisher signature. Use the web client if your device policy disallows unsigned applications.

Both clients connect to a Monolith server using its HTTPS address. They do not install a server or database on your computer.

## Linux server

Install Docker Engine with Docker Compose, and configure an HTTPS reverse proxy for your server. Download the server kit ZIP and the matching `linux-amd64` or `linux-arm64` image archive. Extract this kit into a dedicated directory.

Verify the downloaded files against `SHA256SUMS` before loading them. If an image is split into `.part01`, `.part02`, etc., download **every part** and concatenate them in filename order before loading:

```sh
sha256sum --check --ignore-missing SHA256SUMS
# Unsplit image:
docker load --input monolith-VERSION-linux-amd64.tar.gz
# Split image (instead of the command above):
cat monolith-VERSION-linux-amd64.tar.gz.part* | docker load
```

Replace `VERSION` with the release version. For ARM servers, use `linux-arm64` throughout.

Copy `env/.env.docker.example` to `env/.env.docker`. Set `MONOLITH_SERVER_IMAGE` to the image tag printed by `docker load` and `PUBLIC_URL` to your HTTPS origin. Generate independent random values for both database passwords, `MASTER_KEY`, `JWT_SIGNING_KEY` and `BOOTSTRAP_TOKEN`, for example with `openssl rand -hex 32`. Keep this environment file private and back it up with your database.

```sh
docker compose --env-file env/.env.docker -f compose.yaml up -d
docker compose --env-file env/.env.docker -f compose.yaml ps
```

Forward your HTTPS proxy to `127.0.0.1:8080`. Open the server address and create the first account using your bootstrap token. Persistent named volumes store the database and uploaded files; keep them when replacing containers. Back up these volumes and the environment file before upgrades. Do not use `down --volumes` on an installation whose data you want to keep.

## Add-ons and widgets

The release includes independently versioned `.monolith-addon` downloads and a signed catalog. Configure the catalog URL for the exact release, the included `addon-catalog-public.pem` public key and administrator IDs using the [shop guide](https://monolith-site-maxjafars-projects.vercel.app/docs/addons). The host migration must be applied and its matching `addon-schemas.json` approved before schema-bearing add-ons can be installed. Existing installations should keep their current core/add-on selection until migration is complete.

## CLI and MCP

Install Node.js 22.23 or newer and pnpm, then install the downloaded package:

```sh
pnpm add --global ./monolith-agent-tools-VERSION.tgz
monolith-agent --help
```

Follow the [agent setup guide](https://monolith-site-maxjafars-projects.vercel.app/docs/agents) to connect Codex, Claude Code, OpenClaw or another MCP client.

The repository license and third-party notices also apply to these downloads.
