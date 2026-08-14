import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { signToken } from '../lib/auth.js';
import {
  isLoginAllowed,
  recordLoginFailure,
  recordLoginSuccess,
  retryAfterSeconds,
} from '../lib/rateLimit.js';

const router = Router();

const loginSchema = z.object({
  pin: z.string().min(4).max(6),
});

function clientIp(req: { ip?: string }): string {
  // Behind nginx/Coolify use X-Forwarded-For if present
  return req.ip || 'unknown';
}

router.post('/login', async (req, res, next) => {
  try {
    const ip = clientIp(req);
    if (!isLoginAllowed(ip)) {
      res.setHeader('Retry-After', String(retryAfterSeconds(ip)));
      return res.status(429).json({
        error: 'محاولات كثيرة — حاول لاحقاً',
      });
    }

    const { pin } = loginSchema.parse(req.body);
    const users = await prisma.user.findMany({ where: { active: true } });
    for (const user of users) {
      const ok = await bcrypt.compare(pin, user.pin);
      if (ok) {
        recordLoginSuccess(ip);
        const token = signToken({
          userId: user.id,
          role: user.role as 'ADMIN' | 'CASHIER',
          name: user.name,
        });
        return res.json({
          token,
          user: { id: user.id, name: user.name, role: user.role },
        });
      }
    }
    recordLoginFailure(ip);
    res.status(401).json({ error: 'رمز PIN غير صحيح' });
  } catch (e) {
    next(e);
  }
});

router.get('/me', async (req, res) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).end();
  const { verifyToken } = await import('../lib/auth.js');
  try {
    const payload = verifyToken(header.slice(7));
    res.json({ user: payload });
  } catch {
    res.status(401).end();
  }
});

export default router;
