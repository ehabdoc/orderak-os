import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { createWithOrderNumber } from '../lib/orderNumber.js';

const router = Router();
router.use(requireAuth);

// Bulk push: client sends queued operations to push.
// Returns the server-acknowledged entities with canonical IDs.
const pushSchema = z.object({
  shifts: z
    .array(
      z.object({
        clientId: z.string(),
        openingFloat: z.number().int().nonnegative(),
        notes: z.string().optional(),
      }),
    )
    .optional(),
  orders: z
    .array(
      z.object({
        clientId: z.string(),
        type: z.enum(['DINE_IN', 'TAKEAWAY', 'DELIVERY']),
        shiftClientId: z.string().optional(),
        customerName: z.string().optional(),
        customerPhone: z.string().optional(),
        deliveryAddress: z.string().optional(),
        notes: z.string().optional(),
        items: z.array(
          z.object({
            menuItemId: z.number().int(),
            qty: z.number().int().positive(),
            price: z.number().int().nonnegative(),
            notes: z.string().optional(),
          }),
        ),
      }),
    )
    .optional(),
  payments: z
    .array(
      z.object({
        clientId: z.string(),
        orderClientId: z.string(),
        method: z.enum(['CASH', 'TRANSFER', 'WALLET', 'ATEL']),
        amount: z.number().int().positive(),
        reference: z.string().optional(),
      }),
    )
    .optional(),
  shiftCloses: z
    .array(
      z.object({
        clientId: z.string(),
        openingFloat: z.number().int().nonnegative().optional(),
        countedCash: z.number().int().nonnegative(),
        notes: z.string().optional(),
      }),
    )
    .optional(),
  cancellations: z
    .array(
      z.object({
        clientId: z.string(),
      }),
    )
    .optional(),
});

router.post('/push', async (req, res, next) => {
  try {
    const data = pushSchema.parse(req.body);
    const cashierId = req.user!.userId;

    const result: {
      shifts: Array<{ clientId: string; serverId: number; number: string }>;
      orders: Array<{ clientId: string; serverId: number; number: string; total: number }>;
      payments: Array<{ clientId: string; serverId: number }>;
      shiftCloses: Array<{ clientId: string; serverId: number; variance: number; expectedCash: number }>;
      cancellations: Array<{ clientId: string; serverId: number }>;
    } = { shifts: [], orders: [], payments: [], shiftCloses: [], cancellations: [] };

    // 1. Shifts (open)
    if (data.shifts) {
      for (const s of data.shifts) {
        const existing = await prisma.shift.findUnique({ where: { clientId: s.clientId } });
        if (existing) {
          result.shifts.push({ clientId: s.clientId, serverId: existing.id, number: String(existing.id) });
          continue;
        }
        // Every client shift gets its own server record (idempotency is handled
        // by the clientId check above). Mapping to an unrelated open shift here
        // would corrupt the offline "close A, then open B" flow.
        const created = await prisma.shift.create({
          data: {
            clientId: s.clientId,
            cashierId,
            openingFloat: s.openingFloat,
            notes: s.notes,
            status: 'OPEN',
          },
        });
        result.shifts.push({ clientId: s.clientId, serverId: created.id, number: String(created.id) });
      }
    }

    // 2. Orders
    if (data.orders) {
      for (const o of data.orders) {
        const existing = await prisma.order.findUnique({
          where: { clientId: o.clientId },
        });
        if (existing) {
          result.orders.push({
            clientId: o.clientId,
            serverId: existing.id,
            number: existing.number,
            total: existing.total,
          });
          continue;
        }
        // Lookup shift serverId by clientId
        let shiftId: number | undefined;
        if (o.shiftClientId) {
          const shift = await prisma.shift.findUnique({ where: { clientId: o.shiftClientId } });
          shiftId = shift?.id;
        }
        const subtotal = o.items.reduce((s, i) => s + i.price * i.qty, 0);
        const created = await createWithOrderNumber((number) =>
          prisma.order.create({
            data: {
              clientId: o.clientId,
              number,
              type: o.type,
              status: 'OPEN',
              subtotal,
              total: subtotal,
              customerName: o.customerName,
              customerPhone: o.customerPhone,
              deliveryAddress: o.deliveryAddress,
              notes: o.notes,
              cashierId,
              shiftId,
              items: {
                create: o.items.map((i) => ({
                  menuItemId: i.menuItemId,
                  qty: i.qty,
                  price: i.price,
                  notes: i.notes,
                })),
              },
            },
          }),
        );
        result.orders.push({
          clientId: o.clientId,
          serverId: created.id,
          number: created.number,
          total: created.total,
        });
      }
    }

    // 3. Payments (idempotent on clientId)
    if (data.payments) {
      for (const p of data.payments) {
        const existing = await prisma.payment.findUnique({ where: { clientId: p.clientId } });
        if (existing) {
          result.payments.push({ clientId: p.clientId, serverId: existing.id });
          continue;
        }
        const order = await prisma.order.findUnique({
          where: { clientId: p.orderClientId },
          include: { payments: true },
        });
        if (!order) {
          result.payments.push({ clientId: p.clientId, serverId: 0 });
          continue;
        }
        const paid = order.payments.reduce((s, x) => s + x.amount, 0);
        if (paid + p.amount > order.total) {
          result.payments.push({ clientId: p.clientId, serverId: 0 });
          continue;
        }
        const created = await prisma.payment.create({
          data: {
            clientId: p.clientId,
            orderId: order.id,
            method: p.method,
            amount: p.amount,
            reference: p.reference,
          },
        });
        const newTotal = paid + p.amount;
        if (newTotal >= order.total && order.status !== 'PAID') {
          await prisma.order.update({
            where: { id: order.id },
            data: { status: 'PAID', closedAt: new Date() },
          });
        }
        result.payments.push({ clientId: p.clientId, serverId: created.id });
      }
    }

    // 4. Order cancellations
    if (data.cancellations) {
      for (const c of data.cancellations) {
        const order = await prisma.order.findUnique({ where: { clientId: c.clientId } });
        if (!order || order.status === 'CANCELLED') {
          if (order) result.cancellations.push({ clientId: c.clientId, serverId: order.id });
          continue;
        }
        const updated = await prisma.order.update({
          where: { id: order.id },
          data: { status: 'CANCELLED', closedAt: new Date() },
        });
        result.cancellations.push({ clientId: c.clientId, serverId: updated.id });
      }
    }

    // 5. Shift closes
    if (data.shiftCloses) {
      for (const c of data.shiftCloses) {
        let shift = await prisma.shift.findUnique({
          where: { clientId: c.clientId },
          include: { orders: { include: { payments: true } } },
        });
        if (!shift) {
          // Shift was opened AND closed while fully offline — it never reached
          // the server. Create it (as OPEN) so its orders link up and the
          // close can be applied instead of silently dropping the shift.
          const created = await prisma.shift.create({
            data: {
              clientId: c.clientId,
              cashierId,
              openingFloat: c.openingFloat ?? 0,
              notes: c.notes,
              status: 'OPEN',
            },
          });
          shift = await prisma.shift.findUnique({
            where: { id: created.id },
            include: { orders: { include: { payments: true } } },
          });
          if (!shift) continue;
        }
        if (shift.status === 'CLOSED') {
          result.shiftCloses.push({
            clientId: c.clientId,
            serverId: shift.id,
            variance: shift.variance ?? 0,
            expectedCash: shift.expectedCash ?? 0,
          });
          continue;
        }
        const cashPaid = shift.orders.reduce((s, o) => {
          if (o.status !== 'PAID') return s;
          return s + o.payments.filter((p) => p.method === 'CASH').reduce((ss, p) => ss + p.amount, 0);
        }, 0);
        const expectedCash = shift.openingFloat + cashPaid;
        const variance = c.countedCash - expectedCash;
        await prisma.shift.update({
          where: { id: shift.id },
          data: {
            status: 'CLOSED',
            countedCash: c.countedCash,
            expectedCash,
            variance,
            closedAt: new Date(),
            notes: c.notes ?? shift.notes,
          },
        });
        result.shiftCloses.push({
          clientId: c.clientId,
          serverId: shift.id,
          variance,
          expectedCash,
        });
      }
    }

    res.json(result);
  } catch (e) {
    next(e);
  }
});

// Bulk pull: client requests menu/categories deltas
router.get('/pull', async (req, res, next) => {
  try {
    const since = req.query.since ? new Date(String(req.query.since)) : new Date(0);
    const [categories, items] = await Promise.all([
      prisma.category.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.menuItem.findMany({
        where: { updatedAt: { gt: since } },
        include: { category: { select: { id: true, name: true } } },
      }),
    ]);
    res.json({ categories, items, serverTime: new Date().toISOString() });
  } catch (e) {
    next(e);
  }
});

export default router;
