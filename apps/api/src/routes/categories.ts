import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { parseId } from '../lib/http.js';

const router = Router();
router.use(requireAuth);

const categorySchema = z.object({
  name: z.string().min(1),
  icon: z.string().optional(),
  sortOrder: z.number().int().optional(),
  active: z.boolean().optional(),
});

router.get('/', async (_req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { items: true } } },
    });
    res.json(categories);
  } catch (e) {
    next(e);
  }
});

// Mutations are allowed for all staff (admin + cashier) so the menu
// and prices can be managed from the cashier device at any time.
router.post('/', async (req, res, next) => {
  try {
    const data = categorySchema.parse(req.body);
    const category = await prisma.category.create({ data });
    res.status(201).json(category);
  } catch (e) {
    next(e);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(404).json({ error: 'القسم غير موجود' });
    const data = categorySchema.partial().parse(req.body);
    const category = await prisma.category.update({ where: { id }, data });
    res.json(category);
  } catch (e) {
    next(e);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(404).json({ error: 'القسم غير موجود' });
    await prisma.category.delete({ where: { id } });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

export default router;
