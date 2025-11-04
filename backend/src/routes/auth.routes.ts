/**
 * Authentication Routes
 *
 * Handles user registration, login, and token management.
 */

import express, { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../index';
import { generateToken } from '../utils/jwt';
import { authMiddleware } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import logger from '../utils/logger';

const router = express.Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password too long'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

// ============================================================================
// ROUTES
// ============================================================================

/**
 * POST /api/v1/auth/register
 * Register a new user
 */
router.post(
  '/register',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = registerSchema.parse(req.body);

      logger.info('Auth: Registration attempt', {
        email: validated.email,
        name: validated.name,
      });

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: validated.email },
      });

      if (existingUser) {
        throw createError('Email already registered', 409, 'EMAIL_EXISTS');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(validated.password, 10);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: validated.email,
          password: hashedPassword,
          name: validated.name,
          role: 'user',
          subscriptionTier: 'free',
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          subscriptionTier: true,
          createdAt: true,
        },
      });

      // Generate token
      const token = generateToken(user.id);

      logger.info('Auth: User registered successfully', {
        userId: user.id,
        email: user.email,
      });

      res.status(201).json({
        success: true,
        data: {
          user,
          token,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/auth/login
 * Login existing user
 */
router.post(
  '/login',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = loginSchema.parse(req.body);

      logger.info('Auth: Login attempt', {
        email: validated.email,
      });

      // Find user
      const user = await prisma.user.findUnique({
        where: { email: validated.email },
      });

      if (!user) {
        throw createError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(
        validated.password,
        user.password
      );

      if (!isValidPassword) {
        throw createError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
      }

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      // Generate token
      const token = generateToken(user.id);

      logger.info('Auth: User logged in successfully', {
        userId: user.id,
        email: user.email,
      });

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            subscriptionTier: user.subscriptionTier,
            createdAt: user.createdAt,
            lastLoginAt: user.lastLoginAt,
          },
          token,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/auth/me
 * Get current user info
 */
router.get(
  '/me',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          subscriptionTier: true,
          knocksRemaining: true,
          lastKnockDate: true,
          createdAt: true,
          lastLoginAt: true,
        },
      });

      if (!user) {
        throw createError('User not found', 404, 'NOT_FOUND');
      }

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/auth/refresh
 * Refresh authentication token
 */
router.post(
  '/refresh',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;

      // Generate new token
      const token = generateToken(userId);

      logger.info('Auth: Token refreshed', { userId });

      res.json({
        success: true,
        data: { token },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
