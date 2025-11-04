import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { executePipeline, getJobStatus, retryJob } from '../agents/pipeline-orchestrator';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const agentInputSchema = z.object({
  userData: z.object({
    domains: z.array(z.string()),
    keywords: z.array(z.string()),
    interests: z.array(z.string()),
    avoidTopics: z.array(z.string()).optional(),
  }),
  preferences: z.object({
    conversationStyle: z.enum(['casual', 'formal', 'mixed']).optional(),
    responseLength: z.enum(['short', 'medium', 'long']).optional(),
  }).optional(),
  meta: z.object({
    userId: z.string(),
    userName: z.string(),
    language: z.string().optional(),
  }),
});

const executeAgentSchema = z.object({
  input: agentInputSchema,
  config: z.object({
    templateId: z.string().uuid().optional(),
    skipCache: z.boolean().optional(),
    dryRun: z.boolean().optional(),
  }).optional(),
});

/**
 * POST /api/v1/admin/agent/execute
 * Manually execute the agent pipeline with custom input
 */
router.post('/execute', async (req: Request, res: Response) => {
  try {
    const validatedData = executeAgentSchema.parse(req.body);
    const { input, config = {} } = validatedData;

    // Validate user exists
    const user = await prisma.user.findUnique({
      where: { id: input.meta.userId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // If templateId is specified, validate it exists
    if (config.templateId) {
      const template = await prisma.promptTemplate.findUnique({
        where: { id: config.templateId },
      });

      if (!template) {
        return res.status(404).json({
          success: false,
          error: 'Template not found',
        });
      }

      if (!template.isActive) {
        return res.status(400).json({
          success: false,
          error: 'Template is not active',
        });
      }
    }

    // Execute the agent pipeline
    const result = await executePipeline({
      userId: input.meta.userId,
      userName: input.meta.userName,
      userData: input.userData,
      preferences: input.preferences,
      language: input.meta.language || 'ko',
      templateId: config.templateId,
      dryRun: config.dryRun || false,
    });

    res.status(202).json({
      success: true,
      data: {
        jobId: result.jobId,
        status: result.status,
        message: 'Agent pipeline started successfully',
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    console.error('Error executing agent pipeline:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute agent pipeline',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/admin/agent/jobs/:jobId
 * Get the status and result of a specific job
 */
router.get('/jobs/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;

    const status = await getJobStatus(jobId);

    if (!status) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error('Error fetching job status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch job status',
    });
  }
});

/**
 * GET /api/v1/admin/agent/jobs
 * Get list of all agent jobs with filtering
 */
router.get('/jobs', async (req: Request, res: Response) => {
  try {
    const {
      status,
      userId,
      limit = '20',
      offset = '0',
      sortBy = 'startedAt',
      sortOrder = 'desc',
    } = req.query;

    const where: any = {};

    if (status) {
      where.status = status as string;
    }

    if (userId) {
      where.userId = userId as string;
    }

    const [jobs, total] = await Promise.all([
      prisma.agentJob.findMany({
        where,
        orderBy: {
          [sortBy as string]: sortOrder === 'asc' ? 'asc' : 'desc',
        },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
        include: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
          _count: {
            select: {
              logs: true,
            },
          },
        },
      }),
      prisma.agentJob.count({ where }),
    ]);

    res.json({
      success: true,
      data: jobs,
      pagination: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: parseInt(offset as string) + parseInt(limit as string) < total,
      },
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch jobs',
    });
  }
});

/**
 * POST /api/v1/admin/agent/jobs/:jobId/retry
 * Retry a failed job
 */
router.post('/jobs/:jobId/retry', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;

    // Check if job exists
    const job = await prisma.agentJob.findUnique({
      where: { jobId },
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    // Check if job is in a retryable state
    if (job.status !== 'failed') {
      return res.status(400).json({
        success: false,
        error: 'Only failed jobs can be retried',
        currentStatus: job.status,
      });
    }

    // Retry the job
    const result = await retryJob(jobId);

    res.json({
      success: true,
      data: {
        jobId: result.jobId,
        status: result.status,
        message: 'Job retry initiated',
      },
    });
  } catch (error) {
    console.error('Error retrying job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retry job',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /api/v1/admin/agent/jobs/:jobId
 * Cancel a running job (if possible)
 */
router.delete('/jobs/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;

    const job = await prisma.agentJob.findUnique({
      where: { jobId },
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    // Only allow cancellation of processing jobs
    if (job.status !== 'processing') {
      return res.status(400).json({
        success: false,
        error: 'Only processing jobs can be cancelled',
        currentStatus: job.status,
      });
    }

    // Update job status to failed with cancellation message
    await prisma.agentJob.update({
      where: { jobId },
      data: {
        status: 'failed',
        errorMessage: 'Job cancelled by administrator',
        completedAt: new Date(),
      },
    });

    // Add a cancellation log entry
    await prisma.agentJobLog.create({
      data: {
        agentJobId: job.id,
        agentName: 'System',
        status: 'error',
        message: 'Job cancelled by administrator',
        executionTimeMs: 0,
      },
    });

    res.json({
      success: true,
      message: 'Job cancelled successfully',
    });
  } catch (error) {
    console.error('Error cancelling job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel job',
    });
  }
});

/**
 * GET /api/v1/admin/agent/stats
 * Get overall agent system statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const [
      totalJobs,
      completedJobs,
      failedJobs,
      processingJobs,
      averageExecutionTime,
      averageQualityScore,
      totalPersonasCreated,
      totalRoomsCreated,
    ] = await Promise.all([
      prisma.agentJob.count(),
      prisma.agentJob.count({ where: { status: 'completed' } }),
      prisma.agentJob.count({ where: { status: 'failed' } }),
      prisma.agentJob.count({ where: { status: 'processing' } }),
      prisma.agentJob.aggregate({
        where: { status: 'completed' },
        _avg: { executionTimeMs: true },
      }),
      prisma.agentJob.aggregate({
        where: { status: 'completed', qualityScore: { not: null } },
        _avg: { qualityScore: true },
      }),
      prisma.persona.count(),
      prisma.room.count(),
    ]);

    const successRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;

    res.json({
      success: true,
      data: {
        jobs: {
          total: totalJobs,
          completed: completedJobs,
          failed: failedJobs,
          processing: processingJobs,
          successRate: Math.round(successRate * 100) / 100,
        },
        performance: {
          averageExecutionTime: Math.round(averageExecutionTime._avg.executionTimeMs || 0),
          averageQualityScore: Math.round((averageQualityScore._avg.qualityScore || 0) * 100) / 100,
        },
        output: {
          totalPersonasCreated,
          totalRoomsCreated,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching agent stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agent statistics',
    });
  }
});

/**
 * POST /api/v1/admin/agent/test-pipeline
 * Test the agent pipeline with sample data
 */
router.post('/test-pipeline', async (req: Request, res: Response) => {
  try {
    // Get a random active template
    const template = await prisma.promptTemplate.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'No active templates found',
      });
    }

    // Create sample test data
    const testInput = {
      userId: 'test-user-admin',
      userName: '테스트 관리자',
      userData: {
        domains: ['github.com', 'stackoverflow.com', 'reddit.com/r/programming'],
        keywords: ['typescript', 'react', 'node.js', 'docker'],
        interests: ['프로그래밍', '게임', '음악'],
        avoidTopics: ['정치'],
      },
      preferences: {
        conversationStyle: 'casual' as const,
        responseLength: 'medium' as const,
      },
      language: 'ko',
      templateId: template.id,
      dryRun: true, // Don't save to database
    };

    // Execute pipeline
    const result = await executePipeline(testInput);

    res.json({
      success: true,
      data: {
        jobId: result.jobId,
        status: result.status,
        message: 'Test pipeline executed successfully (dry run mode)',
        testData: testInput,
      },
    });
  } catch (error) {
    console.error('Error testing pipeline:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test pipeline',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
