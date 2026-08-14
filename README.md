# Orderak OS — نظام كاشير وإدارة مطاعم

Offline-first POS system for Sudanese restaurants, built for Coolify / Docker.

## Stack

- **Frontend**: React + Vite + TypeScript + Tailwind (RTL, PWA)
- **Backend**: Node.js + Express + TypeScript + Prisma + SQLite
- **Cache**: Service Worker (Workbox) + IndexedDB (Dexie) for offline-first
- **Deploy**: Docker Compose (api + nginx web reverse proxy)

## Quick start (development)

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev          # API on :3001, Web on :5173
```

Open <http://localhost:5173>

**Default PINs**: `1234` (Admin) · `0000` (Cashier)

## Testing

```bash
npm test          # vitest suites for API + web (offline sync, order numbers, rate limiting, error handling)
```

## Deploy to Coolify

### 1. Push to Git

```bash
git init && git add . && git commit -m "Orderak OS"
git remote add origin <your-git-url>
git push
```

### 2. Create a Compose resource in Coolify

In Coolify: **+ New Resource** → **Docker Compose** → pick your repo.

### 3. Configure environment

In the resource's **Environment Variables** tab:

| Variable | Value | Required |
|---|---|---|
| `JWT_SECRET` | A long random string | ✅ |
| `WEB_PORT` | `80` (or `8080` if behind Coolify proxy) | optional |
| `CORS_ORIGIN` | Leave empty (same domain via nginx) | optional |

### 4. Persistent storage

Coolify auto-detects `volumes:` from `docker-compose.yml`. The `orderak-sqlite` volume will be created. **Don't delete it** — it contains all your data.

### 5. Deploy

Click **Deploy**. Coolify will:
1. Build the API image (multi-stage Node)
2. Build the web image (Vite build + nginx)
3. Run `prisma db push` on first boot (creates schema)
4. Auto-seed default users + menu items (only on empty DB)
5. Expose the web on port 80

### 6. Set the domain

In Coolify's **Domains** tab, set your domain (e.g. `pos.yourrestaurant.com`) to point to the `web` service.

### 7. HTTPS

Coolify auto-provisions Let's Encrypt SSL once the domain is set.

## Architecture

```
                    ┌─────────────────────────────┐
                    │  nginx (web container)      │
                    │  serves static + proxies
   Browser ─────►   │  /api/* → api:3001          │
                    │  Port 80                    │
                    └────────────┬────────────────┘
                                 │ internal Docker network
                                 ▼
                    ┌─────────────────────────────┐
                    │  api (Node.js)              │
                    │  Express + Prisma + SQLite  │
                    │  Port 3001                  │
                    └────────────┬────────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────────┐
                    │  orderak-sqlite (volume)    │
                    │  /app/data/orderak.db       │
                    └─────────────────────────────┘
```

## Offline-first flow

1. App loads in browser → caches static assets via Service Worker
2. First online session → syncs menu/categories from API
3. Creates shifts, orders, payments → written to IndexedDB (Dexie) instantly
4. If internet drops → continues to work; data stays in browser
5. When internet returns → background sync pushes the queue to API
6. PWA installable on desktop/tablet/phone (Chrome, Edge, Safari iOS 16.4+)

## Database

- **Engine**: SQLite (single file)
- **Location**: docker volume `orderak-sqlite` mounted at `/app/data/orderak.db`
- **Backup**: copy the volume with `docker run --rm -v orderak-sqlite:/data -v $(pwd):/backup alpine cp /data/orderak.db /backup/`
- **Restore**: drop the file into the volume and restart
- **Schema changes**: `npm run db:migrate` (safe push). Destructive changes require an explicit `npm run db:reset` — never auto-applied on container boot.

## Build artifacts

```
dist/                                  # Production web build
├── sw.js                              # Service Worker
├── workbox-*.js                       # Workbox runtime
├── manifest.webmanifest              # PWA manifest
├── icon.svg, icons/icon-*.png         # App icons
└── index.html + assets/
```

## Status

- [x] Auth (JWT + PIN), Categories, Menu Items CRUD
- [x] Orders + Payments (split, idempotent)
- [x] Shifts (open/close with variance)
- [x] Dashboard + Reports (basic)
- [x] Offline-first (Dexie + Service Worker)
- [x] PWA (installable on phone/tablet/desktop)
- [x] Docker production-ready
- [x] Coolify / Docker Compose deployment
- [x] Automated tests (vitest — API + web)
- [ ] Multi-tenant (multiple restaurants)
- [ ] Receipt printer integration
- [ ] Customer-facing menu display
