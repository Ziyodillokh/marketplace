# Sellio on the shared Contabo box (62.171.184.14)

This server also runs **vega-\***, **marja-\***, **niyat**, hizmat24, academy-resume (pm2 + docker + nginx).
Sellio lives next to them under its own prefix and must never touch theirs:

- never `pm2 kill` / `pm2 delete all` / `pm2 resurrect` — only `pm2 start /opt/sellio/ecosystem.config.js`
- never `docker system prune` or a project-less `docker compose down` — Sellio's compose project is `sellio`
- never `systemctl restart nginx` — only `nginx -t && systemctl reload nginx`
- no `default_server` in `/etc/nginx/sites-available/sellio`

## Layout

| What | Where |
|---|---|
| code | `/opt/sellio/app` — clone of `Ziyodillokh/marketplace`, branch `main` |
| backend env | `/opt/sellio/app/backend/.env` (mode 600) |
| uploads / logs | `/opt/sellio/uploads`, `/opt/sellio/logs` |
| pm2 | `sellio-api` 2500 · `sellio-webapp` 2501 · `sellio-admin` 2502 · `sellio-superadmin` 2503 · `sellio-landing` 2504 (`/opt/sellio/ecosystem.config.js`) |
| postgres | docker `sellio-postgres`, `127.0.0.1:15435`, user/db `sellio` (`/opt/sellio/docker-compose.yml`, password in `/opt/sellio/.env`) |
| nginx | `/etc/nginx/sites-available/sellio` + `snippets/sellio-proxy.conf` (HTTP until certbot) |
| deploy | `/opt/sellio/deploy.sh main` (backend always; landing/Next apps only when their dir changed; `FORCE_FRONTEND=1` to force) |
| autodeploy | `sellio-autodeploy.timer` → `/opt/sellio/autodeploy.sh` every minute: new `main` commit + GitHub "Build *" checks green → deploy. Log: `/opt/sellio/autodeploy.log` |
| SSL | `sellio-golive.timer` → `/opt/sellio/go-live.sh` every 10 min: when `selliostore.uz` A-records point here, runs `certbot --nginx` for those names and reloads `sellio-api` (webhooks need HTTPS). Log: `/opt/sellio/golive.log` |
| seed creds | `/root/sellio-seed-creds.txt` (super-admin owner + admin seed passwords) |

The repo's `ecosystem.config.cjs` / `deploy/deploy.sh` / `deploy/selliostore.uz.nginx` describe the **old** dedicated `/opt/marketplace` box (ports 2400-2404). They are not used here.

## Ports 2400-2404 are Vega's — Sellio is 2500-2504.

## Shipping code

Commit + push to `main`. CI must be green (`Build backend|webapp|admin|superadmin`); the timer then pulls and deploys (~2-5 min, frontends longer when their lockfile changed).

```
ssh vega 'tail -30 /opt/sellio/autodeploy.log'
ssh vega 'pm2 list | grep sellio'
ssh vega 'curl -s 127.0.0.1:2500/api/health'
```

## Go-live checklist (one time)

1. DNS (ahost.uz): `selliostore.uz`, `www`, `admin`, `clients`, `dev` → **62.171.184.14** (TTL 4 h).
2. `bash /opt/sellio/go-live.sh` (or wait for the timer) → certificate + HTTPS redirect.
3. Fill in `/opt/sellio/app/backend/.env`: `TELEGRAM_BOT_TOKEN` (@selliostorebot), `TELEGRAM_ORDERS_CHANNEL_ID`, `TELEGRAM_PAYMENTS_CHAT_ID` (`-1003641607785`), then `pm2 reload sellio-api --update-env`. Never blind-append to `.env` — delete the old line first (see memory: `TELEGRAM_USE_WEBHOOK=falsefalsetrue` incident).
4. Log in at `https://dev.selliostore.uz` with the owner from `/root/sellio-seed-creds.txt` and change the password.
