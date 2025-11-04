/**
 * Onboarding Routes
 *
 * Handles user onboarding flow and triggers agent pipeline.
 */

import express, { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { authMiddleware } from '../middleware/auth';
import { onboardingLimiter } from '../middleware/rateLimit';
import { createError } from '../middleware/errorHandler';
import { executePipeline, getJobStatus } from '../agents';
import logger from '../utils/logger';

const router = express.Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const saveOnboardingSchema = z.object({
  step: z.number().int().min(1).max(4),
  data: z.object({
    domains: z.array(z.string()).optional(),
    keywords: z.array(z.string()).optional(),
    responseStyle: z.enum(['casual', 'balanced', 'formal']).optional(),
    interests: z.string().optional(),
  }),
});

const completeOnboardingSchema = z.object({
  templateId: z.string().optional(),
});

// ============================================================================
// ROUTES
// ============================================================================

/**
 * POST /api/v1/onboarding/save
 * Save onboarding progress (partial or complete)
 */
router.post(
  '/save',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = saveOnboardingSchema.parse(req.body);
      const userId = (req as any).user.id;

      logger.info('Onboarding: Saving progress', {
        userId,
        step: validated.step,
      });

      // Find or create onboarding data
      let onboardingData = await prisma.onboardingData.findUnique({
        where: { userId },
      });

      if (!onboardingData) {
        onboardingData = await prisma.onboardingData.create({
          data: {
            userId,
            currentStep: validated.step,
            isComplete: false,
            domains: validated.data.domains?.join(',') || '',
            keywords: validated.data.keywords?.join(',') || '',
            responseStyle: validated.data.responseStyle || 'balanced',
            interests: validated.data.interests || '',
          },
        });
      } else {
        onboardingData = await prisma.onboardingData.update({
          where: { userId },
          data: {
            currentStep: validated.step,
            domains: validated.data.domains?.join(',') || onboardingData.domains,
            keywords: validated.data.keywords?.join(',') || onboardingData.keywords,
            responseStyle: validated.data.responseStyle || onboardingData.responseStyle,
            interests: validated.data.interests || onboardingData.interests,
            updatedAt: new Date(),
          },
        });
      }

      res.json({
        success: true,
        data: {
          id: onboardingData.id,
          currentStep: onboardingData.currentStep,
          isComplete: onboardingData.isComplete,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/onboarding/complete
 * Complete onboarding and trigger agent pipeline
 */
router.post(
  '/complete',
  authMiddleware,
  onboardingLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = completeOnboardingSchema.parse(req.body);
      const userId = (req as any).user.id;

      logger.info('Onboarding: Completing onboarding', {
        userId,
        templateId: validated.templateId,
      });

      // Get onboarding data
      const onboardingData = await prisma.onboardingData.findUnique({
        where: { userId },
      });

      if (!onboardingData) {
        throw createError('Onboarding data not found', 404, 'NOT_FOUND');
      }

      if (onboardingData.currentStep < 4) {
        throw createError('Onboarding not complete', 400, 'INCOMPLETE_ONBOARDING');
      }

      // Mark onboarding as complete
      await prisma.onboardingData.update({
        where: { userId },
        data: {
          isComplete: true,
          completedAt: new Date(),
        },
      });

      // Trigger agent pipeline (async)
      logger.info('Onboarding: Triggering agent pipeline', {
        userId,
        onboardingDataId: onboardingData.id,
      });

      const pipelineResult = await executePipeline({
        userId,
        onboardingDataId: onboardingData.id,
        templateId: validated.templateId,
      });

      if (!pipelineResult.success) {
        throw createError(
          `Pipeline execution failed: ${pipelineResult.error}`,
          500,
          'PIPELINE_FAILED'
        );
      }

      res.json({
        success: true,
        data: {
          jobId: pipelineResult.jobId,
          personaId: pipelineResult.personaId,
          message: 'Roommate character generated successfully!',
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/onboarding/status
 * Get current onboarding status
 */
router.get(
  '/status',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;

      const onboardingData = await prisma.onboardingData.findUnique({
        where: { userId },
      });

      if (!onboardingData) {
        return res.json({
          success: true,
          data: {
            exists: false,
            currentStep: 0,
            isComplete: false,
          },
        });
      }

      res.json({
        success: true,
        data: {
          exists: true,
          id: onboardingData.id,
          currentStep: onboardingData.currentStep,
          isComplete: onboardingData.isComplete,
          completedAt: onboardingData.completedAt,
          data: {
            domains: onboardingData.domains ? onboardingData.domains.split(',') : [],
            keywords: onboardingData.keywords ? onboardingData.keywords.split(',') : [],
            responseStyle: onboardingData.responseStyle,
            interests: onboardingData.interests,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/onboarding/job/:jobId
 * Get job status for agent pipeline
 */
router.get(
  '/job/:jobId',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { jobId } = req.params;
      const userId = (req as any).user.id;

      const jobStatus = await getJobStatus(jobId);

      if (!jobStatus) {
        throw createError('Job not found', 404, 'NOT_FOUND');
      }

      // Verify job belongs to user
      const job = await prisma.agentJob.findUnique({
        where: { id: jobId },
      });

      if (job?.userId !== userId) {
        throw createError('Unauthorized', 403, 'FORBIDDEN');
      }

      res.json({
        success: true,
        data: jobStatus,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
