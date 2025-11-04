/**
 * Roommate Routes
 *
 * Handles roommate/persona retrieval and interaction.
 */

import express, { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { authMiddleware } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { getAllPresets } from '../agents';
import logger from '../utils/logger';

const router = express.Router();

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/v1/roommate/my
 * Get current user's persona (roommate)
 */
router.get(
  '/my',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;

      const persona = await prisma.persona.findFirst({
        where: {
          userId,
          isActive: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (!persona) {
        return res.json({
          success: true,
          data: null,
          message: 'No roommate found. Complete onboarding to generate one.',
        });
      }

      res.json({
        success: true,
        data: {
          id: persona.id,
          name: persona.name,
          archetype: persona.archetype,
          keywords: persona.keywords ? persona.keywords.split(',') : [],
          imageUrl: persona.imageUrl,
          imageGenerationMethod: persona.imageGenerationMethod,
          quality: persona.quality,
          needVectors: persona.needVectors ? JSON.parse(persona.needVectors) : null,
          traumaAndLearning: persona.traumaAndLearning,
          survivalStrategies: persona.survivalStrategies,
          personalityTraits: persona.personalityTraits,
          conversationPatterns: persona.conversationPatterns,
          isActive: persona.isActive,
          createdAt: persona.createdAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/roommate/:personaId
 * Get specific persona by ID
 */
router.get(
  '/:personaId',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { personaId } = req.params;
      const userId = (req as any).user.id;

      const persona = await prisma.persona.findUnique({
        where: { id: personaId },
      });

      if (!persona) {
        throw createError('Roommate not found', 404, 'NOT_FOUND');
      }

      // Verify ownership
      if (persona.userId !== userId) {
        throw createError('Unauthorized', 403, 'FORBIDDEN');
      }

      res.json({
        success: true,
        data: {
          id: persona.id,
          name: persona.name,
          archetype: persona.archetype,
          keywords: persona.keywords ? persona.keywords.split(',') : [],
          imageUrl: persona.imageUrl,
          imageGenerationMethod: persona.imageGenerationMethod,
          quality: persona.quality,
          needVectors: persona.needVectors ? JSON.parse(persona.needVectors) : null,
          traumaAndLearning: persona.traumaAndLearning,
          survivalStrategies: persona.survivalStrategies,
          personalityTraits: persona.personalityTraits,
          conversationPatterns: persona.conversationPatterns,
          isActive: persona.isActive,
          createdAt: persona.createdAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/roommate/:personaId/prompt
 * Get system prompt for persona (admin only or owner)
 */
router.get(
  '/:personaId/prompt',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { personaId } = req.params;
      const userId = (req as any).user.id;
      const userRole = (req as any).user.role;

      const persona = await prisma.persona.findUnique({
        where: { id: personaId },
      });

      if (!persona) {
        throw createError('Roommate not found', 404, 'NOT_FOUND');
      }

      // Only owner or admin can see system prompt
      if (persona.userId !== userId && userRole !== 'admin') {
        throw createError('Unauthorized', 403, 'FORBIDDEN');
      }

      res.json({
        success: true,
        data: {
          personaId: persona.id,
          systemPrompt: persona.systemPrompt,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/roommate/presets
 * Get available image presets
 */
router.get(
  '/presets/list',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const presets = getAllPresets();

      res.json({
        success: true,
        data: presets,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/v1/roommate/:personaId/deactivate
 * Deactivate a persona
 */
router.patch(
  '/:personaId/deactivate',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { personaId } = req.params;
      const userId = (req as any).user.id;

      const persona = await prisma.persona.findUnique({
        where: { id: personaId },
      });

      if (!persona) {
        throw createError('Roommate not found', 404, 'NOT_FOUND');
      }

      // Verify ownership
      if (persona.userId !== userId) {
        throw createError('Unauthorized', 403, 'FORBIDDEN');
      }

      await prisma.persona.update({
        where: { id: personaId },
        data: { isActive: false },
      });

      logger.info('Roommate: Persona deactivated', {
        personaId,
        userId,
      });

      res.json({
        success: true,
        message: 'Roommate deactivated successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/roommate/:personaId
 * Delete a persona permanently
 */
router.delete(
  '/:personaId',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { personaId } = req.params;
      const userId = (req as any).user.id;

      const persona = await prisma.persona.findUnique({
        where: { id: personaId },
      });

      if (!persona) {
        throw createError('Roommate not found', 404, 'NOT_FOUND');
      }

      // Verify ownership
      if (persona.userId !== userId) {
        throw createError('Unauthorized', 403, 'FORBIDDEN');
      }

      // Delete associated chat messages first
      await prisma.chatMessage.deleteMany({
        where: { personaId },
      });

      // Delete persona
      await prisma.persona.delete({
        where: { id: personaId },
      });

      logger.info('Roommate: Persona deleted', {
        personaId,
        userId,
      });

      res.json({
        success: true,
        message: 'Roommate deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
