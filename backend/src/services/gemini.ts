import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from '../utils/logger';

// Initialize Gemini API
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

if (!GEMINI_API_KEY) {
  logger.warn('⚠️  GEMINI_API_KEY is not set. AI features will use mock responses.');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// ============================================================================
// TYPES
// ============================================================================

export interface GeminiLLMOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
}

export interface GeminiImageOptions {
  negativePrompt?: string;
  aspectRatio?: string;
  guidanceScale?: number;
  numberOfImages?: number;
}

// ============================================================================
// LLM SERVICE
// ============================================================================

/**
 * Call Gemini LLM API for text generation
 */
export async function callGeminiLLM(
  prompt: string,
  options: GeminiLLMOptions = {}
): Promise<string> {
  const {
    model = process.env.GEMINI_LLM_MODEL || 'gemini-1.5-pro',
    temperature = parseFloat(process.env.GEMINI_LLM_TEMPERATURE || '0.7'),
    maxTokens = parseInt(process.env.GEMINI_LLM_MAX_TOKENS || '4000'),
  } = options;

  try {
    // If no API key, return mock response
    if (!GEMINI_API_KEY) {
      logger.warn('Using mock Gemini LLM response');
      return getMockLLMResponse(prompt);
    }

    const genModel = genAI.getGenerativeModel({ model });

    const result = await genModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
      },
    });

    const response = result.response;
    const text = response.text();

    logger.info('Gemini LLM call successful', {
      model,
      promptLength: prompt.length,
      responseLength: text.length,
    });

    return text;
  } catch (error: any) {
    logger.error('Gemini LLM call failed:', {
      error: error.message,
      model,
    });

    // Fallback to mock response on error
    logger.warn('Falling back to mock LLM response');
    return getMockLLMResponse(prompt);
  }
}

/**
 * Call Gemini LLM API and expect JSON response
 */
export async function callGeminiLLMJSON<T = any>(
  prompt: string,
  options: GeminiLLMOptions = {}
): Promise<T> {
  const fullPrompt = `${prompt}

IMPORTANT: Respond with ONLY valid JSON, no markdown code blocks, no explanations.`;

  const response = await callGeminiLLM(fullPrompt, options);

  try {
    // Remove markdown code blocks if present
    let cleanedResponse = response.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    return JSON.parse(cleanedResponse);
  } catch (error: any) {
    logger.error('Failed to parse JSON response:', {
      error: error.message,
      response: response.substring(0, 500),
    });
    throw new Error('Invalid JSON response from LLM');
  }
}

// ============================================================================
// IMAGE GENERATION SERVICE (MOCK)
// ============================================================================

/**
 * Generate image using Gemini Imagen API
 * Note: Currently returns fallback preset as Imagen integration requires additional setup
 */
export async function generateImage(
  prompt: string,
  options: GeminiImageOptions = {}
): Promise<{
  imageUrl: string;
  validated: boolean;
  fallback: boolean;
}> {
  try {
    logger.info('Image generation requested', {
      promptLength: prompt.length,
      options,
    });

    // Check if AI image generation is enabled
    const useAIGeneration = process.env.USE_AI_IMAGE_GENERATION === 'true';

    if (!useAIGeneration || !GEMINI_API_KEY) {
      logger.info('Using fallback preset image');
      return {
        imageUrl: selectFallbackPreset(),
        validated: false,
        fallback: true,
      };
    }

    // TODO: Implement actual Gemini Imagen API call
    // For now, always use fallback
    logger.info('Gemini Imagen not yet implemented, using fallback');
    return {
      imageUrl: selectFallbackPreset(),
      validated: false,
      fallback: true,
    };
  } catch (error: any) {
    logger.error('Image generation failed:', error);
    return {
      imageUrl: selectFallbackPreset(),
      validated: false,
      fallback: true,
    };
  }
}

/**
 * Select a fallback preset image
 */
function selectFallbackPreset(): string {
  const presets = [
    '/uploads/presets/room-developer-gamer.png',
    '/uploads/presets/room-minimalist.png',
    '/uploads/presets/room-cozy-creative.png',
    '/uploads/presets/room-focused-learner.png',
    '/uploads/presets/room-default.png',
  ];

  // Random selection
  const index = Math.floor(Math.random() * presets.length);
  return presets[index];
}

// ============================================================================
// MOCK RESPONSES (for development without API key)
// ============================================================================

function getMockLLMResponse(prompt: string): string {
  // Check what kind of response is expected based on prompt keywords
  if (prompt.includes('need') && prompt.includes('vector')) {
    return JSON.stringify({
      presenceVector: [
        {
          need: 'belonging',
          intensity: 0.8,
          evidence: ['gaming communities', 'online forums'],
          interpretation: 'Seeking community through shared interests',
        },
        {
          need: 'recognition',
          intensity: 0.7,
          evidence: ['achievement focus', 'skill building'],
          interpretation: 'Wants to be valued for abilities',
        },
        {
          need: 'growth',
          intensity: 0.6,
          evidence: ['learning', 'development'],
          interpretation: 'Continuous self-improvement',
        },
      ],
      deficiencyVector: [
        {
          need: 'belonging',
          type: 'FRUSTRATED',
          evidence: 'High consumption of community content',
          hiddenIntensity: 0.9,
          reason: 'Frequent seeking suggests unmet need',
        },
      ],
      completeVector: [
        {
          need: 'belonging',
          observed: 0.8,
          hidden: 0.9,
          actual: 0.9,
          gap: 0.1,
          state: 'deficient',
        },
        {
          need: 'recognition',
          observed: 0.7,
          hidden: 0.6,
          actual: 0.7,
          gap: 0.0,
          state: 'balanced',
        },
      ],
      paradoxes: [
        {
          needA: 'belonging',
          needB: 'autonomy',
          intensityA: 0.8,
          intensityB: 0.6,
          tension: 0.7,
          description: 'Wants connection but values independence',
        },
      ],
    });
  }

  if (prompt.includes('character') && prompt.includes('profile')) {
    return JSON.stringify({
      character: {
        name: '김민수',
        archetype: 'developer_gamer',
        keywords: ['게임매니아', '코딩덕후', '새벽형인간'],
        selectedExperiences: [
          {
            id: 'exp-belonging-001',
            customization: 'Adapted for gaming context',
          },
        ],
        traumaAndLearning: {
          learnedBeliefs: {
            aboutWorld: ['세상은 경쟁적이다'],
            aboutPeople: ['온라인 친구가 더 편하다'],
            aboutSelf: ['커뮤니티에 소속되어야 안전하다'],
          },
          trauma: {
            deepestFear: '거부당하는 것',
            neverAgain: '혼자가 되는 것',
            avoidances: ['대면 갈등', '직접적 거절'],
            triggers: '커뮤니티에서 배제되는 느낌',
          },
        },
        survivalStrategies: [
          {
            name: '온라인 커뮤니티 활동',
            purpose: '소속감 확인',
            effect: '안전하고 연결된 느낌',
            cost: '현실 관계 소홀',
          },
        ],
        personalityTraits: {
          surface: [
            {
              trait: '친근하다',
              behavior: '게임 얘기하면 적극적',
            },
          ],
          shadow: [
            {
              trait: '외롭다',
              behavior: '진짜 친구가 없다고 느낌',
            },
          ],
        },
        conversationPatterns: {
          frequentPhrases: [
            {
              phrase: 'ㅋㅋㅋ 나도 그랬어',
              reason: '소속감 확인',
            },
          ],
          neverSays: [
            {
              phrase: '너 틀렸어',
              reason: '갈등 회피',
            },
          ],
          style: {
            length: 'short',
            speed: 'fast',
            tone: 'light',
            characteristics: '커뮤니티 용어, 이모지 사용',
          },
        },
      },
    });
  }

  // Default mock response
  return 'Mock response: ' + prompt.substring(0, 100);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Count tokens in a text (approximate)
 */
export function countTokens(text: string): number {
  // Rough approximation: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}

/**
 * Validate API key
 */
export function validateGeminiApiKey(): boolean {
  return !!GEMINI_API_KEY && GEMINI_API_KEY.length > 0;
}

/**
 * Get API status
 */
export async function getGeminiStatus(): Promise<{
  available: boolean;
  model: string;
  features: {
    llm: boolean;
    imagen: boolean;
  };
}> {
  const hasKey = validateGeminiApiKey();

  return {
    available: hasKey,
    model: process.env.GEMINI_LLM_MODEL || 'gemini-1.5-pro',
    features: {
      llm: hasKey,
      imagen: hasKey && process.env.USE_AI_IMAGE_GENERATION === 'true',
    },
  };
}
