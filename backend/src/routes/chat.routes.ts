/**
 * Chat Routes
 *
 * Handles chat conversations with roommate personas.
 */

import express, { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { authMiddleware } from '../middleware/auth';
import { chatLimiter } from '../middleware/rateLimit';
import { createError } from '../middleware/errorHandler';
import { callGeminiLLM } from '../services/gemini';
import logger from '../utils/logger';

const router = express.Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const sendMessageSchema = z.object({
  personaId: z.string().min(1),
  content: z.string().min(1).max(1000, 'Message too long (max 1000 characters)'),
});

const getHistorySchema = z.object({
  personaId: z.string().min(1),
  limit: z.number().int().min(1).max(100).optional().default(50),
  before: z.string().optional(), // Message ID for pagination
});

// ============================================================================
// ROUTES
// ============================================================================

/**
 * POST /api/v1/chat/message
 * Send a message to roommate and get response
 */
router.post(
  '/message',
  authMiddleware,
  chatLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = sendMessageSchema.parse(req.body);
      const userId = (req as any).user.id;

      logger.info('Chat: Sending message', {
        userId,
        personaId: validated.personaId,
        contentLength: validated.content.length,
      });

      // Get persona
      const persona = await prisma.persona.findUnique({
        where: { id: validated.personaId },
      });

      if (!persona) {
        throw createError('Roommate not found', 404, 'NOT_FOUND');
      }

      // Verify ownership
      if (persona.userId !== userId) {
        throw createError('Unauthorized', 403, 'FORBIDDEN');
      }

      if (!persona.isActive) {
        throw createError('Roommate is not active', 400, 'INACTIVE_ROOMMATE');
      }

      // Get recent chat history for context (last 10 messages)
      const recentMessages = await prisma.chatMessage.findMany({
        where: {
          personaId: validated.personaId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 10,
      });

      // Save user message
      const userMessage = await prisma.chatMessage.create({
        data: {
          personaId: validated.personaId,
          role: 'user',
          content: validated.content,
        },
      });

      // Build conversation context
      const conversationHistory = recentMessages
        .reverse()
        .map((msg) => `${msg.role === 'user' ? 'User' : persona.name}: ${msg.content}`)
        .join('\n');

      // Generate AI response
      const fullPrompt = buildChatPrompt(
        persona.systemPrompt,
        conversationHistory,
        validated.content
      );

      logger.info('Chat: Generating AI response', {
        personaId: validated.personaId,
        promptLength: fullPrompt.length,
      });

      const aiResponse = await callGeminiLLM(fullPrompt, {
        temperature: 0.7,
        maxTokens: 500,
      });

      // Save AI message
      const assistantMessage = await prisma.chatMessage.create({
        data: {
          personaId: validated.personaId,
          role: 'assistant',
          content: aiResponse,
        },
      });

      // Update interaction statistics
      await prisma.persona.update({
        where: { id: validated.personaId },
        data: {
          interactionCount: { increment: 1 },
          lastInteractionAt: new Date(),
        },
      });

      logger.info('Chat: AI response generated', {
        personaId: validated.personaId,
        responseLength: aiResponse.length,
      });

      res.json({
        success: true,
        data: {
          userMessage: {
            id: userMessage.id,
            role: userMessage.role,
            content: userMessage.content,
            createdAt: userMessage.createdAt,
          },
          assistantMessage: {
            id: assistantMessage.id,
            role: assistantMessage.role,
            content: assistantMessage.content,
            createdAt: assistantMessage.createdAt,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/chat/history
 * Get chat history for a persona
 */
router.get(
  '/history',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = getHistorySchema.parse({
        personaId: req.query.personaId,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
        before: req.query.before,
      });
      const userId = (req as any).user.id;

      // Get persona
      const persona = await prisma.persona.findUnique({
        where: { id: validated.personaId },
      });

      if (!persona) {
        throw createError('Roommate not found', 404, 'NOT_FOUND');
      }

      // Verify ownership
      if (persona.userId !== userId) {
        throw createError('Unauthorized', 403, 'FORBIDDEN');
      }

      // Build query
      const whereClause: any = {
        personaId: validated.personaId,
      };

      if (validated.before) {
        const beforeMessage = await prisma.chatMessage.findUnique({
          where: { id: validated.before },
        });

        if (beforeMessage) {
          whereClause.createdAt = {
            lt: beforeMessage.createdAt,
          };
        }
      }

      // Get messages
      const messages = await prisma.chatMessage.findMany({
        where: whereClause,
        orderBy: {
          createdAt: 'desc',
        },
        take: validated.limit,
      });

      res.json({
        success: true,
        data: {
          messages: messages.reverse().map((msg) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            createdAt: msg.createdAt,
          })),
          hasMore: messages.length === validated.limit,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/chat/statistics/:personaId
 * Get visit/interaction statistics for a persona
 */
router.get(
  '/statistics/:personaId',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { personaId } = req.params;
      const userId = (req as any).user.id;

      // Get persona
      const persona = await prisma.persona.findUnique({
        where: { id: personaId },
        select: {
          id: true,
          userId: true,
          name: true,
          interactionCount: true,
          lastInteractionAt: true,
          createdAt: true,
        },
      });

      if (!persona) {
        throw createError('Roommate not found', 404, 'NOT_FOUND');
      }

      // Verify ownership
      if (persona.userId !== userId) {
        throw createError('Unauthorized', 403, 'FORBIDDEN');
      }

      // Get total message count
      const totalMessages = await prisma.chatMessage.count({
        where: { personaId },
      });

      // Get user messages count
      const userMessages = await prisma.chatMessage.count({
        where: { personaId, role: 'user' },
      });

      // Get assistant messages count
      const assistantMessages = await prisma.chatMessage.count({
        where: { personaId, role: 'assistant' },
      });

      // Get first interaction date
      const firstMessage = await prisma.chatMessage.findFirst({
        where: { personaId },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      });

      // Calculate days since first interaction
      const daysSinceFirstInteraction = firstMessage
        ? Math.floor(
            (Date.now() - firstMessage.createdAt.getTime()) / (1000 * 60 * 60 * 24)
          )
        : 0;

      // Get messages by day for the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentMessages = await prisma.chatMessage.groupBy({
        by: ['createdAt'],
        where: {
          personaId,
          createdAt: { gte: sevenDaysAgo },
        },
        _count: true,
      });

      // Group by date
      const messagesByDay: Record<string, number> = {};
      for (const msg of recentMessages) {
        const date = msg.createdAt.toISOString().split('T')[0];
        messagesByDay[date] = (messagesByDay[date] || 0) + msg._count;
      }

      res.json({
        success: true,
        data: {
          persona: {
            id: persona.id,
            name: persona.name,
          },
          statistics: {
            totalInteractions: persona.interactionCount,
            totalMessages,
            userMessages,
            assistantMessages,
            lastInteractionAt: persona.lastInteractionAt,
            firstInteractionAt: firstMessage?.createdAt || null,
            daysSinceFirstInteraction,
            averageMessagesPerDay:
              daysSinceFirstInteraction > 0
                ? (totalMessages / daysSinceFirstInteraction).toFixed(2)
                : '0.00',
            messagesByDay,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/chat/history/:personaId
 * Clear chat history for a persona
 */
router.delete(
  '/history/:personaId',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { personaId } = req.params;
      const userId = (req as any).user.id;

      // Get persona
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

      // Delete all messages
      const result = await prisma.chatMessage.deleteMany({
        where: { personaId },
      });

      logger.info('Chat: History cleared', {
        personaId,
        userId,
        deletedCount: result.count,
      });

      res.json({
        success: true,
        message: `Deleted ${result.count} messages`,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// UTILITIES
// ============================================================================

function buildChatPrompt(
  systemPrompt: string,
  conversationHistory: string,
  newMessage: string
): string {
  let prompt = systemPrompt + '\n\n';

  prompt += '---\n\n';
  prompt += '## CONVERSATION GUIDELINES\n\n';
  prompt += '당신은 위 시스템 프롬프트에 정의된 룸메이트입니다. 다음 지침을 따라 대화하세요:\n\n';
  prompt += '1. **일관성**: 위에 정의된 성격, 트라우마, 전략을 일관되게 유지하세요.\n';
  prompt += '2. **자연스러움**: 실제 룸메이트처럼 자연스럽고 친근하게 대화하세요.\n';
  prompt += '3. **간결함**: 답변은 2-4 문장으로 간결하게 유지하세요.\n';
  prompt += '4. **감정 표현**: 필요 시 이모지나 말투로 감정을 표현하세요.\n';
  prompt += '5. **경계 존중**: 개인 공간과 자율성을 존중하는 태도를 보이세요.\n\n';

  prompt += '---\n\n';
  prompt += '## CONVERSATION HISTORY\n\n';

  if (conversationHistory.trim()) {
    prompt += conversationHistory + '\n\n';
  } else {
    prompt += '[No previous conversation]\n\n';
  }

  prompt += '---\n\n';
  prompt += '## NEW MESSAGE\n\n';
  prompt += `User: ${newMessage}\n\n`;

  prompt += '---\n\n';
  prompt += `${newMessage}에 대해 위 룸메이트 캐릭터로서 자연스럽게 답변하세요. 답변만 출력하고 다른 설명은 하지 마세요.`;

  return prompt;
}

export default router;
