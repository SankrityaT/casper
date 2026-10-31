#!/bin/sh
#created by kinjal
# Supervisor: keeps the relay mirror running, restarting after Relay outages.
# Each restart resumes from .state/cursor.json via sinceSeq.
cd "$(dirname "$0")"
while true; do
  bun --env-file=../../.env run mirror.ts
  echo "mirror exited ($?), restarting in 3s" >&2
  sleep 3
done
