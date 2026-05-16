# Marketplace — Production Deploy

## 🌐 Live

- **WebApp:** https://marketplace.yuksalish.dev
- **Admin:** https://marketplace.yuksalish.dev/admin (admin@marketplace.yuksalish.dev / Marketplace2026!)
- **API:** https://marketplace.yuksalish.dev/api/*
- **Bot:** @savora_aibot
- **Server:** 104.248.25.130 (DigitalOcean Frankfurt)

## 📂 Server tuzilishi

```
/opt/marketplace/
├── backend/        NestJS API (port 2400)
├── webapp/         Next.js webapp (port 2401)
├── admin/          Next.js admin (port 2402, basePath /admin)
├── deploy/         Shell scripts + nginx config
├── uploads/        Yuklangan rasmlar
├── logs/           PM2 logs
└── ecosystem.config.cjs
```

## 🔧 PM2 (3 process — boshqalardan ajratilgan)

```bash
pm2 list                # umumiy ko'rinish
pm2 logs marketplace-api      --lines 100
pm2 logs marketplace-webapp   --lines 100
pm2 logs marketplace-admin    --lines 100
pm2 restart marketplace-api
pm2 reload ecosystem.config.cjs --update-env  # zero-downtime reload
```

> **Boshqa processlarga TEGMASLIK** — biz faqat `marketplace-*` prefiksli processlarni boshqaramiz.

## 🗄 Database

- PostgreSQL 14
- DB: `marketplace_prod`
- User: `marketplace_user`
- Migrations: `cd /opt/marketplace/backend && npx prisma migrate deploy`

## 🌐 Nginx

Konfiguratsiya: `/etc/nginx/sites-available/marketplace.yuksalish.dev`

Routing (single domain):
- `/` → webapp:2401
- `/admin/` → admin:2402
- `/api/` → backend:2400
- `/uploads/` → backend:2400
- `/socket.io/` → backend:2400 (WebSocket)
- `/telegram/webhook` → backend:2400

## 🔒 SSL

Let's Encrypt — auto-renewal certbot cron orqali.
```bash
certbot certificates                       # ko'rish
certbot renew --dry-run                    # sinov
```

## 🤖 Telegram bot

- Token: `.env` da `TELEGRAM_BOT_TOKEN`
- Channel: `.env` da `TELEGRAM_ORDERS_CHANNEL_ID`
- Webhook: `https://marketplace.yuksalish.dev/telegram/webhook` (secret token bilan)
- Mode: `TELEGRAM_USE_WEBHOOK=true` (production)
- Menu button: avtomatik WebApp orqali Marketplace ochiladi

Webhook'ni qayta o'rnatish:
```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d "url=https://marketplace.yuksalish.dev/telegram/webhook" \
  -d "secret_token=<WEBHOOK_SECRET>"
```

## 🚀 CI/CD (GitHub Actions)

Har `git push origin main`'da avtomatik deploy:
1. SSH orqali serverga ulanadi (secrets: SSH_HOST, SSH_USER, SSH_PASSWORD)
2. `git pull` → npm install → build → prisma migrate deploy → pm2 reload
3. Health check

Manual deploy:
- GitHub UI → Actions → "Deploy to production" → Run workflow

## 🔄 Qo'lda deploy

```bash
ssh root@104.248.25.130
cd /opt/marketplace
git pull
cd backend && npm install && npx prisma migrate deploy && npm run build
cd ../webapp && npm install --legacy-peer-deps && npm run build
cd ../admin && npm install --legacy-peer-deps && npm run build
cd ..
pm2 reload ecosystem.config.cjs --update-env
```

## 🔐 Secrets (GitHub repo)

| Secret | Qiymati |
|--------|---------|
| `SSH_HOST` | `104.248.25.130` |
| `SSH_USER` | `root` |
| `SSH_PASSWORD` | (DigitalOcean root parol) |

## 📋 Portlar

| Port | Servis |
|------|--------|
| 2400 | Backend API |
| 2401 | WebApp Next.js |
| 2402 | Admin Next.js (basePath: /admin) |
| 80/443 | Nginx (public) |

## 🛡 Xavfsizlik

- **Hech qaysi port internetga ochiq emas** — faqat 80/443 (nginx orqali)
- JWT access (15m) + refresh (30d) rotation
- httpOnly cookie + Bearer token
- Telegram initData HMAC verification
- Rate limit (60 req/min/user)
- Helmet headers

## 📊 Monitoring

```bash
# PM2 monit (real-time CPU/MEM)
pm2 monit

# Nginx logs
tail -f /var/log/nginx/marketplace.access.log
tail -f /var/log/nginx/marketplace.error.log

# App logs
tail -f /opt/marketplace/logs/api.out.log
tail -f /opt/marketplace/logs/api.err.log

# DB connection check
sudo -u postgres psql -d marketplace_prod -c "SELECT count(*) FROM \"User\";"
```

## ⚠️ Disaster recovery

Agar nimadir buzilsa:
1. `pm2 logs marketplace-api --err` — backend xatolarini ko'ring
2. `nginx -t && systemctl status nginx` — nginx
3. `systemctl status postgresql` — DB
4. So'nggi commit'ga rollback:
   ```bash
   cd /opt/marketplace
   git log --oneline -5
   git reset --hard <HASH>
   pm2 reload ecosystem.config.cjs --update-env
   ```

## 👥 Admin credentials

- Email: `admin@marketplace.yuksalish.dev`
- Password: `Marketplace2026!`

> **MUHIM:** Ishlatishni boshlashdan oldin parolni o'zgartiring (`/admins` sahifasi orqali yoki DB'da `passwordHash`).
