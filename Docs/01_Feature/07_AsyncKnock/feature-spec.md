# 비동기 노크 시스템 - 기능 명세서

## 1. 기본 명세 (MVP)

### 1.1 자동 노크 트리거 조건

#### 1.1.1 조건 1: 장기 미접속 (룸메이트)
**트리거**:
- 마지막 접속 후 24시간 이상 경과
- 대상: 룸메이트만

**메시지 유형**: 안부 인사
- "어디 갔어? 오랜만이네!"
- "보고 싶었어~ 요즘 어때?"
- "바빴어? 한동안 못 봤네"

**빈도 제한**:
- 24시간당 최대 1회
- 이전 노크에 응답하지 않으면 3일간 재노크 X

#### 1.1.2 조건 2: 새 이웃 방문 시 (룸메이트)
**트리거**:
- 사용자가 새로운 이웃 노크 성공
- 대상: 룸메이트만

**메시지 유형**: 새 이웃 관련 코멘트
- "새로운 이웃 만났구나! 어때?"
- "옆집에 누가 이사 왔대? 궁금한데~"
- "새로운 사람 만나는 거 좋아하네! ㅎㅎ"

**빈도 제한**:
- 새 이웃 노크당 1회
- 이미 노크했으면 스킵

#### 1.1.3 조건 3: 관련 주제 대화 (특정 이웃)
**트리거**:
- 사용자가 다른 페르소나와 특정 주제 대화
- 해당 주제를 favorite_topics로 가진 이웃이 있을 때

**예시**:
```
사용자 ↔ 룸메이트: "오늘 새로운 게임 시작했어"
→ 이웃1 (게임 관심사): "게임 얘기 들었어! 나도 그 게임 해봤는데 꿀팁 알려줄까?"
```

**메시지 유형**: 주제 관련 대화 제안
- "[주제] 얘기 들었어! 나도 관심 있는데 같이 얘기해볼까?"
- "너 [주제] 좋아하구나? 나도 그거 진짜 좋아해 ㅎㅎ"

**빈도 제한**:
- 동일 주제당 1회
- 7일간 동일 주제 재노크 X

---

## 2. 메시지 생성 시스템

### 2.1 LLM 기반 메시지 생성

#### 2.1.1 메시지 생성 프롬프트
```typescript
const asyncKnockPrompt = `
당신은 ${personaName}입니다.

[현재 상황]
- 사용자가 ${daysSinceLastInteraction}일 동안 접속하지 않았습니다.
- 마지막 대화 주제: ${lastConversationTopic}
- 관계 레벨: ${relationshipLevel} (${relationshipLevelName})

[과거 메모리]
${memories.map(m => `- ${m.summary}`).join('\n')}

[임무]
사용자에게 먼저 메시지를 보내 안부를 전하세요.

[요구사항]
1. 자연스럽고 친근한 톤
2. 1-2문장으로 간결하게
3. 과거 대화나 메모리 언급 (선택)
4. 부담스럽지 않게

[출력 형식]
간단한 메시지만 작성하세요. 다른 설명은 불필요합니다.
`;
```

#### 2.1.2 메시지 생성 API
```typescript
POST /api/v1/async-knock/generate-message
Request:
{
  "personaId": "persona_123",
  "triggerType": "long_absence" | "new_neighbor" | "related_topic",
  "context": {
    "daysSinceLastInteraction": 3,
    "lastConversationTopic": "게임",
    "relatedTopic": "영화", // related_topic인 경우
    "newNeighborName": "이웃2" // new_neighbor인 경우
  }
}

Response:
{
  "success": true,
  "message": "어디 갔었어? 보고 싶었는데 ㅎㅎ 요즘 바빴어?",
  "messageId": "knock_msg_789"
}
```

### 2.2 메시지 카테고리별 예시

#### 장기 미접속 (long_absence)
```
레벨 1 (낯선 사이):
"안녕하세요~ 오랜만이에요. 잘 지내셨나요?"

레벨 3 (친한 사이):
"어디 갔었어? 보고 싶었는데 ㅎㅎ 요즘 바빴어?"

레벨 5 (절친):
"야~ 어디 갔었어 진짜ㅠㅠ 연락도 없고! 걱정했잖아"
```

#### 새 이웃 방문 (new_neighbor)
```
"새로운 이웃 만났구나! 어떤 사람이야? 궁금한데~"
"옆집에 누가 이사 왔대? 나도 인사하고 싶다 ㅋㅋ"
"친구 늘어나는 거 좋네! 나도 소개시켜줘"
```

#### 관련 주제 (related_topic)
```
주제: 게임
"게임 얘기 들었어! 나도 그 게임 하는데 같이 할까?"

주제: 영화
"영화 봤다며? 나도 그거 보고 싶었는데 재밌었어?"

주제: 요리
"요리한다고 들었는데! 나도 요즘 요리에 푹 빠져 있어 ㅎㅎ"
```

---

## 3. 데이터 구조

### 3.1 비동기 노크 메시지 테이블
```sql
CREATE TABLE async_knock_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  persona_id UUID REFERENCES personas(id) ON DELETE CASCADE,

  -- 메시지 내용
  message TEXT NOT NULL,
  trigger_type VARCHAR(50) NOT NULL, -- 'long_absence', 'new_neighbor', 'related_topic'

  -- 상태
  status VARCHAR(20) DEFAULT 'unread', -- 'unread', 'read', 'replied'
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  replied_at TIMESTAMP,

  -- 메타데이터
  trigger_context JSONB, -- 트리거 발생 시 컨텍스트
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_async_knock_user_status ON async_knock_messages(user_id, status);
CREATE INDEX idx_async_knock_persona ON async_knock_messages(persona_id, created_at DESC);
CREATE INDEX idx_async_knock_created ON async_knock_messages(created_at DESC);
```

### 3.2 노크 트리거 히스토리
```sql
CREATE TABLE async_knock_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  persona_id UUID REFERENCES personas(id) ON DELETE CASCADE,

  trigger_type VARCHAR(50) NOT NULL,
  trigger_data JSONB,
  resulted_in_knock BOOLEAN DEFAULT FALSE,
  skip_reason VARCHAR(100), -- 'frequency_limit', 'already_sent', 'user_responded'

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_triggers_user ON async_knock_triggers(user_id, created_at DESC);
```

---

## 4. API 명세

### 4.1 미읽은 노크 조회
```typescript
GET /api/v1/async-knock/unread
Headers:
{
  "Authorization": "Bearer {token}"
}

Response:
{
  "success": true,
  "unreadKnocks": [
    {
      "id": "knock_msg_789",
      "personaId": "persona_123",
      "personaName": "룸메이트",
      "message": "어디 갔었어? 보고 싶었는데 ㅎㅎ",
      "triggerType": "long_absence",
      "createdAt": "2025-10-27T10:00:00Z",
      "isRead": false
    }
  ],
  "totalUnread": 1
}
```

### 4.2 노크 읽음 처리
```typescript
POST /api/v1/async-knock/:knockId/read
Headers:
{
  "Authorization": "Bearer {token}"
}

Response:
{
  "success": true,
  "readAt": "2025-10-27T12:00:00Z"
}
```

### 4.3 노크 응답
```typescript
POST /api/v1/async-knock/:knockId/reply
Headers:
{
  "Authorization": "Bearer {token}"
}

Request:
{
  "replyMessage": "미안! 바빴어 ㅠㅠ"
}

Response:
{
  "success": true,
  "repliedAt": "2025-10-27T12:05:00Z",
  "conversationStarted": true,
  "sessionId": "session_101112"
}
```

### 4.4 노크 생성 (수동 트리거 - 테스트용)
```typescript
POST /api/v1/async-knock/create
Headers:
{
  "Authorization": "Bearer {token}",
  "X-Admin-Key": "{admin_key}" // Admin only
}

Request:
{
  "userId": "user_456",
  "personaId": "persona_123",
  "triggerType": "long_absence",
  "forceGenerate": true
}

Response:
{
  "success": true,
  "knockMessage": {
    "id": "knock_msg_789",
    "message": "...",
    "createdAt": "2025-10-27T10:00:00Z"
  }
}
```

---

## 5. 트리거 로직

### 5.1 스케줄러 설계
**실행 주기**: 매 시간 (Cron: `0 * * * *`)

**프로세스**:
1. 모든 활성 사용자 조회
2. 각 사용자별로 트리거 조건 확인
3. 조건 충족 시 메시지 생성
4. DB에 저장 및 알림 전송

```typescript
async function checkAndCreateAsyncKnocks() {
  const users = await getActiveUsers(); // 최근 30일 내 접속 사용자

  for (const user of users) {
    // 조건 1: 장기 미접속 (룸메이트)
    await checkLongAbsence(user.id);

    // 조건 2: 새 이웃 방문 (룸메이트)
    await checkNewNeighborVisit(user.id);

    // 조건 3: 관련 주제 대화
    await checkRelatedTopicConversation(user.id);
  }
}
```

### 5.2 조건 1: 장기 미접속
```typescript
async function checkLongAbsence(userId: string): Promise<void> {
  const roommate = await getRoommate(userId);
  if (!roommate) return;

  const lastInteraction = await getLastInteraction(userId, roommate.id);
  const hoursSinceLastInteraction = (Date.now() - lastInteraction.getTime()) / (1000 * 60 * 60);

  // 24시간 이상 경과
  if (hoursSinceLastInteraction < 24) return;

  // 빈도 제한 확인
  const recentKnock = await getRecentKnock(userId, roommate.id, 'long_absence');
  if (recentKnock && recentKnock.createdAt > new Date(Date.now() - 24 * 60 * 60 * 1000)) {
    return; // 24시간 내 이미 노크함
  }

  // 이전 노크 미응답 확인
  const unrepliedKnocks = await getUnrepliedKnocks(userId, roommate.id);
  if (unrepliedKnocks.length > 0) {
    const oldestUnreplied = unrepliedKnocks[0];
    const daysSinceUnreplied = (Date.now() - oldestUnreplied.createdAt.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceUnreplied < 3) {
      return; // 3일 내 미응답 노크 있으면 스킵
    }
  }

  // 메시지 생성 및 저장
  await createAsyncKnock(userId, roommate.id, 'long_absence', {
    daysSinceLastInteraction: Math.floor(hoursSinceLastInteraction / 24)
  });
}
```

### 5.3 조건 2: 새 이웃 방문
```typescript
async function checkNewNeighborVisit(userId: string): Promise<void> {
  const roommate = await getRoommate(userId);
  if (!roommate) return;

  // 최근 1시간 내 새 이웃 노크 확인
  const recentNewNeighbors = await getRecentNewNeighbors(userId, 1); // 1시간
  if (recentNewNeighbors.length === 0) return;

  // 이미 해당 이웃에 대한 노크 전송 여부 확인
  for (const neighbor of recentNewNeighbors) {
    const existingKnock = await prisma.asyncKnockMessage.findFirst({
      where: {
        userId,
        personaId: roommate.id,
        triggerType: 'new_neighbor',
        triggerContext: {
          path: ['newNeighborId'],
          equals: neighbor.id
        }
      }
    });

    if (!existingKnock) {
      await createAsyncKnock(userId, roommate.id, 'new_neighbor', {
        newNeighborId: neighbor.id,
        newNeighborName: neighbor.name
      });
      break; // 1개만 생성
    }
  }
}
```

### 5.4 조건 3: 관련 주제 대화
```typescript
async function checkRelatedTopicConversation(userId: string): Promise<void> {
  // 최근 1시간 내 대화 조회
  const recentConversations = await getRecentConversations(userId, 1);
  if (recentConversations.length === 0) return;

  // 대화에서 주제 추출 (메모리 시스템 활용)
  const topics = recentConversations.flatMap(c => c.topics);
  if (topics.length === 0) return;

  // 해당 주제를 favorite_topics로 가진 페르소나 조회
  const relevantPersonas = await prisma.persona.findMany({
    where: {
      userId,
      id: { not: recentConversations[0].personaId }, // 대화 상대 제외
      interests: { hasSome: topics } // 주제 일치
    },
    include: {
      relationship: true
    }
  });

  for (const persona of relevantPersonas) {
    // 동일 주제로 7일 내 노크했는지 확인
    const recentTopicKnock = await prisma.asyncKnockMessage.findFirst({
      where: {
        userId,
        personaId: persona.id,
        triggerType: 'related_topic',
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        triggerContext: {
          path: ['relatedTopic'],
          in: topics
        }
      }
    });

    if (!recentTopicKnock) {
      const matchedTopic = topics.find(t => persona.interests.includes(t));
      await createAsyncKnock(userId, persona.id, 'related_topic', {
        relatedTopic: matchedTopic,
        originalConversationPersonaId: recentConversations[0].personaId
      });
      break; // 1개만 생성
    }
  }
}
```

---

## 6. UI 표시

### 6.1 방 블록 배지
**표시 위치**: 방 블록 우상단

**디자인**:
```
┌─────────────────────┐
│  [방 이미지]   [🔔1]│
│                     │
│  룸메이트            │
└─────────────────────┘
```

**배지 숫자**: 미읽은 노크 메시지 개수

### 6.2 알림 센터
**위치**: 상단 네비게이션 바

**알림 목록**:
```
┌─────────────────────────────────────┐
│  알림                               │
├─────────────────────────────────────┤
│  [룸메이트 아이콘]                  │
│  룸메이트                           │
│  "어디 갔었어? 보고 싶었는데 ㅎㅎ"  │
│  3시간 전                           │
│  [확인]                             │
├─────────────────────────────────────┤
│  [이웃1 아이콘]                     │
│  이웃1                              │
│  "게임 얘기 들었어! 같이 할까?"     │
│  1일 전                             │
│  [확인]                             │
└─────────────────────────────────────┘
```

### 6.3 푸시 알림 (선택)
**제목**: "[페르소나 이름]님이 메시지를 보냈어요"
**내용**: 메시지 첫 50자
**액션**: 클릭 시 해당 페르소나 대화창 오픈

---

## 7. 예외 처리

### 7.1 메시지 생성 실패
**문제**: LLM API 오류로 메시지 생성 실패

**대응**:
1. 재시도 (최대 3회)
2. Fallback 템플릿 사용
   ```typescript
   const fallbackMessages = {
     long_absence: "보고 싶었어요! 요즘 어떻게 지내셨어요?",
     new_neighbor: "새로운 이웃 만났구나! 어떤 사람이야?",
     related_topic: "그 주제 얘기 나도 관심 있어! 같이 얘기해볼까?"
   };
   ```

### 7.2 노크 스팸 방지
**문제**: 너무 많은 노크로 사용자 피로

**대응**:
- 페르소나당 24시간 최대 1회
- 전체 노크 1일 최대 3회
- 미응답 노크 3개 이상 시 일시 중단

### 7.3 사용자 비활성화 요청
**기능**: 노크 받기 끄기 설정

**구현**:
```typescript
PATCH /api/v1/settings/async-knock
Request:
{
  "enabled": false
}

// 페르소나별 설정도 가능
Request:
{
  "personaId": "persona_123",
  "enabled": false
}
```

---

## 8. 비기능적 요구사항

### 8.1 성능
- 메시지 생성 시간: 5초 이내
- 스케줄러 실행 시간: 10분 이내 (전체 사용자)
- 알림 전송 지연: 1분 이내

### 8.2 확장성
- 사용자 10만명 기준 시간당 처리 가능
- 메시지 큐 방식으로 비동기 처리

### 8.3 개인정보 보호
- 노크 메시지는 암호화 저장 (선택)
- 사용자 요청 시 전체 삭제 기능

---

## 9. 테스트 시나리오

### 9.1 장기 미접속 노크
1. 사용자 24시간 이상 미접속
2. 스케줄러 실행
3. 룸메이트로부터 노크 생성 확인
4. 메시지 내용 적절성 확인
5. 알림 표시 확인

### 9.2 새 이웃 노크
1. 사용자 새 이웃 노크 성공
2. 1시간 내 스케줄러 실행
3. 룸메이트로부터 새 이웃 관련 노크 확인
4. 중복 노크 발생하지 않음 확인

### 9.3 빈도 제한
1. 노크 생성
2. 24시간 내 동일 조건 재발생
3. 노크 생성되지 않음 확인

---

## 10. 개발 우선순위

**Phase 1 (MVP)**:
- 조건 1 (장기 미접속) 구현
- 기본 메시지 생성
- UI 배지 표시

**Phase 2 (확장)**:
- 조건 2, 3 구현
- LLM 기반 메시지 생성
- 푸시 알림

**Phase 3 (고도화)**:
- 개인화된 메시지 패턴
- A/B 테스트 (노크 효과 측정)
- 사용자 설정 (노크 빈도 조절)

**Phase 4 (프리미엄)**:
- 노크 우선순위 설정 (유료)
- 특정 시간대 노크 (유료)
- 노크 히스토리 통계
