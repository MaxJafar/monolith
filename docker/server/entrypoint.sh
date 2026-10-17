#!/bin/sh
set -eu
cd /monolith/apps/api
exec node dist/server.js "$@"
