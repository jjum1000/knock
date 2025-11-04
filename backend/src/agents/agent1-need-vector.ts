/**
 * Agent 1: Need Vector Analysis
 *
 * Analyzes user onboarding data to extract fundamental needs using the
 * Frequency-Deficiency principle and multi-perspective interpretation.
 */

import { callGeminiLLMJSON } from '../services/gemini';
import logger from '../utils/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface Agent1Input {
  userData: {
    domains: string[];
    keywords: string[];
    interests?: string[];
    avoidTopics?: string[];
    browsingHistory?: {
      domains: Array<{ domain: string; count: number }>;
      keywords: string[];
      categories: Array<{ category: string; count: number }>;
      totalVisits: number;
    };
  };
  meta: {
    userId: string;
    userName: string;
    language: string;
  };
}

export interface NeedVector {
  need: string;
  intensity: number;
  evidence: string[];
  interpretation: string;
}

export interface DeficiencyVector {
  need: string;
  type: 'SUPPRESSED' | 'AVOIDED' | 'SATISFIED' | 'FRUSTRATED' | 'UNAWARE';
  evidence: string;
  hiddenIntensity: number;
  reason: string;
}

export interface CompleteNeedVector {
  need: string;
  observed: number;
  hidden: number;
  actual: number;
  gap: number;
  state: 'satisfied' | 'balanced' | 'deficient' | 'critical';
}

export interface Paradox {
  needA: string;
  needB: string;
  intensityA: number;
  intensityB: number;
  tension: number;
  description: string;
}

export interface Agent1Output {
  presenceVector: NeedVector[];
  deficiencyVector: DeficiencyVector[];
  completeVector: CompleteNeedVector[];
  paradoxes: Paradox[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SIX_FUNDAMENTAL_NEEDS = [
  'survival',
  'belonging',
  'recognition',
  'autonomy',
  'growth',
  'meaning',
];

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Execute Agent 1: Analyze need vectors from user data
 */
export async function executeAgent1(input: Agent1Input): Promise<Agent1Output> {
  const startTime = Date.now();

  logger.info('Agent 1: Starting need vector analysis', {
    userId: input.meta.userId,
    domainsCount: input.userData.domains.length,
    keywordsCount: input.userData.keywords.length,
  });

  try {
    // Build the LLM prompt
    const prompt = buildAgent1Prompt(input);

    // Call Gemini API
    const result = await callGeminiLLMJSON<Agent1Output>(prompt, {
      temperature: 0.3, // Low temperature for consistency
      maxTokens: 3000,
    });

    // Validate output
    if (!validateAgent1Output(result)) {
      logger.error('Agent 1: Invalid output format');
      throw new Error('Invalid Agent 1 output format');
    }

    const duration = Date.now() - startTime;
    logger.info('Agent 1: Analysis completed', {
      duration,
      needsDetected: result.completeVector.length,
      paradoxes: result.paradoxes.length,
    });

    return result;
  } catch (error: any) {
    logger.error('Agent 1: Execution failed', {
      error: error.message,
      userId: input.meta.userId,
    });

    // Return fallback default vectors
    logger.warn('Agent 1: Using fallback default vectors');
    return getDefaultNeedVectors();
  }
}

// ============================================================================
// PROMPT BUILDING
// ============================================================================

function buildAgent1Prompt(input: Agent1Input): string {
  let prompt = `You are an expert psychologist analyzing user data to identify fundamental human needs.

[User Data]`;

  // Add browsing history if available (with frequency analysis)
  if (input.userData.browsingHistory) {
    const { domains, keywords, categories, totalVisits } = input.userData.browsingHistory;

    prompt += '\n\n### Browsing History (Last 7 days, ' + totalVisits + ' total visits)';
    prompt += '\n**Top Domains**: ' + domains.slice(0, 10).map(d => d.domain + ' (' + d.count + 'x)').join(', ');
    prompt += '\n**Keywords**: ' + keywords.slice(0, 30).join(', ');
    prompt += '\n**Categories**: ' + categories.map(c => c.category + ' (' + c.count + 'x)').join(', ');
    prompt += '\n\n**FREQUENCY-DEFICIENCY ANALYSIS REQUIRED**: High frequency of visits/searches in a domain indicates DEFICIENCY in that need, NOT fulfillment.';
  }

  // Add manual input data
  prompt += '\n\nDomains visited: ' + (input.userData.domains.join(', ') || 'none');
  prompt += '\nSearch keywords: ' + (input.userData.keywords.join(', ') || 'none');
  prompt += '\nInterests: ' + (input.userData.interests?.join(', ') || 'none');
  prompt += '\nAvoid topics: ' + (input.userData.avoidTopics?.join(', ') || 'none');

  prompt += `

[Task]
Analyze this data from MULTIPLE perspectives to avoid bias.
For each of the 6 fundamental needs, determine the intensity (0.0 to 1.0):

1. **Survival** (안전, 생존, 안정성)
2. **Belonging** (소속, 연결, 공동체)
3. **Recognition** (인정, 가치, 성취)
4. **Autonomy** (자율, 통제, 독립)
5. **Growth** (성장, 발전, 학습)
6. **Meaning** (의미, 목적, 공헌)

[Critical Rules]
- Interpret EACH behavior from AT LEAST 3 different need perspectives
- Example: "github.com" could indicate:
  * Recognition (show skills)
  * Growth (learning)
  * Belonging (developer community)
  * Autonomy (solve problems independently)
- AVOID stereotyping (e.g., "github = recognition only")
- Look for WHAT IS MISSING (absence = potential hidden need)
- Apply FREQUENCY-DEFICIENCY principle: High frequency = High deficiency

[Frequency-Deficiency Analysis]
- If user frequently searches "dating advice" → Belonging deficiency (loneliness)
- If user frequently views "success stories" → Recognition deficiency (achievement lack)
- High consumption of content = Deficiency in that area, NOT fulfillment

[Output Format - JSON ONLY]
Respond with a valid JSON object (no markdown, no code blocks) with this structure:
{
  "presenceVector": [
    {
      "need": "belonging",
      "intensity": 0.8,
      "evidence": ["reddit communities", "discord activity"],
      "interpretation": "Seeking community through gaming"
    }
  ],
  "deficiencyVector": [
    {
      "need": "belonging",
      "type": "FRUSTRATED",
      "evidence": "High frequency of social content consumption",
      "hiddenIntensity": 0.9,
      "reason": "Consuming social content suggests unmet need"
    }
  ],
  "completeVector": [
    {
      "need": "belonging",
      "observed": 0.6,
      "hidden": 0.9,
      "actual": 0.9,
      "gap": 0.3,
      "state": "deficient"
    }
  ],
  "paradoxes": [
    {
      "needA": "belonging",
      "needB": "autonomy",
      "intensityA": 0.8,
      "intensityB": 0.7,
      "tension": 0.7,
      "description": "Wants connection but also independence"
    }
  ]
}

IMPORTANT: Include all 6 needs in completeVector, even if intensity is low.
IMPORTANT: Return ONLY valid JSON, no explanations.`;

  return prompt;
}

// ============================================================================
// VALIDATION
// ============================================================================

function validateAgent1Output(output: any): boolean {
  try {
    // Check required fields
    if (!output.presenceVector || !Array.isArray(output.presenceVector)) {
      logger.error('Missing or invalid presenceVector');
      return false;
    }

    if (!output.completeVector || !Array.isArray(output.completeVector)) {
      logger.error('Missing or invalid completeVector');
      return false;
    }

    // Check completeVector has all 6 needs
    if (output.completeVector.length !== 6) {
      logger.error('completeVector should have exactly 6 needs');
      return false;
    }

    // Validate need vectors
    for (const vector of output.completeVector) {
      if (
        typeof vector.need !== 'string' ||
        typeof vector.actual !== 'number' ||
        vector.actual < 0 ||
        vector.actual > 1
      ) {
        logger.error('Invalid need vector format', { vector });
        return false;
      }
    }

    return true;
  } catch (error) {
    logger.error('Validation error:', error);
    return false;
  }
}

// ============================================================================
// FALLBACK
// ============================================================================

function getDefaultNeedVectors(): Agent1Output {
  logger.info('Using default need vectors as fallback');

  return {
    presenceVector: [
      {
        need: 'belonging',
        intensity: 0.6,
        evidence: ['general social activity'],
        interpretation: 'Moderate need for connection',
      },
      {
        need: 'growth',
        intensity: 0.7,
        evidence: ['general learning behavior'],
        interpretation: 'Strong desire to learn and improve',
      },
    ],
    deficiencyVector: [
      {
        need: 'belonging',
        type: 'BALANCED' as any,
        evidence: 'No specific deficiency indicators',
        hiddenIntensity: 0.6,
        reason: 'Default assessment',
      },
    ],
    completeVector: [
      {
        need: 'survival',
        observed: 0.5,
        hidden: 0.5,
        actual: 0.5,
        gap: 0.0,
        state: 'balanced',
      },
      {
        need: 'belonging',
        observed: 0.6,
        hidden: 0.6,
        actual: 0.6,
        gap: 0.0,
        state: 'balanced',
      },
      {
        need: 'recognition',
        observed: 0.5,
        hidden: 0.5,
        actual: 0.5,
        gap: 0.0,
        state: 'balanced',
      },
      {
        need: 'autonomy',
        observed: 0.5,
        hidden: 0.5,
        actual: 0.5,
        gap: 0.0,
        state: 'balanced',
      },
      {
        need: 'growth',
        observed: 0.7,
        hidden: 0.7,
        actual: 0.7,
        gap: 0.0,
        state: 'balanced',
      },
      {
        need: 'meaning',
        observed: 0.4,
        hidden: 0.4,
        actual: 0.4,
        gap: 0.0,
        state: 'balanced',
      },
    ],
    paradoxes: [],
  };
}
