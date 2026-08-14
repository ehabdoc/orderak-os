import { db, getMeta, setMeta } from './dexie';
import { api } from '../lib/api';
import type { Order, Payment, Shift } from '../types';

interface SyncResult {
  pulled: { categories: number; items: number };
  pushed: { shifts: number; orders: number; payments: number; shiftCloses: number; cancellations: number };
  errors: string[];
}

export async function pullMenu(): Promise<{ categories: number; items: number }> {
  const since = (await getMeta('menuLastSync')) ?? '';
  const res = await api.get<{ categories: any[]; items: any[]; serverTime: string }>(
    `/sync/pull?since=${encodeURIComponent(since)}`,
  );
  await db.transaction('rw', db.categories, db.menuItems, async () => {
    if (!since) {
      // first sync — replace fully
      await db.categories.clear();
      await db.menuItems.clear();
      await db.categories.bulkPut(res.categories);
      await db.menuItems.bulkPut(res.items);
    } else {
      await db.categories.bulkPut(res.categories);
      await db.menuItems.bulkPut(res.items);
    }
  });
  await setMeta('menuLastSync', res.serverTime);
  return { categories: res.categories.length, items: res.items.length };
}

export async function pushPending(): Promise<{
  shifts: number;
  orders: number;
  payments: number;
  shiftCloses: number;
  cancellations: number;
}> {
  const [pendingShifts, pendingOrders, pendingPayments, pendingCloses, pendingCancellations] =
    await Promise.all([
      db.shifts.where('syncStatus').equals('pending').toArray(),
      db.orders.where('syncStatus').equals('pending').toArray(),
      db.payments.where('syncStatus').equals('pending').toArray(),
      db.shifts.where('syncStatus').equals('closed-pending').toArray(),
      db.orders.where('syncStatus').equals('cancel-pending').toArray(),
    ]);

  if (
    pendingShifts.length === 0 &&
    pendingOrders.length === 0 &&
    pendingPayments.length === 0 &&
    pendingCloses.length === 0 &&
    pendingCancellations.length === 0
  ) {
    return { shifts: 0, orders: 0, payments: 0, shiftCloses: 0, cancellations: 0 };
  }

  // A shift that was opened AND closed while fully offline must be pushed as
  // an open first (so its orders link up server-side), then closed.
  const shiftsToOpen = [...pendingShifts, ...pendingCloses];

  const payload = {
    shifts: shiftsToOpen.map((s) => ({
      clientId: s.clientId,
      openingFloat: s.openingFloat,
      notes: s.notes,
    })),
    orders: pendingOrders.map((o) => ({
      clientId: o.clientId,
      type: o.type,
      shiftClientId: o.shiftClientId,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      deliveryAddress: o.deliveryAddress,
      notes: o.notes,
      items: o.items.map((i) => ({
        menuItemId: i.menuItemId,
        qty: i.qty,
        price: i.price,
        notes: i.notes,
      })),
    })),
    payments: pendingPayments.map((p) => ({
      clientId: p.clientId,
      orderClientId: p.orderClientId,
      method: p.method,
      amount: p.amount,
      reference: p.reference,
    })),
    shiftCloses: pendingCloses.map((c) => ({
      clientId: c.clientId,
      openingFloat: c.openingFloat,
      countedCash: c.countedCash ?? 0,
      notes: c.notes,
    })),
    cancellations: pendingCancellations.map((c) => ({ clientId: c.clientId })),
  };

  const res = await api.post<{
    shifts: Array<{ clientId: string; serverId: number }>;
    orders: Array<{ clientId: string; serverId: number; number: string }>;
    payments: Array<{ clientId: string; serverId: number }>;
    shiftCloses: Array<{ clientId: string; variance: number; expectedCash: number }>;
    cancellations: Array<{ clientId: string; serverId: number }>;
  }>('/sync/push', payload);

  await db.transaction(
    'rw',
    db.shifts,
    db.orders,
    db.payments,
    async () => {
      // Update shifts with server IDs (covers closed-pending shifts pushed as opens)
      for (const s of res.shifts) {
        const shift = await db.shifts.get(s.clientId);
        if (shift) {
          await db.shifts.update(s.clientId, { id: s.serverId, syncStatus: 'synced' });
        }
      }
      for (const o of res.orders) {
        const order = await db.orders.get(o.clientId);
        if (order) {
          await db.orders.update(o.clientId, {
            id: o.serverId,
            number: o.number,
            syncStatus: 'synced',
          });
        }
      }
      for (const p of res.payments) {
        const payment = await db.payments.get(p.clientId);
        if (!payment) continue;
        if (p.serverId) {
          await db.payments.update(p.clientId, { id: p.serverId, syncStatus: 'synced' });
        } else {
          // Server rejected this payment (e.g. exceeds remaining total) — stop
          // retrying it forever, surface it as an error state instead.
          await db.payments.update(p.clientId, { syncStatus: 'error' });
        }
      }
      for (const c of res.shiftCloses) {
        const shift = await db.shifts.get(c.clientId);
        if (shift) {
          await db.shifts.update(c.clientId, {
            syncStatus: 'synced',
            expectedCash: c.expectedCash,
            variance: c.variance,
          });
        }
      }
      for (const c of res.cancellations) {
        const order = await db.orders.get(c.clientId);
        if (order) {
          await db.orders.update(c.clientId, { id: c.serverId, syncStatus: 'synced' });
        }
      }
    },
  );

  return {
    shifts: res.shifts.length,
    orders: res.orders.length,
    payments: res.payments.length,
    shiftCloses: res.shiftCloses.length,
    cancellations: res.cancellations.length,
  };
}

export async function fullSync(): Promise<SyncResult> {
  const errors: string[] = [];
  let pulled = { categories: 0, items: 0 };
  let pushed = { shifts: 0, orders: 0, payments: 0, shiftCloses: 0, cancellations: 0 };

  try {
    pulled = await pullMenu();
  } catch (e) {
    errors.push(`pull: ${e instanceof Error ? e.message : 'failed'}`);
  }

  try {
    pushed = await pushPending();
  } catch (e) {
    errors.push(`push: ${e instanceof Error ? e.message : 'failed'}`);
  }

  return { pulled, pushed, errors };
}

export async function pendingCount(): Promise<number> {
  const [s, o, p, c, x] = await Promise.all([
    db.shifts.where('syncStatus').equals('pending').count(),
    db.orders.where('syncStatus').equals('pending').count(),
    db.payments.where('syncStatus').equals('pending').count(),
    db.shifts.where('syncStatus').equals('closed-pending').count(),
    db.orders.where('syncStatus').equals('cancel-pending').count(),
  ]);
  return s + o + p + c + x;
}
