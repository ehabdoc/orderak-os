import { v4 as uuid } from 'uuid';
import type { Collection } from 'dexie';
import { db } from '../db/dexie';
import { fullSync } from '../db/sync';
import type { Order, OrderItem, Payment, PaymentMethod, Shift } from '../types';

// ============== SHIFTS ==============

export async function getActiveShift(cashierId?: number): Promise<Shift | undefined> {
  let q: Collection<Shift, string> = db.shifts.where('status').equals('OPEN');
  // Only this cashier's shift — cashiers on the same device don't share one.
  if (cashierId !== undefined) q = q.filter((s) => s.cashierId === cashierId);
  return q.first();
}

export async function openShift(openingFloat: number, cashierId: number): Promise<Shift> {
  const existing = await getActiveShift();
  if (existing) return existing;

  const shift: Shift = {
    clientId: uuid(),
    cashierId,
    openedAt: new Date().toISOString(),
    openingFloat,
    status: 'OPEN',
    syncStatus: 'pending',
  };
  await db.shifts.add(shift);
  fullSync().catch(() => {});
  return shift;
}

export async function closeShift(countedCash: number, notes?: string): Promise<Shift | undefined> {
  const shift = await getActiveShift();
  if (!shift) return undefined;

  // Compute expected cash locally (cash payments on paid orders)
  const orders = await db.orders.where('shiftClientId').equals(shift.clientId).toArray();
  let cashPaid = 0;
  for (const o of orders) {
    if (o.status !== 'PAID') continue;
    const payments = await db.payments.where('orderClientId').equals(o.clientId).toArray();
    cashPaid += payments
      .filter((p) => p.method === 'CASH')
      .reduce((s, p) => s + p.amount, 0);
  }
  const expectedCash = shift.openingFloat + cashPaid;
  const variance = countedCash - expectedCash;

  const updated: Shift = {
    ...shift,
    closedAt: new Date().toISOString(),
    countedCash,
    expectedCash,
    variance,
    status: 'CLOSED',
    notes,
    syncStatus: 'closed-pending',
  };
  await db.shifts.put(updated);
  fullSync().catch(() => {});
  return updated;
}

// ============== ORDERS ==============

export async function createOrder(input: {
  type: Order['type'];
  shiftClientId?: string;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  notes?: string;
  items: OrderItem[];
  cashierId: number;
}): Promise<Order> {
  const subtotal = input.items.reduce((s, i) => s + i.price * i.qty, 0);
  const order: Order = {
    clientId: uuid(),
    type: input.type,
    status: 'OPEN',
    subtotal,
    total: subtotal,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    deliveryAddress: input.deliveryAddress,
    notes: input.notes,
    shiftClientId: input.shiftClientId,
    cashierId: input.cashierId,
    items: input.items,
    payments: [],
    createdAt: new Date().toISOString(),
    syncStatus: 'pending',
  };
  await db.orders.add(order);
  fullSync().catch(() => {});
  return order;
}

export async function cancelOrder(clientId: string) {
  const order = await db.orders.get(clientId);
  if (!order || order.status === 'CANCELLED') return;

  // If the order was already pushed to the server (or is being retried), we
  // must sync the cancellation. If it never left the device, drop it from the
  // queue entirely so no ghost OPEN order ever gets created server-side.
  const wasSynced = !!order.id || order.syncStatus === 'synced' || order.syncStatus === 'failed';
  await db.orders.update(clientId, {
    status: 'CANCELLED',
    closedAt: new Date().toISOString(),
    syncStatus: wasSynced ? 'cancel-pending' : 'synced',
  });
  if (wasSynced) fullSync().catch(() => {});
}

export async function getOrder(clientId: string): Promise<Order | undefined> {
  return db.orders.get(clientId);
}

export async function listOpenOrders(): Promise<Order[]> {
  const all = await db.orders.toArray();
  return all
    .filter((o) => o.status === 'OPEN')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listOrdersForShift(shiftClientId: string): Promise<Order[]> {
  const orders = await db.orders.where('shiftClientId').equals(shiftClientId).toArray();
  return orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ============== PAYMENTS ==============

export async function addPayment(input: {
  orderClientId: string;
  method: PaymentMethod;
  amount: number;
  reference?: string;
}): Promise<Payment> {
  const payment: Payment = {
    clientId: uuid(),
    orderClientId: input.orderClientId,
    method: input.method,
    amount: input.amount,
    reference: input.reference,
    createdAt: new Date().toISOString(),
    syncStatus: 'pending',
  };
  await db.payments.add(payment);

  // Auto-close order if total payments >= order total
  const order = await db.orders.get(input.orderClientId);
  if (order) {
    const all = await db.payments.where('orderClientId').equals(input.orderClientId).toArray();
    const paid = all.reduce((s, p) => s + p.amount, 0);
    if (paid >= order.total) {
      await db.orders.update(input.orderClientId, {
        status: 'PAID',
        closedAt: new Date().toISOString(),
      });
    }
  }

  fullSync().catch(() => {});
  return payment;
}

export async function listPayments(orderClientId: string): Promise<Payment[]> {
  return db.payments.where('orderClientId').equals(orderClientId).toArray();
}

export async function paidTotal(orderClientId: string): Promise<number> {
  const payments = await listPayments(orderClientId);
  return payments.reduce((s, p) => s + p.amount, 0);
}
