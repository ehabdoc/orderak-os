import { describe, expect, it, vi, beforeEach } from 'vitest';

const countMock = vi.fn();
vi.mock('../src/lib/prisma.js', () => ({
  prisma: { order: { count: countMock } },
}));

const { formatOrderNumber, todayMonthDay, nextOrderNumber, createWithOrderNumber } =
  await import('../src/lib/orderNumber.js');

describe('formatOrderNumber', () => {
  it('zero-pads the sequence to 4 digits', () => {
    expect(formatOrderNumber('0814', 1)).toBe('0814-0001');
    expect(formatOrderNumber('0814', 10000)).toBe('0814-10000');
  });
});

describe('nextOrderNumber', () => {
  beforeEach(() => {
    countMock.mockReset();
    vi.useRealTimers();
  });

  it('uses today MMDD prefix with a per-day sequence', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-14T10:00:00Z'));
    countMock.mockResolvedValue(3);
    expect(await nextOrderNumber()).toBe('0814-0004');
    expect(countMock).toHaveBeenCalledTimes(1);
  });
});

describe('createWithOrderNumber', () => {
  it('retries with the next number when a P2002 collision occurs', async () => {
    const seen: string[] = [];
    let calls = 0;
    const fn = vi.fn(async (number: string) => {
      seen.push(number);
      calls += 1;
      if (calls === 1) {
        const err = new Error('unique constraint') as Error & { code?: string };
        err.code = 'P2002';
        throw err;
      }
      return { number };
    });

    const result = await createWithOrderNumber(fn);
    expect(result).toEqual({ number: expect.any(String) });
    expect(seen.length).toBe(2);
  });

  it('rethrows non-collision errors immediately', async () => {
    const boom = new Error('boom');
    const fn = vi.fn(async () => {
      throw boom;
    });
    await expect(createWithOrderNumber(fn)).rejects.toThrow('boom');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
