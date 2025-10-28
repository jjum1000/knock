# 룸메이트 시스템 - 기술 명세서

## 1. 시스템 아키텍처

```
[클라이언트]
    ↓
[API Gateway]
    ↓
[룸메이트 서비스]
    ↓
    ├─ [LLM 분석 모듈] ← Gemini API
    ├─ [프롬프트 생성 모듈]
    ├─ [키워드 추출 모듈]
    └─ [데이터베이스] ← PostgreSQL
         ↓
    [캐시 레이어] ← Redis
```

### 모듈별 역할

**LLM 분석 모듈**:
- 사용자 데이터 → Gemini API 전송
- 성격, 관심사, 대화 스타일 분석
- 재시도 로직 및 Fallback 처리

**프롬프트 생성 모듈**:
- LLM 분석 결과 → 시스템 프롬프트 변환
- 템플릿 기반 프롬프트 조합
- 금기어 필터링

**키워드 추출 모듈**:
- 관심사/성격 → 핵심 키워드 추출
- LLM 또는 룰 기반 알고리즘
- 3-5개 키워드 선별

---

## 2. 기술 스택

### 2.1 백엔드
- **런타임**: Node.js 20 LTS
- **프레임워크**: Express.js
- **언어**: TypeScript 5.3
- **ORM**: Prisma 5

### 2.2 데이터베이스
- **메인 DB**: PostgreSQL 15
- **캐시**: Redis 7
- **검색**: (선택) Elasticsearch 8 (키워드 검색)

### 2.3 외부 API
- **LLM**: Google Gemini 1.5 Pro API
- **이미지 저장**: AWS S3 / Cloudflare R2
- **CDN**: Cloudflare CDN

### 2.4 모니터링
- **로그**: Winston
- **에러 추적**: Sentry
- **메트릭**: Prometheus + Grafana

---

## 3. 데이터베이스 스키마

### 3.1 personas 테이블
```sql
CREATE TABLE personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  persona_type VARCHAR(50) NOT NULL CHECK (persona_type IN ('roommate', 'neighbor')),

  -- 시스템 프롬프트
  system_prompt TEXT NOT NULL,
  base_prompt TEXT NOT NULL, -- 원본 프롬프트 (복원용)

  -- LLM 분석 결과
  personality_traits JSONB NOT NULL, -- ["호기심 많음", "유머러스"]
  interests JSONB NOT NULL, -- ["게임", "영화", "코딩"]
  conversation_style VARCHAR(255) NOT NULL,

  -- 키워드
  keywords TEXT[] NOT NULL, -- {"게임매니아", "영화평론가"}
  custom_keywords TEXT[], -- 사용자가 추가한 키워드 (유료)

  -- 선호도 필터링
  focus_topics TEXT[], -- 사용자 지정 관심 주제
  avoid_topics TEXT[], -- 사용자 지정 금기 주제

  -- 메타데이터
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_interaction_at TIMESTAMP, -- 마지막 대화 시간
  interaction_count INT DEFAULT 0, -- 총 대화 횟수

  -- 제약: 사용자당 룸메이트 1개만
  CONSTRAINT one_roommate_per_user UNIQUE (user_id, persona_type)
);

CREATE INDEX idx_personas_user_id ON personas(user_id);
CREATE INDEX idx_personas_type ON personas(persona_type);
CREATE INDEX idx_personas_last_interaction ON personas(last_interaction_at);
CREATE INDEX idx_personas_keywords ON personas USING GIN(keywords); -- GIN 인덱스 (배열 검색)
```

### 3.2 rooms 테이블 (공유)
```sql
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  persona_id UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,

  -- 비주얼
  image_url VARCHAR(500) NOT NULL,

  -- 위치
  position_x INT NOT NULL DEFAULT 0,
  position_y INT NOT NULL DEFAULT 0,

  -- 상태
  is_unlocked BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_position_per_user UNIQUE (user_id, position_x, position_y)
);

CREATE INDEX idx_rooms_user_id ON rooms(user_id);
CREATE INDEX idx_rooms_persona_id ON rooms(persona_id);
```

### 3.3 persona_keywords 테이블 (선택 - 키워드 검색 강화)
```sql
CREATE TABLE persona_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  keyword VARCHAR(50) NOT NULL,
  keyword_type VARCHAR(20) NOT NULL CHECK (keyword_type IN ('auto', 'custom')), -- 자동 vs 수동
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_persona_keywords_persona ON persona_keywords(persona_id);
CREATE INDEX idx_persona_keywords_keyword ON persona_keywords(keyword);
```

---

## 4. API 명세

### 4.1 룸메이트 생성
```typescript
POST /api/v1/roommate/create

Headers:
{
  "Authorization": "Bearer {token}",
  "Content-Type": "application/json"
}

Request:
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "userDataId": "660e8400-e29b-41d4-a716-446655440000",
  "preferences": {
    "focusTopics": ["게임", "영화"],
    "avoidTopics": ["정치"]
  }
}

Response (Success):
{
  "success": true,
  "roommate": {
    "id": "770e8400-e29b-41d4-a716-446655440000",
    "systemPrompt": "당신은 사용자와 오래 함께 산 룸메이트입니다...",
    "personalityTraits": ["호기심 많음", "유머러스"],
    "interests": ["게임", "영화", "코딩"],
    "conversationStyle": "친근하고 캐주얼",
    "keywords": ["게임매니아", "영화평론가", "코딩덕후"],
    "createdAt": "2025-10-27T12:00:00Z"
  },
  "room": {
    "id": "880e8400-e29b-41d4-a716-446655440000",
    "imageUrl": "https://cdn.knock.com/rooms/preset-1.png",
    "position": { "x": 0, "y": 0 }
  }
}

Response (Error - 중복):
{
  "success": false,
  "error": "ROOMMATE_ALREADY_EXISTS",
  "message": "이미 룸메이트가 존재합니다",
  "existingRoommate": {
    "id": "770e8400-e29b-41d4-a716-446655440000",
    "createdAt": "2025-10-20T10:00:00Z"
  }
}

Response (Error - LLM 실패):
{
  "success": false,
  "error": "LLM_ANALYSIS_FAILED",
  "message": "AI 분석에 실패했습니다. 기본 템플릿을 사용합니다.",
  "usingFallback": true
}
```

### 4.2 룸메이트 조회
```typescript
GET /api/v1/roommate

Headers:
{
  "Authorization": "Bearer {token}"
}

Response (Success):
{
  "success": true,
  "roommate": {
    "id": "770e8400-e29b-41d4-a716-446655440000",
    "keywords": ["게임매니아", "영화평론가", "코딩덕후"],
    "personalityTraits": ["호기심 많음", "유머러스"],
    "interests": ["게임", "영화", "코딩"],
    "conversationStyle": "친근하고 캐주얼",
    "createdAt": "2025-10-27T12:00:00Z",
    "lastInteractionAt": "2025-10-27T15:30:00Z",
    "interactionCount": 24
  },
  "room": {
    "id": "880e8400-e29b-41d4-a716-446655440000",
    "imageUrl": "https://cdn.knock.com/rooms/preset-1.png",
    "position": { "x": 0, "y": 0 }
  }
}

Response (Error):
{
  "success": false,
  "error": "ROOMMATE_NOT_FOUND",
  "message": "룸메이트가 아직 생성되지 않았습니다"
}
```

### 4.3 룸메이트 프로필 상세 조회
```typescript
GET /api/v1/roommate/:roommateId/profile

Headers:
{
  "Authorization": "Bearer {token}"
}

Response:
{
  "success": true,
  "profile": {
    "id": "770e8400-e29b-41d4-a716-446655440000",
    "keywords": ["게임매니아", "영화평론가", "코딩덕후"],
    "customKeywords": ["운동매니아"], // 사용자가 추가한 키워드
    "personalityTraits": ["호기심 많음", "유머러스"],
    "interests": ["게임", "영화", "코딩"],
    "conversationStyle": "친근하고 캐주얼하며, 이모지를 적절히 사용합니다.",
    "focusTopics": ["게임", "영화"],
    "avoidTopics": ["정치"],
    "createdAt": "2025-10-27T12:00:00Z",
    "daysTogether": 7,
    "interactionCount": 24,
    "lastInteractionAt": "2025-10-27T15:30:00Z"
  }
}
```

### 4.4 키워드 업데이트 (유료)
```typescript
PATCH /api/v1/roommate/:roommateId/keywords

Headers:
{
  "Authorization": "Bearer {token}",
  "Content-Type": "application/json"
}

Request:
{
  "addKeywords": ["운동매니아"],
  "removeKeywords": ["게임매니아"]
}

Response (Success):
{
  "success": true,
  "keywords": ["영화평론가", "코딩덕후", "운동매니아"],
  "updatedPrompt": "당신은 사용자와 오래 함께 산 룸메이트입니다...",
  "message": "키워드가 업데이트되었습니다"
}

Response (Error - 무료 사용자):
{
  "success": false,
  "error": "PREMIUM_REQUIRED",
  "message": "키워드 수정은 Knock Plus 전용 기능입니다",
  "upgradeUrl": "https://knock.com/pricing"
}

Response (Error - 최대 개수 초과):
{
  "success": false,
  "error": "MAX_KEYWORDS_EXCEEDED",
  "message": "키워드는 최대 10개까지 설정할 수 있습니다",
  "currentCount": 10
}
```

### 4.5 선호도 업데이트
```typescript
PATCH /api/v1/roommate/:roommateId/preferences

Headers:
{
  "Authorization": "Bearer {token}",
  "Content-Type": "application/json"
}

Request:
{
  "focusTopics": ["게임", "영화", "운동"],
  "avoidTopics": ["정치", "종교"]
}

Response:
{
  "success": true,
  "preferences": {
    "focusTopics": ["게임", "영화", "운동"],
    "avoidTopics": ["정치", "종교"]
  },
  "updatedPrompt": "...",
  "message": "선호도가 업데이트되었습니다"
}
```

### 4.6 대화 통계 업데이트 (내부 API)
```typescript
POST /api/v1/roommate/:roommateId/interaction

Headers:
{
  "Authorization": "Bearer {serviceToken}", // 내부 서비스 전용
  "Content-Type": "application/json"
}

Request:
{
  "interactionType": "message_sent" | "message_received"
}

Response:
{
  "success": true,
  "interactionCount": 25,
  "lastInteractionAt": "2025-10-27T16:00:00Z"
}
```

---

## 5. LLM 통합

### 5.1 Gemini API 설정
```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

const generationConfig = {
  temperature: 0.7,
  topK: 40,
  topP: 0.95,
  maxOutputTokens: 2048,
};
```

### 5.2 사용자 분석 프롬프트
```typescript
interface UserData {
  domains: string[];
  keywords: string[];
  focusTopics?: string[];
  avoidTopics?: string[];
}

function buildAnalysisPrompt(userData: UserData): string {
  return `
당신은 사용자 데이터 분석 전문가입니다. 다음 데이터를 바탕으로 사용자의 성격, 관심사, 선호하는 대화 스타일을 분석하세요.

[입력 데이터]
방문 도메인: ${userData.domains.join(", ")}
검색 키워드: ${userData.keywords.join(", ")}
${userData.focusTopics ? `특별 관심 주제: ${userData.focusTopics.join(", ")}` : ""}
${userData.avoidTopics ? `금기 주제: ${userData.avoidTopics.join(", ")}` : ""}

[출력 형식 - JSON만 반환]
{
  "personality": {
    "traits": ["성격 특성 1", "성격 특성 2", "성격 특성 3"],
    "interests": ["관심사 1", "관심사 2", "관심사 3", "관심사 4"],
    "conversationStyle": "선호하는 대화 스타일 설명 (1-2문장)"
  },
  "keywords": ["키워드1", "키워드2", "키워드3", "키워드4", "키워드5"]
}

[제약사항]
- traits는 정확히 3개
- interests는 3-5개
- keywords는 3-5개 (해시태그 없이, 예: "게임매니아", "영화평론가")
- conversationStyle은 100자 이내
- JSON 외 다른 텍스트 포함 금지

[키워드 생성 규칙]
- 관심사와 성격을 조합하여 매력적인 키워드 생성
- 예: "게임" + "열정적" → "게임매니아"
- 예: "영화" + "비평적" → "영화평론가"
- 친근하고 이해하기 쉬운 표현 사용
- 각 키워드는 10자 이내
`.trim();
}
```

### 5.3 시스템 프롬프트 생성
```typescript
interface AnalysisResult {
  personality: {
    traits: string[];
    interests: string[];
    conversationStyle: string;
  };
  keywords: string[];
}

function buildSystemPrompt(
  analysis: AnalysisResult,
  preferences?: {
    focusTopics?: string[];
    avoidTopics?: string[];
  }
): string {
  return `
[역할]
당신은 사용자와 오래 함께 산 룸메이트입니다.

[성격]
${analysis.personality.traits.join(", ")}

[관심사]
${analysis.personality.interests.join(", ")}

[말투]
${analysis.personality.conversationStyle}
친근하고 캐주얼하며, 이모지를 적절히 사용합니다.
존댓말과 반말을 혼용하여 편안한 분위기를 만듭니다.

[관계]
사용자와는 6개월 이상 함께 살았으며, 서로의 생활 패턴을 잘 알고 있습니다.
사용자가 힘들 때 위로해주고, 재미있는 이야기로 웃게 만들어주는 존재입니다.

[대화 원칙]
- 사용자의 관심사에 공감하며 대화를 이어갑니다.
- 너무 짧거나 길지 않은 적절한 길이로 답변합니다 (2-4문장).
- 가끔 먼저 새로운 주제를 제안합니다.
- 사용자가 말하지 않아도 기분을 읽고 배려합니다.
${preferences?.focusTopics ? `\n[특별 관심 주제]\n사용자가 특별히 관심 있는 주제: ${preferences.focusTopics.join(", ")}\n→ 이 주제에 대한 대화 비중을 높이고, 관련 질문을 먼저 던지세요.` : ""}
${preferences?.avoidTopics ? `\n[금기 주제]\n사용자가 대화하고 싶지 않은 주제: ${preferences.avoidTopics.join(", ")}\n→ 이 주제는 절대 언급하지 않습니다.` : ""}
`.trim();
}
```

### 5.4 LLM 분석 실행
```typescript
async function analyzeUserData(userData: UserData): Promise<AnalysisResult> {
  const prompt = buildAnalysisPrompt(userData);

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig,
      });

      const responseText = result.response.text();
      const analysis = JSON.parse(responseText);

      // 검증
      if (
        !analysis.personality ||
        !Array.isArray(analysis.personality.traits) ||
        analysis.personality.traits.length !== 3
      ) {
        throw new Error("Invalid analysis format");
      }

      return analysis;
    } catch (error) {
      console.error(`LLM analysis attempt ${attempt} failed:`, error);

      if (attempt === 3) {
        // 최종 실패 → Fallback
        return getDefaultAnalysis();
      }

      // Exponential backoff
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }

  throw new Error("Unreachable");
}

function getDefaultAnalysis(): AnalysisResult {
  return {
    personality: {
      traits: ["친근함", "호기심 많음", "유머러스"],
      interests: ["일상 대화", "새로운 경험", "유머"],
      conversationStyle: "편안하고 친근한 대화를 즐깁니다",
    },
    keywords: ["친절한이웃", "대화좋아요", "긍정에너지"],
  };
}
```

### 5.5 첫 인사말 생성
```typescript
async function generateFirstMessage(systemPrompt: string): Promise<string> {
  const prompt = `
당신은 다음과 같은 성격의 룸메이트입니다:

${systemPrompt}

사용자가 방금 집에 들어왔습니다. 자연스럽게 첫 인사를 건네주세요.

[조건]
- 2-3문장
- 친근하고 편안한 느낌
- 오늘의 관심사 중 하나를 가볍게 언급
- 질문 1개 포함하여 대화 유도

[예시]
"어, 왔어? 오늘 하루 어땠어? 나는 새로운 게임 하나 발견했는데 진짜 재밌더라!"
`.trim();

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig,
  });

  return result.response.text().trim();
}
```

---

## 6. 비즈니스 로직

### 6.1 룸메이트 생성 플로우
```typescript
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

interface CreateRoommateParams {
  userId: string;
  userDataId: string;
  preferences?: {
    focusTopics?: string[];
    avoidTopics?: string[];
  };
}

async function createRoommate(params: CreateRoommateParams) {
  const { userId, userDataId, preferences } = params;

  // 1. 중복 확인
  const existing = await prisma.personas.findFirst({
    where: { userId, personaType: "roommate" },
  });

  if (existing) {
    throw new Error("ROOMMATE_ALREADY_EXISTS");
  }

  // 2. 사용자 데이터 조회
  const userData = await prisma.userData.findUnique({
    where: { id: userDataId },
  });

  if (!userData || userData.userId !== userId) {
    throw new Error("USER_DATA_NOT_FOUND");
  }

  // 3. LLM 분석
  const analysis = await analyzeUserData({
    domains: userData.rawData.domains || [],
    keywords: userData.rawData.keywords || [],
    focusTopics: preferences?.focusTopics,
    avoidTopics: preferences?.avoidTopics,
  });

  // 4. 시스템 프롬프트 생성
  const systemPrompt = buildSystemPrompt(analysis, preferences);

  // 5. DB 저장
  const roommate = await prisma.personas.create({
    data: {
      userId,
      personaType: "roommate",
      systemPrompt,
      basePrompt: systemPrompt, // 원본 저장
      personalityTraits: analysis.personality.traits,
      interests: analysis.personality.interests,
      conversationStyle: analysis.personality.conversationStyle,
      keywords: analysis.keywords,
      focusTopics: preferences?.focusTopics || [],
      avoidTopics: preferences?.avoidTopics || [],
    },
  });

  // 6. 방 생성
  const room = await prisma.rooms.create({
    data: {
      userId,
      personaId: roommate.id,
      imageUrl: selectRandomPresetImage(), // 프리셋 이미지 랜덤 선택
      positionX: 0,
      positionY: 0,
      isUnlocked: true,
    },
  });

  // 7. 첫 인사말 생성
  const firstMessage = await generateFirstMessage(systemPrompt);

  return {
    roommate,
    room,
    firstMessage,
  };
}

function selectRandomPresetImage(): string {
  const presets = [
    "https://cdn.knock.com/rooms/preset-1.png",
    "https://cdn.knock.com/rooms/preset-2.png",
    "https://cdn.knock.com/rooms/preset-3.png",
    "https://cdn.knock.com/rooms/preset-4.png",
    "https://cdn.knock.com/rooms/preset-5.png",
  ];

  return presets[Math.floor(Math.random() * presets.length)];
}
```

### 6.2 키워드 업데이트 로직 (유료)
```typescript
interface UpdateKeywordsParams {
  roommateId: string;
  userId: string;
  addKeywords: string[];
  removeKeywords: string[];
}

async function updateRoommateKeywords(params: UpdateKeywordsParams) {
  const { roommateId, userId, addKeywords, removeKeywords } = params;

  // 1. 유료 사용자 확인
  const user = await prisma.users.findUnique({ where: { id: userId } });
  if (!user?.isPremium) {
    throw new Error("PREMIUM_REQUIRED");
  }

  // 2. 룸메이트 조회 및 소유권 확인
  const roommate = await prisma.personas.findUnique({
    where: { id: roommateId },
  });

  if (!roommate || roommate.userId !== userId) {
    throw new Error("ROOMMATE_NOT_FOUND");
  }

  // 3. 키워드 업데이트
  const currentKeywords = roommate.keywords as string[];
  let newKeywords = currentKeywords.filter((k) => !removeKeywords.includes(k));
  newKeywords = [...newKeywords, ...addKeywords];

  // 4. 최대 개수 검증
  if (newKeywords.length > 10) {
    throw new Error("MAX_KEYWORDS_EXCEEDED");
  }

  // 5. 금기어 필터링
  const filteredKeywords = newKeywords.filter((k) => !isForbiddenKeyword(k));

  // 6. 시스템 프롬프트 재생성
  const updatedPrompt = buildSystemPrompt(
    {
      personality: {
        traits: roommate.personalityTraits as string[],
        interests: roommate.interests as string[],
        conversationStyle: roommate.conversationStyle,
      },
      keywords: filteredKeywords,
    },
    {
      focusTopics: roommate.focusTopics as string[],
      avoidTopics: roommate.avoidTopics as string[],
    }
  );

  // 7. DB 업데이트
  const updated = await prisma.personas.update({
    where: { id: roommateId },
    data: {
      keywords: filteredKeywords,
      customKeywords: addKeywords, // 사용자 추가 키워드만 별도 저장
      systemPrompt: updatedPrompt,
      updatedAt: new Date(),
    },
  });

  return {
    keywords: filteredKeywords,
    updatedPrompt,
  };
}

function isForbiddenKeyword(keyword: string): boolean {
  const forbidden = ["욕설", "비속어", "정치", "종교", "혐오"]; // 예시
  return forbidden.some((f) => keyword.includes(f));
}
```

### 6.3 대화 통계 업데이트
```typescript
async function recordInteraction(roommateId: string) {
  await prisma.personas.update({
    where: { id: roommateId },
    data: {
      lastInteractionAt: new Date(),
      interactionCount: {
        increment: 1,
      },
    },
  });
}
```

---

## 7. 캐싱 전략

### 7.1 Redis 캐싱
```typescript
import Redis from "ioredis";
const redis = new Redis(process.env.REDIS_URL!);

const CACHE_TTL = {
  ROOMMATE_PROFILE: 3600, // 1시간
  ROOMMATE_KEYWORDS: 1800, // 30분
};

async function getRoommateWithCache(userId: string) {
  const cacheKey = `roommate:${userId}`;

  // 1. 캐시 확인
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // 2. DB 조회
  const roommate = await prisma.personas.findFirst({
    where: { userId, personaType: "roommate" },
    include: { rooms: true },
  });

  if (!roommate) {
    return null;
  }

  // 3. 캐시 저장
  await redis.setex(cacheKey, CACHE_TTL.ROOMMATE_PROFILE, JSON.stringify(roommate));

  return roommate;
}

async function invalidateRoommateCache(userId: string) {
  await redis.del(`roommate:${userId}`);
}
```

---

## 8. 보안

### 8.1 소유권 검증 미들웨어
```typescript
import { Request, Response, NextFunction } from "express";

async function verifyRoommateOwnership(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { roommateId } = req.params;
  const userId = req.userId; // authMiddleware에서 설정됨

  const roommate = await prisma.personas.findUnique({
    where: { id: roommateId },
  });

  if (!roommate || roommate.userId !== userId) {
    return res.status(403).json({
      success: false,
      error: "FORBIDDEN",
      message: "이 룸메이트에 대한 권한이 없습니다",
    });
  }

  next();
}

// 사용 예시
app.patch(
  "/api/v1/roommate/:roommateId/keywords",
  authMiddleware,
  verifyRoommateOwnership,
  updateKeywordsHandler
);
```

### 8.2 시스템 프롬프트 보호
```typescript
// 클라이언트에는 시스템 프롬프트 전체를 노출하지 않음
function sanitizeRoommateForClient(roommate: any) {
  return {
    id: roommate.id,
    keywords: roommate.keywords,
    personalityTraits: roommate.personalityTraits,
    interests: roommate.interests,
    conversationStyle: roommate.conversationStyle,
    // systemPrompt는 제외 (서버 내부 전용)
  };
}
```

---

## 9. 성능 최적화

### 9.1 LLM 요청 최적화
```typescript
// 배치 처리 (여러 사용자 동시 분석)
import pLimit from "p-limit";
const limit = pLimit(5); // 동시 5개까지만 LLM 요청

async function batchCreateRoommates(userIds: string[]) {
  const promises = userIds.map((userId) =>
    limit(() => createRoommate({ userId, userDataId: `data_${userId}` }))
  );

  return await Promise.all(promises);
}
```

### 9.2 DB 쿼리 최적화
```typescript
// N+1 문제 방지 - include 사용
async function getRoommatesWithRooms(userIds: string[]) {
  return await prisma.personas.findMany({
    where: {
      userId: { in: userIds },
      personaType: "roommate",
    },
    include: {
      rooms: true,
    },
  });
}
```

---

## 10. 모니터링 및 로깅

### 10.1 이벤트 로깅
```typescript
enum RoommateEvent {
  CREATED = "roommate_created",
  KEYWORDS_UPDATED = "roommate_keywords_updated",
  PREFERENCES_UPDATED = "roommate_preferences_updated",
  INTERACTION_RECORDED = "roommate_interaction_recorded",
  LLM_ANALYSIS_FAILED = "roommate_llm_analysis_failed",
}

function logRoommateEvent(
  event: RoommateEvent,
  userId: string,
  metadata?: any
) {
  console.log(
    JSON.stringify({
      event,
      userId,
      timestamp: new Date().toISOString(),
      metadata,
    })
  );

  // Analytics 전송
  analytics.track(userId, event, metadata);
}
```

### 10.2 메트릭 수집
```typescript
import client from "prom-client";

const roommateCreationCounter = new client.Counter({
  name: "knock_roommate_creation_total",
  help: "Total number of roommates created",
  labelNames: ["status"], // success, fallback, error
});

const llmAnalysisDuration = new client.Histogram({
  name: "knock_llm_analysis_duration_seconds",
  help: "LLM analysis duration in seconds",
  buckets: [1, 5, 10, 15, 20, 30],
});

// 사용 예시
const timer = llmAnalysisDuration.startTimer();
try {
  const analysis = await analyzeUserData(userData);
  roommateCreationCounter.inc({ status: "success" });
} catch (error) {
  roommateCreationCounter.inc({ status: "error" });
} finally {
  timer();
}
```

---

## 11. 테스트

### 11.1 단위 테스트 (Jest)
```typescript
describe("createRoommate", () => {
  it("should create roommate with LLM analysis", async () => {
    const params = {
      userId: "user_123",
      userDataId: "data_456",
    };

    const result = await createRoommate(params);

    expect(result.roommate).toBeDefined();
    expect(result.roommate.personaType).toBe("roommate");
    expect(result.roommate.keywords).toHaveLength(3);
    expect(result.room.positionX).toBe(0);
    expect(result.room.positionY).toBe(0);
  });

  it("should use default analysis on LLM failure", async () => {
    // Mock LLM 실패
    jest.spyOn(model, "generateContent").mockRejectedValue(new Error("API Error"));

    const result = await createRoommate({
      userId: "user_123",
      userDataId: "data_456",
    });

    expect(result.roommate.keywords).toEqual([
      "친절한이웃",
      "대화좋아요",
      "긍정에너지",
    ]);
  });

  it("should throw error if roommate already exists", async () => {
    // 기존 룸메이트 생성
    await createRoommate({ userId: "user_123", userDataId: "data_456" });

    // 중복 생성 시도
    await expect(
      createRoommate({ userId: "user_123", userDataId: "data_789" })
    ).rejects.toThrow("ROOMMATE_ALREADY_EXISTS");
  });
});
```

### 11.2 통합 테스트
```typescript
describe("PATCH /api/v1/roommate/:roommateId/keywords", () => {
  it("should update keywords for premium users", async () => {
    const premiumUser = await createTestUser({ isPremium: true });
    const roommate = await createTestRoommate(premiumUser.id);

    const response = await request(app)
      .patch(`/api/v1/roommate/${roommate.id}/keywords`)
      .set("Authorization", `Bearer ${premiumUser.token}`)
      .send({
        addKeywords: ["운동매니아"],
        removeKeywords: ["게임매니아"],
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.keywords).toContain("운동매니아");
    expect(response.body.keywords).not.toContain("게임매니아");
  });

  it("should reject for free users", async () => {
    const freeUser = await createTestUser({ isPremium: false });
    const roommate = await createTestRoommate(freeUser.id);

    const response = await request(app)
      .patch(`/api/v1/roommate/${roommate.id}/keywords`)
      .set("Authorization", `Bearer ${freeUser.token}`)
      .send({ addKeywords: ["운동매니아"] })
      .expect(403);

    expect(response.body.error).toBe("PREMIUM_REQUIRED");
  });
});
```

---

## 12. 환경 변수

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/knock
REDIS_URL=redis://localhost:6379

# LLM
GEMINI_API_KEY=your_gemini_api_key

# Security
JWT_SECRET=your_jwt_secret_here
ENCRYPTION_KEY=your_32_byte_key_hex

# Storage
CDN_BASE_URL=https://cdn.knock.com

# Monitoring
SENTRY_DSN=https://xxx@sentry.io/xxx

# App
NODE_ENV=production
PORT=3000
```
