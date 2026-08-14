import { describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { errorHandler } from '../src/middleware/error.js';

function mockRes() {
  const res: any = {
    statusCode: 200,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(body: unknown) {
      res.body = body;
      return res;
    },
  };
  return res;
}

describe('errorHandler', () => {
  it('returns 400 with validation details for Zod errors', () => {
    const res = mockRes();
    const err = new ZodError([{ code: 'custom', path: ['pin'], message: 'too short' }]);
    errorHandler(err, {} as any, res, vi.fn());
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('بيانات غير صحيحة');
  });

  it('maps Prisma P2025 to 404', () => {
    const res = mockRes();
    errorHandler(new Prisma.PrismaClientKnownRequestError('nope', { code: 'P2025', clientVersion: '5' }), {} as any, res, vi.fn());
    expect(res.statusCode).toBe(404);
  });

  it('maps Prisma P2003 (FK violation) to 409', () => {
    const res = mockRes();
    errorHandler(new Prisma.PrismaClientKnownRequestError('fk', { code: 'P2003', clientVersion: '5' }), {} as any, res, vi.fn());
    expect(res.statusCode).toBe(409);
  });

  it('never leaks internal messages on 500', () => {
    const res = mockRes();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    errorHandler(new Error('SELECT * FROM users -- secret internal detail'), {} as any, res, vi.fn());
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('خطأ داخلي في الخادم');
    expect(JSON.stringify(res.body)).not.toContain('SELECT');
    consoleSpy.mockRestore();
  });
});
