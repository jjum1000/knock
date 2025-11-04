/**
 * Agent Routes
 *
 * Handles agent-related operations including browsing history analysis
 */

import express, { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { authMiddleware } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { executeAgent1 } from '../agents/agent1-need-vector';
import logger from '../utils/logger';

const router = express.Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const analyzeBrowsingHistorySchema = z.object({
  browsingData: z.object({
    domains: z.array(
      z.object({
        domain: z.string(),
        count: z.number(),
      })
    ),
    keywords: z.array(z.string()),
    categories: z.array(
      z.object({
        category: z.string(),
        count: z.number(),
      })
    ),
    totalVisits: z.number(),
  }),
});

// ============================================================================
// ROUTES
// ============================================================================

/**
 * POST /api/v1/agent/analyze-browsing-history
 * Analyze browsing history using Agent 1 and store only Need Vector results
 *
 * ✅ Original history processed in memory only (not saved to DB)
 * ✅ Only Agent 1 analysis results (Need Vector) saved to DB
 */
router.post(
  '/analyze-browsing-history',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const validated = analyzeBrowsingHistorySchema.parse(req.body);

      logger.info('Agent: Analyzing browsing history (memory only)', {
        userId,
        domainCount: validated.browsingData.domains.length,
        keywordCount: validated.browsingData.keywords.length,
      });

      // ⚡ Execute Agent 1 immediately (process in memory only)
      const agent1Input = {
        userData: {
          // Convert domains to string array
          domains: validated.browsingData.domains.map((d) => d.domain),

          // Keywords array
          keywords: validated.browsingData.keywords,

          // Browsing history for Agent 1 analysis
          browsingHistory: {
            domains: validated.browsingData.domains,
            keywords: validated.browsingData.keywords,
            categories: validated.browsingData.categories,
            totalVisits: validated.browsingData.totalVisits,
          },
        },
        meta: {
          userId,
          userName: 'User',
          language: 'ko',
        },
      };

      // Execute Agent 1
      const needVectorResult = await executeAgent1(agent1Input);

      logger.info('Agent: Need Vector analysis complete', {
        userId,
        needsCount: needVectorResult.completeVector.length,
      });

      // ✅ Save only Need Vector to DB (for onboarding use)
      await prisma.onboardingData.upsert({
        where: { userId },
        create: {
          userId,
          currentStep: 1,
          isComplete: false,
          // Save only top domains (public info)
          domains: validated.browsingData.domains
            .slice(0, 10)
            .map((d) => d.domain)
            .join(','),
          // Save only top keywords
          keywords: validated.browsingData.keywords.slice(0, 20).join(','),
          // ⚠️ Do NOT save original history (rawData stays null)
          rawData: null,
        },
        update: {
          domains: validated.browsingData.domains
            .slice(0, 10)
            .map((d) => d.domain)
            .join(','),
          keywords: validated.browsingData.keywords.slice(0, 20).join(','),
          updatedAt: new Date(),
        },
      });

      // ❌ Original history auto-disposed after response (memory only)
      res.json({
        success: true,
        data: {
          message: 'Need Vector analysis complete',
          needVectorGenerated: true,

          // Return only Need Vector summary
          needs: needVectorResult.completeVector.map((n) => ({
            need: n.need,
            intensity: n.actual,
            state: n.state,
            gap: n.gap,
          })),

          // Statistics
          stats: {
            domainsAnalyzed: validated.browsingData.domains.length,
            keywordsExtracted: validated.browsingData.keywords.length,
            categoriesDetected: validated.browsingData.categories.length,
          },

          // Quality indicators
          analysis: {
            topNeeds: needVectorResult.completeVector
              .filter((n) => n.actual > 0.6)
              .sort((a, b) => b.actual - a.actual)
              .slice(0, 3)
              .map((n) => n.need),
            paradoxes: needVectorResult.paradoxes?.length || 0,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/agent/status
 * Get agent system status
 */
router.get(
  '/status',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;

      // Check if user has completed browsing history analysis
      const onboardingData = await prisma.onboardingData.findUnique({
        where: { userId },
        select: {
          domains: true,
          keywords: true,
          currentStep: true,
          updatedAt: true,
        },
      });

      const hasAnalyzedHistory = !!(
        onboardingData?.domains && onboardingData?.keywords
      );

      res.json({
        success: true,
        data: {
          hasAnalyzedHistory,
          lastAnalyzedAt: onboardingData?.updatedAt || null,
          currentStep: onboardingData?.currentStep || 0,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
