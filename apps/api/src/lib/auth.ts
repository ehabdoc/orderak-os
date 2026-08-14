import jwt from 'jsonwebtoken';

// Fail fast in production: a known/default secret lets anyone forge tokens.
// In dev, fall back to a local-only secret so `npm run dev` works out of the box.
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET environment variable is required in production');
}
const SECRET = process.env.JWT_SECRET || 'dev-secret-do-not-use-in-prod';

export interface JwtPayload {
  userId: number;
  role: 'ADMIN' | 'CASHIER';
  name: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: '12h' });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, SECRET) as JwtPayload;
}
