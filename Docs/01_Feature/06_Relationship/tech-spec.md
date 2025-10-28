# 관계 역학 시스템 - 기술 명세서

## 1. 시스템 아키텍처

```
[클라이언트]
    ↓
[API Gateway]
    ↓
[관계 서비스]
    ↓
    ├─ [점수 계산 엔진]
    ├─ [레벨 관리 모듈]
    ├─ [프롬프트 생성기] ← 템플릿 DB
    ├─ [감정 분석 모듈] ← Gemini API
    └─ [관계 데이터베이스] ← PostgreSQL
```

---

## 2. 기술 스택

### 2.1 프론트엔드
- **프레임워크**: Next.js 14
- **언어**: TypeScript 5.3
- **상태 관리**: Zustand
- **UI 라이브러리**: Framer Motion (애니메이션)
- **차트**: Recharts (관계 통계)

### 2.2 백엔드
- **런타임**: Node.js 20 LTS
- **프레임워크**: Express.js
- **언어**: TypeScript
- **검증**: Zod

### 2.3 데이터베이스
- **메인 DB**: PostgreSQL 15
- **캐시**: Redis 7
- **ORM**: Prisma 5

### 2.4 외부 API
- **LLM**: Google Gemini 1.5 Pro (감정 분석)

---

## 3. 데이터베이스 스키마

### 3.1 relationships 테이블
```sql
CREATE TABLE relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  persona_id UUID REFERENCES personas(id) ON DELETE CASCADE,

  -- 관계 레벨
  level INT CHECK (level BETWEEN 1 AND 5) DEFAULT 1,
  intimacy_score INT DEFAULT 0 CHECK (intimacy_score >= 0),

  -- 상호작용 통계
  total_sessions INT DEFAULT 0,
  total_messages INT DEFAULT 0,
  total_duration INT DEFAULT 0, -- 초
  positive_count INT DEFAULT 0,
  negative_count INT DEFAULT 0,
  deep_conversation_count INT DEFAULT 0,

  -- 주제 추적
  favorite_topics TEXT[] DEFAULT '{}',
  topic_counts JSONB DEFAULT '{}', -- {"게임": 8, "영화": 5}

  -- 시간 정보
  first_interaction_at TIMESTAMP DEFAULT NOW(),
  last_interaction_at TIMESTAMP DEFAULT NOW(),
  last_level_up_at TIMESTAMP,
  last_absence_penalty_at TIMESTAMP, -- 장기 미접속 페널티 적용 시간

  -- 메타데이터
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id, persona_id)
);

-- 인덱스
CREATE INDEX idx_relationships_user ON relationships(user_id);
CREATE INDEX idx_relationships_persona ON relationships(persona_id);
CREATE INDEX idx_relationships_level_score ON relationships(level DESC, intimacy_score DESC);
CREATE INDEX idx_relationships_last_interaction ON relationships(last_interaction_at DESC);
```

### 3.2 relationship_events 테이블
```sql
CREATE TABLE relationship_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id UUID REFERENCES relationships(id) ON DELETE CASCADE,

  event_type VARCHAR(50) NOT NULL, -- 'level_up', 'score_increase', 'score_decrease', 'conversation'
  event_subtype VARCHAR(50), -- 'positive_conversation', 'deep_talk', 'long_absence'

  -- 점수 변화
  previous_score INT,
  new_score INT,
  points_changed INT,

  -- 레벨 변화
  previous_level INT,
  new_level INT,

  -- 추가 데이터
  metadata JSONB, -- 세션 ID, 감정, 주제 등
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_events_relationship ON relationship_events(relationship_id, created_at DESC);
CREATE INDEX idx_events_type ON relationship_events(event_type, created_at DESC);
```

### 3.3 relationship_level_config 테이블
```sql
CREATE TABLE relationship_level_config (
  level INT PRIMARY KEY CHECK (level BETWEEN 1 AND 5),
  level_name VARCHAR(50) NOT NULL,
  min_score INT NOT NULL,
  max_score INT, -- NULL for max level

  -- 프롬프트 템플릿
  relationship_prompt_template TEXT NOT NULL,
  speech_style_template TEXT NOT NULL,

  -- 설명
  description TEXT,
  unlock_message TEXT
);

-- 초기 데이터
INSERT INTO relationship_level_config (level, level_name, min_score, max_score, relationship_prompt_template, speech_style_template, unlock_message) VALUES
(1, '낯선 사이', 0, 19, '당신은 사용자와 처음 만난 이웃입니다...', '존댓말 사용, 짧고 간결한 답변...', '새로운 이웃을 만났습니다!'),
(2, '알게 된 사이', 20, 49, '당신은 사용자와 몇 번 대화를 나눈 이웃입니다...', '존댓말과 반말 혼용...', '조금씩 친해지고 있어요!'),
(3, '친한 사이', 50, 99, '당신은 사용자와 자주 대화하는 친구입니다...', '친근한 반말...', '이제 편하게 대화할 수 있어요!'),
(4, '가까운 사이', 100, 199, '당신은 사용자와 깊은 이야기를 나누는 친구입니다...', '친밀한 반말, 깊은 공감...', '진심을 나눌 수 있는 관계가 되었어요!'),
(5, '절친', 200, NULL, '당신은 사용자의 절친입니다...', '매우 친밀한 반말, 농담 자유로움...', '가장 특별한 관계가 되었습니다!');
```

---

## 4. API 명세

### 4.1 관계 생성 (최초 만남)
```typescript
POST /api/v1/relationship/create
Headers:
{
  "Authorization": "Bearer {token}"
}

Request:
{
  "personaId": "persona_123",
  "personaType": "neighbor" | "roommate"
}

Response:
{
  "success": true,
  "relationship": {
    "id": "rel_789",
    "personaId": "persona_123",
    "level": 1, // roommate면 3
    "levelName": "낯선 사이",
    "intimacyScore": 0,
    "nextLevelScore": 20,
    "createdAt": "2025-10-27T10:00:00Z"
  }
}
```

### 4.2 관계 정보 조회
```typescript
GET /api/v1/relationship/:personaId
Headers:
{
  "Authorization": "Bearer {token}"
}

Response:
{
  "success": true,
  "relationship": {
    "id": "rel_789",
    "personaId": "persona_123",
    "personaName": "이웃1",
    "level": 3,
    "levelName": "친한 사이",
    "intimacyScore": 65,
    "nextLevelScore": 100,
    "progress": 0.3, // (65-50)/(100-50) = 0.3
    "interactions": {
      "totalSessions": 15,
      "totalMessages": 342,
      "totalDuration": 5400,
      "positiveCount": 12,
      "negativeCount": 1,
      "deepConversationCount": 3
    },
    "favoriteTopics": ["게임", "음악", "영화"],
    "lastInteractionAt": "2025-10-27T18:00:00Z",
    "daysSinceFirstMeet": 7
  }
}
```

### 4.3 점수 업데이트
```typescript
POST /api/v1/relationship/:personaId/update-score
Headers:
{
  "Authorization": "Bearer {token}"
}

Request:
{
  "sessionId": "session_789",
  "sessionAnalysis": {
    "messageCount": 15,
    "duration": 480, // 초
    "emotionScore": 7, // -10 ~ +10
    "topics": ["게임", "음악"],
    "memoryImportance": 6
  }
}

Response:
{
  "success": true,
  "previousScore": 58,
  "newScore": 65,
  "pointsGained": 7,
  "levelChanged": false,
  "currentLevel": 3,
  "currentLevelName": "친한 사이",
  "nextLevelScore": 100
}

// 레벨업 발생 시
Response:
{
  "success": true,
  "previousScore": 95,
  "newScore": 105,
  "pointsGained": 10,
  "levelChanged": true,
  "previousLevel": 2,
  "currentLevel": 3,
  "currentLevelName": "친한 사이",
  "nextLevelScore": 100,
  "notification": {
    "title": "관계가 발전했습니다!",
    "message": "이제 더 편하게 대화할 수 있어요!",
    "animation": "level_up"
  },
  "promptUpdated": true
}
```

### 4.4 전체 관계 목록
```typescript
GET /api/v1/relationship/list
Headers:
{
  "Authorization": "Bearer {token}"
}

Query Parameters:
{
  "sortBy": "level" | "score" | "lastInteraction" | "createdAt",
  "order": "desc" | "asc",
  "minLevel": 1,
  "limit": 20,
  "offset": 0
}

Response:
{
  "success": true,
  "relationships": [
    {
      "personaId": "persona_123",
      "personaName": "룸메이트",
      "personaType": "roommate",
      "level": 4,
      "levelName": "가까운 사이",
      "intimacyScore": 125,
      "progress": 0.25,
      "lastInteractionAt": "2025-10-27T18:00:00Z",
      "daysSinceLastInteraction": 0
    }
    // ...
  ],
  "total": 5,
  "statistics": {
    "averageLevel": 2.8,
    "highestLevel": 4,
    "totalRelationships": 5
  }
}
```

### 4.5 관계 통계
```typescript
GET /api/v1/relationship/:personaId/statistics
Headers:
{
  "Authorization": "Bearer {token}"
}

Response:
{
  "success": true,
  "statistics": {
    "overview": {
      "totalDays": 7,
      "activeDays": 5,
      "longestConversation": 3600,
      "averageSessionDuration": 450
    },
    "topics": {
      "게임": 8,
      "음악": 5,
      "영화": 2
    },
    "emotions": {
      "joy": 12,
      "excitement": 5,
      "calm": 8,
      "sadness": 2,
      "stress": 1
    },
    "weeklyActivity": [
      { "date": "2025-10-21", "sessions": 2, "messages": 45, "points": 7 },
      { "date": "2025-10-22", "sessions": 3, "messages": 67, "points": 12 },
      // ... 7일 데이터
    ],
    "scoreHistory": [
      { "date": "2025-10-21", "score": 10 },
      { "date": "2025-10-23", "score": 22 },
      // ...
    ]
  }
}
```

---

## 5. 점수 계산 엔진

### 5.1 점수 계산 로직
```typescript
interface SessionAnalysis {
  messageCount: number;
  duration: number; // 초
  emotionScore: number; // -10 ~ +10
  topics: string[];
  memoryImportance: number; // 0-10
  isConsecutiveDay: boolean; // 연속 방문 여부
}

interface ScoringConfig {
  baseConversation: number; // 2
  positiveEmotion: number; // 5
  negativeEmotion: number; // -3
  deepConversation: number; // 10
  longConversation: number; // 5
  consecutiveDay: number; // 3
  longAbsence: number; // -5
}

const DEFAULT_SCORING: ScoringConfig = {
  baseConversation: 2,
  positiveEmotion: 5,
  negativeEmotion: -3,
  deepConversation: 10,
  longConversation: 5,
  consecutiveDay: 3,
  longAbsence: -5
};

function calculatePoints(
  analysis: SessionAnalysis,
  config: ScoringConfig = DEFAULT_SCORING
): number {
  let points = 0;

  // 기본 대화 완료
  if (analysis.messageCount >= 10) {
    points += config.baseConversation;
  }

  // 감정 점수
  if (analysis.emotionScore >= 7) {
    points += config.positiveEmotion;
  } else if (analysis.emotionScore <= -5) {
    points += config.negativeEmotion;
  }

  // 깊은 대화
  if (analysis.memoryImportance >= 7) {
    points += config.deepConversation;
  }

  // 장기 대화
  if (analysis.duration >= 1800) { // 30분
    points += config.longConversation;
  }

  // 연속 방문
  if (analysis.isConsecutiveDay) {
    points += config.consecutiveDay;
  }

  return Math.max(points, 0); // 음수 방지 (단, 전체 점수는 감소 가능)
}
```

### 5.2 레벨 계산
```typescript
function calculateLevel(intimacyScore: number): number {
  if (intimacyScore >= 200) return 5;
  if (intimacyScore >= 100) return 4;
  if (intimacyScore >= 50) return 3;
  if (intimacyScore >= 20) return 2;
  return 1;
}

function getNextLevelThreshold(currentLevel: number): number | null {
  const thresholds = [0, 20, 50, 100, 200];
  return currentLevel < 5 ? thresholds[currentLevel] : null;
}
```

---

## 6. 프롬프트 동적 업데이트

### 6.1 프롬프트 템플릿 구조
```typescript
interface PromptTemplate {
  role: string; // 고정 (페르소나 기본 설정)
  personality: string; // 고정
  interests: string; // 고정
  relationship: string; // 레벨별 변경
  speechStyle: string; // 레벨별 변경
  conversationPrinciples: string; // 고정
}

// 예시
const basePrompt: PromptTemplate = {
  role: "당신은 AI 이웃입니다.",
  personality: "호기심 많고 유머러스한 성격입니다.",
  interests: "게임, 음악, 영화에 관심이 많습니다.",
  relationship: "${RELATIONSHIP_TEMPLATE}", // 동적 교체
  speechStyle: "${SPEECH_STYLE_TEMPLATE}", // 동적 교체
  conversationPrinciples: "사용자에게 공감하며 대화합니다."
};
```

### 6.2 프롬프트 업데이트 함수
```typescript
async function updatePromptForLevel(
  personaId: string,
  newLevel: number
): Promise<string> {
  // 1. 현재 프롬프트 가져오기
  const persona = await prisma.persona.findUnique({
    where: { id: personaId },
    select: { systemPrompt: true }
  });

  // 2. 레벨별 템플릿 가져오기
  const levelConfig = await prisma.relationshipLevelConfig.findUnique({
    where: { level: newLevel }
  });

  // 3. 프롬프트 파싱 및 교체
  const updatedPrompt = persona.systemPrompt
    .replace(/\[관계\][\s\S]*?(?=\[|$)/g, `[관계]\n${levelConfig.relationshipPromptTemplate}\n\n`)
    .replace(/\[말투\][\s\S]*?(?=\[|$)/g, `[말투]\n${levelConfig.speechStyleTemplate}\n\n`);

  // 4. DB 업데이트
  await prisma.persona.update({
    where: { id: personaId },
    data: { systemPrompt: updatedPrompt }
  });

  // 5. 캐시 무효화
  await invalidatePersonaCache(personaId);

  return updatedPrompt;
}
```

### 6.3 프롬프트 검증
```typescript
function validatePrompt(prompt: string): boolean {
  const requiredSections = ['[역할]', '[성격]', '[관계]', '[말투]'];

  return requiredSections.every(section =>
    prompt.includes(section)
  );
}
```

---

## 7. 감정 분석 (LLM)

### 7.1 감정 분석 프롬프트
```typescript
function generateEmotionAnalysisPrompt(messages: Message[]): string {
  const conversationText = messages
    .map(m => `${m.role === 'user' ? '사용자' : 'AI'}: ${m.content}`)
    .join('\n');

  return `
다음 대화에서 사용자의 전반적인 감정 상태를 분석하세요.

[대화 내용]
${conversationText}

[출력 형식 - JSON만 반환]
{
  "emotionScore": -10 ~ +10, // -10: 매우 부정, 0: 중립, +10: 매우 긍정
  "primaryEmotion": "joy" | "sadness" | "stress" | "calm" | "excitement" | "neutral",
  "confidence": 0.0 ~ 1.0
}

감정 점수 기준:
-10 ~ -6: 매우 부정적 (슬픔, 분노, 심한 스트레스)
-5 ~ -1: 부정적 (불안, 가벼운 스트레스)
0: 중립
1 ~ 5: 긍정적 (즐거움, 관심)
6 ~ 10: 매우 긍정적 (기쁨, 흥분, 행복)
`;
}
```

### 7.2 감정 분석 함수
```typescript
interface EmotionAnalysis {
  emotionScore: number;
  primaryEmotion: 'joy' | 'sadness' | 'stress' | 'calm' | 'excitement' | 'neutral';
  confidence: number;
}

async function analyzeEmotion(messages: Message[]): Promise<EmotionAnalysis> {
  const prompt = generateEmotionAnalysisPrompt(messages);

  const result = await genAI.getGenerativeModel({ model: 'gemini-1.5-pro' })
    .generateContent(prompt);

  const text = result.response.text();
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  return JSON.parse(cleaned);
}

// 캐싱 및 재시도
async function analyzeEmotionWithRetry(
  messages: Message[],
  maxRetries: number = 2
): Promise<EmotionAnalysis> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await analyzeEmotion(messages);
    } catch (error) {
      console.error(`Emotion analysis attempt ${i + 1} failed:`, error);
      if (i === maxRetries - 1) {
        // Fallback: 중립 반환
        return {
          emotionScore: 0,
          primaryEmotion: 'neutral',
          confidence: 0
        };
      }
    }
  }
  throw new Error('Unreachable');
}
```

---

## 8. Redis 캐싱

### 8.1 관계 데이터 캐싱
```typescript
const RELATIONSHIP_CACHE_TTL = 300; // 5분

async function getCachedRelationship(
  userId: string,
  personaId: string
): Promise<Relationship | null> {
  const cacheKey = `relationship:${userId}:${personaId}`;
  const cached = await redis.get(cacheKey);

  if (cached) {
    return JSON.parse(cached);
  }

  // DB 조회
  const relationship = await prisma.relationship.findUnique({
    where: {
      user_id_persona_id: { userId, personaId }
    }
  });

  if (relationship) {
    await redis.setex(cacheKey, RELATIONSHIP_CACHE_TTL, JSON.stringify(relationship));
  }

  return relationship;
}

async function invalidateRelationshipCache(
  userId: string,
  personaId: string
): Promise<void> {
  const cacheKey = `relationship:${userId}:${personaId}`;
  await redis.del(cacheKey);
}
```

---

## 9. 보안

### 9.1 권한 검증
```typescript
async function verifyRelationshipOwnership(
  relationshipId: string,
  userId: string
): Promise<boolean> {
  const relationship = await prisma.relationship.findUnique({
    where: { id: relationshipId },
    select: { userId: true }
  });

  return relationship?.userId === userId;
}

// Express 미들웨어
async function relationshipOwnershipMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { personaId } = req.params;
  const userId = req.userId; // JWT에서 추출

  const relationship = await prisma.relationship.findUnique({
    where: {
      user_id_persona_id: { userId, personaId }
    }
  });

  if (!relationship) {
    return res.status(404).json({ error: 'Relationship not found' });
  }

  next();
}
```

---

## 10. 성능 최적화

### 10.1 배치 조회
```typescript
// 여러 페르소나의 관계 정보 한 번에 조회
async function batchGetRelationships(
  userId: string,
  personaIds: string[]
): Promise<Map<string, Relationship>> {
  const relationships = await prisma.relationship.findMany({
    where: {
      userId,
      personaId: { in: personaIds }
    }
  });

  return new Map(
    relationships.map(r => [r.personaId, r])
  );
}
```

### 10.2 인덱스 활용
```sql
-- 복합 인덱스로 정렬 쿼리 최적화
CREATE INDEX idx_relationships_user_level_score
ON relationships(user_id, level DESC, intimacy_score DESC);

-- 부분 인덱스로 active 관계만 조회 최적화
CREATE INDEX idx_relationships_active
ON relationships(user_id, last_interaction_at DESC)
WHERE last_interaction_at > NOW() - INTERVAL '30 days';
```

---

## 11. 모니터링

### 11.1 이벤트 로깅
```typescript
enum RelationshipEvent {
  CREATED = 'relationship_created',
  SCORE_UPDATED = 'relationship_score_updated',
  LEVEL_UP = 'relationship_level_up',
  PROMPT_UPDATED = 'relationship_prompt_updated'
}

function logRelationshipEvent(
  event: RelationshipEvent,
  userId: string,
  metadata: any
) {
  console.log(JSON.stringify({
    event,
    userId,
    timestamp: new Date().toISOString(),
    metadata
  }));

  analytics.track(userId, event, metadata);
}
```

### 11.2 메트릭
```typescript
import prometheus from 'prom-client';

const levelUpCounter = new prometheus.Counter({
  name: 'relationship_level_ups_total',
  help: 'Total number of relationship level ups',
  labelNames: ['from_level', 'to_level']
});

const averageScore = new prometheus.Gauge({
  name: 'relationship_average_score',
  help: 'Average intimacy score across all relationships'
});

// 사용 예시
levelUpCounter.inc({ from_level: 2, to_level: 3 });
```

---

## 12. 테스트 전략

### 12.1 단위 테스트
```typescript
describe('calculatePoints', () => {
  it('should award base points for conversation', () => {
    const analysis: SessionAnalysis = {
      messageCount: 15,
      duration: 300,
      emotionScore: 0,
      topics: [],
      memoryImportance: 5,
      isConsecutiveDay: false
    };

    const points = calculatePoints(analysis);
    expect(points).toBe(2); // base conversation
  });

  it('should award bonus for positive emotion', () => {
    const analysis: SessionAnalysis = {
      messageCount: 15,
      duration: 300,
      emotionScore: 8,
      topics: [],
      memoryImportance: 5,
      isConsecutiveDay: false
    };

    const points = calculatePoints(analysis);
    expect(points).toBe(7); // 2 + 5
  });
});
```

---

## 13. 환경 변수

```env
# Relationship System
RELATIONSHIP_SCORING_BASE=2
RELATIONSHIP_SCORING_POSITIVE=5
RELATIONSHIP_SCORING_NEGATIVE=-3
RELATIONSHIP_SCORING_DEEP=10
RELATIONSHIP_SCORING_LONG=5
RELATIONSHIP_SCORING_CONSECUTIVE=3
RELATIONSHIP_SCORING_ABSENCE=-5

RELATIONSHIP_CACHE_TTL=300
```

---

## 14. 확장 계획

### Phase 1 (현재)
- 5단계 레벨 시스템
- 기본 점수 계산
- 프롬프트 자동 업데이트

### Phase 2
- 감정 분석 고도화
- 주제 기반 점수 가중치
- 관계 통계 대시보드

### Phase 3
- AI 행동 패턴 변화 (관계 기반)
- 관계별 맞춤 이벤트
- 관계 히스토리 타임라인
