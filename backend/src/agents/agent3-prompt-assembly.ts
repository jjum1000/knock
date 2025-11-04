/**
 * Agent 3: System Prompt Assembly
 *
 * Assembles the final system prompt using Handlebars templates and
 * character profile data from Agent 2.
 */

import Handlebars from 'handlebars';
import { prisma } from '../index';
import logger from '../utils/logger';
import { Agent1Output } from './agent1-need-vector';
import { Agent2Output } from './agent2-character-profile';

// ============================================================================
// TYPES
// ============================================================================

export interface Agent3Input {
  templateId?: string;
  character: Agent2Output['character'];
  needVectors: Agent1Output;
  meta: {
    userName: string;
  };
}

export interface Agent3Output {
  systemPrompt: string;
  validation: {
    passed: boolean;
    critical: boolean;
    issues: string[];
  };
  tokenCount: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const NEED_NAMES_KR: Record<string, string> = {
  survival: '안전',
  belonging: '소속',
  recognition: '인정',
  autonomy: '자율',
  growth: '성장',
  meaning: '의미',
};

const NEED_DESCRIPTIONS: Record<string, string> = {
  survival: '안전하고 예측 가능한 환경에서 살고 싶다',
  belonging: '어딘가에 소속되어 연결되고 싶다',
  recognition: '내 가치를 인정받고 존중받고 싶다',
  autonomy: '내 방식대로 자유롭게 선택하고 싶다',
  growth: '배우고 성장하며 더 나아지고 싶다',
  meaning: '의미 있는 일을 하며 기여하고 싶다',
};

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Execute Agent 3: Assemble system prompt
 */
export async function executeAgent3(input: Agent3Input): Promise<Agent3Output> {
  const startTime = Date.now();

  logger.info('Agent 3: Starting system prompt assembly', {
    characterName: input.character.name,
    templateId: input.templateId,
  });

  try {
    // 1. Load template
    const template = await loadTemplate(input.templateId);

    if (!template) {
      throw new Error('Template not found');
    }

    logger.info('Agent 3: Template loaded', {
      templateName: template.name,
      version: template.version,
    });

    // 2. Load experiences
    const experiences = await loadExperiences(
      input.character.selectedExperiences.map((e) => e.id)
    );

    // 3. Prepare variables
    const variables = prepareVariables(input, experiences);

    // 4. Assemble sections
    const sections = assembleSections(template, variables);

    // 5. Build final prompt
    const systemPrompt = buildFinalPrompt(sections, input.character.name);

    // 6. Validate
    const validation = validateSystemPrompt(systemPrompt);

    const tokenCount = countTokens(systemPrompt);

    const duration = Date.now() - startTime;
    logger.info('Agent 3: System prompt assembled', {
      duration,
      tokenCount,
      validationPassed: validation.passed,
    });

    return {
      systemPrompt,
      validation,
      tokenCount,
    };
  } catch (error: any) {
    logger.error('Agent 3: Execution failed', {
      error: error.message,
    });

    throw error;
  }
}

// ============================================================================
// TEMPLATE LOADING
// ============================================================================

async function loadTemplate(templateId?: string) {
  if (templateId) {
    return await prisma.promptTemplate.findUnique({
      where: { id: templateId },
    });
  }

  // Load default template
  return await prisma.promptTemplate.findFirst({
    where: {
      isActive: true,
      isDefault: true,
    },
  });
}

async function loadExperiences(experienceIds: string[]) {
  return await prisma.dataPoolExperience.findMany({
    where: {
      id: { in: experienceIds },
    },
  });
}

// ============================================================================
// VARIABLE PREPARATION
// ============================================================================

function prepareVariables(input: Agent3Input, experiences: any[]) {
  const { character, needVectors, meta } = input;

  // Prepare needs array
  const needs = needVectors.completeVector
    .filter((n) => n.actual > 0.5)
    .map((n) => ({
      name: NEED_NAMES_KR[n.need] || n.need,
      intensity: n.actual > 0.8 ? '강함' : n.actual > 0.5 ? '중간' : '약함',
      description: NEED_DESCRIPTIONS[n.need] || n.need,
    }));

  // Prepare experiences array
  const experiencesData = character.selectedExperiences.map((sel, index) => {
    const exp = experiences.find((e) => e.id === sel.id);
    if (!exp) return null;

    const ageRange = exp.ageRange.split(',').map(Number);
    const learnings = exp.learnings ? exp.learnings.split(',') : [];

    return {
      index: index + 1,
      title: exp.title,
      event: exp.description,
      age: ageRange[0],
      ageContext: `${ageRange[0]}세`,
      learnings,
    };
  }).filter(Boolean);

  return {
    characterName: character.name,
    userName: meta.userName,
    needs,
    experiences: experiencesData,
    trauma: character.traumaAndLearning,
    strategies: character.survivalStrategies,
    personality: character.personalityTraits,
    conversation: character.conversationPatterns,
  };
}

// ============================================================================
// SECTION ASSEMBLY
// ============================================================================

function assembleSections(template: any, variables: any) {
  const sectionsData = JSON.parse(template.sections);

  const compiled: Record<string, string> = {};

  for (const [key, value] of Object.entries(sectionsData)) {
    try {
      const templateFn = Handlebars.compile(value as string);
      compiled[key] = templateFn(variables);
    } catch (error: any) {
      logger.error(`Failed to compile section: ${key}`, {
        error: error.message,
      });
      compiled[key] = `[Error compiling ${key}]`;
    }
  }

  return compiled;
}

// ============================================================================
// FINAL PROMPT BUILDING
// ============================================================================

function buildFinalPrompt(sections: Record<string, string>, characterName: string): string {
  const orderedSections = ['why', 'past', 'trauma', 'how', 'personality', 'what', 'relationship'];

  let prompt = `# 시스템 프롬프트: ${characterName}\n\n`;

  for (const sectionKey of orderedSections) {
    if (sections[sectionKey]) {
      prompt += sections[sectionKey] + '\n\n---\n\n';
    }
  }

  // Remove trailing separator
  prompt = prompt.replace(/\n\n---\n\n$/, '');

  return prompt.trim();
}

// ============================================================================
// VALIDATION
// ============================================================================

function validateSystemPrompt(prompt: string): {
  passed: boolean;
  critical: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  let critical = false;

  // Check for required sections
  if (!prompt.includes('## WHY')) {
    issues.push('Missing WHY section');
    critical = true;
  }

  if (!prompt.includes('## HOW')) {
    issues.push('Missing HOW section');
    critical = true;
  }

  if (!prompt.includes('## WHAT')) {
    issues.push('Missing WHAT section');
    critical = true;
  }

  // Check length
  const tokenCount = countTokens(prompt);

  if (tokenCount < 1000) {
    issues.push(`Too short: ${tokenCount} tokens (min 1000)`);
  }

  if (tokenCount > 4000) {
    issues.push(`Too long: ${tokenCount} tokens (max 4000)`);
  }

  // Check for placeholder issues
  if (prompt.includes('{{') || prompt.includes('}}')) {
    issues.push('Contains uncompiled Handlebars placeholders');
    critical = true;
  }

  if (prompt.includes('[Error')) {
    issues.push('Contains compilation errors');
    critical = true;
  }

  return {
    passed: issues.length === 0,
    critical,
    issues,
  };
}

// ============================================================================
// UTILITIES
// ============================================================================

function countTokens(text: string): number {
  // Rough approximation: 1 token ≈ 4 characters for Korean text
  // For mixed Korean/English, use 3.5 characters per token
  return Math.ceil(text.length / 3.5);
}
