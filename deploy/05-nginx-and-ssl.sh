#!/bin/bash
set -e
DOMAIN="marketplace.yuksalish.dev"
APP_DIR="/opt/marketplace"

echo "=== Nginx config o'rnatish ==="
cp ${APP_DIR}/deploy/marketplace.yuksalish.dev.nginx /etc/nginx/sites-available/${DOMAIN}

# Symlink
if [ ! -L /etc/nginx/sites-enabled/${DOMAIN} ]; then
  ln -s /etc/nginx/sites-available/${DOMAIN} /etc/nginx/sites-enabled/${DOMAIN}
  echo "  ✓ symlink yaratildi"
fi

# Nginx syntax check
nginx -t

# Reload (faqat reload, restart EMAS — boshqa siteslarga ta'sir qilmasligi uchun)
systemctl reload nginx
echo "  ✓ nginx reload tugadi"

# Test HTTP (DNS allaqachon serverga yo'naltirilgan)
echo ""
echo "=== HTTP test ==="
curl -s -o /dev/null -m 10 -w "GET /health: HTTP %{http_code} (%{time_total}s)\n" -H "Host: ${DOMAIN}" http://127.0.0.1/health
curl -s -o /dev/null -m 10 -w "GET /: HTTP %{http_code} (%{time_total}s)\n" -H "Host: ${DOMAIN}" http://127.0.0.1/

echo ""
echo "=== Domain DNS ==="
dig +short ${DOMAIN} A | head -3
echo "Server IP: $(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')"

echo ""
echo "=== SSL: Let's Encrypt ==="
# Email kerak. webroot mode bilan + nginx redirect avtomatik
certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos --email admin@yuksalish.dev --redirect 2>&1 | tail -15

echo ""
echo "=== HTTPS test ==="
sleep 2
curl -s -o /dev/null -m 15 -w "GET https://${DOMAIN}/health: HTTP %{http_code} (%{time_total}s)\n" https://${DOMAIN}/health || echo "DNS hali yangilanmagan bo'lishi mumkin"

echo ""
echo "✓ Nginx + SSL tayyor"
