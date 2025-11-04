import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createError } from './errorHandler';
import { prisma } from '../index';

export interface AuthUser {
  id: string;
  email: string;
  isAdmin: boolean;
  isPremium: boolean;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      userId?: string;
    }
  }
}

/**
 * Authentication middleware - validates JWT token
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createError('No authentication token provided', 401, 'NO_TOKEN');
    }

    const token = authHeader.substring(7);

    // Verify token
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined');
    }

    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
      isAdmin: boolean;
      isPremium: boolean;
    };

    // Check if user still exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        isAdmin: true,
        isPremium: true,
        premiumExpiresAt: true,
      },
    });

    if (!user) {
      throw createError('User not found', 401, 'USER_NOT_FOUND');
    }

    // Check premium expiration
    const isPremium = user.isPremium &&
      (!user.premiumExpiresAt || user.premiumExpiresAt > new Date());

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
      isPremium,
    };
    req.userId = user.id;

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(createError('Invalid token', 401, 'INVALID_TOKEN'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(createError('Token expired', 401, 'TOKEN_EXPIRED'));
    } else {
      next(error);
    }
  }
}

/**
 * Admin-only middleware - requires admin role
 */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return next(createError('Authentication required', 401, 'AUTH_REQUIRED'));
  }

  if (!req.user.isAdmin) {
    return next(createError('Admin access required', 403, 'ADMIN_REQUIRED'));
  }

  next();
}

/**
 * Premium-only middleware - requires premium subscription
 */
export function requirePremium(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return next(createError('Authentication required', 401, 'AUTH_REQUIRED'));
  }

  if (!req.user.isPremium) {
    return next(createError('Premium subscription required', 403, 'PREMIUM_REQUIRED'));
  }

  next();
}

/**
 * Optional auth middleware - attaches user if token is present
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const JWT_SECRET = process.env.JWT_SECRET;

      if (JWT_SECRET) {
        const decoded = jwt.verify(token, JWT_SECRET) as {
          id: string;
          email: string;
          isAdmin: boolean;
          isPremium: boolean;
        };

        const user = await prisma.user.findUnique({
          where: { id: decoded.id },
          select: {
            id: true,
            email: true,
            isAdmin: true,
            isPremium: true,
            premiumExpiresAt: true,
          },
        });

        if (user) {
          const isPremium = user.isPremium &&
            (!user.premiumExpiresAt || user.premiumExpiresAt > new Date());

          req.user = {
            id: user.id,
            email: user.email,
            isAdmin: user.isAdmin,
            isPremium,
          };
          req.userId = user.id;
        }
      }
    }

    next();
  } catch (error) {
    // Ignore errors in optional auth
    next();
  }
}
