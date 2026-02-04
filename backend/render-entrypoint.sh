#!/usr/bin/env bash
set -euo pipefail

if [ -n "${DATABASE_URL:-}" ]; then
  uri="${DATABASE_URL#postgres://}"
  uri="${uri#postgresql://}"

  creds=""
  host_and_path="$uri"
  if [[ "$uri" == *"@"* ]]; then
    creds="${uri%@*}"
    host_and_path="${uri#*@}"
  fi

  if [ -n "$creds" ]; then
    user="${creds%%:*}"
    pass="${creds#*:}"

    if [ -n "${user:-}" ] && [ -z "${SPRING_DATASOURCE_USERNAME:-}" ]; then
      export SPRING_DATASOURCE_USERNAME="$user"
    fi

    if [ -n "${pass:-}" ] && [ -z "${SPRING_DATASOURCE_PASSWORD:-}" ]; then
      export SPRING_DATASOURCE_PASSWORD="$pass"
    fi
  fi

  hostport="${host_and_path%%/*}"
  path_and_query="${host_and_path#*/}"

  host="${hostport%%:*}"
  port="${hostport#*:}"
  if [ "$host" = "$port" ]; then
    port="5432"
  fi

  dbname="${path_and_query%%\?*}"
  query=""
  if [[ "$path_and_query" == *"?"* ]]; then
    query="?${path_and_query#*\?}"
  fi

  if [ -z "${SPRING_DATASOURCE_URL:-}" ]; then
    export SPRING_DATASOURCE_URL="jdbc:postgresql://${host}:${port}/${dbname}${query}"
  fi
fi

PORT_TO_USE="${PORT:-10000}"
exec java ${JAVA_OPTS:-} -jar /app/app.jar --server.port="${PORT_TO_USE}"
