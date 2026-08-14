export interface User {
  id: number;
  name: string;
  role: 'ADMIN' | 'CASHIER';
}

export interface Category {
  id: number;
  name: string;
  icon?: string | null;
  sortOrder: number;
  active: boolean;
  _count?: { items: number };
}

export interface MenuItem {
  id: number;
  categoryId: number;
  name: string;
  description?: string | null;
  price: number;
  cost: number;
  active: boolean;
  version: number;
  category?: { id: number; name: string };
}

export type OrderType = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
export type OrderStatus = 'OPEN' | 'PAID' | 'CANCELLED';
export type PaymentMethod = 'CASH' | 'TRANSFER' | 'WALLET' | 'ATEL';
export type SyncStatus =
  | 'pending'
  | 'syncing'
  | 'synced'
  | 'failed'
  | 'closed-pending' // shift closed locally before its open ever synced
  | 'cancel-pending' // order was synced, then cancelled locally — needs a cancel push
  | 'error'; // server rejected the op (e.g. overpay) — stop retrying

export interface OrderItem {
  id?: number;
  menuItemId: number;
  name: string;
  qty: number;
  price: number;
  notes?: string;
}

export interface Payment {
  id?: number;
  clientId: string; // local UUID
  orderClientId: string;
  method: PaymentMethod;
  amount: number;
  reference?: string;
  createdAt: string;
  syncStatus: SyncStatus;
}

export interface Order {
  id?: number;
  clientId: string; // local UUID
  number?: string; // server-assigned, after sync
  type: OrderType;
  status: OrderStatus;
  subtotal: number;
  total: number;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  notes?: string;
  shiftClientId?: string;
  cashierId: number;
  createdAt: string;
  closedAt?: string;
  items: OrderItem[];
  payments: Payment[];
  syncStatus: SyncStatus;
}

export interface Shift {
  id?: number;
  clientId: string;
  cashierId: number;
  openedAt: string;
  closedAt?: string;
  openingFloat: number;
  countedCash?: number;
  expectedCash?: number;
  variance?: number;
  status: 'OPEN' | 'CLOSED';
  notes?: string;
  syncStatus: SyncStatus;
}

