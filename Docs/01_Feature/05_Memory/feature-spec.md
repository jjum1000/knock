# 메모리 시스템 - 기능 명세서

## 1. 기본 명세 (MVP)

### 1.1 세션 메모리

#### 1.1.1 대화 컨텍스트 유지
**목적**: 현재 세션 내에서 자연스러운 대화 흐름 유지

**기본 동작**:
- 현재 대화 세션의 최근 10개 메시지를 메모리에 유지
- LLM API 호출 시 컨텍스트로 전달
- 세션 종료 (창 닫기, 30분 비활성) 시 메모리 휘발

**기술 요구사항**:
- 클라이언트 측 상태 관리 (Zustand/Redux)
- 메시지 배열: `Message[]` (최대 10개)
- 세션 타임아웃: 30분

**데이터 구조**:
```typescript
interface SessionMemory {
  sessionId: string;
  personaId: string;
  messages: Message[];
  startedAt: Date;
  lastActivityAt: Date;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}
```

#### 1.1.2 LLM 컨텍스트 전달
**API 호출 예시**:
```typescript
POST /api/v1/chat/send
Request:
{
  "personaId": "persona_123",
  "message": "오늘 날씨 어때?",
  "context": {
    "recentMessages": [
      { "role": "user", "content": "요즘 스트레스 받아" },
      { "role": "assistant", "content": "무슨 일 있어? 들어줄게" },
      { "role": "user", "content": "회사 일이 너무 많아서..." }
    ]
  }
}
```

---

## 2. 강화 방안 (장기 메모리)

### 2.1 대화 요약 생성

#### 2.1.1 자동 요약 트리거
**트리거 조건**:
- 대화 세션 종료 시 (창 닫기, 명시적 종료)
- 대화 메시지 수가 20개 이상일 때
- 사용자가 명시적으로 "대화 저장" 요청 시

**실행 프로세스**:
1. 현재 세션의 전체 메시지 수집
2. LLM에 요약 요청 전송
3. 요약 결과를 DB에 저장
4. 세션 메모리 클리어

#### 2.1.2 LLM 요약 프롬프트
```typescript
const summaryPrompt = `
당신은 대화 내용을 간결하게 요약하는 전문가입니다.
다음 대화에서 중요한 정보만 추출하여 1-2문장으로 요약하세요.

[요약 기준]
✓ 사용자가 공유한 사실 (이벤트, 계획, 선호)
✓ 사용자의 감정 상태 (기쁨, 슬픔, 스트레스 등)
✓ 향후 대화에 도움이 될 정보

✗ 일반적인 인사말, 짧은 맞장구
✗ 중요하지 않은 일상적 대화

[대화 내용]
${conversationHistory}

[출력 형식 - JSON]
{
  "summary": "핵심 요약 1-2문장",
  "topics": ["주제1", "주제2"],
  "emotion": "기쁨" | "슬픔" | "스트레스" | "평온" | "흥분",
  "importance": 1-10 (1: 낮음, 10: 매우 중요)
}
`;
```

**API 명세**:
```typescript
POST /api/v1/memory/summarize
Headers:
{
  "Authorization": "Bearer {token}"
}

Request:
{
  "sessionId": "session_456",
  "personaId": "persona_123",
  "messages": Message[]
}

Response:
{
  "success": true,
  "memory": {
    "id": "memory_789",
    "summary": "사용자가 새로운 영화를 봤고 매우 재미있었다고 함. 다음주에 또 영화관에 갈 예정.",
    "topics": ["영화", "여가활동"],
    "emotion": "기쁨",
    "importance": 7,
    "createdAt": "2025-10-27T12:00:00Z"
  }
}
```

### 2.2 메모리 저장 및 관리

#### 2.2.1 데이터베이스 스키마
```sql
CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  persona_id UUID REFERENCES personas(id) ON DELETE CASCADE,
  session_id VARCHAR(100),
  summary TEXT NOT NULL,
  topics TEXT[], -- Array of topic strings
  emotion VARCHAR(50), -- 'joy', 'sadness', 'stress', 'calm', 'excitement'
  importance INT CHECK (importance BETWEEN 1 AND 10),
  created_at TIMESTAMP DEFAULT NOW(),
  archived_at TIMESTAMP NULL -- 아카이브 시간 (NULL이면 활성)
);

CREATE INDEX idx_memories_user_persona ON memories(user_id, persona_id);
CREATE INDEX idx_memories_importance ON memories(importance DESC);
CREATE INDEX idx_memories_created ON memories(created_at DESC);
CREATE INDEX idx_memories_active ON memories(archived_at) WHERE archived_at IS NULL;
```

#### 2.2.2 메모리 우선순위 관리
**무료 플랜**: 최대 5개 메모리 저장
**유료 플랜**: 무제한 메모리 저장

**우선순위 로직**:
1. 중요도(importance) 높은 순
2. 최신 생성 순
3. 중복 주제 제거 (가장 최신 것만 유지)

**아카이브 로직**:
```typescript
async function archiveOldMemories(userId: string, personaId: string, plan: 'free' | 'premium') {
  const maxMemories = plan === 'free' ? 5 : Infinity;

  if (maxMemories === Infinity) return;

  // 활성 메모리 수 확인
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
  }
}
```

### 2.3 메모리 활용

#### 2.3.1 대화 시작 시 메모리 로드
**프로세스**:
1. 사용자가 AI 페르소나와 대화 시작
2. 해당 페르소나와의 활성 메모리 조회 (최대 5개)
3. 메모리를 LLM 시스템 프롬프트에 추가
4. 첫 응답 생성 시 메모리 반영

**API 명세**:
```typescript
GET /api/v1/memory/load
Headers:
{
  "Authorization": "Bearer {token}"
}

Query Parameters:
{
  "personaId": "persona_123",
  "limit": 5
}

Response:
{
  "success": true,
  "memories": [
    {
      "id": "memory_789",
      "summary": "사용자가 새로운 영화를 봤고 매우 재미있었다고 함. 다음주에 또 영화관에 갈 예정.",
      "topics": ["영화", "여가활동"],
      "emotion": "기쁨",
      "importance": 7,
      "createdAt": "2025-10-26T15:30:00Z"
    },
    // ... 최대 5개
  ]
}
```

#### 2.3.2 메모리 기반 프롬프트 구성
```typescript
const systemPromptWithMemory = `
${baseSystemPrompt}

[과거 대화 기록]
당신은 사용자와 다음과 같은 대화를 나눴습니다:

${memories.map(m => `- ${m.summary} (${formatDate(m.createdAt)})`).join('\n')}

이 정보를 바탕으로 자연스럽게 대화를 이어가세요.
예: "어제 본 영화 어땠어?" 같은 질문으로 관심 표현
`;
```

#### 2.3.3 메모리 활용 예시
**시나리오 1: 연속성 있는 대화**
```
[Day 1]
사용자: 내일 중요한 면접이 있어
AI: 와, 떨리겠다! 어떤 회사야?
사용자: IT 스타트업인데 정말 가고 싶어
AI: 잘 될 거야! 준비 많이 해!

→ 메모리 저장: "사용자가 IT 스타트업 면접을 앞두고 있음. 매우 기대하고 있음."

[Day 2]
사용자: (대화 시작)
AI: 어제 면접 어땠어?! 정말 궁금하다!
```

**시나리오 2: 감정 상태 기억**
```
[3 days ago]
사용자: 요즘 너무 지쳐... 회사 일이 힘들어
AI: 힘들겠다... 휴식이 필요할 것 같은데

→ 메모리 저장: "사용자가 업무 스트레스로 힘들어하고 있음."

[Today]
사용자: (대화 시작)
AI: 요즘은 좀 어때? 지난번에 많이 힘들어 보였는데...
```

---

## 3. API 명세

### 3.1 메모리 저장
```typescript
POST /api/v1/memory/create
Headers:
{
  "Authorization": "Bearer {token}"
}

Request:
{
  "personaId": "persona_123",
  "sessionId": "session_456",
  "messages": Message[],
  "manualSummary": "수동 요약 텍스트" // 선택
}

Response:
{
  "success": true,
  "memory": {
    "id": "memory_789",
    "summary": "...",
    "importance": 7
  }
}

Error:
{
  "success": false,
  "error": "MEMORY_LIMIT_REACHED" | "LLM_SUMMARY_FAILED"
}
```

### 3.2 메모리 조회
```typescript
GET /api/v1/memory/list
Headers:
{
  "Authorization": "Bearer {token}"
}

Query Parameters:
{
  "personaId": "persona_123", // 선택 (없으면 모든 페르소나)
  "includeArchived": false,
  "limit": 10,
  "offset": 0
}

Response:
{
  "success": true,
  "memories": Memory[],
  "total": 25,
  "hasMore": true
}
```

### 3.3 메모리 수정
```typescript
PATCH /api/v1/memory/:memoryId
Headers:
{
  "Authorization": "Bearer {token}"
}

Request:
{
  "summary": "수정된 요약", // 선택
  "importance": 9 // 선택
}

Response:
{
  "success": true,
  "memory": Memory
}
```

### 3.4 메모리 삭제
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

### 3.5 메모리 아카이브
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
```

---

## 4. 예외 처리

### 4.1 LLM 요약 실패
**문제**: Gemini API 오류로 요약 생성 실패

**대응**:
1. 재시도 (최대 3회, exponential backoff)
2. 3회 실패 시 대화 원문을 요약 대신 저장 (최대 500자)
3. 사용자에게 "메모리 저장 실패" 알림 (선택적)

```typescript
async function createMemoryWithRetry(sessionData: SessionData): Promise<Memory> {
  for (let i = 0; i < 3; i++) {
    try {
      const summary = await generateSummaryWithLLM(sessionData.messages);
      return await saveMemory(sessionData, summary);
    } catch (error) {
      console.error(`Summary attempt ${i + 1} failed:`, error);
      if (i === 2) {
        // 최종 실패: 원문 저장
        const fallbackSummary = sessionData.messages
          .map(m => `${m.role}: ${m.content}`)
          .join('\n')
          .substring(0, 500);
        return await saveMemory(sessionData, { summary: fallbackSummary, importance: 5 });
      }
      await sleep(1000 * Math.pow(2, i));
    }
  }
}
```

### 4.2 메모리 제한 초과 (무료 플랜)
**문제**: 사용자가 5개 메모리 제한에 도달

**대응**:
1. 중요도가 가장 낮은 메모리 자동 아카이브
2. 사용자에게 알림 표시
   - "메모리가 가득 찼습니다. 중요도가 낮은 이전 대화는 아카이브됩니다."
   - "더 많은 메모리를 원하시면 Knock Plus를 이용하세요"

### 4.3 세션 비정상 종료
**문제**: 브라우저 크래시로 대화 종료 이벤트 미발생

**대응**:
1. 백그라운드 주기적 저장 (5분마다)
2. 서버 측에서 비활성 세션 감지 (30분)
3. 비활성 세션 자동 요약 및 저장

---

## 5. 비기능적 요구사항

### 5.1 성능
- 메모리 로드 시간: 500ms 이내
- 요약 생성 시간: 5초 이내
- 메모리 저장 시간: 1초 이내

### 5.2 개인정보 보호
- 메모리 데이터 암호화 저장 (AES-256)
- 사용자 요청 시 메모리 전체 삭제 기능
- GDPR 준수 (데이터 이동성, 삭제 권리)

### 5.3 확장성
- 사용자별 메모리 독립 저장
- 페르소나별 메모리 분리
- 수평 확장 가능한 DB 구조

---

## 6. 테스트 시나리오

### 6.1 기본 플로우
1. 사용자가 AI와 대화 시작
2. 20개 이상 메시지 교환
3. 대화 종료
4. 메모리 자동 생성 확인
5. 다음 날 대화 재시작
6. AI가 이전 대화 언급하는지 확인

### 6.2 메모리 제한 테스트 (무료 플랜)
1. 5개 메모리 생성
2. 6번째 메모리 생성 시도
3. 가장 낮은 중요도 메모리 아카이브 확인
4. 활성 메모리 개수 = 5 유지 확인

### 6.3 LLM 실패 대응
1. Gemini API를 의도적으로 차단
2. 대화 종료
3. Fallback 메모리 생성 확인 (원문 일부 저장)

---

## 7. 개발 우선순위

**Phase 1 (MVP)**:
- 세션 메모리 (10개 메시지)
- 기본 메모리 저장 (수동 트리거)
- 메모리 조회 및 표시

**Phase 2 (자동화)**:
- LLM 자동 요약
- 대화 종료 시 자동 저장
- 메모리 기반 프롬프트 구성

**Phase 3 (고도화)**:
- 메모리 우선순위 알고리즘
- 아카이브 시스템
- 메모리 검색 기능

**Phase 4 (프리미엄)**:
- 무제한 메모리 (유료)
- 메모리 수동 편집
- 메모리 카테고리 태깅
