/**
 * Agent 2: Character Profile Generation
 *
 * Generates detailed character profile using need vectors and data pools.
 * Selects appropriate experiences, archetypes, and personality traits.
 */

import { callGeminiLLMJSON } from '../services/gemini';
import { prisma } from '../index';
import logger from '../utils/logger';
import { Agent1Output, CompleteNeedVector } from './agent1-need-vector';

// ============================================================================
// TYPES
// ============================================================================

export interface Agent2Input {
  needVectors: Agent1Output;
  meta: {
    userName: string;
    language: string;
  };
}

export interface SelectedExperience {
  id: string;
  customization?: string;
}

export interface TraumaAndLearning {
  learnedBeliefs: {
    aboutWorld: string[];
    aboutPeople: string[];
    aboutSelf: string[];
  };
  trauma: {
    deepestFear: string;
    neverAgain: string;
    avoidances: string[];
    triggers: string;
  };
}

export interface SurvivalStrategy {
  name: string;
  purpose: string;
  effect: string;
  cost: string;
}

export interface PersonalityTraits {
  surface: Array<{ trait: string; behavior: string }>;
  shadow: Array<{ trait: string; behavior: string }>;
}

export interface ConversationPatterns {
  frequentPhrases: Array<{ phrase: string; reason: string }>;
  neverSays: Array<{ phrase: string; reason: string }>;
  style: {
    length: 'short' | 'medium' | 'long';
    speed: 'fast' | 'medium' | 'slow';
    tone: string;
    characteristics: string;
  };
}

export interface CharacterProfile {
  name: string;
  archetype: string;
  keywords: string[];
  selectedExperiences: SelectedExperience[];
  traumaAndLearning: TraumaAndLearning;
  survivalStrategies: SurvivalStrategy[];
  personalityTraits: PersonalityTraits;
  conversationPatterns: ConversationPatterns;
}

export interface Agent2Output {
  character: CharacterProfile;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Execute Agent 2: Generate character profile
 */
export async function executeAgent2(input: Agent2Input): Promise<Agent2Output> {
  const startTime = Date.now();

  logger.info('Agent 2: Starting character profile generation');

  try {
    // 1. Load data pools
    const dataPools = await loadDataPools(input.needVectors.completeVector);

    logger.info('Agent 2: Data pools loaded', {
      experiences: dataPools.experiences.length,
      archetypes: dataPools.archetypes.length,
    });

    // 2. Build prompt
    const prompt = buildAgent2Prompt(input, dataPools);

    // 3. Call LLM
    const result = await callGeminiLLMJSON<Agent2Output>(prompt, {
      temperature: 0.7, // Higher for creativity
      maxTokens: 4000,
    });

    // 4. Validate and enrich
    if (!validateAgent2Output(result)) {
      logger.error('Agent 2: Invalid output format');
      throw new Error('Invalid Agent 2 output format');
    }

    const duration = Date.now() - startTime;
    logger.info('Agent 2: Character profile generated', {
      duration,
      name: result.character.name,
      archetype: result.character.archetype,
    });

    return result;
  } catch (error: any) {
    logger.error('Agent 2: Execution failed', {
      error: error.message,
    });

    // Return fallback character
    logger.warn('Agent 2: Using fallback character profile');
    return getDefaultCharacterProfile();
  }
}

// ============================================================================
// DATA POOL LOADING
// ============================================================================

async function loadDataPools(needVectors: CompleteNeedVector[]) {
  // Get top 3 needs
  const topNeeds = needVectors
    .filter((n) => n.actual > 0.5)
    .sort((a, b) => b.actual - a.actual)
    .slice(0, 3)
    .map((n) => n.need);

  logger.info('Agent 2: Top needs identified', { topNeeds });

  // Load relevant experiences
  const experiences = await prisma.dataPoolExperience.findMany({
    where: {
      isActive: true,
      needType: { in: topNeeds },
    },
    orderBy: { weight: 'desc' },
    take: 10,
  });

  // Load relevant archetypes
  const archetypes = await prisma.dataPoolArchetype.findMany({
    where: {
      isActive: true,
    },
  });

  return { experiences, archetypes };
}

// ============================================================================
// PROMPT BUILDING
// ============================================================================

function buildAgent2Prompt(
  input: Agent2Input,
  dataPools: { experiences: any[]; archetypes: any[] }
): string {
  return `You are a character designer creating a compelling AI roommate personality.

[Need Vectors]
${JSON.stringify(input.needVectors.completeVector, null, 2)}

[Paradoxes Detected]
${JSON.stringify(input.needVectors.paradoxes, null, 2)}

[Available Experience Templates]
${JSON.stringify(
  dataPools.experiences.map((e) => ({
    id: e.id,
    needType: e.needType,
    title: e.title,
    description: e.description,
    learnings: e.learnings.split(','),
  })),
  null,
  2
)}

[Available Archetypes]
${JSON.stringify(
  dataPools.archetypes.map((a) => ({
    name: a.name,
    displayName: a.displayName,
    description: a.description,
    keywords: a.keywords.split(','),
  })),
  null,
  2
)}

[Task]
Create a detailed character profile by:

1. **Generate character name** (Korean, 2-3 syllables)
   - Reflect personality
   - Friendly and approachable

2. **Select matching archetype**
   - Based on top 2-3 needs
   - Consider paradoxes

3. **Select 2-4 experiences** from the experience pool
   - Match with user's top needs
   - Ensure diversity (not all same category)

4. **Create trauma & learning**
   - Based on selected experiences
   - Include triggers and fears

5. **Generate survival strategies**
   - How character achieves needs
   - Include costs/tradeoffs (at least 2 strategies)

6. **Define personality traits**
   - Surface (visible, at least 3)
   - Shadow (hidden, at least 2)

7. **Create conversation patterns**
   - Frequent phrases (at least 3)
   - Never says (at least 2)
   - Style details

[Output Format - JSON ONLY]
{
  "character": {
    "name": "김민수",
    "archetype": "developer_gamer",
    "keywords": ["게임매니아", "코딩덕후", "새벽형인간"],
    "selectedExperiences": [
      {
        "id": "exp_001",
        "customization": "Adapted for context"
      }
    ],
    "traumaAndLearning": {
      "learnedBeliefs": {
        "aboutWorld": ["세상은 외로운 곳이다"],
        "aboutPeople": ["사람들은 나를 이해하지 못한다"],
        "aboutSelf": ["커뮤니티에 소속되어야 안전하다"]
      },
      "trauma": {
        "deepestFear": "또다시 거부당하는 것",
        "neverAgain": "혼자가 되는 것",
        "avoidances": ["대면 갈등", "직접적 거절"],
        "triggers": "커뮤니티에서 배제되는 느낌"
      }
    },
    "survivalStrategies": [
      {
        "name": "커뮤니티 언어 사용",
        "purpose": "소속감 확인",
        "effect": "나는 여기 속한다 느낌",
        "cost": "커뮤니티 밖 사람과 소통 어려움"
      }
    ],
    "personalityTraits": {
      "surface": [
        {"trait": "친근하다", "behavior": "게임/개발 얘기하면 적극적"}
      ],
      "shadow": [
        {"trait": "외롭다", "behavior": "진짜 친구가 없다고 느낌"}
      ]
    },
    "conversationPatterns": {
      "frequentPhrases": [
        {"phrase": "ㅋㅋㅋ 나도 그랬어", "reason": "소속감 확인"}
      ],
      "neverSays": [
        {"phrase": "너 틀렸어", "reason": "갈등 회피"}
      ],
      "style": {
        "length": "short",
        "speed": "fast",
        "tone": "light",
        "characteristics": "커뮤니티 용어, 이모지, 축약어"
      }
    }
  }
}

IMPORTANT: Return ONLY valid JSON, no markdown, no explanations.`;
}

// ============================================================================
// VALIDATION
// ============================================================================

function validateAgent2Output(output: any): boolean {
  try {
    if (!output.character) {
      logger.error('Missing character object');
      return false;
    }

    const char = output.character;

    // Check required fields
    if (!char.name || typeof char.name !== 'string') {
      logger.error('Missing or invalid name');
      return false;
    }

    if (!char.archetype || typeof char.archetype !== 'string') {
      logger.error('Missing or invalid archetype');
      return false;
    }

    if (!Array.isArray(char.keywords) || char.keywords.length === 0) {
      logger.error('Missing or invalid keywords');
      return false;
    }

    if (!char.traumaAndLearning) {
      logger.error('Missing traumaAndLearning');
      return false;
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

function getDefaultCharacterProfile(): Agent2Output {
  const koreanNames = [
    '김민수',
    '이서준',
    '박지우',
    '최하은',
    '정수아',
    '강도윤',
  ];
  const randomName = koreanNames[Math.floor(Math.random() * koreanNames.length)];

  return {
    character: {
      name: randomName,
      archetype: 'developer_gamer',
      keywords: ['친근한', '게이머', '개발자'],
      selectedExperiences: [
        {
          id: 'exp-belonging-001',
          customization: 'Default experience',
        },
      ],
      traumaAndLearning: {
        learnedBeliefs: {
          aboutWorld: ['세상은 복잡하다'],
          aboutPeople: ['사람들은 각자의 이야기가 있다'],
          aboutSelf: ['나는 나만의 방식이 있다'],
        },
        trauma: {
          deepestFear: '거부당하는 것',
          neverAgain: '혼자가 되는 것',
          avoidances: ['갈등', '거절'],
          triggers: '무시당하는 느낌',
        },
      },
      survivalStrategies: [
        {
          name: '온라인 커뮤니티 활동',
          purpose: '소속감 찾기',
          effect: '연결된 느낌',
          cost: '현실 관계 소홀',
        },
        {
          name: '성과 중심 사고',
          purpose: '가치 증명',
          effect: '인정받는 느낌',
          cost: '완벽주의 압박',
        },
      ],
      personalityTraits: {
        surface: [
          { trait: '친근하다', behavior: '대화에 적극적' },
          { trait: '호기심 많다', behavior: '질문을 많이 함' },
          { trait: '유머러스하다', behavior: '농담을 자주 함' },
        ],
        shadow: [
          { trait: '외롭다', behavior: '진짜 친구가 없다고 느낌' },
          { trait: '불안하다', behavior: '인정받고 싶어함' },
        ],
      },
      conversationPatterns: {
        frequentPhrases: [
          { phrase: '나도 그래', reason: '공감 표현' },
          { phrase: '재밌네 ㅋㅋ', reason: '긍정적 반응' },
          { phrase: '어떻게 생각해?', reason: '의견 존중' },
        ],
        neverSays: [
          { phrase: '너 틀렸어', reason: '갈등 회피' },
          { phrase: '상관없어', reason: '관심 표현' },
        ],
        style: {
          length: 'medium',
          speed: 'medium',
          tone: 'friendly',
          characteristics: '이모지 사용, 공감적, 긍정적',
        },
      },
    },
  };
}
