#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
if [ ! -f env/.env.docker ]; then
    echo 'Copy env/.env.docker.example to env/.env.docker and fill its values first.' >&2
    exit 1
fi
docker compose --env-file env/.env.docker config --quiet
docker compose --env-file env/.env.docker build migrate client
printf '%s\n' 'ZillionOS images built. Start the isolated stack with:' \
    'docker compose --env-file env/.env.docker up -d'
