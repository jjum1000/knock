import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/v1/admin/monitoring/dashboard
 * Get dashboard statistics and metrics
 */
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const { period = '24h' } = req.query;

    // Calculate time range
    const now = new Date();
    let startDate = new Date();
    switch (period) {
      case '1h':
        startDate.setHours(now.getHours() - 1);
        break;
      case '24h':
        startDate.setDate(now.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      default:
        startDate.setDate(now.getDate() - 1);
    }

    // Fetch job statistics
    const [
      totalJobs,
      completedJobs,
      failedJobs,
      processingJobs,
      recentJobs,
      averageExecutionTime,
      averageQualityScore,
    ] = await Promise.all([
      // Total jobs in period
      prisma.agentJob.count({
        where: {
          startedAt: { gte: startDate },
        },
      }),

      // Completed jobs
      prisma.agentJob.count({
        where: {
          status: 'completed',
          startedAt: { gte: startDate },
        },
      }),

      // Failed jobs
      prisma.agentJob.count({
        where: {
          status: 'failed',
          startedAt: { gte: startDate },
        },
      }),

      // Currently processing jobs
      prisma.agentJob.count({
        where: {
          status: 'processing',
        },
      }),

      // Recent jobs (last 10)
      prisma.agentJob.findMany({
        where: {
          startedAt: { gte: startDate },
        },
        orderBy: {
          startedAt: 'desc',
        },
        take: 10,
        select: {
          id: true,
          jobId: true,
          status: true,
          executionTimeMs: true,
          qualityScore: true,
          startedAt: true,
          completedAt: true,
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      }),

      // Average execution time
      prisma.agentJob.aggregate({
        where: {
          status: 'completed',
          startedAt: { gte: startDate },
        },
        _avg: {
          executionTimeMs: true,
        },
      }),

      // Average quality score
      prisma.agentJob.aggregate({
        where: {
          status: 'completed',
          startedAt: { gte: startDate },
          qualityScore: { not: null },
        },
        _avg: {
          qualityScore: true,
        },
      }),
    ]);

    // Calculate success rate
    const successRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;

    // Get hourly distribution for the period
    const hourlyDistribution = await prisma.$queryRaw<Array<{ hour: string; count: number }>>`
      SELECT
        strftime('%Y-%m-%d %H:00:00', started_at) as hour,
        COUNT(*) as count
      FROM agent_jobs
      WHERE started_at >= ${startDate.toISOString()}
      GROUP BY hour
      ORDER BY hour ASC
    `;

    // Get status distribution
    const statusDistribution = await prisma.agentJob.groupBy({
      by: ['status'],
      where: {
        startedAt: { gte: startDate },
      },
      _count: {
        status: true,
      },
    });

    // Get quality score distribution
    const qualityDistribution = await prisma.$queryRaw<Array<{ range: string; count: number }>>`
      SELECT
        CASE
          WHEN quality_score >= 90 THEN '90-100'
          WHEN quality_score >= 80 THEN '80-89'
          WHEN quality_score >= 70 THEN '70-79'
          WHEN quality_score >= 60 THEN '60-69'
          ELSE '0-59'
        END as range,
        COUNT(*) as count
      FROM agent_jobs
      WHERE status = 'completed'
        AND quality_score IS NOT NULL
        AND started_at >= ${startDate.toISOString()}
      GROUP BY range
      ORDER BY range DESC
    `;

    res.json({
      success: true,
      data: {
        overview: {
          totalJobs,
          completedJobs,
          failedJobs,
          processingJobs,
          successRate: Math.round(successRate * 100) / 100,
          averageExecutionTime: Math.round(averageExecutionTime._avg.executionTimeMs || 0),
          averageQualityScore: Math.round((averageQualityScore._avg.qualityScore || 0) * 100) / 100,
        },
        charts: {
          hourlyDistribution,
          statusDistribution: statusDistribution.map(item => ({
            status: item.status,
            count: item._count.status,
          })),
          qualityDistribution,
        },
        recentJobs,
      },
      period,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard data',
    });
  }
});

/**
 * GET /api/v1/admin/monitoring/jobs
 * Get all jobs with filtering and pagination
 */
router.get('/jobs', async (req: Request, res: Response) => {
  try {
    const {
      status,
      userId,
      search,
      sortBy = 'startedAt',
      sortOrder = 'desc',
      limit = '20',
      offset = '0',
      startDate,
      endDate,
    } = req.query;

    const where: any = {};

    if (status) {
      where.status = status as string;
    }

    if (userId) {
      where.userId = userId as string;
    }

    if (startDate || endDate) {
      where.startedAt = {};
      if (startDate) where.startedAt.gte = new Date(startDate as string);
      if (endDate) where.startedAt.lte = new Date(endDate as string);
    }

    if (search) {
      where.jobId = { contains: search as string };
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
          logs: {
            select: {
              id: true,
              agentName: true,
              status: true,
              createdAt: true,
            },
            orderBy: {
              createdAt: 'asc',
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
 * GET /api/v1/admin/monitoring/jobs/:jobId
 * Get detailed information about a specific job
 */
router.get('/jobs/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;

    const job = await prisma.agentJob.findUnique({
      where: { jobId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            createdAt: true,
          },
        },
        logs: {
          orderBy: {
            createdAt: 'asc',
          },
        },
        personas: {
          select: {
            id: true,
            name: true,
            archetype: true,
            createdAt: true,
          },
        },
        rooms: {
          select: {
            id: true,
            imageUrl: true,
            createdAt: true,
          },
        },
      },
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    // Parse input and output if they exist
    const input = job.input ? (typeof job.input === 'string' ? JSON.parse(job.input) : job.input) : null;
    const output = job.output ? (typeof job.output === 'string' ? JSON.parse(job.output) : job.output) : null;

    res.json({
      success: true,
      data: {
        ...job,
        input,
        output,
      },
    });
  } catch (error) {
    console.error('Error fetching job details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch job details',
    });
  }
});

/**
 * GET /api/v1/admin/monitoring/quality
 * Get quality analysis and insights
 */
router.get('/quality', async (req: Request, res: Response) => {
  try {
    const { period = '7d' } = req.query;

    // Calculate time range
    const now = new Date();
    let startDate = new Date();
    switch (period) {
      case '24h':
        startDate.setDate(now.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }

    // Get quality score statistics
    const qualityStats = await prisma.agentJob.aggregate({
      where: {
        status: 'completed',
        qualityScore: { not: null },
        startedAt: { gte: startDate },
      },
      _avg: {
        qualityScore: true,
      },
      _min: {
        qualityScore: true,
      },
      _max: {
        qualityScore: true,
      },
      _count: {
        qualityScore: true,
      },
    });

    // Get jobs with low quality scores (below 70)
    const lowQualityJobs = await prisma.agentJob.findMany({
      where: {
        status: 'completed',
        qualityScore: { lt: 70 },
        startedAt: { gte: startDate },
      },
      orderBy: {
        qualityScore: 'asc',
      },
      take: 10,
      select: {
        id: true,
        jobId: true,
        qualityScore: true,
        errorMessage: true,
        startedAt: true,
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    // Get quality score trend over time
    const qualityTrend = await prisma.$queryRaw<Array<{ date: string; avg_score: number; count: number }>>`
      SELECT
        DATE(started_at) as date,
        AVG(quality_score) as avg_score,
        COUNT(*) as count
      FROM agent_jobs
      WHERE status = 'completed'
        AND quality_score IS NOT NULL
        AND started_at >= ${startDate.toISOString()}
      GROUP BY date
      ORDER BY date ASC
    `;

    // Get failure reasons
    const failureReasons = await prisma.agentJob.findMany({
      where: {
        status: 'failed',
        startedAt: { gte: startDate },
      },
      select: {
        errorMessage: true,
      },
    });

    // Count failure reasons
    const failureReasonCounts = failureReasons.reduce((acc: any, job) => {
      const reason = job.errorMessage || 'Unknown error';
      acc[reason] = (acc[reason] || 0) + 1;
      return acc;
    }, {});

    const topFailureReasons = Object.entries(failureReasonCounts)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 5);

    res.json({
      success: true,
      data: {
        qualityStats: {
          average: Math.round((qualityStats._avg.qualityScore || 0) * 100) / 100,
          min: qualityStats._min.qualityScore,
          max: qualityStats._max.qualityScore,
          total: qualityStats._count.qualityScore,
        },
        lowQualityJobs,
        qualityTrend: qualityTrend.map(item => ({
          date: item.date,
          averageScore: Math.round(Number(item.avg_score) * 100) / 100,
          count: Number(item.count),
        })),
        topFailureReasons,
      },
      period,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching quality analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch quality analysis',
    });
  }
});

/**
 * GET /api/v1/admin/monitoring/errors
 * Get error logs and failed jobs
 */
router.get('/errors', async (req: Request, res: Response) => {
  try {
    const { limit = '20', offset = '0', startDate, endDate } = req.query;

    const where: any = {
      status: 'failed',
    };

    if (startDate || endDate) {
      where.startedAt = {};
      if (startDate) where.startedAt.gte = new Date(startDate as string);
      if (endDate) where.startedAt.lte = new Date(endDate as string);
    }

    const [errors, total] = await Promise.all([
      prisma.agentJob.findMany({
        where,
        orderBy: {
          startedAt: 'desc',
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
          logs: {
            where: {
              status: 'error',
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      }),
      prisma.agentJob.count({ where }),
    ]);

    res.json({
      success: true,
      data: errors,
      pagination: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: parseInt(offset as string) + parseInt(limit as string) < total,
      },
    });
  } catch (error) {
    console.error('Error fetching error logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch error logs',
    });
  }
});

/**
 * GET /api/v1/admin/monitoring/performance
 * Get performance metrics and bottleneck analysis
 */
router.get('/performance', async (req: Request, res: Response) => {
  try {
    const { period = '7d' } = req.query;

    // Calculate time range
    const now = new Date();
    let startDate = new Date();
    switch (period) {
      case '24h':
        startDate.setDate(now.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }

    // Get execution time statistics by agent
    const agentPerformance = await prisma.agentJobLog.groupBy({
      by: ['agentName'],
      where: {
        status: 'completed',
        agentJob: {
          startedAt: { gte: startDate },
        },
      },
      _avg: {
        executionTimeMs: true,
      },
      _max: {
        executionTimeMs: true,
      },
      _min: {
        executionTimeMs: true,
      },
      _count: {
        agentName: true,
      },
    });

    // Get slowest jobs
    const slowestJobs = await prisma.agentJob.findMany({
      where: {
        status: 'completed',
        startedAt: { gte: startDate },
      },
      orderBy: {
        executionTimeMs: 'desc',
      },
      take: 10,
      select: {
        id: true,
        jobId: true,
        executionTimeMs: true,
        qualityScore: true,
        startedAt: true,
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    // Get execution time trend
    const executionTimeTrend = await prisma.$queryRaw<Array<{ date: string; avg_time: number; count: number }>>`
      SELECT
        DATE(started_at) as date,
        AVG(execution_time_ms) as avg_time,
        COUNT(*) as count
      FROM agent_jobs
      WHERE status = 'completed'
        AND started_at >= ${startDate.toISOString()}
      GROUP BY date
      ORDER BY date ASC
    `;

    res.json({
      success: true,
      data: {
        agentPerformance: agentPerformance.map(agent => ({
          agentName: agent.agentName,
          averageTime: Math.round(agent._avg.executionTimeMs || 0),
          maxTime: agent._max.executionTimeMs,
          minTime: agent._min.executionTimeMs,
          count: agent._count.agentName,
        })),
        slowestJobs,
        executionTimeTrend: executionTimeTrend.map(item => ({
          date: item.date,
          averageTime: Math.round(Number(item.avg_time)),
          count: Number(item.count),
        })),
      },
      period,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch performance metrics',
    });
  }
});

export default router;
