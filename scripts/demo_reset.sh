#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "Resetting demo stack and seeded data..."
docker compose down -v
docker compose up -d --build

echo "Waiting for API gateway health..."
for _ in $(seq 1 60); do
  if curl -fsS "http://127.0.0.1:8000/health" >/dev/null; then
    break
  fi
  sleep 2
done

curl -fsS "http://127.0.0.1:8000/health" >/dev/null

LAN_IP="$(ipconfig getifaddr en0 2>/dev/null || true)"
if [[ -z "$LAN_IP" ]]; then
  LAN_IP="$(ipconfig getifaddr en1 2>/dev/null || true)"
fi
if [[ -z "$LAN_IP" ]]; then
  LAN_IP="YOUR_LAPTOP_LAN_IP"
fi

cat <<EOF

Demo stack is ready.

Customer app API URL for a physical phone:
  EXPO_PUBLIC_API_BASE_URL=http://${LAN_IP}:8000/api/v1

Seeded demo users (password: password123):
  customer@test.com
  restaurant@test.com
  delivery@test.com
  admin@test.com

Dashboards:
  Admin:      http://127.0.0.1:8008/api/v1/admin/dashboard
  Restaurant: http://127.0.0.1:8003/api/v1/restaurants/partner/dashboard
  Delivery:   http://127.0.0.1:8005/api/v1/delivery/dashboard
EOF
