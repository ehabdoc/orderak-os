import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'بيانات غير صحيحة',
      details: err.errors,
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2025': // record not found
        return res.status(404).json({ error: 'السجل غير موجود' });
      case 'P2002': // unique constraint
        return res.status(409).json({ error: 'سجل مكرر — البيانات موجودة بالفعل' });
      case 'P2003': // FK constraint (e.g. delete a category that still has items)
        return res.status(409).json({ error: 'لا يمكن الحذف — السجل مرتبط ببيانات أخرى' });
      default:
        break;
    }
  }

  // Never leak internal messages (Prisma/stack traces) to the client.
  console.error('[error]', err);
  res.status(500).json({ error: 'خطأ داخلي في الخادم' });
}
