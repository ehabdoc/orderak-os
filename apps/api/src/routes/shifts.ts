import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { parseId } from '../lib/http.js';

const router = Router();
router.use(requireAuth);

const openSchema = z.object({
  clientId: z.string().min(1),
  openingFloat: z.number().int().nonnegative().default(0),
  notes: z.string().optional(),
});

const closeSchema = z.object({
  countedCash: z.number().int().nonnegative(),
  notes: z.string().optional(),
});

// Get current open shift for this cashier (if any)
router.get('/current', async (req, res, next) => {
  try {
    const shift = await prisma.shift.findFirst({
      where: { cashierId: req.user!.userId, status: 'OPEN' },
      include: { orders: { include: { payments: true } } },
      orderBy: { openedAt: 'desc' },
    });
    res.json(shift);
  } catch (e) {
    next(e);
  }
});

// Open shift (idempotent on clientId)
router.post('/open', async (req, res, next) => {
  try {
    const data = openSchema.parse(req.body);
    const cashierId = req.user!.userId;

    const existing = await prisma.shift.findUnique({
      where: { clientId: data.clientId },
    });
    if (existing) {
      return res.json(await prisma.shift.findUnique({
        where: { id: existing.id },
        include: { orders: { include: { payments: true } } },
      }));
    }

    // Reject if there's another open shift for this cashier
    const open = await prisma.shift.findFirst({
      where: { cashierId, status: 'OPEN' },
    });
    if (open) {
      return res.status(409).json({ error: 'لديك وردية مفتوحة بالفعل' });
    }

    const shift = await prisma.shift.create({
      data: {
        clientId: data.clientId,
        cashierId,
        openingFloat: data.openingFloat,
        notes: data.notes,
        status: 'OPEN',
      },
    });
    res.status(201).json(shift);
  } catch (e) {
    next(e);
  }
});

// Close shift
router.post('/:id/close', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(404).json({ error: 'الوردية غير موجودة' });
    const data = closeSchema.parse(req.body);

    const shift = await prisma.shift.findUnique({
      where: { id },
      include: { orders: { include: { payments: true } } },
    });
    if (!shift) return res.status(404).json({ error: 'الوردية غير موجودة' });
    if (shift.status === 'CLOSED') {
      return res.status(409).json({ error: 'الوردية مقفلة بالفعل' });
    }

    // Expected cash = opening float + sum of CASH payments on PAID orders
    const cashPaid = shift.orders.reduce((s, o) => {
      if (o.status !== 'PAID') return s;
      return s + o.payments.filter((p) => p.method === 'CASH').reduce((ss, p) => ss + p.amount, 0);
    }, 0);
    const expectedCash = shift.openingFloat + cashPaid;
    const variance = data.countedCash - expectedCash;

    const closed = await prisma.shift.update({
      where: { id },
      data: {
        status: 'CLOSED',
        countedCash: data.countedCash,
        expectedCash,
        variance,
        closedAt: new Date(),
        notes: data.notes ?? shift.notes,
      },
    });
    res.json({ shift: closed, expectedCash, variance });
  } catch (e) {
    next(e);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(404).json({ error: 'الوردية غير موجودة' });
    const shift = await prisma.shift.findUnique({
      where: { id },
      include: { orders: { include: { payments: true } } },
    });
    if (!shift) return res.status(404).json({ error: 'الوردية غير موجودة' });
    res.json(shift);
  } catch (e) {
    next(e);
  }
});

export default router;
