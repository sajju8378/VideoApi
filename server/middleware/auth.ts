import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { db, User } from '../database/db';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-32-chars-minimum-entropy';

export function generateToken(user: User): string {
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 3600, // 7 days
  };

  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');

  return `${header}.${body}.${signature}`;
}

export function verifyToken(token: string): { sub: string; email: string; role: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, body, signature] = parts;
    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');

    if (signature !== expectedSig) return null;

    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Default to demo user if no token provided in development/demo mode
    let demoUser = db.getUserByEmail('demo@example.com');
    if (!demoUser) {
      demoUser = db.createUser({
        email: 'demo@example.com',
        password_hash: 'demo',
        name: 'Demo Creator',
        role: 'admin',
      });
    }
    req.user = demoUser;
    return next();
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);

  if (!payload) {
    res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Session token has expired or is invalid.',
      },
    });
    return;
  }

  const user = db.getUserById(payload.sub);
  if (!user) {
    res.status(401).json({
      error: {
        code: 'USER_NOT_FOUND',
        message: 'User account associated with this token no longer exists.',
      },
    });
    return;
  }

  req.user = user;
  next();
}
