import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { createWithOrderNumber } from '../lib/orderNumber.js';
import { parseId } from '../lib/http.js';

const router = Router();
router.use(requireAuth);

const itemSchema = z.object({
  menuItemId: z.number().int(),
  qty: z.number().int().positive(),
  price: z.number().int().nonnegative(),
  notes: z.string().optional(),
});

const orderSchema = z.object({
  clientId: z.string().min(1),
  type: z.enum(['DINE_IN', 'TAKEAWAY', 'DELIVERY']),
  shiftId: z.number().int().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  deliveryAddress: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1),
});

const paymentSchema = z.object({
  orderClientId: z.string(),
  clientId: z.string().optional(), // offline-first idempotency
  method: z.enum(['CASH', 'TRANSFER', 'WALLET', 'ATEL']),
  amount: z.number().int().positive(),
  reference: z.string().optional(),
});

router.get('/', async (req, res, next) => {
  try {
    const { status, shiftId } = req.query;
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 1000);
    const skip = Math.max(Number(req.query.skip) || 0, 0);
    const orders = await prisma.order.findMany({
      where: {
        ...(status ? { status: String(status) } : {}),
        ...(shiftId ? { shiftId: Number(shiftId) } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        items: { include: { menuItem: { select: { name: true } } } },
        payments: true,
      },
      take: limit,
      skip,
    });
    res.json(orders);
  } catch (e) {
    next(e);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(404).json({ error: 'الطلب غير موجود' });
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { menuItem: true } },
        payments: true,
      },
    });
    if (!order) return res.status(404).json({ error: 'الطلب غير موجود' });
    res.json(order);
  } catch (e) {
    next(e);
  }
});

// Create order (idempotent on clientId)
router.post('/', async (req, res, next) => {
  try {
    const data = orderSchema.parse(req.body);
    const cashierId = req.user!.userId;

    // Idempotency: if clientId already exists, return existing order
    const existing = await prisma.order.findUnique({
      where: { clientId: data.clientId },
      include: { items: true, payments: true },
    });
    if (existing) return res.json(existing);

    const subtotal = data.items.reduce((s, i) => s + i.price * i.qty, 0);
    const total = subtotal; // no tax/discount for now

    const order = await createWithOrderNumber((number) =>
      prisma.order.create({
        data: {
          clientId: data.clientId,
          number,
          type: data.type,
          status: 'OPEN',
          subtotal,
          total,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          deliveryAddress: data.deliveryAddress,
          notes: data.notes,
          cashierId,
          shiftId: data.shiftId,
          items: {
            create: data.items.map((i) => ({
              menuItemId: i.menuItemId,
              qty: i.qty,
              price: i.price,
              notes: i.notes,
            })),
          },
        },
        include: { items: true, payments: true },
      }),
    );
    res.status(201).json(order);
  } catch (e) {
    next(e);
  }
});

// Add payment to order (used by payment screen)
router.post('/:id/payments', async (req, res, next) => {
  try {
    const orderId = parseId(req.params.id);
    if (!orderId) return res.status(404).json({ error: 'الطلب غير موجود' });
    const data = paymentSchema.parse(req.body);

    // Idempotent on clientId: a retried push returns the original payment
    if (data.clientId) {
      const dup = await prisma.payment.findUnique({ where: { clientId: data.clientId } });
      if (dup) {
        return res.status(201).json({ payment: dup, fullyPaid: true });
      }
    }

    // Order can be referenced by clientId (offline-first) or numeric id
    const order = await prisma.order.findFirst({
      where: { OR: [{ clientId: data.orderClientId }, { id: orderId }] },
      include: { payments: true },
    });
    if (!order) return res.status(404).json({ error: 'الطلب غير موجود' });

    const paid = order.payments.reduce((s, p) => s + p.amount, 0);
    if (paid + data.amount > order.total) {
      return res.status(400).json({ error: 'المبلغ أكبر من المتبقي' });
    }

    const payment = await prisma.payment.create({
      data: {
        clientId: data.clientId,
        orderId: order.id,
        method: data.method,
        amount: data.amount,
        reference: data.reference,
      },
    });

    const newTotal = paid + data.amount;
    const isFullyPaid = newTotal >= order.total;
    if (isFullyPaid && order.status !== 'PAID') {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'PAID', closedAt: new Date() },
      });
    }

    res.status(201).json({ payment, fullyPaid: isFullyPaid });
  } catch (e) {
    next(e);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(404).json({ error: 'الطلب غير موجود' });
    const data = z
      .object({
        status: z.enum(['OPEN', 'PAID', 'CANCELLED']).optional(),
        notes: z.string().optional(),
      })
      .parse(req.body);
    const order = await prisma.order.update({
      where: { id },
      data: {
        ...data,
        ...(data.status === 'CANCELLED' ? { closedAt: new Date() } : {}),
      },
    });
    res.json(order);
  } catch (e) {
    next(e);
  }
});

export default router;
