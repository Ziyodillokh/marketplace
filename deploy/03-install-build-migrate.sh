#!/bin/bash
set -e
APP_DIR="/opt/marketplace"

echo "=========================================="
echo "=== 1. BACKEND: install + prisma + build ==="
echo "=========================================="
cd ${APP_DIR}/backend
npm ci --omit=dev=false --no-audit --no-fund 2>&1 | tail -3 || npm install --no-audit --no-fund 2>&1 | tail -5
echo "  → npm install bajarildi"
npx prisma generate 2>&1 | tail -3
echo "  → prisma generate"
npx prisma migrate deploy 2>&1 | tail -10
echo "  → prisma migrate deploy"
npx prisma db seed 2>&1 | tail -10 || echo "  Seed allaqachon bor, davom etadi"
echo "  → seed"
npm run build 2>&1 | tail -5
echo "  → backend build tugadi"
ls -la dist/src/main.js && echo "  ✓ dist/src/main.js mavjud"

echo ""
echo "=========================================="
echo "=== 2. WEBAPP: install + build ==="
echo "=========================================="
cd ${APP_DIR}/webapp
npm install --legacy-peer-deps --no-audit --no-fund 2>&1 | tail -5
echo "  → install"
npm run build 2>&1 | tail -10
echo "  → webapp build"

echo ""
echo "=========================================="
echo "=== 3. ADMIN: install + build ==="
echo "=========================================="
cd ${APP_DIR}/admin
npm install --legacy-peer-deps --no-audit --no-fund 2>&1 | tail -5
echo "  → install"
npm run build 2>&1 | tail -10
echo "  → admin build"

echo ""
echo "=========================================="
echo "✓ HAMMA BUILD TAYYOR"
echo "=========================================="
ls -la ${APP_DIR}/backend/dist/src/main.js ${APP_DIR}/webapp/.next/BUILD_ID ${APP_DIR}/admin/.next/BUILD_ID 2>&1
