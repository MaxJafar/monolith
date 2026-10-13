#!/bin/sh
set -eu
cd /zillion/apps/api
exec node dist/server.js "$@"
