# 노크 시스템 - 기술 명세서

## 1. 시스템 아키텍처

```
[클라이언트]
    ↓
[API Gateway]
    ↓
[노크 서비스]
    ↓
    ├─ [제한 관리 모듈] ← Redis (캐싱)
    ├─ [위치 계산 모듈]
    ├─ [다양성 분석 모듈]
    ├─ [이웃 생성 모듈] ← Gemini API
    └─ [데이터베이스] ← PostgreSQL
```

### 모듈별 역할

**제한 관리 모듈**:
- 1일 1회 노크 제한 검증
- 자정 초기화 로직
- Redis 캐싱으로 빠른 조회

**위치 계산 모듈**:
- 인접 위치 탐색
- 빈 위치 랜덤 선택
- 충돌 방지

**다양성 분석 모듈**:
- 기존 AI 관심사 분석
- 미커버 주제 추출
- 새로운 관심사 선택

**이웃 생성 모듈**:
- LLM 기반 페르소나 생성
- 시스템 프롬프트 조합
- 첫 인사말 생성

---

## 2. 기술 스택

### 2.1 백엔드
- **런타임**: Node.js 20 LTS
- **프레임워크**: Express.js
- **언어**: TypeScript 5.3
- **ORM**: Prisma 5
- **스케줄러**: node-cron (자정 초기화)

### 2.2 데이터베이스
- **메인 DB**: PostgreSQL 15
- **캐시**: Redis 7 (노크 제한 캐싱)

### 2.3 외부 API
- **LLM**: Google Gemini 1.5 Pro API

---

## 3. 데이터베이스 스키마

### 3.1 knock_limits 테이블
```sql
CREATE TABLE knock_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- 제한 설정
  daily_limit INT NOT NULL DEFAULT 1, -- 무료: 1, 유료: 999
  used_today INT NOT NULL DEFAULT 0,

  -- 타임스탬프
  last_knock_at TIMESTAMP,
  last_reset_at TIMESTAMP DEFAULT NOW(),

  -- 스트릭 (선택 기능)
  streak_days INT DEFAULT 0,
  best_streak INT DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_user_knock_limit UNIQUE (user_id)
);

CREATE INDEX idx_knock_limits_user_id ON knock_limits(user_id);
CREATE INDEX idx_knock_limits_last_reset ON knock_limits(last_reset_at);
```

### 3.2 knock_history 테이블 (선택)
```sql
CREATE TABLE knock_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  neighbor_id UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,

  -- 생성 정보
  rarity VARCHAR(20) DEFAULT 'common', -- common, rare, legendary
  interests JSONB NOT NULL, -- 생성 시 관심사

  knocked_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_knock_history_user_id ON knock_history(user_id);
CREATE INDEX idx_knock_history_knocked_at ON knock_history(knocked_at);
```

---

## 4. API 명세

### 4.1 노크 제한 조회
```typescript
GET /api/v1/knock/limit

Headers:
{
  "Authorization": "Bearer {token}"
}

Response:
{
  "success": true,
  "limit": {
    "dailyLimit": 1,
    "usedToday": 0,
    "remaining": 1,
    "nextResetAt": "2025-10-28T00:00:00Z",
    "streak": 5, // 선택 기능
    "bestStreak": 12 // 선택 기능
  }
}
```

### 4.2 노크 실행
```typescript
POST /api/v1/knock/execute

Headers:
{
  "Authorization": "Bearer {token}",
  "Content-Type": "application/json"
}

Request:
{
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}

Response (Success):
{
  "success": true,
  "neighbor": {
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "keywords": ["여행러버", "철학덕후", "독서광"],
    "personalityTraits": ["사색적", "모험적", "호기심 많음"],
    "interests": ["여행", "철학", "독서"],
    "conversationStyle": "깊이 있는 대화를 좋아하며, 여행 경험을 철학적으로 해석하는 스타일",
    "firstMessage": "안녕! 처음 보는 얼굴인데, 혹시 새로 이사왔어?",
    "rarity": "common" // 선택 기능
  },
  "room": {
    "id": "770e8400-e29b-41d4-a716-446655440000",
    "imageUrl": "https://cdn.knock.com/rooms/neighbor-1.png",
    "position": {
      "x": 1,
      "y": 0
    }
  },
  "limit": {
    "usedToday": 1,
    "remaining": 0,
    "nextResetAt": "2025-10-28T00:00:00Z"
  }
}

Response (Error - 제한 초과):
{
  "success": false,
  "error": "KNOCK_LIMIT_EXCEEDED",
  "message": "오늘의 노크를 모두 사용했습니다",
  "limit": {
    "usedToday": 1,
    "remaining": 0,
    "nextResetAt": "2025-10-28T00:00:00Z"
  },
  "premium": {
    "upgradeUrl": "https://knock.com/pricing",
    "benefits": ["무제한 노크", "특별 이웃 발견", "스트릭 보상"]
  }
}

Response (Error - 위치 부족):
{
  "success": false,
  "error": "NO_AVAILABLE_POSITION",
  "message": "더 이상 방을 배치할 공간이 없습니다",
  "maxRooms": 100
}
```

### 4.3 노크 히스토리 조회 (선택)
```typescript
GET /api/v1/knock/history?limit=20&offset=0

Headers:
{
  "Authorization": "Bearer {token}"
}

Response:
{
  "success": true,
  "history": [
    {
      "id": "uuid",
      "neighborId": "uuid",
      "roomId": "uuid",
      "rarity": "rare",
      "interests": ["여행", "철학", "독서"],
      "knockedAt": "2025-10-27T15:00:00Z"
    }
  ],
  "total": 15,
  "hasMore": false
}
```

---

## 5. 핵심 로직 구현

### 5.1 노크 제한 확인
```typescript
import { PrismaClient } from "@prisma/client";
import Redis from "ioredis";

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL!);

const CACHE_TTL = 300; // 5분

async function checkKnockLimit(userId: string): Promise<{
  canKnock: boolean;
  limit: {
    dailyLimit: number;
    usedToday: number;
    remaining: number;
    nextResetAt: string;
  };
}> {
  // 1. Redis 캐시 확인
  const cacheKey = `knock_limit:${userId}`;
  const cached = await redis.get(cacheKey);

  if (cached) {
    const limit = JSON.parse(cached);
    return {
      canKnock: limit.remaining > 0,
      limit,
    };
  }

  // 2. DB 조회
  let knockLimit = await prisma.knockLimits.findUnique({
    where: { userId },
  });

  // 3. 초기 생성 (첫 노크)
  if (!knockLimit) {
    knockLimit = await prisma.knockLimits.create({
      data: {
        userId,
        dailyLimit: 1, // 기본 무료
        usedToday: 0,
      },
    });
  }

  // 4. 자동 초기화 체크
  if (shouldResetLimit(knockLimit.lastResetAt)) {
    knockLimit = await prisma.knockLimits.update({
      where: { userId },
      data: {
        usedToday: 0,
        lastResetAt: new Date(),
      },
    });
  }

  // 5. 다음 초기화 시간 계산
  const nextResetAt = getNextMidnight();

  const limit = {
    dailyLimit: knockLimit.dailyLimit,
    usedToday: knockLimit.usedToday,
    remaining: knockLimit.dailyLimit - knockLimit.usedToday,
    nextResetAt: nextResetAt.toISOString(),
  };

  // 6. 캐시 저장
  await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(limit));

  return {
    canKnock: limit.remaining > 0,
    limit,
  };
}

function shouldResetLimit(lastResetAt: Date): boolean {
  const now = new Date();
  const lastReset = new Date(lastResetAt);
  return now.toDateString() !== lastReset.toDateString();
}

function getNextMidnight(): Date {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow;
}
```

### 5.2 방 위치 결정
```typescript
interface Position {
  x: number;
  y: number;
}

function getAdjacentPositions(position: Position): Position[] {
  return [
    { x: position.x + 1, y: position.y }, // 우
    { x: position.x - 1, y: position.y }, // 좌
    { x: position.x, y: position.y + 1 }, // 하
    { x: position.x, y: position.y - 1 }, // 상
  ];
}

async function findNextRoomPosition(userId: string): Promise<Position> {
  // 1. 기존 방 위치 조회
  const existingRooms = await prisma.rooms.findMany({
    where: { userId },
    select: { positionX: true, positionY: true },
  });

  if (existingRooms.length >= 100) {
    throw new Error("NO_AVAILABLE_POSITION");
  }

  // 2. 차지된 위치 Set
  const occupied = new Set(
    existingRooms.map((r) => `${r.positionX},${r.positionY}`)
  );

  // 3. 인접 빈 위치 찾기
  const candidates: Position[] = [];

  for (const room of existingRooms) {
    const adjacent = getAdjacentPositions({
      x: room.positionX,
      y: room.positionY,
    });

    for (const pos of adjacent) {
      const key = `${pos.x},${pos.y}`;
      if (!occupied.has(key)) {
        candidates.push(pos);
      }
    }
  }

  // 4. 중복 제거
  const uniqueCandidates = Array.from(
    new Set(candidates.map((p) => `${p.x},${p.y}`))
  ).map((key) => {
    const [x, y] = key.split(",").map(Number);
    return { x, y };
  });

  if (uniqueCandidates.length === 0) {
    throw new Error("NO_AVAILABLE_POSITION");
  }

  // 5. 랜덤 선택
  return uniqueCandidates[Math.floor(Math.random() * uniqueCandidates.length)];
}
```

### 5.3 콘텐츠 다양성 분석
```typescript
const ALL_TOPICS = [
  "게임",
  "영화",
  "음악",
  "요리",
  "운동",
  "여행",
  "독서",
  "사진",
  "그림",
  "코딩",
  "디자인",
  "철학",
  "과학",
  "역사",
  "언어",
  "패션",
  "반려동물",
  "식물",
  "인테리어",
  "차",
  "커피",
];

interface InterestCoverage {
  covered: string[];
  uncovered: string[];
}

async function analyzeInterestCoverage(
  userId: string
): Promise<InterestCoverage> {
  // 1. 사용자의 모든 페르소나 조회
  const personas = await prisma.personas.findMany({
    where: { userId },
    select: { interests: true },
  });

  // 2. 모든 관심사 추출
  const covered = new Set<string>();
  personas.forEach((p) => {
    const interests = p.interests as string[];
    interests.forEach((i) => covered.add(i));
  });

  // 3. 미커버 주제 계산
  const uncovered = ALL_TOPICS.filter((topic) => !covered.has(topic));

  return {
    covered: Array.from(covered),
    uncovered,
  };
}

async function selectNewInterests(userId: string): Promise<string[]> {
  const { uncovered } = await analyzeInterestCoverage(userId);

  if (uncovered.length === 0) {
    // 모든 주제 커버 → 전체 풀에서 랜덤
    console.warn("All topics covered, selecting from full pool");
    return shuffleArray(ALL_TOPICS).slice(0, 3);
  }

  // 미커버 주제 중 3개 선택
  return shuffleArray(uncovered).slice(0, 3);
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
```

### 5.4 이웃 페르소나 생성
```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

interface NeighborAnalysis {
  personality: {
    traits: string[];
    conversationStyle: string;
  };
  keywords: string[];
}

async function generateNeighbor(
  interests: string[]
): Promise<NeighborAnalysis> {
  const prompt = `
당신은 새로운 AI 이웃을 생성하는 전문가입니다.

[이웃 설정]
관심사: ${interests.join(", ")}

위 관심사를 기반으로 새로운 이웃의 성격과 특성을 생성하세요.

[출력 형식 - JSON]
{
  "personality": {
    "traits": ["성격 특성 1", "성격 특성 2", "성격 특성 3"],
    "conversationStyle": "대화 스타일 설명 (1-2문장)"
  },
  "keywords": ["키워드1", "키워드2", "키워드3"]
}

[제약사항]
- traits는 정확히 3개
- keywords는 3개 (관심사와 성격 조합)
- 친근하고 흥미로운 성격으로 설정
- JSON 외 다른 텍스트 포함 금지

[예시]
관심사: ["여행", "철학", "독서"]
→
{
  "personality": {
    "traits": ["사색적", "모험적", "호기심 많음"],
    "conversationStyle": "깊이 있는 대화를 좋아하며, 여행 경험을 철학적으로 해석하는 스타일"
  },
  "keywords": ["여행러버", "철학덕후", "독서광"]
}
`.trim();

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });

      const text = result.response.text();
      return JSON.parse(text);
    } catch (error) {
      console.error(`Neighbor generation attempt ${attempt} failed:`, error);

      if (attempt === 3) {
        // Fallback
        return {
          personality: {
            traits: ["친근함", "호기심 많음", "유머러스"],
            conversationStyle: "편안하고 친근한 대화를 즐깁니다",
          },
          keywords: interests.map((i) => `${i}러버`).slice(0, 3),
        };
      }

      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }

  throw new Error("Unreachable");
}

function buildNeighborSystemPrompt(
  interests: string[],
  analysis: NeighborAnalysis
): string {
  return `
[역할]
당신은 사용자의 새로운 이웃입니다. 처음 만난 관계입니다.

[성격]
${analysis.personality.traits.join(", ")}

[관심사]
${interests.join(", ")}

[말투]
${analysis.personality.conversationStyle}
처음 만난 관계이므로 약간 거리를 두되, 친근하게 대합니다.

[관계]
사용자와는 이제 막 알게 된 이웃입니다.
서로에 대해 잘 모르므로, 호기심을 가지고 질문합니다.
시간이 지나면서 점점 친해질 수 있습니다.

[대화 원칙]
- 자신의 관심사에 대해 열정적으로 이야기합니다.
- 사용자의 관심사도 궁금해하며 질문합니다.
- 2-4문장으로 간결하게 답변합니다.
- 너무 친밀하지 않게, 적절한 거리를 유지합니다.
`.trim();
}

async function generateFirstMessage(systemPrompt: string): Promise<string> {
  const prompt = `
${systemPrompt}

사용자를 처음 만났습니다. 자연스럽게 첫 인사를 건네주세요.

[조건]
- 2-3문장
- 처음 만난 이웃으로서 적절한 거리감
- 가벼운 질문 1개 포함

[예시]
"안녕! 처음 보는 얼굴인데, 혹시 새로 이사왔어?"
`.trim();

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  return result.response.text().trim();
}
```

### 5.5 노크 실행 통합 로직
```typescript
async function executeKnock(userId: string) {
  // 1. 제한 확인
  const { canKnock, limit } = await checkKnockLimit(userId);

  if (!canKnock) {
    throw new Error("KNOCK_LIMIT_EXCEEDED");
  }

  // 2. 방 위치 결정
  const position = await findNextRoomPosition(userId);

  // 3. 새로운 관심사 선택 (콘텐츠 다양성)
  const newInterests = await selectNewInterests(userId);

  // 4. 이웃 페르소나 생성
  const analysis = await generateNeighbor(newInterests);
  const systemPrompt = buildNeighborSystemPrompt(newInterests, analysis);
  const firstMessage = await generateFirstMessage(systemPrompt);

  // 5. DB 저장 (Transaction)
  const result = await prisma.$transaction(async (tx) => {
    // 5-1. 페르소나 생성
    const neighbor = await tx.personas.create({
      data: {
        userId,
        personaType: "neighbor",
        systemPrompt,
        basePrompt: systemPrompt,
        personalityTraits: analysis.personality.traits,
        interests: newInterests,
        conversationStyle: analysis.personality.conversationStyle,
        keywords: analysis.keywords,
      },
    });

    // 5-2. 방 생성
    const room = await tx.rooms.create({
      data: {
        userId,
        personaId: neighbor.id,
        imageUrl: selectRandomNeighborImage(),
        positionX: position.x,
        positionY: position.y,
        isUnlocked: true,
      },
    });

    // 5-3. 노크 제한 차감
    await tx.knockLimits.update({
      where: { userId },
      data: {
        usedToday: { increment: 1 },
        lastKnockAt: new Date(),
      },
    });

    // 5-4. 노크 히스토리 (선택)
    await tx.knockHistory.create({
      data: {
        userId,
        neighborId: neighbor.id,
        roomId: room.id,
        rarity: "common",
        interests: newInterests,
      },
    });

    return { neighbor, room };
  });

  // 6. 캐시 무효화
  await redis.del(`knock_limit:${userId}`);

  // 7. 업데이트된 제한 정보
  const updatedLimit = await checkKnockLimit(userId);

  return {
    neighbor: {
      id: result.neighbor.id,
      keywords: result.neighbor.keywords,
      personalityTraits: result.neighbor.personalityTraits,
      interests: result.neighbor.interests,
      conversationStyle: result.neighbor.conversationStyle,
      firstMessage,
    },
    room: {
      id: result.room.id,
      imageUrl: result.room.imageUrl,
      position: { x: result.room.positionX, y: result.room.positionY },
    },
    limit: updatedLimit.limit,
  };
}

function selectRandomNeighborImage(): string {
  const images = [
    "https://cdn.knock.com/rooms/neighbor-1.png",
    "https://cdn.knock.com/rooms/neighbor-2.png",
    "https://cdn.knock.com/rooms/neighbor-3.png",
    "https://cdn.knock.com/rooms/neighbor-4.png",
    "https://cdn.knock.com/rooms/neighbor-5.png",
  ];

  return images[Math.floor(Math.random() * images.length)];
}
```

---

## 6. 자정 초기화 (Cron Job)

### 6.1 node-cron 설정
```typescript
import cron from "node-cron";

// 매일 00:00 실행 (서버 시간 기준)
cron.schedule("0 0 * * *", async () => {
  console.log("Running knock limit reset job...");

  try {
    const result = await prisma.knockLimits.updateMany({
      data: {
        usedToday: 0,
        lastResetAt: new Date(),
      },
    });

    console.log(`Reset ${result.count} knock limits`);

    // Redis 캐시 전체 삭제
    const keys = await redis.keys("knock_limit:*");
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`Cleared ${keys.length} cache entries`);
    }
  } catch (error) {
    console.error("Knock limit reset failed:", error);
    // Sentry 등으로 에러 전송
  }
});
```

### 6.2 대안: 실시간 검증 (Cron 불필요)
```typescript
// checkKnockLimit 함수에서 자동 초기화 체크 (위 5.1 참조)
// 장점: Cron Job 불필요, 서버 재시작 시에도 안전
// 단점: 첫 요청 시 약간의 지연
```

---

## 7. 캐싱 전략

### 7.1 Redis 캐싱
```typescript
// 노크 제한 캐싱 (5분 TTL)
async function cacheKnockLimit(userId: string, limit: any) {
  const cacheKey = `knock_limit:${userId}`;
  await redis.setex(cacheKey, 300, JSON.stringify(limit));
}

async function getCachedKnockLimit(userId: string) {
  const cacheKey = `knock_limit:${userId}`;
  const cached = await redis.get(cacheKey);
  return cached ? JSON.parse(cached) : null;
}

async function invalidateKnockLimitCache(userId: string) {
  await redis.del(`knock_limit:${userId}`);
}
```

---

## 8. 보안

### 8.1 Rate Limiting
```typescript
import rateLimit from "express-rate-limit";

const knockLimiter = rateLimit({
  windowMs: 60 * 1000, // 1분
  max: 5, // 최대 5회 시도
  message: {
    success: false,
    error: "TOO_MANY_REQUESTS",
    message: "너무 많은 요청입니다. 잠시 후 다시 시도해주세요.",
  },
});

app.post("/api/v1/knock/execute", knockLimiter, executeKnockHandler);
```

### 8.2 소유권 검증
```typescript
// 사용자 본인의 노크만 허용
async function verifyKnockOwnership(userId: string, requestUserId: string) {
  if (userId !== requestUserId) {
    throw new Error("FORBIDDEN");
  }
}
```

---

## 9. 성능 최적화

### 9.1 병렬 처리
```typescript
async function executeKnockOptimized(userId: string) {
  // 제한 확인과 위치 계산을 병렬 실행
  const [{ canKnock, limit }, position] = await Promise.all([
    checkKnockLimit(userId),
    findNextRoomPosition(userId),
  ]);

  if (!canKnock) {
    throw new Error("KNOCK_LIMIT_EXCEEDED");
  }

  // ... 나머지 로직
}
```

### 9.2 DB 쿼리 최적화
```typescript
// N+1 방지 - 단일 쿼리로 모든 페르소나 관심사 조회
async function analyzeInterestCoverageOptimized(userId: string) {
  const personas = await prisma.personas.findMany({
    where: { userId },
    select: { interests: true }, // 필요한 필드만 조회
  });

  // ... 나머지 로직
}
```

---

## 10. 모니터링 및 로깅

### 10.1 이벤트 로깅
```typescript
enum KnockEvent {
  EXECUTED = "knock_executed",
  LIMIT_EXCEEDED = "knock_limit_exceeded",
  POSITION_NOT_FOUND = "knock_position_not_found",
  LLM_FAILED = "knock_llm_failed",
  STREAK_UPDATED = "knock_streak_updated",
}

function logKnockEvent(event: KnockEvent, userId: string, metadata?: any) {
  console.log(
    JSON.stringify({
      event,
      userId,
      timestamp: new Date().toISOString(),
      metadata,
    })
  );

  analytics.track(userId, event, metadata);
}
```

### 10.2 메트릭 수집
```typescript
import client from "prom-client";

const knockCounter = new client.Counter({
  name: "knock_executions_total",
  help: "Total number of knock executions",
  labelNames: ["status"], // success, limit_exceeded, error
});

const knockDuration = new client.Histogram({
  name: "knock_execution_duration_seconds",
  help: "Knock execution duration in seconds",
  buckets: [5, 10, 15, 20, 30],
});

// 사용
const timer = knockDuration.startTimer();
try {
  const result = await executeKnock(userId);
  knockCounter.inc({ status: "success" });
} catch (error) {
  knockCounter.inc({ status: "error" });
} finally {
  timer();
}
```

---

## 11. 테스트

### 11.1 단위 테스트
```typescript
describe("findNextRoomPosition", () => {
  it("should find adjacent empty position", async () => {
    // 룸메이트 방 (0, 0) 생성
    await createTestRoom(userId, { x: 0, y: 0 });

    const position = await findNextRoomPosition(userId);

    expect([
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ]).toContainEqual(position);
  });

  it("should throw error when no position available", async () => {
    // 100개 방 생성 (최대 개수)
    for (let i = 0; i < 100; i++) {
      await createTestRoom(userId, { x: i % 10, y: Math.floor(i / 10) });
    }

    await expect(findNextRoomPosition(userId)).rejects.toThrow(
      "NO_AVAILABLE_POSITION"
    );
  });
});

describe("selectNewInterests", () => {
  it("should select uncovered topics", async () => {
    // 룸메이트: 게임, 영화
    await createTestPersona(userId, { interests: ["게임", "영화"] });

    const newInterests = await selectNewInterests(userId);

    expect(newInterests).toHaveLength(3);
    expect(newInterests).not.toContain("게임");
    expect(newInterests).not.toContain("영화");
  });
});
```

### 11.2 통합 테스트
```typescript
describe("POST /api/v1/knock/execute", () => {
  it("should execute knock and create neighbor", async () => {
    const user = await createTestUser();

    const response = await request(app)
      .post("/api/v1/knock/execute")
      .set("Authorization", `Bearer ${user.token}`)
      .send({ userId: user.id })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.neighbor).toBeDefined();
    expect(response.body.room.position).toBeDefined();
    expect(response.body.limit.usedToday).toBe(1);
  });

  it("should reject when limit exceeded", async () => {
    const user = await createTestUser();

    // 첫 노크 성공
    await request(app)
      .post("/api/v1/knock/execute")
      .set("Authorization", `Bearer ${user.token}`)
      .send({ userId: user.id })
      .expect(200);

    // 두 번째 노크 실패 (무료 1일 1회)
    const response = await request(app)
      .post("/api/v1/knock/execute")
      .set("Authorization", `Bearer ${user.token}`)
      .send({ userId: user.id })
      .expect(403);

    expect(response.body.error).toBe("KNOCK_LIMIT_EXCEEDED");
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
JWT_SECRET=your_jwt_secret

# CDN
CDN_BASE_URL=https://cdn.knock.com

# App
NODE_ENV=production
PORT=3000
```
