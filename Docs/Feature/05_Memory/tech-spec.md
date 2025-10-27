# 메모리 시스템 - 기술 명세서

## 1. 시스템 아키텍처

```
[클라이언트]
    ↓
[API Gateway]
    ↓
[메모리 서비스]
    ↓
    ├─ [세션 메모리 관리] ← Redis Cache
    ├─ [LLM 요약 모듈] ← Gemini API
    ├─ [메모리 저장소] ← PostgreSQL
    └─ [아카이브 스케줄러] ← Cron Jobs
```

---

## 2. 기술 스택

### 2.1 프론트엔드
- **프레임워크**: Next.js 14 (App Router)
- **언어**: TypeScript 5.3
- **상태 관리**: Zustand
- **캐싱**: React Query (TanStack Query)
- **HTTP 클라이언트**: Axios

### 2.2 백엔드
- **런타임**: Node.js 20 LTS
- **프레임워크**: Express.js
- **언어**: TypeScript
- **인증**: JWT

### 2.3 데이터베이스
- **메인 DB**: PostgreSQL 15
- **캐시**: Redis 7 (세션 메모리 임시 저장)
- **ORM**: Prisma 5

### 2.4 외부 API
- **LLM**: Google Gemini 1.5 Pro API
- **스케줄링**: Node-cron

---

## 3. 데이터베이스 스키마

### 3.1 memories 테이블
```sql
CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  persona_id UUID REFERENCES personas(id) ON DELETE CASCADE,
  session_id VARCHAR(100) NOT NULL,

  -- 메모리 내용
  summary TEXT NOT NULL,
  topics TEXT[] DEFAULT '{}',
  emotion VARCHAR(50), -- 'joy', 'sadness', 'stress', 'calm', 'excitement', 'neutral'
  importance INT CHECK (importance BETWEEN 1 AND 10) DEFAULT 5,

  -- 원본 대화 (선택)
  raw_conversation JSONB, -- 원본 메시지 배열 (압축 저장)

  -- 메타데이터
  message_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  archived_at TIMESTAMP NULL,

  -- 인덱스 최적화를 위한 컬럼
  persona_type VARCHAR(50) -- 'roommate' or 'neighbor'
);

-- 인덱스
CREATE INDEX idx_memories_user_persona ON memories(user_id, persona_id);
CREATE INDEX idx_memories_active ON memories(user_id, persona_id, archived_at)
  WHERE archived_at IS NULL;
CREATE INDEX idx_memories_importance ON memories(importance DESC, created_at DESC);
CREATE INDEX idx_memories_topics ON memories USING GIN(topics);
CREATE INDEX idx_memories_created ON memories(created_at DESC);
```

### 3.2 conversation_sessions 테이블
```sql
CREATE TABLE conversation_sessions (
  id VARCHAR(100) PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  persona_id UUID REFERENCES personas(id) ON DELETE CASCADE,

  started_at TIMESTAMP DEFAULT NOW(),
  last_activity_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP NULL,

  message_count INT DEFAULT 0,
  is_saved BOOLEAN DEFAULT FALSE, -- 메모리로 저장되었는지 여부

  -- Redis 캐시 키
  cache_key VARCHAR(200)
);

CREATE INDEX idx_sessions_active ON conversation_sessions(user_id, ended_at)
  WHERE ended_at IS NULL;
```

### 3.3 memory_summaries_queue 테이블 (비동기 처리)
```sql
CREATE TABLE memory_summaries_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(100) REFERENCES conversation_sessions(id) ON DELETE CASCADE,

  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  retry_count INT DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP NULL,
  error_message TEXT NULL
);

CREATE INDEX idx_queue_status ON memory_summaries_queue(status, created_at);
```

---

## 4. API 명세

### 4.1 세션 시작
```typescript
POST /api/v1/memory/session/start
Headers:
{
  "Authorization": "Bearer {token}"
}

Request:
{
  "personaId": "persona_123"
}

Response:
{
  "success": true,
  "sessionId": "session_789",
  "existingMemories": [
    {
      "id": "memory_456",
      "summary": "사용자가 어제 영화를 봤고 매우 재미있었다고 함",
      "topics": ["영화"],
      "emotion": "joy",
      "importance": 7,
      "createdAt": "2025-10-26T20:00:00Z"
    }
  ]
}
```

### 4.2 메시지 추가 (세션 메모리 업데이트)
```typescript
POST /api/v1/memory/session/:sessionId/message
Headers:
{
  "Authorization": "Bearer {token}"
}

Request:
{
  "role": "user" | "assistant",
  "content": "메시지 내용"
}

Response:
{
  "success": true,
  "messageCount": 15
}
```

### 4.3 세션 종료 및 요약 요청
```typescript
POST /api/v1/memory/session/:sessionId/end
Headers:
{
  "Authorization": "Bearer {token}"
}

Request:
{
  "saveMemory": true, // false면 요약 없이 종료
  "forceSync": false // true면 동기 처리 (기본: 비동기)
}

Response (비동기):
{
  "success": true,
  "queueId": "queue_101",
  "estimatedTime": 5 // 초
}

Response (동기):
{
  "success": true,
  "memory": {
    "id": "memory_456",
    "summary": "...",
    "importance": 7
  }
}
```

### 4.4 메모리 조회
```typescript
GET /api/v1/memory/list
Headers:
{
  "Authorization": "Bearer {token}"
}

Query Parameters:
{
  "personaId": "persona_123", // 선택
  "includeArchived": false,
  "topics": ["영화", "게임"], // 선택 (필터링)
  "minImportance": 5, // 선택
  "limit": 10,
  "offset": 0
}

Response:
{
  "success": true,
  "memories": Memory[],
  "total": 25,
  "activeCount": 5,
  "archivedCount": 20
}
```

### 4.5 메모리 수정
```typescript
PATCH /api/v1/memory/:memoryId
Headers:
{
  "Authorization": "Bearer {token}"
}

Request:
{
  "summary": "수정된 요약", // 선택
  "importance": 9, // 선택
  "topics": ["새주제"] // 선택
}

Response:
{
  "success": true,
  "memory": Memory
}
```

### 4.6 메모리 삭제
```typescript
DELETE /api/v1/memory/:memoryId
Headers:
{
  "Authorization": "Bearer {token}"
}

Response:
{
  "success": true
}
```

### 4.7 메모리 아카이브/복원
```typescript
POST /api/v1/memory/:memoryId/archive
Headers:
{
  "Authorization": "Bearer {token}"
}

Response:
{
  "success": true,
  "archivedAt": "2025-10-27T12:00:00Z"
}

POST /api/v1/memory/:memoryId/unarchive
Response:
{
  "success": true,
  "archivedAt": null
}
```

### 4.8 요약 작업 상태 확인
```typescript
GET /api/v1/memory/queue/:queueId
Headers:
{
  "Authorization": "Bearer {token}"
}

Response:
{
  "success": true,
  "status": "completed",
  "memory": Memory // status가 completed일 때만
}
```

---

## 5. LLM 통합

### 5.1 Gemini API 설정
```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-pro",
  generationConfig: {
    temperature: 0.3, // 일관성 있는 요약을 위해 낮은 temperature
    maxOutputTokens: 500
  }
});
```

### 5.2 대화 요약 프롬프트
```typescript
function generateSummaryPrompt(messages: Message[]): string {
  const conversationText = messages
    .map(m => `${m.role === 'user' ? '사용자' : 'AI'}: ${m.content}`)
    .join('\n');

  return `
당신은 대화 내용을 간결하게 요약하는 전문가입니다.
다음 대화에서 중요한 정보만 추출하여 JSON 형식으로 요약하세요.

[요약 기준]
✓ 사용자가 공유한 사실 (이벤트, 계획, 선호)
✓ 사용자의 감정 상태
✓ 향후 대화에 도움이 될 정보

✗ 일반적인 인사말, 짧은 맞장구
✗ 중요하지 않은 일상적 대화

[대화 내용]
${conversationText}

[출력 형식 - JSON만 반환]
{
  "summary": "핵심 요약 1-2문장 (최대 200자)",
  "topics": ["주제1", "주제2"], // 최대 3개
  "emotion": "joy" | "sadness" | "stress" | "calm" | "excitement" | "neutral",
  "importance": 1-10 // 1: 일상 대화, 5: 보통, 10: 매우 중요한 이벤트
}

[중요도 판단 기준]
1-3: 일반적인 대화, 간단한 일상 공유
4-6: 의미 있는 대화, 관심사 공유
7-8: 중요한 계획, 감정적 순간
9-10: 매우 중요한 이벤트, 깊은 감정 공유

반드시 JSON 형식만 반환하고 다른 텍스트는 포함하지 마세요.
`;
}
```

### 5.3 요약 생성 함수
```typescript
interface SummaryResult {
  summary: string;
  topics: string[];
  emotion: 'joy' | 'sadness' | 'stress' | 'calm' | 'excitement' | 'neutral';
  importance: number;
}

async function generateSummary(messages: Message[]): Promise<SummaryResult> {
  const prompt = generateSummaryPrompt(messages);

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // JSON 파싱
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const summary: SummaryResult = JSON.parse(cleaned);

    // 유효성 검증
    if (!summary.summary || summary.summary.length > 200) {
      throw new Error('Invalid summary length');
    }
    if (summary.importance < 1 || summary.importance > 10) {
      throw new Error('Invalid importance value');
    }

    return summary;
  } catch (error) {
    console.error('Summary generation failed:', error);
    throw error;
  }
}
```

### 5.4 재시도 로직
```typescript
async function generateSummaryWithRetry(
  messages: Message[],
  maxRetries = 3
): Promise<SummaryResult> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await generateSummary(messages);
    } catch (error) {
      console.error(`Summary attempt ${i + 1} failed:`, error);

      if (i === maxRetries - 1) {
        // 최종 실패: Fallback
        return createFallbackSummary(messages);
      }

      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }

  throw new Error('Unreachable');
}

function createFallbackSummary(messages: Message[]): SummaryResult {
  // 원본 대화 일부를 요약으로 사용
  const conversationText = messages
    .map(m => `${m.role}: ${m.content}`)
    .join(' | ')
    .substring(0, 200);

  return {
    summary: `대화 내용: ${conversationText}`,
    topics: ['일반'],
    emotion: 'neutral',
    importance: 5
  };
}
```

---

## 6. Redis 캐싱 (세션 메모리)

### 6.1 Redis 설정
```typescript
import Redis from "ioredis";

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: 1, // 메모리 시스템 전용 DB
  keyPrefix: 'memory:'
});
```

### 6.2 세션 메모리 저장
```typescript
interface SessionCache {
  sessionId: string;
  personaId: string;
  messages: Message[];
  startedAt: string;
  lastActivityAt: string;
}

async function saveSessionToCache(sessionId: string, data: SessionCache): Promise<void> {
  const key = `session:${sessionId}`;
  const ttl = 30 * 60; // 30분

  await redis.setex(key, ttl, JSON.stringify(data));
}

async function getSessionFromCache(sessionId: string): Promise<SessionCache | null> {
  const key = `session:${sessionId}`;
  const data = await redis.get(key);

  return data ? JSON.parse(data) : null;
}

async function updateSessionActivity(sessionId: string): Promise<void> {
  const key = `session:${sessionId}`;
  const ttl = 30 * 60;

  // TTL 갱신
  await redis.expire(key, ttl);
}
```

### 6.3 메시지 추가
```typescript
async function addMessageToSession(
  sessionId: string,
  message: Message
): Promise<number> {
  const session = await getSessionFromCache(sessionId);

  if (!session) {
    throw new Error('Session not found');
  }

  // 메시지 추가 (최대 50개 유지)
  session.messages.push(message);
  if (session.messages.length > 50) {
    session.messages = session.messages.slice(-50);
  }

  session.lastActivityAt = new Date().toISOString();

  await saveSessionToCache(sessionId, session);

  return session.messages.length;
}
```

---

## 7. 비동기 요약 처리

### 7.1 Bull Queue 설정
```typescript
import Bull from 'bull';

const summaryQueue = new Bull('memory-summary', {
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379')
  }
});

// 동시 처리 제한
summaryQueue.process(5, async (job) => {
  const { sessionId, userId, personaId } = job.data;

  try {
    // Redis에서 세션 데이터 가져오기
    const session = await getSessionFromCache(sessionId);
    if (!session) {
      throw new Error('Session not found in cache');
    }

    // LLM 요약 생성
    const summary = await generateSummaryWithRetry(session.messages);

    // DB에 저장
    const memory = await prisma.memory.create({
      data: {
        userId,
        personaId,
        sessionId,
        summary: summary.summary,
        topics: summary.topics,
        emotion: summary.emotion,
        importance: summary.importance,
        messageCount: session.messages.length,
        rawConversation: session.messages // JSONB로 저장
      }
    });

    // 메모리 제한 확인 및 아카이브
    await checkAndArchiveMemories(userId, personaId);

    return memory;
  } catch (error) {
    console.error('Summary job failed:', error);
    throw error;
  }
});

// 실패 시 재시도
summaryQueue.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err);

  if (job.attemptsMade < 3) {
    job.retry();
  }
});
```

### 7.2 작업 추가
```typescript
async function queueSummaryGeneration(
  sessionId: string,
  userId: string,
  personaId: string
): Promise<string> {
  const job = await summaryQueue.add(
    { sessionId, userId, personaId },
    {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    }
  );

  return job.id as string;
}
```

---

## 8. 메모리 제한 및 아카이브

### 8.1 아카이브 로직
```typescript
async function checkAndArchiveMemories(
  userId: string,
  personaId: string
): Promise<void> {
  // 사용자 플랜 확인
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true }
  });

  const maxMemories = user?.plan === 'premium' ? Infinity : 5;

  if (maxMemories === Infinity) return;

  // 활성 메모리 조회 (중요도 및 생성일 기준 정렬)
  const activeMemories = await prisma.memory.findMany({
    where: {
      userId,
      personaId,
      archivedAt: null
    },
    orderBy: [
      { importance: 'desc' },
      { createdAt: 'desc' }
    ]
  });

  // 초과분 아카이브
  if (activeMemories.length > maxMemories) {
    const toArchive = activeMemories.slice(maxMemories);

    await prisma.memory.updateMany({
      where: {
        id: { in: toArchive.map(m => m.id) }
      },
      data: {
        archivedAt: new Date()
      }
    });

    console.log(`Archived ${toArchive.length} memories for user ${userId}`);
  }
}
```

### 8.2 스케줄러 (정기 정리)
```typescript
import cron from 'node-cron';

// 매일 자정에 오래된 세션 정리
cron.schedule('0 0 * * *', async () => {
  console.log('Running session cleanup...');

  // 48시간 이상 지난 종료된 세션 삭제
  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

  await prisma.conversationSession.deleteMany({
    where: {
      endedAt: { lt: twoDaysAgo }
    }
  });

  console.log('Session cleanup completed');
});
```

---

## 9. 보안

### 9.1 데이터 암호화
```typescript
import crypto from 'crypto';

const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex'); // 32 bytes
const IV_LENGTH = 16;

function encryptMemory(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return iv.toString('hex') + ':' + encrypted;
}

function decryptMemory(encrypted: string): string {
  const parts = encrypted.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];

  const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);

  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// 사용 예시 (민감한 메모리 저장 시)
const encryptedSummary = encryptMemory(summary.summary);
await prisma.memory.create({
  data: {
    // ...
    summary: encryptedSummary,
    isEncrypted: true
  }
});
```

### 9.2 권한 검증
```typescript
async function verifyMemoryOwnership(
  memoryId: string,
  userId: string
): Promise<boolean> {
  const memory = await prisma.memory.findUnique({
    where: { id: memoryId },
    select: { userId: true }
  });

  return memory?.userId === userId;
}

// Express 미들웨어
async function memoryOwnershipMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { memoryId } = req.params;
  const userId = req.userId; // JWT에서 추출

  const isOwner = await verifyMemoryOwnership(memoryId, userId);

  if (!isOwner) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  next();
}
```

---

## 10. 성능 최적화

### 10.1 메모리 로드 최적화
```typescript
// 페르소나별 메모리 프리페치 (병렬 처리)
async function prefetchMemoriesForPersonas(
  userId: string,
  personaIds: string[]
): Promise<Record<string, Memory[]>> {
  const promises = personaIds.map(async (personaId) => {
    const memories = await prisma.memory.findMany({
      where: {
        userId,
        personaId,
        archivedAt: null
      },
      orderBy: [
        { importance: 'desc' },
        { createdAt: 'desc' }
      ],
      take: 5
    });

    return [personaId, memories] as const;
  });

  const results = await Promise.all(promises);
  return Object.fromEntries(results);
}
```

### 10.2 데이터베이스 쿼리 최적화
```sql
-- Materialized View for active memories count
CREATE MATERIALIZED VIEW user_active_memory_counts AS
SELECT
  user_id,
  persona_id,
  COUNT(*) as active_count
FROM memories
WHERE archived_at IS NULL
GROUP BY user_id, persona_id;

-- 정기 갱신 (5분마다)
CREATE INDEX ON user_active_memory_counts(user_id, persona_id);
```

### 10.3 캐싱 전략
```typescript
import { createClient } from 'redis';

// 메모리 목록 캐싱 (5분 TTL)
async function getCachedMemoryList(
  userId: string,
  personaId: string
): Promise<Memory[] | null> {
  const cacheKey = `memories:${userId}:${personaId}`;
  const cached = await redis.get(cacheKey);

  if (cached) {
    return JSON.parse(cached);
  }

  // DB 조회
  const memories = await prisma.memory.findMany({
    where: { userId, personaId, archivedAt: null },
    orderBy: [{ importance: 'desc' }, { createdAt: 'desc' }],
    take: 5
  });

  // 캐시 저장 (5분)
  await redis.setex(cacheKey, 300, JSON.stringify(memories));

  return memories;
}

// 메모리 생성/수정 시 캐시 무효화
async function invalidateMemoryCache(userId: string, personaId: string): Promise<void> {
  const cacheKey = `memories:${userId}:${personaId}`;
  await redis.del(cacheKey);
}
```

---

## 11. 모니터링 및 로깅

### 11.1 이벤트 로깅
```typescript
enum MemoryEvent {
  SESSION_STARTED = 'memory_session_started',
  SESSION_ENDED = 'memory_session_ended',
  SUMMARY_GENERATED = 'memory_summary_generated',
  SUMMARY_FAILED = 'memory_summary_failed',
  MEMORY_ARCHIVED = 'memory_archived',
  MEMORY_LIMIT_REACHED = 'memory_limit_reached'
}

function logMemoryEvent(
  event: MemoryEvent,
  userId: string,
  metadata?: any
) {
  console.log(JSON.stringify({
    event,
    userId,
    timestamp: new Date().toISOString(),
    metadata
  }));

  // Analytics 전송
  analytics.track(userId, event, metadata);
}
```

### 11.2 성능 메트릭
```typescript
import prometheus from 'prom-client';

const summaryDuration = new prometheus.Histogram({
  name: 'memory_summary_duration_seconds',
  help: 'Duration of memory summary generation',
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

const memoryCount = new prometheus.Gauge({
  name: 'active_memories_total',
  help: 'Total number of active memories',
  labelNames: ['user_plan']
});

// 사용 예시
async function generateSummaryWithMetrics(messages: Message[]): Promise<SummaryResult> {
  const end = summaryDuration.startTimer();

  try {
    const result = await generateSummaryWithRetry(messages);
    return result;
  } finally {
    end();
  }
}
```

---

## 12. 테스트 전략

### 12.1 단위 테스트
```typescript
describe('generateSummary', () => {
  it('should generate valid summary from conversation', async () => {
    const messages: Message[] = [
      { role: 'user', content: '오늘 영화 봤어' },
      { role: 'assistant', content: '오! 뭐 봤는데?' },
      { role: 'user', content: '인터스텔라. 진짜 감동이었어' }
    ];

    const summary = await generateSummary(messages);

    expect(summary.summary).toBeTruthy();
    expect(summary.summary.length).toBeLessThanOrEqual(200);
    expect(summary.topics).toContain('영화');
    expect(summary.emotion).toBe('joy');
    expect(summary.importance).toBeGreaterThanOrEqual(1);
    expect(summary.importance).toBeLessThanOrEqual(10);
  });
});

describe('checkAndArchiveMemories', () => {
  it('should archive oldest low-importance memory when limit exceeded', async () => {
    // 6개 메모리 생성 (무료 플랜 제한: 5개)
    await createTestMemories(userId, personaId, 6);

    await checkAndArchiveMemories(userId, personaId);

    const activeCount = await prisma.memory.count({
      where: { userId, personaId, archivedAt: null }
    });

    expect(activeCount).toBe(5);
  });
});
```

### 12.2 통합 테스트
```typescript
describe('POST /api/v1/memory/session/:sessionId/end', () => {
  it('should create memory and archive if needed', async () => {
    const session = await createTestSession();
    await addTestMessages(session.id, 25);

    const response = await request(app)
      .post(`/api/v1/memory/session/${session.id}/end`)
      .set('Authorization', `Bearer ${testToken}`)
      .send({ saveMemory: true, forceSync: true })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.memory).toBeDefined();
    expect(response.body.memory.summary).toBeTruthy();
  });
});
```

---

## 13. 배포 환경 변수

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/knock
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# Security
ENCRYPTION_KEY=64_character_hex_string_for_aes256_encryption_key_here

# LLM
GEMINI_API_KEY=your_gemini_api_key

# Memory System
MEMORY_SESSION_TTL=1800 # 30분 (초)
MEMORY_MAX_MESSAGES=50
MEMORY_FREE_LIMIT=5
MEMORY_SUMMARY_MIN_MESSAGES=20

# Queue
BULL_CONCURRENCY=5
SUMMARY_RETRY_ATTEMPTS=3

# Monitoring
SENTRY_DSN=https://xxx@sentry.io/xxx

# App
NODE_ENV=production
```

---

## 14. 확장 계획

### Phase 1 (현재)
- 기본 세션 메모리
- LLM 자동 요약
- 메모리 제한 및 아카이브

### Phase 2
- 메모리 검색 기능 (전문 검색)
- 메모리 카테고리 자동 분류
- 메모리 연결 (관련 메모리 링크)

### Phase 3
- 메모리 기반 추천 (관련 주제 제안)
- 메모리 타임라인 뷰
- 메모리 통계 대시보드
