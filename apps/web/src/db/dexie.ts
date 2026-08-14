import Dexie, { Table } from 'dexie';
import type { Category, MenuItem, Order, Payment, Shift } from '../types';

export class OrderakDB extends Dexie {
  categories!: Table<Category, number>;
  menuItems!: Table<MenuItem, number>;
  orders!: Table<Order, string>; // clientId is the PK
  payments!: Table<Payment, string>; // clientId is the PK
  shifts!: Table<Shift, string>; // clientId is the PK
  meta!: Table<{ key: string; value: string }, string>;

  constructor() {
    super('orderak');
    this.version(1).stores({
      categories: 'id, name, sortOrder, active',
      menuItems: 'id, categoryId, name, active, version',
      orders: 'clientId, status, type, shiftClientId, syncStatus, createdAt',
      payments: 'clientId, orderClientId, syncStatus, createdAt',
      shifts: 'clientId, status, cashierId, syncStatus',
      meta: 'key',
    });
  }
}

export const db = new OrderakDB();

export async function getMeta(key: string): Promise<string | null> {
  const row = await db.meta.get(key);
  return row?.value ?? null;
}

export async function setMeta(key: string, value: string) {
  await db.meta.put({ key, value });
}
