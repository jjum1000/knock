# 에이전트 기반 캐릭터 생성 플로우
**작성일**: 2025-10-28 (수정)
**목적**: 완전 자동화된 에이전트 파이프라인으로 룸메이트 생성

---

## 📋 개요

온보딩 데이터를 입력받아 **5개의 에이전트가 순차적으로 실행**되어 완성된 룸메이트를 자동 생성합니다.
관리자는 **템플릿과 데이터 풀만 관리**하고, 실제 생성은 에이전트가 담당합니다.

---

## 🔄 전체 파이프라인

```
[온보딩 데이터 입력]
        ↓
┌─────────────────────────────────────┐
│ Agent 1: 욕구 벡터 분석              │
│ - Presence Vector (있는 것)         │
│ - Deficiency Vector (없는 것)       │
│ - Complete Vector (통합)            │
│ - Paradox Detection (역설 발견)     │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ Agent 2: 캐릭터 프로파일 생성         │
│ - 데이터 풀에서 경험 선택            │
│ - 아키타입 매칭                      │
│ - 성격/대화 패턴 생성                │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ Agent 3: 시스템 프롬프트 조립         │
│ - 템플릿 로드                        │
│ - 변수 치환 (Handlebars)            │
│ - 검증 (WHY-HOW-WHAT 구조)          │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ Agent 4: 이미지 프롬프트 생성         │
│ - 욕구 → 시각 요소 매핑              │
│ - 트라우마 → 방어 요소               │
│ - 픽셀아트 프롬프트 조립             │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ Agent 5: 이미지 생성                 │
│ - Gemini Imagen API 호출            │
│ - 품질 검증                          │
│ - Fallback 처리                     │
└──────────────┬──────────────────────┘
               ↓
      [완성된 룸메이트 출력]
```

---

## Agent 1: 욕구 벡터 분석

### 목적
사용자 온보딩 데이터에서 **6가지 근원적 욕구**의 강도를 자동 분석합니다.

### 입력 데이터

```typescript
interface Agent1Input {
  userData: {
    domains: string[];      // ["github.com", "stackoverflow.com"]
    keywords: string[];     // ["react hooks", "best indie games"]
    interests: string[];    // ["개발", "게임"]
    avoidTopics: string[];  // ["정치"]
  };
  meta: {
    userId: string;
    userName: string;
    language: string;
  };
}
```

### LLM 프롬프트

```typescript
const AGENT1_PROMPT = `
You are an expert psychologist analyzing user data to identify fundamental human needs.

[User Data]
Domains visited: ${input.userData.domains.join(', ')}
Search keywords: ${input.userData.keywords.join(', ')}
Interests: ${input.userData.interests.join(', ')}
Avoid topics: ${input.userData.avoidTopics.join(', ')}

[Task]
Analyze this data from MULTIPLE perspectives to avoid bias.
For each of the 6 fundamental needs, determine the intensity (0.0 to 1.0):

1. **Survival** (안전, 생존)
2. **Belonging** (소속, 연결)
3. **Recognition** (인정, 가치)
4. **Autonomy** (자율, 통제)
5. **Growth** (성장, 발전)
6. **Meaning** (의미, 목적)

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
{
  "presenceVector": [
    {
      "need": "belonging",
      "intensity": 0.8,
      "evidence": ["reddit.com/r/gaming (community)", "discord activity"],
      "interpretation": "Seeking community through gaming"
    },
    // ... 5 more needs
  ],
  "deficiencyVector": [
    {
      "need": "belonging",
      "type": "SUPPRESSED" | "AVOIDED" | "SATISFIED" | "FRUSTRATED" | "UNAWARE",
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
    },
    // ... 5 more
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
`;
```

### 실행 코드

```typescript
async function executeAgent1(input: Agent1Input): Promise<Agent1Output> {
  const prompt = buildAgent1Prompt(input);

  try {
    const result = await callGeminiAPI({
      prompt,
      model: 'gemini-1.5-pro',
      temperature: 0.3,  // Low for consistency
      maxTokens: 3000
    });

    const output = JSON.parse(result);

    // 검증
    if (!validateAgent1Output(output)) {
      throw new Error('Invalid Agent 1 output format');
    }

    return output;

  } catch (error) {
    console.error('Agent 1 failed:', error);

    // Fallback: 기본 벡터 사용
    return getDefaultNeedVectors();
  }
}

function validateAgent1Output(output: any): boolean {
  return (
    Array.isArray(output.presenceVector) &&
    output.presenceVector.length === 6 &&
    Array.isArray(output.completeVector) &&
    output.completeVector.every(v => v.actual >= 0 && v.actual <= 1)
  );
}
```

### 출력 데이터

```typescript
interface Agent1Output {
  presenceVector: NeedVector[];
  deficiencyVector: DeficiencyVector[];
  completeVector: CompleteNeedVector[];
  paradoxes: Paradox[];
}
```

---

## Agent 2: 캐릭터 프로파일 생성

### 목적
욕구 벡터를 기반으로 **구체적인 캐릭터 프로파일**을 생성합니다.
**데이터 풀**에서 적합한 경험/아키타입을 선택합니다.

### 입력 데이터

```typescript
interface Agent2Input {
  needVectors: Agent1Output;
  dataPools: {
    experiences: ExperienceTemplate[];
    archetypes: ArchetypeTemplate[];
  };
  meta: {
    userName: string;
    language: string;
  };
}
```

### LLM 프롬프트

```typescript
const AGENT2_PROMPT = `
You are a character designer creating a compelling AI roommate personality.

[Need Vectors]
${JSON.stringify(input.needVectors.completeVector, null, 2)}

[Paradoxes Detected]
${JSON.stringify(input.needVectors.paradoxes, null, 2)}

[Available Experience Templates]
${JSON.stringify(input.dataPools.experiences, null, 2)}

[Available Archetypes]
${JSON.stringify(input.dataPools.archetypes, null, 2)}

[Task]
Create a detailed character profile by:

1. **Select 3-5 experiences** from the experience pool
   - Match triggers.needs with user's top needs
   - Higher priority experiences first
   - Ensure diversity (not all same category)

2. **Generate character name** (Korean, 2-3 syllables)
   - Reflect personality
   - Friendly and approachable

3. **Select matching archetype**
   - Based on top 2-3 needs
   - Consider paradoxes

4. **Create trauma & learning**
   - Based on selected experiences
   - Include triggers

5. **Generate survival strategies**
   - How character achieves needs
   - Include costs/tradeoffs

6. **Define personality traits**
   - Surface (visible)
   - Shadow (hidden)

7. **Create conversation patterns**
   - Frequent phrases
   - Never says
   - Style (length, speed, tone)

[Output Format - JSON ONLY]
{
  "character": {
    "name": "김민수",
    "archetype": "developer_gamer",
    "keywords": ["게임매니아", "코딩덕후", "새벽형인간"],

    "selectedExperiences": [
      {
        "id": "exp_001",
        "customization": "Adapted for gaming context"
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
`;
```

### 실행 코드

```typescript
async function executeAgent2(input: Agent2Input): Promise<Agent2Output> {
  // 1. 데이터 풀에서 관련 데이터 필터링
  const relevantExperiences = filterExperiences(
    input.dataPools.experiences,
    input.needVectors.completeVector
  );

  const relevantArchetypes = filterArchetypes(
    input.dataPools.archetypes,
    input.needVectors.completeVector
  );

  // 2. LLM 호출
  const prompt = buildAgent2Prompt({
    needVectors: input.needVectors,
    experiences: relevantExperiences,
    archetypes: relevantArchetypes,
    meta: input.meta
  });

  const result = await callGeminiAPI({
    prompt,
    model: 'gemini-1.5-pro',
    temperature: 0.7,  // Higher for creativity
    maxTokens: 4000
  });

  return JSON.parse(result);
}

// 욕구 벡터와 매칭되는 경험 필터링
function filterExperiences(
  pool: ExperienceTemplate[],
  needs: CompleteNeedVector[]
): ExperienceTemplate[] {
  const topNeeds = needs
    .filter(n => n.actual > 0.5)
    .sort((a, b) => b.actual - a.actual)
    .slice(0, 3)
    .map(n => n.need);

  return pool
    .filter(exp =>
      exp.triggers.needs.some(n => topNeeds.includes(n))
    )
    .sort((a, b) => b.triggers.priority - a.triggers.priority)
    .slice(0, 10);  // Top 10 candidates
}
```

---

## Agent 3: 시스템 프롬프트 조립

### 목적
**템플릿**과 **Agent 2의 캐릭터 프로파일**을 결합하여 최종 시스템 프롬프트를 생성합니다.

### 입력 데이터

```typescript
interface Agent3Input {
  template: PromptTemplate;  // 관리자가 정의한 템플릿
  character: Agent2Output;
  needVectors: Agent1Output;
  experiences: ExperienceTemplate[];  // 실제 선택된 경험들
  meta: {
    userName: string;
  };
}
```

### 실행 코드 (Handlebars 기반)

```typescript
import Handlebars from 'handlebars';

async function executeAgent3(input: Agent3Input): Promise<Agent3Output> {
  // 1. 템플릿 로드
  const template = input.template;

  // 2. 변수 준비
  const variables = {
    characterName: input.character.name,
    userName: input.meta.userName,

    // WHY 섹션
    needs: input.needVectors.completeVector
      .filter(n => n.actual > 0.5)
      .map(n => ({
        name: NEED_NAMES_KR[n.need],
        intensity: n.actual > 0.8 ? '강함' : n.actual > 0.5 ? '중간' : '약함',
        description: NEED_DESCRIPTIONS[n.need]
      })),

    // PAST 섹션
    experiences: input.character.selectedExperiences.map((sel, index) => {
      const exp = input.experiences.find(e => e.id === sel.id);
      return {
        index: index + 1,
        title: exp.title,
        event: exp.event,
        age: exp.ageRange[0],
        ageContext: `${exp.ageRange[0]}세`,
        learnings: exp.learnings
      };
    }),

    // TRAUMA 섹션
    trauma: input.character.traumaAndLearning,

    // HOW 섹션
    strategies: input.character.survivalStrategies,

    // PERSONALITY 섹션
    personality: input.character.personalityTraits,

    // WHAT 섹션
    conversation: input.character.conversationPatterns
  };

  // 3. 섹션별 조립
  const sections = {
    why: Handlebars.compile(template.sections.why)(variables),
    past: Handlebars.compile(template.sections.past)(variables),
    trauma: Handlebars.compile(template.sections.trauma)(variables),
    how: Handlebars.compile(template.sections.how)(variables),
    personality: Handlebars.compile(template.sections.personality)(variables),
    what: Handlebars.compile(template.sections.what)(variables),
    relationship: Handlebars.compile(template.sections.relationship)(variables)
  };

  // 4. 최종 조립
  const systemPrompt = `
# 시스템 프롬프트: ${variables.characterName}

${sections.why}

---

${sections.past}

---

${sections.trauma}

---

${sections.how}

---

${sections.personality}

---

${sections.what}

---

${sections.relationship}
`.trim();

  // 5. 검증
  const validation = validateSystemPrompt(systemPrompt);

  if (!validation.passed) {
    console.warn('System prompt validation failed:', validation.issues);

    if (validation.critical) {
      throw new Error('Critical validation failure');
    }
  }

  return {
    systemPrompt,
    validation,
    tokenCount: countTokens(systemPrompt)
  };
}

function validateSystemPrompt(prompt: string): {
  passed: boolean;
  critical: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  let critical = false;

  // WHY-HOW-WHAT 구조 확인
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

  // 길이 확인
  const tokenCount = countTokens(prompt);
  if (tokenCount < 1000) {
    issues.push(`Too short: ${tokenCount} tokens`);
  }
  if (tokenCount > 4000) {
    issues.push(`Too long: ${tokenCount} tokens`);
  }

  return {
    passed: issues.length === 0,
    critical,
    issues
  };
}
```

---

## Agent 4: 이미지 프롬프트 생성

### 목적
욕구 벡터와 캐릭터 프로파일을 기반으로 **픽셀아트 이미지 프롬프트**를 생성합니다.

### 입력 데이터

```typescript
interface Agent4Input {
  needVectors: Agent1Output;
  character: Agent2Output;
  visualElementsPool: VisualElementTemplate[];
}
```

### 실행 코드

```typescript
async function executeAgent4(input: Agent4Input): Promise<Agent4Output> {
  // 1. 욕구 → 시각 요소 매핑
  const visualLanguage = mapNeedsToVisuals(
    input.needVectors.completeVector
  );

  // 2. 트라우마 → 방어 요소
  const defensiveElements = mapTraumaToDefense(
    input.character.traumaAndLearning
  );

  // 3. 아키타입 → 오브젝트 선택
  const archetype = input.character.archetype;
  const objects = selectObjectsFromPool(
    input.visualElementsPool,
    archetype,
    input.needVectors.completeVector
  );

  // 4. 프롬프트 조립
  const imagePrompt = assembleImagePrompt({
    visualLanguage,
    defensiveElements,
    objects,
    archetype
  });

  return {
    imagePrompt,
    metadata: {
      visualLanguage,
      defensiveElements,
      objects,
      archetype
    }
  };
}

function mapNeedsToVisuals(
  needs: CompleteNeedVector[]
): VisualLanguage {
  const topNeeds = needs
    .filter(n => n.actual > 0.5)
    .sort((a, b) => b.actual - a.actual)
    .slice(0, 3);

  // 가장 강한 욕구의 색상
  const primary = VISUAL_MAPPINGS[topNeeds[0].need];

  return {
    colors: {
      primary: primary.colors.primary,
      secondary: topNeeds[1]
        ? VISUAL_MAPPINGS[topNeeds[1].need].colors.secondary
        : primary.colors.secondary,
      accent: topNeeds[2]
        ? VISUAL_MAPPINGS[topNeeds[2].need].colors.accent
        : primary.colors.accent
    },
    space: primary.space,
    lighting: primary.lighting,
    mood: topNeeds.map(n => VISUAL_MAPPINGS[n.need].mood).join(' with ')
  };
}

function assembleImagePrompt(data: {
  visualLanguage: VisualLanguage;
  defensiveElements: DefensiveElement[];
  objects: string[];
  archetype: string;
}): string {
  return `
Create a pixel art room (256x512px, isometric view).

[Style]
- 16-bit pixel art (SNES era)
- Isometric perspective
- 32 color palette maximum
- Clear pixel boundaries, no anti-aliasing

[Room Atmosphere]
Colors:
- Primary: ${data.visualLanguage.colors.primary}
- Secondary: ${data.visualLanguage.colors.secondary}
- Accent: ${data.visualLanguage.colors.accent}

Lighting: ${data.visualLanguage.lighting}
Mood: ${data.visualLanguage.mood}

[Key Objects]
${data.objects.map((obj, i) => `${i + 1}. ${obj}`).join('\n')}

[Defensive Elements] (subtle, integrated naturally)
${data.defensiveElements.map(el => `- ${el.object} (${el.placement})`).join('\n')}

[Technical Requirements]
- Size: 256x512 pixels (portrait)
- No text, no characters
- No photorealistic elements
- Pure pixel art style

Generate the image.
`.trim();
}
```

---

## Agent 5: 이미지 생성

### 목적
**Gemini Imagen API**를 호출하여 실제 이미지를 생성하고 품질을 검증합니다.

### 실행 코드

```typescript
async function executeAgent5(input: Agent5Input): Promise<Agent5Output> {
  const { imagePrompt } = input;

  try {
    // 1. Gemini Imagen 호출
    const result = await generateWithGeminiImagen({
      prompt: imagePrompt,
      negativePrompt: NEGATIVE_PROMPT,
      aspectRatio: '9:16',
      guidanceScale: 7.5
    });

    // 2. 품질 검증
    const validation = await validateImage(result.imageData);

    if (!validation.passed) {
      console.warn('Image validation failed:', validation.issues);

      if (validation.retryable) {
        // 재시도
        return await executeAgent5(input);
      }

      // Fallback
      return {
        imageUrl: selectFallbackPreset(),
        validated: false,
        fallback: true,
        validation
      };
    }

    // 3. CDN 업로드
    const imageUrl = await uploadToCDN(result.imageData, 'rooms');

    return {
      imageUrl,
      validated: true,
      fallback: false,
      validation
    };

  } catch (error) {
    console.error('Agent 5 failed:', error);

    // Fallback
    return {
      imageUrl: selectFallbackPreset(),
      validated: false,
      fallback: true,
      error: error.message
    };
  }
}

async function validateImage(imageData: Buffer): Promise<{
  passed: boolean;
  retryable: boolean;
  issues: string[];
}> {
  const issues: string[] = [];
  let retryable = false;

  // 해상도
  const dimensions = await getImageDimensions(imageData);
  if (dimensions.width !== 256 || dimensions.height !== 512) {
    issues.push(`Wrong dimensions: ${dimensions.width}x${dimensions.height}`);
  }

  // 색상 수
  const colorCount = await countUniqueColors(imageData);
  if (colorCount > 40) {
    issues.push(`Too many colors: ${colorCount}`);
    retryable = true;
  }

  // 픽셀아트 스타일
  const isPixelArt = await detectPixelArtStyle(imageData);
  if (!isPixelArt) {
    issues.push('Not pixel art style');
    retryable = true;
  }

  return {
    passed: issues.length === 0,
    retryable,
    issues
  };
}
```

---

## 통합 실행 엔진

### 전체 파이프라인 실행

```typescript
async function executeAgentPipeline(
  input: AgentInput,
  config: AgentConfig
): Promise<AgentOutput> {

  const jobId = `job_${Date.now()}`;
  const logs: LogEntry[] = [];

  try {
    // 로그 시작
    addLog(logs, 'info', 'Pipeline started');

    // Agent 1: 욕구 벡터 분석
    addLog(logs, 'info', 'Agent 1: Analyzing need vectors...');
    const agent1Result = await executeAgent1({
      userData: input.userData,
      meta: input.meta
    });
    addLog(logs, 'success', `Agent 1: Found ${agent1Result.completeVector.length} needs`);

    // Agent 2: 캐릭터 프로파일 생성
    addLog(logs, 'info', 'Agent 2: Generating character profile...');
    const dataPools = await loadDataPools();
    const agent2Result = await executeAgent2({
      needVectors: agent1Result,
      dataPools,
      meta: input.meta
    });
    addLog(logs, 'success', `Agent 2: Created ${agent2Result.character.name}`);

    // Agent 3: 시스템 프롬프트 조립
    addLog(logs, 'info', 'Agent 3: Assembling system prompt...');
    const template = await loadTemplate(config.templateId);
    const experiences = await loadExperiences(
      agent2Result.character.selectedExperiences.map(e => e.id)
    );
    const agent3Result = await executeAgent3({
      template,
      character: agent2Result,
      needVectors: agent1Result,
      experiences,
      meta: input.meta
    });
    addLog(logs, 'success', `Agent 3: Generated ${agent3Result.tokenCount} tokens`);

    // Agent 4: 이미지 프롬프트 생성
    addLog(logs, 'info', 'Agent 4: Creating image prompt...');
    const visualElementsPool = await loadVisualElements();
    const agent4Result = await executeAgent4({
      needVectors: agent1Result,
      character: agent2Result,
      visualElementsPool
    });
    addLog(logs, 'success', 'Agent 4: Image prompt ready');

    // Agent 5: 이미지 생성
    addLog(logs, 'info', 'Agent 5: Generating image...');
    const agent5Result = await executeAgent5({
      imagePrompt: agent4Result.imagePrompt
    });
    addLog(logs, agent5Result.validated ? 'success' : 'warning',
      `Agent 5: Image ${agent5Result.fallback ? 'fallback' : 'generated'}`);

    // 품질 검증
    const quality = calculateQuality({
      agent1Result,
      agent2Result,
      agent3Result,
      agent5Result
    });

    addLog(logs, 'success', `Pipeline completed (Quality: ${quality.score}/100)`);

    // 최종 출력
    const output: AgentOutput = {
      analysis: {
        presenceVector: agent1Result.presenceVector,
        deficiencyVector: agent1Result.deficiencyVector,
        completeVector: agent1Result.completeVector,
        paradoxes: agent1Result.paradoxes
      },
      character: agent2Result.character,
      prompts: {
        systemPrompt: agent3Result.systemPrompt,
        imagePrompt: agent4Result.imagePrompt
      },
      image: {
        url: agent5Result.imageUrl,
        metadata: agent4Result.metadata
      },
      quality
    };

    // DB 저장 (dryRun이 아닌 경우)
    if (!config.dryRun) {
      await saveToDatabase(input.meta.userId, output);
    }

    // 실행 로그 저장
    await saveExecutionLog({
      jobId,
      userId: input.meta.userId,
      input,
      output,
      logs,
      status: 'completed',
      executionTime: Date.now() - startTime
    });

    return output;

  } catch (error) {
    addLog(logs, 'error', `Pipeline failed: ${error.message}`);

    await saveExecutionLog({
      jobId,
      userId: input.meta.userId,
      input,
      output: null,
      logs,
      status: 'failed',
      errorMessage: error.message
    });

    throw error;
  }
}

function calculateQuality(results: {
  agent1Result: Agent1Output;
  agent2Result: Agent2Output;
  agent3Result: Agent3Output;
  agent5Result: Agent5Output;
}): QualityMetrics {
  const checks = {
    needDiversity: results.agent1Result.completeVector
      .filter(n => n.actual > 0.5).length >= 2,

    hasParadox: results.agent1Result.paradoxes.length >= 1,

    promptStructure: results.agent3Result.validation.passed,

    imageValidation: results.agent5Result.validated
  };

  const score = Object.values(checks).filter(v => v).length * 25;

  return {
    ...checks,
    score
  };
}
```

---

## API 엔드포인트

```typescript
POST /api/v1/agent/execute

Request:
{
  "input": {
    "userData": {
      "domains": ["github.com"],
      "keywords": ["react"],
      "interests": ["개발"],
      "avoidTopics": []
    },
    "meta": {
      "userId": "user_123",
      "userName": "홍길동",
      "language": "ko"
    }
  },
  "config": {
    "templateId": "template_default_v1",
    "skipCache": false,
    "dryRun": false
  }
}

Response:
{
  "success": true,
  "jobId": "job_1698765432000",
  "status": "completed",
  "output": {
    "analysis": { ... },
    "character": { ... },
    "prompts": { ... },
    "image": { ... },
    "quality": {
      "needDiversity": true,
      "hasParadox": true,
      "promptStructure": true,
      "imageValidation": true,
      "score": 100
    }
  },
  "executionTime": 12345
}
```

---

## 에러 처리 및 Fallback

### 각 에이전트별 Fallback

| Agent | 에러 상황 | Fallback 전략 |
|-------|----------|--------------|
| Agent 1 | LLM API 실패 | 기본 욕구 벡터 사용 |
| Agent 2 | 프로파일 생성 실패 | 기본 아키타입 사용 |
| Agent 3 | 템플릿 조립 실패 | 기본 템플릿 사용 |
| Agent 4 | 이미지 프롬프트 실패 | 아키타입 기본 프롬프트 |
| Agent 5 | 이미지 생성 실패 | 프리셋 이미지 사용 |

### 재시도 전략

```typescript
async function executeWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  backoff: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }

      console.warn(`Attempt ${attempt} failed, retrying...`);
      await sleep(backoff * attempt);
    }
  }
}
```

---

## 성능 최적화

### 병렬 실행 (가능한 경우)

```typescript
// Agent 1 완료 후, Agent 2와 Agent 4를 병렬 실행
const [agent2Result, agent4Partial] = await Promise.all([
  executeAgent2(...),
  preloadVisualElements(...)  // Agent 4 준비 작업
]);
```

### 캐싱

```typescript
// 자주 사용되는 데이터 풀 캐싱
const DATA_POOL_CACHE = new Map();

async function loadDataPoolsCached(): Promise<DataPools> {
  const cacheKey = 'data_pools_v1';

  if (DATA_POOL_CACHE.has(cacheKey)) {
    return DATA_POOL_CACHE.get(cacheKey);
  }

  const pools = await loadDataPools();
  DATA_POOL_CACHE.set(cacheKey, pools);

  return pools;
}
```

---

## 📝 요약

### 완전 자동화된 5단계 파이프라인

1. **Agent 1**: 욕구 벡터 분석 (LLM)
2. **Agent 2**: 캐릭터 프로파일 생성 (LLM + 데이터 풀)
3. **Agent 3**: 시스템 프롬프트 조립 (Handlebars)
4. **Agent 4**: 이미지 프롬프트 생성 (규칙 기반)
5. **Agent 5**: 이미지 생성 (Gemini Imagen)

### 관리자 개입 불필요

- ✅ 템플릿만 정의하면 자동 실행
- ✅ 데이터 풀만 관리하면 품질 향상
- ✅ 모니터링만 하면 됨

### 10-15초 내 완성

- 각 Agent: 2-3초
- 총 소요: 10-15초 (이미지 생성 포함)
