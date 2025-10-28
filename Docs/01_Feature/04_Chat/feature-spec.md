# 대화 시스템 - 기능 명세서

## 1. 기본 명세 (MVP)

### 1.1 채팅 모달 UI

#### 1.1.1 모달 오픈
**트리거**: 방 블록 클릭

**화면 구성**:
```
┌─────────────────────────────────────┐
│  ← 룸메이트         #게임매니아 ⓘ   │
├─────────────────────────────────────┤
│                                     │
│   [AI] 어, 왔어? 오늘 하루 어땠어?  │
│        12:00                        │
│                                     │
│                      안녕! [User]   │
│                             12:01   │
│                                     │
│   [AI] 오 반가워! 요즘 뭐하고 지내? │
│        12:01                        │
│                                     │
│                  [타이핑 중...]     │
│                                     │
├─────────────────────────────────────┤
│  [메시지 입력...]          [전송]   │
└─────────────────────────────────────┘
```

**헤더 요소**:
- [←] 닫기 버튼
- AI 이름 (룸메이트 / 이웃1 등)
- 핵심 키워드 (첫 번째 1개)
- [ⓘ] 프로필 보기

**채팅 영역**:
- 메시지 말풍선 (AI: 좌측, User: 우측)
- 타임스탬프 (HH:MM)
- 타이핑 인디케이터 (AI 응답 대기 중)
- 자동 스크롤 (최신 메시지 하단)

**입력 영역**:
- 텍스트 입력 필드
- [전송] 버튼
- Enter 키 전송 (Shift+Enter: 줄바꿈)

#### 1.1.2 메시지 스타일
**AI 메시지**:
```css
.message.ai {
  background: #f0f0f0;
  border-radius: 12px;
  padding: 10px 14px;
  max-width: 70%;
  float: left;
  clear: both;
  margin-bottom: 8px;
}

.message.ai .timestamp {
  font-size: 11px;
  color: #999;
  margin-top: 4px;
}
```

**사용자 메시지**:
```css
.message.user {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px;
  padding: 10px 14px;
  max-width: 70%;
  float: right;
  clear: both;
  margin-bottom: 8px;
}
```

---

### 1.2 실시간 메시지 송수신

#### 1.2.1 사용자 메시지 전송
**플로우**:
```
[사용자 메시지 입력]
    ↓
[전송 버튼 클릭 / Enter 키]
    ↓
[클라이언트 → 서버 API 호출]
    ↓
[메시지 화면에 즉시 표시]
    ↓
[타이핑 인디케이터 표시]
    ↓
[LLM 응답 대기]
```

**API 명세**:
```typescript
POST /api/v1/chat/message
Request:
{
  "personaId": "string", // 룸메이트 또는 이웃 ID
  "userId": "string",
  "message": "string",
  "sessionId": "string" // 세션 식별자 (UUID)
}

Response:
{
  "success": true,
  "userMessage": {
    "id": "uuid",
    "content": "안녕!",
    "sender": "user",
    "timestamp": "2025-10-27T12:01:00Z"
  },
  "aiResponse": {
    "id": "uuid",
    "content": "오 반가워! 요즘 뭐하고 지내?",
    "sender": "ai",
    "timestamp": "2025-10-27T12:01:05Z"
  }
}

Error:
{
  "success": false,
  "error": "PERSONA_NOT_FOUND" | "EMPTY_MESSAGE" | "LLM_ERROR"
}
```

#### 1.2.2 LLM 응답 생성
**입력 데이터**:
- 페르소나 시스템 프롬프트
- 세션 대화 히스토리 (최근 10개 메시지)
- 사용자 최신 메시지

**Gemini API 호출**:
```typescript
const messages = [
  { role: "user", parts: [{ text: systemPrompt }] }, // 시스템 프롬프트
  { role: "model", parts: [{ text: "알겠습니다." }] },
  ...sessionHistory, // 과거 대화
  { role: "user", parts: [{ text: userMessage }] }
];

const result = await model.generateContent({
  contents: messages,
  generationConfig: {
    temperature: 0.8,
    maxOutputTokens: 256,
  }
});

const aiResponse = result.response.text();
```

**응답 시간**:
- 평균: 2-3초
- 최대: 5초 (타임아웃)

---

### 1.3 세션 단위 메모리 (기본)

#### 1.3.1 세션 생성
**트리거**: 채팅 모달 오픈 시

**세션 ID 생성**:
```typescript
import { v4 as uuidv4 } from 'uuid';

function createChatSession(userId: string, personaId: string): string {
  const sessionId = uuidv4();

  // Redis에 세션 초기화 (TTL: 1시간)
  redis.setex(
    `chat_session:${sessionId}`,
    3600,
    JSON.stringify({
      userId,
      personaId,
      messages: [],
      createdAt: new Date().toISOString()
    })
  );

  return sessionId;
}
```

#### 1.3.2 대화 히스토리 저장
**Redis 구조**:
```json
{
  "userId": "user_123",
  "personaId": "persona_456",
  "messages": [
    {
      "id": "msg_1",
      "sender": "user",
      "content": "안녕!",
      "timestamp": "2025-10-27T12:01:00Z"
    },
    {
      "id": "msg_2",
      "sender": "ai",
      "content": "오 반가워! 요즘 뭐하고 지내?",
      "timestamp": "2025-10-27T12:01:05Z"
    }
  ],
  "createdAt": "2025-10-27T12:00:00Z"
}
```

**저장 로직**:
```typescript
async function addMessageToSession(
  sessionId: string,
  message: Message
): Promise<void> {
  const key = `chat_session:${sessionId}`;
  const session = JSON.parse(await redis.get(key) || '{}');

  session.messages.push(message);

  // 최근 20개 메시지만 유지
  if (session.messages.length > 20) {
    session.messages = session.messages.slice(-20);
  }

  await redis.setex(key, 3600, JSON.stringify(session));
}
```

#### 1.3.3 세션 종료 (휘발)
**트리거**: 채팅 모달 닫기

**동작**:
- Redis 세션 자동 만료 (1시간 TTL)
- 또는 명시적 삭제 (선택)

```typescript
async function endChatSession(sessionId: string): Promise<void> {
  await redis.del(`chat_session:${sessionId}`);
}
```

---

### 1.4 타이핑 인디케이터

#### 1.4.1 표시 타이밍
**트리거**: 사용자 메시지 전송 → LLM 응답 대기 중

**UI**:
```html
<div class="typing-indicator">
  <span></span>
  <span></span>
  <span></span>
</div>
```

```css
.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 10px 14px;
  background: #f0f0f0;
  border-radius: 12px;
  width: fit-content;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  background: #999;
  border-radius: 50%;
  animation: typing 1.4s infinite;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.5;
  }
  30% {
    transform: translateY(-10px);
    opacity: 1;
  }
}
```

---

## 2. 콘텐츠 강화 방안 (선택)

### 2.1 영구 메모리 (유료 기능)

#### 2.1.1 대화 요약 저장
**목적**: 과거 대화 내용을 기억하여 연속성 있는 대화 제공

**프로세스**:
```
[채팅 세션 종료]
    ↓
[LLM에 대화 요약 요청]
    ↓
[핵심 사실/감정 추출 (1-2줄)]
    ↓
[DB에 영구 저장]
    ↓
[다음 대화 시 컨텍스트로 포함]
```

**요약 프롬프트**:
```typescript
const summaryPrompt = `
다음 대화를 1-2문장으로 요약하세요. 중요한 사실과 감정을 중심으로.

[대화 내용]
${sessionMessages.map(m => `${m.sender}: ${m.content}`).join('\n')}

[출력 형식]
간결한 1-2문장 요약

[예시]
사용자가 최근 새로운 게임을 시작했다고 이야기했고, 매우 흥미로워하는 모습이었다.
`;
```

**데이터베이스 스키마**:
```sql
CREATE TABLE conversation_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  persona_id UUID REFERENCES personas(id) ON DELETE CASCADE,
  summary TEXT NOT NULL, -- 요약된 대화 내용
  keywords TEXT[], -- 핵심 키워드
  emotion VARCHAR(50), -- 감정 (긍정, 중립, 부정)
  conversation_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_memories_user_persona ON conversation_memories(user_id, persona_id);
CREATE INDEX idx_memories_date ON conversation_memories(conversation_date);
```

#### 2.1.2 메모리 활용
**다음 대화 시**:
```typescript
async function getConversationContext(
  userId: string,
  personaId: string
): Promise<string> {
  // 최근 5개 메모리 조회
  const memories = await prisma.conversationMemories.findMany({
    where: { userId, personaId },
    orderBy: { conversationDate: 'desc' },
    take: 5
  });

  if (memories.length === 0) return '';

  return `
[과거 대화 요약]
${memories.map((m, i) => `${i + 1}. ${m.summary}`).join('\n')}

위 내용을 참고하여 대화의 연속성을 유지하세요.
`.trim();
}
```

**LLM 프롬프트에 포함**:
```typescript
const messages = [
  { role: "user", parts: [{ text: systemPrompt }] },
  { role: "model", parts: [{ text: "알겠습니다." }] },
  { role: "user", parts: [{ text: contextFromMemory }] }, // 과거 요약
  { role: "model", parts: [{ text: "이전 대화를 기억하고 있습니다." }] },
  ...sessionHistory,
  { role: "user", parts: [{ text: userMessage }] }
];
```

---

### 2.2 관계 동적 변화

#### 2.2.1 대화 빈도 추적
**목적**: 친밀도에 따라 말투/관계 변화

**데이터베이스**:
```sql
ALTER TABLE personas ADD COLUMN interaction_count INT DEFAULT 0;
ALTER TABLE personas ADD COLUMN relationship_level VARCHAR(50) DEFAULT 'stranger';
-- stranger, acquaintance, friend, close_friend
```

**업데이트 로직**:
```typescript
async function updateRelationship(personaId: string): Promise<void> {
  const persona = await prisma.personas.findUnique({
    where: { id: personaId }
  });

  if (!persona) return;

  const newCount = persona.interactionCount + 1;
  let newLevel = persona.relationshipLevel;

  // 레벨 업 조건
  if (newCount >= 50 && newLevel === 'stranger') {
    newLevel = 'acquaintance';
  } else if (newCount >= 100 && newLevel === 'acquaintance') {
    newLevel = 'friend';
  } else if (newCount >= 200 && newLevel === 'friend') {
    newLevel = 'close_friend';
  }

  // 프롬프트 업데이트
  if (newLevel !== persona.relationshipLevel) {
    const updatedPrompt = updateSystemPromptRelationship(
      persona.systemPrompt,
      newLevel
    );

    await prisma.personas.update({
      where: { id: personaId },
      data: {
        interactionCount: newCount,
        relationshipLevel: newLevel,
        systemPrompt: updatedPrompt
      }
    });
  } else {
    await prisma.personas.update({
      where: { id: personaId },
      data: { interactionCount: newCount }
    });
  }
}
```

---

### 2.3 비동기 노크 (AI 먼저 말 걸기)

#### 2.3.1 트리거 조건
**시나리오**:
1. 24시간+ 미접속 (룸메이트)
2. 새 이웃 노크 시 (룸메이트가 안부 인사)
3. 관련 주제 대화 시 (다른 이웃이 끼어들기)

**데이터베이스**:
```sql
CREATE TABLE async_knocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  persona_id UUID REFERENCES personas(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_async_knocks_user ON async_knocks(user_id, is_read);
```

**생성 로직**:
```typescript
async function createAsyncKnock(
  userId: string,
  personaId: string,
  reason: string
): Promise<void> {
  const persona = await prisma.personas.findUnique({
    where: { id: personaId }
  });

  if (!persona) return;

  // LLM으로 먼저 말 걸기 메시지 생성
  const message = await generateProactiveMessage(persona.systemPrompt, reason);

  await prisma.asyncKnocks.create({
    data: {
      userId,
      personaId,
      message
    }
  });
}
```

**UI 표시**:
```
┌─────────────────────────────────────┐
│  🔔 이웃 노크하기 (1/1)  [프로필]    │
├─────────────────────────────────────┤
│                                     │
│        ┌─────────┐                  │
│        │         │ 💬 1             │
│        │ 룸메이트 │                  │
│        │   방    │                  │
│        └─────────┘                  │
│                                     │
│   💬 1: 읽지 않은 메시지 1개         │
└─────────────────────────────────────┘
```

---

## 3. API 명세

### 3.1 채팅 세션 생성
```typescript
POST /api/v1/chat/session
Request:
{
  "userId": "string",
  "personaId": "string"
}

Response:
{
  "success": true,
  "sessionId": "uuid",
  "persona": {
    "id": "uuid",
    "name": "룸메이트",
    "keywords": ["게임매니아", "영화평론가"]
  },
  "initialMessage": "어, 왔어? 오늘 하루 어땠어?" // 첫 인사 (선택)
}
```

### 3.2 메시지 전송
```typescript
POST /api/v1/chat/message
Request:
{
  "sessionId": "uuid",
  "userId": "string",
  "personaId": "uuid",
  "message": "string"
}

Response:
{
  "success": true,
  "userMessage": {
    "id": "uuid",
    "content": "안녕!",
    "sender": "user",
    "timestamp": "2025-10-27T12:01:00Z"
  },
  "aiResponse": {
    "id": "uuid",
    "content": "오 반가워! 요즘 뭐하고 지내?",
    "sender": "ai",
    "timestamp": "2025-10-27T12:01:05Z"
  }
}
```

### 3.3 세션 히스토리 조회
```typescript
GET /api/v1/chat/session/:sessionId/history

Response:
{
  "success": true,
  "messages": [
    {
      "id": "uuid",
      "sender": "user",
      "content": "안녕!",
      "timestamp": "2025-10-27T12:01:00Z"
    },
    {
      "id": "uuid",
      "sender": "ai",
      "content": "오 반가워!",
      "timestamp": "2025-10-27T12:01:05Z"
    }
  ],
  "total": 10
}
```

### 3.4 세션 종료
```typescript
DELETE /api/v1/chat/session/:sessionId

Response:
{
  "success": true,
  "message": "세션이 종료되었습니다"
}
```

---

## 4. 예외 처리

### 4.1 LLM 응답 실패
**시나리오**: Gemini API 오류

**대응**:
- 재시도 (최대 2회)
- 실패 시 미리 정의된 기본 응답 사용

```typescript
const fallbackResponses = [
  "앗, 잠깐 생각이 안 나네. 다시 말해줄래?",
  "미안, 지금 좀 멍했어. 다시 한 번?",
  "어? 잠깐만, 무슨 말이었지?"
];
```

### 4.2 빈 메시지 전송
**대응**:
```typescript
{
  "success": false,
  "error": "EMPTY_MESSAGE",
  "message": "메시지를 입력해주세요"
}
```

### 4.3 세션 만료
**시나리오**: 1시간 후 Redis TTL 만료

**대응**:
- 새 세션 자동 생성
- 사용자에게 알림: "대화가 초기화되었습니다"

---

## 5. 비기능적 요구사항

### 5.1 성능
- LLM 응답 시간: 평균 2-3초, 최대 5초
- 메시지 전송 → 화면 표시: 100ms 이내
- 동시 채팅 세션: 10,000개

### 5.2 확장성
- 세션당 최대 메시지: 20개 (최근 대화만 유지)
- LLM 컨텍스트 윈도우: 최대 10개 메시지

### 5.3 사용성
- 모바일 키보드 자동 포커스
- 스크롤 자동 하단 이동
- Enter 키 전송 / Shift+Enter 줄바꿈

---

## 6. 테스트 시나리오

### 6.1 정상 플로우
1. 방 블록 클릭 → 채팅 모달 오픈
2. 메시지 입력 → 전송
3. 타이핑 인디케이터 표시
4. LLM 응답 수신 (2-3초)
5. 대화 계속 (3-5회 왕복)
6. 모달 닫기 → 세션 종료

### 6.2 예외 플로우
1. LLM 오류 → Fallback 응답
2. 빈 메시지 전송 → 에러 메시지
3. 세션 만료 → 자동 재생성

### 6.3 성능 테스트
1. 100명 동시 채팅 요청 처리
2. LLM 응답 5초 내 완료율 95%+

---

## 7. 개발 우선순위

**Phase 1 (MVP)**:
- 채팅 모달 UI
- LLM 실시간 응답
- 세션 단위 메모리 (Redis)
- 타이핑 인디케이터

**Phase 2 (Enhancement)**:
- 영구 메모리 (대화 요약 저장)
- 과거 대화 컨텍스트 포함
- 대화 히스토리 조회 UI

**Phase 3 (Premium)**:
- 관계 동적 변화
- 비동기 노크 (AI 먼저 말 걸기)
- 대화 통계 (주제 분석, 감정 분석)
