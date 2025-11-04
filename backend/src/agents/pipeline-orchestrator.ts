/**
 * Pipeline Orchestrator
 *
 * Coordinates the execution of all 5 agents in sequence.
 * Manages job logging, error handling, and retry logic.
 */

import { prisma } from '../index';
import logger from '../utils/logger';
import { executeAgent1, Agent1Input, Agent1Output } from './agent1-need-vector';
import { executeAgent2, Agent2Input, Agent2Output } from './agent2-character-profile';
import { executeAgent3, Agent3Input, Agent3Output } from './agent3-prompt-assembly';
import { executeAgent4, Agent4Input, Agent4Output } from './agent4-image-prompt';
import { executeAgent5, Agent5Input, Agent5Output } from './agent5-image-generation';

// ============================================================================
// TYPES
// ============================================================================

export interface PipelineInput {
  userId: string;
  onboardingDataId: string;
  templateId?: string;
}

export interface PipelineOutput {
  success: boolean;
  personaId?: string;
  jobId: string;
  results?: {
    needVectors: Agent1Output;
    character: Agent2Output;
    systemPrompt: Agent3Output;
    imagePrompt: Agent4Output;
    image: Agent5Output;
  };
  error?: string;
  duration: number;
}

export type AgentStatus = 'pending' | 'running' | 'completed' | 'failed';
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

// ============================================================================
// MAIN ORCHESTRATOR
// ============================================================================

/**
 * Execute the full 5-agent pipeline
 */
export async function executePipeline(input: PipelineInput): Promise<PipelineOutput> {
  const startTime = Date.now();
  const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  logger.info('Pipeline: Starting execution', {
    jobId,
    userId: input.userId,
    onboardingDataId: input.onboardingDataId,
  });

  // Create job record
  const job = await prisma.agentJob.create({
    data: {
      id: jobId,
      userId: input.userId,
      status: 'running',
      startedAt: new Date(),
      metadata: JSON.stringify({
        onboardingDataId: input.onboardingDataId,
        templateId: input.templateId,
      }),
    },
  });

  try {
    // ========================================================================
    // AGENT 1: Need Vector Analysis
    // ========================================================================
    await logAgentStart(jobId, 'agent1', 'Need Vector Analysis');

    const onboardingData = await prisma.onboardingData.findUnique({
      where: { id: input.onboardingDataId },
    });

    if (!onboardingData) {
      throw new Error('Onboarding data not found');
    }

    const agent1Input: Agent1Input = {
      onboardingData: {
        domains: onboardingData.domains ? onboardingData.domains.split(',') : [],
        keywords: onboardingData.keywords ? onboardingData.keywords.split(',') : [],
        responseStyle: onboardingData.responseStyle || 'balanced',
        interests: onboardingData.interests || '',
      },
    };

    const agent1Output = await executeAgent1(agent1Input);
    await logAgentComplete(jobId, 'agent1', agent1Output);

    // ========================================================================
    // AGENT 2: Character Profile Generation
    // ========================================================================
    await logAgentStart(jobId, 'agent2', 'Character Profile Generation');

    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { name: true },
    });

    const agent2Input: Agent2Input = {
      needVectors: agent1Output,
      meta: {
        userName: user?.name || 'User',
      },
    };

    const agent2Output = await executeAgent2(agent2Input);
    await logAgentComplete(jobId, 'agent2', agent2Output);

    // ========================================================================
    // AGENT 3: System Prompt Assembly
    // ========================================================================
    await logAgentStart(jobId, 'agent3', 'System Prompt Assembly');

    const agent3Input: Agent3Input = {
      templateId: input.templateId,
      character: agent2Output.character,
      needVectors: agent1Output,
      meta: {
        userName: user?.name || 'User',
      },
    };

    const agent3Output = await executeAgent3(agent3Input);
    await logAgentComplete(jobId, 'agent3', agent3Output);

    // Validate system prompt
    if (!agent3Output.validation.passed) {
      logger.warn('Pipeline: System prompt validation failed', {
        issues: agent3Output.validation.issues,
        critical: agent3Output.validation.critical,
      });

      if (agent3Output.validation.critical) {
        throw new Error(
          `System prompt validation failed: ${agent3Output.validation.issues.join(', ')}`
        );
      }
    }

    // ========================================================================
    // AGENT 4: Image Prompt Generation
    // ========================================================================
    await logAgentStart(jobId, 'agent4', 'Image Prompt Generation');

    const agent4Input: Agent4Input = {
      character: agent2Output.character,
      needVectors: agent1Output.completeVector,
    };

    const agent4Output = await executeAgent4(agent4Input);
    await logAgentComplete(jobId, 'agent4', agent4Output);

    // ========================================================================
    // AGENT 5: Image Generation
    // ========================================================================
    await logAgentStart(jobId, 'agent5', 'Image Generation');

    const agent5Input: Agent5Input = {
      imagePrompt: agent4Output.imagePrompt,
      visualElements: agent4Output.visualElements,
      characterName: agent2Output.character.name,
      userId: input.userId,
    };

    const agent5Output = await executeAgent5(agent5Input);
    await logAgentComplete(jobId, 'agent5', agent5Output);

    // ========================================================================
    // CREATE PERSONA IN DATABASE
    // ========================================================================
    const persona = await prisma.persona.create({
      data: {
        userId: input.userId,
        name: agent2Output.character.name,
        archetype: agent2Output.character.archetype,
        keywords: agent2Output.character.keywords.join(','),
        systemPrompt: agent3Output.systemPrompt,
        imageUrl: agent5Output.imageUrl,
        imageGenerationMethod: agent5Output.generationMethod,
        needVectors: JSON.stringify(agent1Output.completeVector),
        traumaAndLearning: agent2Output.character.traumaAndLearning,
        survivalStrategies: agent2Output.character.survivalStrategies,
        personalityTraits: agent2Output.character.personalityTraits,
        conversationPatterns: agent2Output.character.conversationPatterns,
        isActive: true,
        quality: calculateQuality(agent1Output, agent2Output, agent3Output),
      },
    });

    // ========================================================================
    // MARK JOB AS COMPLETED
    // ========================================================================
    await prisma.agentJob.update({
      where: { id: jobId },
      data: {
        status: 'completed',
        completedAt: new Date(),
        result: JSON.stringify({
          personaId: persona.id,
          needVectors: agent1Output,
          character: agent2Output.character,
          systemPrompt: {
            tokenCount: agent3Output.tokenCount,
            validation: agent3Output.validation,
          },
          imagePrompt: {
            visualElements: agent4Output.visualElements,
          },
          image: {
            method: agent5Output.generationMethod,
            url: agent5Output.imageUrl,
          },
        }),
      },
    });

    const duration = Date.now() - startTime;

    logger.info('Pipeline: Execution completed successfully', {
      jobId,
      personaId: persona.id,
      duration,
    });

    return {
      success: true,
      personaId: persona.id,
      jobId,
      results: {
        needVectors: agent1Output,
        character: agent2Output,
        systemPrompt: agent3Output,
        imagePrompt: agent4Output,
        image: agent5Output,
      },
      duration,
    };
  } catch (error: any) {
    // ========================================================================
    // ERROR HANDLING
    // ========================================================================
    logger.error('Pipeline: Execution failed', {
      jobId,
      error: error.message,
      stack: error.stack,
    });

    await prisma.agentJob.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        completedAt: new Date(),
        result: JSON.stringify({
          error: error.message,
          stack: error.stack,
        }),
      },
    });

    const duration = Date.now() - startTime;

    return {
      success: false,
      jobId,
      error: error.message,
      duration,
    };
  }
}

// ============================================================================
// JOB LOGGING
// ============================================================================

async function logAgentStart(jobId: string, agentName: string, agentDescription: string) {
  logger.info(`Pipeline: ${agentName} starting`, {
    jobId,
    agentName,
  });

  await prisma.agentJobLog.create({
    data: {
      jobId,
      agentName,
      status: 'running',
      startedAt: new Date(),
      metadata: JSON.stringify({
        description: agentDescription,
      }),
    },
  });
}

async function logAgentComplete(jobId: string, agentName: string, output: any) {
  const logEntry = await prisma.agentJobLog.findFirst({
    where: {
      jobId,
      agentName,
    },
    orderBy: {
      startedAt: 'desc',
    },
  });

  if (logEntry) {
    await prisma.agentJobLog.update({
      where: { id: logEntry.id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        output: JSON.stringify(output),
      },
    });
  }

  logger.info(`Pipeline: ${agentName} completed`, {
    jobId,
    agentName,
  });
}

// ============================================================================
// QUALITY CALCULATION
// ============================================================================

function calculateQuality(
  agent1: Agent1Output,
  agent2: Agent2Output,
  agent3: Agent3Output
): number {
  let quality = 1.0;

  // Factor 1: Need vector clarity (20%)
  const avgNeedActual = agent1.completeVector.reduce((sum, n) => sum + n.actual, 0) / 6;
  const needClarity = avgNeedActual > 0.6 ? 1.0 : avgNeedActual > 0.4 ? 0.8 : 0.6;
  quality *= 0.2 + needClarity * 0.2;

  // Factor 2: Character richness (30%)
  const experienceCount = agent2.character.selectedExperiences.length;
  const experienceRichness = experienceCount >= 5 ? 1.0 : experienceCount >= 3 ? 0.8 : 0.6;
  quality *= 0.3 + experienceRichness * 0.3;

  // Factor 3: System prompt quality (30%)
  const promptQuality = agent3.validation.passed ? 1.0 : agent3.validation.critical ? 0.5 : 0.7;
  quality *= 0.3 + promptQuality * 0.3;

  // Factor 4: Token count appropriateness (20%)
  const tokenRatio = agent3.tokenCount / 2500; // Ideal: 2500 tokens
  const tokenQuality = tokenRatio > 0.8 && tokenRatio < 1.2 ? 1.0 : 0.8;
  quality *= 0.2 + tokenQuality * 0.2;

  // Normalize to 0.0 - 1.0
  return Math.max(0.0, Math.min(1.0, quality));
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Get job status
 */
export async function getJobStatus(jobId: string) {
  const job = await prisma.agentJob.findUnique({
    where: { id: jobId },
    include: {
      logs: {
        orderBy: {
          startedAt: 'asc',
        },
      },
    },
  });

  if (!job) {
    return null;
  }

  return {
    id: job.id,
    status: job.status,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    duration: job.completedAt
      ? job.completedAt.getTime() - job.startedAt.getTime()
      : Date.now() - job.startedAt.getTime(),
    logs: job.logs.map((log) => ({
      agentName: log.agentName,
      status: log.status,
      startedAt: log.startedAt,
      completedAt: log.completedAt,
      duration: log.completedAt
        ? log.completedAt.getTime() - log.startedAt.getTime()
        : null,
    })),
    result: job.result ? JSON.parse(job.result) : null,
  };
}

/**
 * Retry failed job
 */
export async function retryJob(jobId: string): Promise<PipelineOutput> {
  const job = await prisma.agentJob.findUnique({
    where: { id: jobId },
  });

  if (!job) {
    throw new Error('Job not found');
  }

  const metadata = JSON.parse(job.metadata || '{}');

  return executePipeline({
    userId: job.userId,
    onboardingDataId: metadata.onboardingDataId,
    templateId: metadata.templateId,
  });
}

/**
 * Get recent jobs for a user
 */
export async function getUserJobs(userId: string, limit: number = 10) {
  return await prisma.agentJob.findMany({
    where: { userId },
    orderBy: { startedAt: 'desc' },
    take: limit,
    include: {
      logs: {
        orderBy: { startedAt: 'asc' },
      },
    },
  });
}
