#!/bin/bash
set -e
APP_DIR="/opt/marketplace"
cd ${APP_DIR}

echo "=== PM2 start (boshqa loyihalarga tegmasdan) ==="

# Avval bizning processlar bo'lsa to'xtataylik (qayta deployda)
pm2 delete marketplace-api 2>/dev/null || true
pm2 delete marketplace-webapp 2>/dev/null || true
pm2 delete marketplace-admin 2>/dev/null || true

# Ecosystem dan start
pm2 start ${APP_DIR}/ecosystem.config.cjs

# 5 sekund kuting, keyin holatni ko'rsating
sleep 5

echo ""
echo "=== PM2 holatlar ==="
pm2 list 2>&1 | grep -E "marketplace|^┌|^├|^└|^│ id" | head -20

echo ""
echo "=== Backend health (2400) ==="
curl -s -o /dev/null -m 5 -w "HTTP %{http_code} (%{time_total}s)\n" http://127.0.0.1:2400/health || echo "FAIL"

echo ""
echo "=== Webapp (2401) ==="
curl -s -o /dev/null -m 10 -w "HTTP %{http_code} (%{time_total}s)\n" http://127.0.0.1:2401/ || echo "FAIL"

echo ""
echo "=== Admin (2402) ==="
curl -s -o /dev/null -m 10 -w "HTTP %{http_code} (%{time_total}s)\n" http://127.0.0.1:2402/admin/login || echo "FAIL"

# Save PM2 state (so it survives reboots — but our process list only)
pm2 save 2>&1 | tail -2
