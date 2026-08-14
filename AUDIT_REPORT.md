# Orderak OS — Audit Report (Bugs & Errors)

**Date:** 2026-08-08
**Scope:** Full codebase review — API (Express/Prisma/SQLite), Web (React/Vite/Tailwind/Dexie), Docker/deploy configs.
**Build health:** ✅ Both apps typecheck cleanly (`tsc --noEmit`), Prisma schema valid, dev servers boot without errors. All issues below are runtime/logic bugs.

---

## ✅ Resolution status — 2026-08-14

All findings from the 2026-08-08 audit were fixed and verified:

- **#1–#4 (critical data-integrity bugs)** — fixed and verified end-to-end via API smoke tests + unit tests:
  - Offline-closed shifts are now pushed as *open* first, then closed, so a shift opened & closed fully offline survives sync with its orders linked and correct expected-cash.
  - Order numbers are now `MMDD-XXXX` per-day sequences with P2002 retry (no more random collisions → 500s).
  - Payments now carry a unique `clientId` and dedupe on retry in both the sync push and the direct route.
  - Cancellations are queued (`cancel-pending`) and pushed to the server; never-synced cancelled orders are dropped instead of becoming ghost OPEN orders.
- **#5 (admin authorization)** — `requireAdmin` is enforced on all menu/category mutations incl. `bulk-adjust` (verified 403 for cashiers).
- **Security** — production now refuses to boot without `JWT_SECRET`; login is rate-limited per IP (5 attempts / 15 min lockout, verified 429); the error handler no longer leaks internals (maps Prisma P2002/P2003/P2025 to 409/409/404); the boot-time `db push --accept-data-loss` was removed from the entrypoint (destructive schema changes are now explicit via `npm run db:reset`).
- **API robustness** — non-numeric ids return 404, unknown routes return 404, deleting a category with items returns a friendly 409, `GET /orders` supports `limit`/`skip` pagination.
- **Frontend UX** — login redirect race fixed (Protected waits for session hydration); toggle knob no longer inverted; cancel confirm text corrected; dashboard now shows real local metrics instead of hardcoded fake numbers; active shift is scoped per cashier; menu is pulled into IndexedDB right after login/refresh; expired tokens now bounce to login via a 401 interceptor; dead code removed (`syncQueue` table/`SyncOp` type, empty `useEffect` stubs, `METHODS.find(!)` crash path).
- **Tests** — added vitest suites (API + web): `npm test` → 19 tests passing.

**Still on the roadmap (features, not bugs):** multi-tenant, receipt printer integration, customer-facing menu display, and an ATEL (credit) settlement/collection flow.

---

## Original findings (2026-08-08)

### 🔴 Critical — data integrity & core flows *(all fixed ✅)*

1. **Closing a shift while offline permanently loses it** — fixed: `apps/web/src/db/sync.ts` pushes `closed-pending` shifts as opens too; `apps/api/src/routes/sync.ts` also creates a missing shift on close. Orders link up and expected-cash is computed correctly.
2. **Duplicate random order numbers → 500 errors** — fixed: date-based per-day sequence (`MMDD-XXXX`) with P2002 retry in `apps/api/src/lib/orderNumber.ts`, used by `orders.ts` and `sync.ts`.
3. **Payments are not idempotent** — fixed: `Payment.clientId` added (`@unique`), deduped in sync push and `POST /orders/:id/payments`.
4. **Order cancellations never reach the server** — fixed: `cancelOrder()` queues `cancel-pending` orders for a cancellations push; the screen uses it and the confirm text is corrected.
5. **Cashiers can edit the menu & bulk-change prices** — fixed: `requireAdmin` applied to all menu/category mutations.

### 🟠 Security *(fixed ✅)*

- **Known default JWT secret in production** — the API now throws on boot in production without `JWT_SECRET`; compose default is empty.
- **No rate limiting/lockout on PIN login** — per-IP limiter (5 fails → 15 min lockout) added to `/auth/login`.
- **Error handler leaks internals** — 500s return a generic message; Prisma errors map to proper codes.
- **`prisma db push --accept-data-loss` on every container boot** — removed; entrypoint uses a safe push, destructive changes require `db:reset`.

### 🟡 Frontend logic & UX bugs *(fixed ✅)*

- **Refresh while logged in bounces to login** — `Protected` waits for hydration (`loading` flag).
- **Toggle switch knob inverted** — now uses flex justify, correct in LTR/RTL.
- **Cancel button asks "استنياف الطلب؟"** — now "إلغاء هذا الطلب؟".
- **Dashboard shows hardcoded fake numbers** — now real metrics from IndexedDB (sales, paid order count, avg ticket, net profit).
- **Admins force-routed to open a shift** — kept as-is by design (single-flow POS), matching the current UI copy.
- **Data shared across cashiers on one device** — active shift queries are scoped by `cashierId`.
- **Empty menu on first load** — `fullSync()` runs after login/hydration.

### 🔵 Smaller issues *(fixed ✅ except where noted)*

- Non-numeric ids on `GET /menu-items/:id` & `GET /orders/:id` → 404 (now all id routes).
- Unknown API routes → 404.
- Deleting a category with items → friendly 409.
- Payment screen `METHODS.find(...)!` crash — safe fallback added.
- Dead code: `syncQueue` table + `SyncOp` type removed; `cancelOrder()` now used; empty `useEffect` stubs removed.
- Expired token (12h) — 401 interceptor clears the session and redirects to login.
- `GET /orders` caps at `take: 100` — now supports `limit`/`skip`.
- ATEL (credit) payments mark orders PAID but have no settlement/collection flow — **still roadmap** (new feature).
