import { describe, expect, it, vi, beforeEach } from 'vitest';

const apiPost = vi.fn();

vi.mock('../lib/api', () => ({ api: { post: apiPost } }));

// ---- Fake Dexie tables keyed by clientId ----
const shiftRows = new Map<string, any>();
const orderRows = new Map<string, any>();
const paymentRows = new Map<string, any>();

function table(map: Map<string, any>) {
  return {
    where: () => ({
      equals: (status: string) => ({
        toArray: async () => [...map.values()].filter((r) => r.syncStatus === status),
      }),
    }),
    get: async (id: string) => map.get(id),
    update: async (id: string, patch: any) => {
      const cur = map.get(id);
      if (cur) map.set(id, { ...cur, ...patch });
    },
  };
}

vi.mock('./dexie', () => ({
  db: {
    shifts: table(shiftRows),
    orders: table(orderRows),
    payments: table(paymentRows),
    categories: {},
    menuItems: {},
    meta: {},
    transaction: async (_mode: string, ...args: any[]) => {
      const cb = args[args.length - 1];
      return cb();
    },
  },
  getMeta: vi.fn(async () => null),
  setMeta: vi.fn(),
}));

const { pushPending } = await import('./sync');

describe('pushPending', () => {
  beforeEach(() => {
    shiftRows.clear();
    orderRows.clear();
    paymentRows.clear();
    apiPost.mockReset();
  });

  it('pushes a closed-pending shift as open AND close so it is never lost', async () => {
    shiftRows.set('s1', {
      clientId: 's1',
      openingFloat: 5000,
      countedCash: 30000,
      syncStatus: 'closed-pending',
    });
    apiPost.mockResolvedValue({
      shifts: [{ clientId: 's1', serverId: 7 }],
      orders: [],
      payments: [],
      shiftCloses: [{ clientId: 's1', variance: 0, expectedCash: 30000 }],
      cancellations: [],
    });

    const result = await pushPending();

    const payload = apiPost.mock.calls[0][1];
    // opened AND closed in the same request
    expect(payload.shifts).toContainEqual({ clientId: 's1', openingFloat: 5000, notes: undefined });
    expect(payload.shiftCloses).toContainEqual({
      clientId: 's1',
      openingFloat: 5000,
      countedCash: 30000,
      notes: undefined,
    });

    expect(result.shiftCloses).toBe(1);
    expect(shiftRows.get('s1')).toMatchObject({ syncStatus: 'synced', expectedCash: 30000 });
  });

  it('pushes cancelled orders as cancellations, not as new orders', async () => {
    orderRows.set('o1', { clientId: 'o1', syncStatus: 'cancel-pending' });
    apiPost.mockResolvedValue({
      shifts: [],
      orders: [],
      payments: [],
      shiftCloses: [],
      cancellations: [{ clientId: 'o1', serverId: 2 }],
    });

    await pushPending();

    const payload = apiPost.mock.calls[0][1];
    expect(payload.orders).toEqual([]); // never re-created as OPEN
    expect(payload.cancellations).toEqual([{ clientId: 'o1' }]);
    expect(orderRows.get('o1').syncStatus).toBe('synced');
  });

  it('marks server-rejected payments as error instead of retrying forever', async () => {
    paymentRows.set('p1', { clientId: 'p1', syncStatus: 'pending' });
    apiPost.mockResolvedValue({
      shifts: [],
      orders: [],
      payments: [{ clientId: 'p1', serverId: 0 }], // overpay → rejected
      shiftCloses: [],
      cancellations: [],
    });

    await pushPending();

    expect(paymentRows.get('p1').syncStatus).toBe('error');
    expect(paymentRows.get('p1').id).toBeUndefined();
  });

  it('skips the network call when the queue is empty', async () => {
    const result = await pushPending();
    expect(apiPost).not.toHaveBeenCalled();
    expect(result).toEqual({ shifts: 0, orders: 0, payments: 0, shiftCloses: 0, cancellations: 0 });
  });
});
