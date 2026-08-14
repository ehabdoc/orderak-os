import { describe, expect, it, vi, beforeEach } from 'vitest';

const orderGet = vi.fn();
const orderUpdate = vi.fn();
const fullSync = vi.fn();

vi.mock('../db/dexie', () => ({
  db: {
    orders: { get: orderGet, update: orderUpdate },
    shifts: {},
    payments: {},
    categories: {},
    menuItems: {},
    meta: {},
  },
}));

vi.mock('../db/sync', () => ({ fullSync }));

const { cancelOrder } = await import('./orders');

describe('cancelOrder', () => {
  beforeEach(() => {
    orderGet.mockReset();
    orderUpdate.mockReset();
    fullSync.mockReset();
    fullSync.mockResolvedValue(undefined);
  });

  it('drops never-synced orders from the queue instead of pushing them', async () => {
    orderGet.mockResolvedValue({ clientId: 'x', status: 'OPEN', syncStatus: 'pending' });
    await cancelOrder('x');
    expect(orderUpdate).toHaveBeenCalledWith('x', {
      status: 'CANCELLED',
      closedAt: expect.any(String),
      syncStatus: 'synced', // removed from the push queue — no ghost order server-side
    });
    expect(fullSync).not.toHaveBeenCalled();
  });

  it('queues a cancel push for orders that already reached the server', async () => {
    orderGet.mockResolvedValue({ clientId: 'x', id: 5, status: 'OPEN', syncStatus: 'synced' });
    await cancelOrder('x');
    expect(orderUpdate).toHaveBeenCalledWith('x', {
      status: 'CANCELLED',
      closedAt: expect.any(String),
      syncStatus: 'cancel-pending',
    });
    expect(fullSync).toHaveBeenCalled();
  });

  it('is a no-op for already-cancelled orders', async () => {
    orderGet.mockResolvedValue({ clientId: 'x', status: 'CANCELLED', syncStatus: 'synced' });
    await cancelOrder('x');
    expect(orderUpdate).not.toHaveBeenCalled();
  });
});
