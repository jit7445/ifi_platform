#!/usr/bin/env bash
# One-command runner for the local demo. Usage: ./run.sh [start|stop|reset|status|logs|test]
set -euo pipefail
cd "$(dirname "$0")"

COMPOSE=(docker compose --profile web)

need_docker() {
  if ! docker info >/dev/null 2>&1; then
    echo "Docker is not running. Start Docker Desktop and try again."
    exit 1
  fi
}

wait_for_api() {
  printf "Waiting for the API"
  for _ in $(seq 1 60); do
    if curl -fsS http://localhost:${API_PORT:-8010}/healthz >/dev/null 2>&1; then
      echo " ready."
      return
    fi
    printf "."
    sleep 2
  done
  echo
  echo "The API did not become healthy. Run: ./run.sh logs"
  exit 1
}

banner() {
  cat <<EOF

  Infollion Evaluation Platform is running.

  Open:      http://localhost:${WEB_PORT:-3000}
  API docs:  http://localhost:${API_PORT:-8010}/docs

  Password for every demo account: ChangeMe-dev-123!
    customer@acme.local        customer (AI company)
    pm@infollion.local         project manager
    reviewer@infollion.local   reviewer
    expert1@infollion.local    expert (also expert2 ... expert5)
    admin@infollion.local      platform admin

  Use a separate browser or incognito window per role.
  Stop with: ./run.sh stop
EOF
}

case "${1:-start}" in
  start)
    need_docker
    "${COMPOSE[@]}" up -d --build
    wait_for_api
    "${COMPOSE[@]}" run --rm api python -m app.cli seed >/dev/null
    banner
    ;;
  stop)
    need_docker
    "${COMPOSE[@]}" down
    echo "Stopped. Data is kept; ./run.sh start brings it back."
    ;;
  reset)
    need_docker
    read -r -p "This deletes ALL local platform data and re-creates the demo. Continue? [y/N] " ok
    [[ "$ok" == "y" || "$ok" == "Y" ]] || { echo "Cancelled."; exit 0; }
    "${COMPOSE[@]}" down -v
    "$0" start
    ;;
  status)
    need_docker
    "${COMPOSE[@]}" ps --format 'table {{.Service}}\t{{.Status}}'
    ;;
  logs)
    need_docker
    "${COMPOSE[@]}" logs -f --tail 100
    ;;
  test)
    need_docker
    "${COMPOSE[@]}" up -d postgres
    (cd backend && uv run pytest -q)
    (cd frontend && npx vitest run)
    ;;
  *)
    echo "Usage: ./run.sh [start|stop|reset|status|logs|test]"
    exit 1
    ;;
esac
