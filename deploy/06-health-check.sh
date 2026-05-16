#!/bin/bash
echo '================================='
echo '  PRODUCTION HEALTH CHECK'
echo '================================='
echo ''
DOMAIN=marketplace.yuksalish.dev

echo '--- 1. PUBLIC ENDPOINTS ---'
curl -s -o /dev/null -m 10 -w "GET https://${DOMAIN}/: HTTP %{http_code} (%{time_total}s)\n" https://${DOMAIN}/
curl -s -o /dev/null -m 10 -w "GET /admin/login: HTTP %{http_code}\n" https://${DOMAIN}/admin/login
curl -s -o /dev/null -m 10 -w "GET /health: HTTP %{http_code}\n" https://${DOMAIN}/health

echo ''
echo '--- 2. API (public) ---'
curl -s -o /dev/null -m 10 -w "GET /api/banners: HTTP %{http_code}\n" https://${DOMAIN}/api/banners?placement=home
curl -s -o /dev/null -m 10 -w "GET /api/settings/public: HTTP %{http_code}\n" https://${DOMAIN}/api/settings/public

echo ''
echo '--- 3. ADMIN AUTH ---'
LOGIN_RESP=$(curl -s -m 10 -X POST -H 'Content-Type: application/json' -d '{"email":"admin@marketplace.yuksalish.dev","password":"Marketplace2026!"}' https://${DOMAIN}/api/admin/auth/login)
TOKEN=$(echo "$LOGIN_RESP" | python3 -c 'import json,sys;d=json.load(sys.stdin);print(d.get("accessToken","FAIL"))')
echo "Login: ${TOKEN:0:40}..."
curl -s -o /dev/null -m 10 -w "GET /api/admin/stats/overview: HTTP %{http_code}\n" -H "Authorization: Bearer $TOKEN" https://${DOMAIN}/api/admin/stats/overview
curl -s -o /dev/null -m 10 -w "GET /api/admin/products: HTTP %{http_code}\n" -H "Authorization: Bearer $TOKEN" https://${DOMAIN}/api/admin/products
curl -s -o /dev/null -m 10 -w "GET /api/admin/users: HTTP %{http_code}\n" -H "Authorization: Bearer $TOKEN" https://${DOMAIN}/api/admin/users

echo ''
echo '--- 4. PM2 STATUS (marketplace only) ---'
pm2 jlist 2>/dev/null | python3 -c '
import json,sys
ps = json.load(sys.stdin)
for p in ps:
    if p["name"].startswith("marketplace-"):
        env = p["pm2_env"]
        print(f"  {p[\"name\"]}: {env[\"status\"]} (restarts: {env.get(\"restart_time\",0)}, mem: {p[\"monit\"][\"memory\"]//1024//1024}mb, cpu: {p[\"monit\"][\"cpu\"]}%)")
'

echo ''
echo '--- 5. NGINX ---'
nginx -t 2>&1 | tail -2

echo ''
echo '--- 6. SSL ---'
echo | openssl s_client -servername ${DOMAIN} -connect ${DOMAIN}:443 2>/dev/null | openssl x509 -noout -dates 2>&1 | head -2

echo ''
echo '--- 7. TELEGRAM WEBHOOK ---'
curl -s 'https://api.telegram.org/bot8755806242:AAHBl9OobTUPnX7gcarTwIuIOq89OlwLkls/getWebhookInfo' | python3 -m json.tool

echo ''
echo '--- 8. DB ---'
sudo -u postgres psql -d marketplace_prod -c 'SELECT
  (SELECT count(*) FROM "User") AS users,
  (SELECT count(*) FROM "Product") AS products,
  (SELECT count(*) FROM "Category") AS categories,
  (SELECT count(*) FROM "Order") AS orders,
  (SELECT count(*) FROM "PromoCode") AS promos,
  (SELECT count(*) FROM "Banner") AS banners,
  (SELECT count(*) FROM "Admin") AS admins;' 2>&1 | head -10

echo ''
echo '================================='
echo '  ✓ HEALTH CHECK TUGADI'
echo '================================='
