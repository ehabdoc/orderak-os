import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { parseId } from '../lib/http.js';

const router = Router();
router.use(requireAuth);

const itemSchema = z.object({
  categoryId: z.number().int(),
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().int().nonnegative(),
  cost: z.number().int().nonnegative().optional(),
  active: z.boolean().optional(),
});

const bulkAdjustSchema = z.object({
  percent: z.number().int().min(-100).max(1000),
  categoryId: z.number().int().optional(), // limit to category
  itemIds: z.array(z.number().int()).optional(), // or specific items
});

router.get('/', async (req, res, next) => {
  try {
    const { categoryId, active } = req.query;
    const items = await prisma.menuItem.findMany({
      where: {
        ...(categoryId ? { categoryId: Number(categoryId) } : {}),
        ...(active === 'true' ? { active: true } : {}),
      },
      orderBy: { name: 'asc' },
      include: { category: { select: { id: true, name: true } } },
    });
    res.json(items);
  } catch (e) {
    next(e);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(404).json({ error: 'الصنف غير موجود' });
    const item = await prisma.menuItem.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!item) return res.status(404).json({ error: 'الصنف غير موجود' });
    res.json(item);
  } catch (e) {
    next(e);
  }
});

// Mutations are allowed for all staff (admin + cashier) so items
// and prices can be added/changed from the cashier device at any time.
router.post('/', async (req, res, next) => {
  try {
    const data = itemSchema.parse(req.body);
    const item = await prisma.menuItem.create({
      data: { ...data, version: 1 },
      include: { category: true },
    });
    res.status(201).json(item);
  } catch (e) {
    next(e);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(404).json({ error: 'الصنف غير موجود' });
    const data = itemSchema.partial().parse(req.body);
    const item = await prisma.menuItem.update({
      where: { id },
      data: { ...data, version: { increment: 1 } },
      include: { category: true },
    });
    res.json(item);
  } catch (e) {
    next(e);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(404).json({ error: 'الصنف غير موجود' });
    await prisma.menuItem.delete({ where: { id } });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

// Bulk price adjustment (matches mockup 04: +5% / +10% / +15% / +20%)
router.post('/bulk-adjust', async (req, res, next) => {
  try {
    const { percent, categoryId, itemIds } = bulkAdjustSchema.parse(req.body);
    const where = {
      ...(categoryId ? { categoryId } : {}),
      ...(itemIds ? { id: { in: itemIds } } : {}),
    };
    const items = await prisma.menuItem.findMany({ where });
    const updates = await prisma.$transaction(
      items.map((item) => {
        const factor = 1 + percent / 100;
        const newPrice = Math.round(item.price * factor / 100) * 100; // round to nearest 100
        return prisma.menuItem.update({
          where: { id: item.id },
          data: { price: newPrice, version: { increment: 1 } },
        });
      }),
    );
    res.json({ updated: updates.length, percent });
  } catch (e) {
    next(e);
  }
});

export default router;
