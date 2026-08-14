import { prisma } from './prisma.js';

export function formatOrderNumber(monthDay: string, seq: number): string {
  return `${monthDay}-${String(seq).padStart(4, '0')}`;
}

export function todayMonthDay(): string {
  const d = new Date();
  return `${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

function isUniqueViolation(e: unknown): boolean {
  return (
    typeof e === 'object' &&
    e !== null &&
    (e as { code?: string }).code === 'P2002'
  );
}

// Human-readable, globally-unique order number: "0814-0001" (MMDD + per-day
// sequence). Counting today's orders avoids the random-collision 500s; the
// date prefix keeps numbers unique across days.
export async function nextOrderNumber(): Promise<string> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const count = await prisma.order.count({
    where: { createdAt: { gte: startOfDay } },
  });
  return formatOrderNumber(todayMonthDay(), count + 1);
}

// Runs `fn` with a fresh candidate number, retrying with the next sequence
// number if a concurrent create wins the race (P2002 on `number`).
export async function createWithOrderNumber<T>(
  fn: (number: string) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      return await fn(await nextOrderNumber());
    } catch (e) {
      if (isUniqueViolation(e) && attempt < 9) continue;
      throw e;
    }
  }
  throw new Error('unreachable');
}
