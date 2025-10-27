# 비동기 노크 시스템 - 기술 명세서

## 1. 시스템 아키텍처

```
[스케줄러 (Cron)]
    ↓
[트리거 감지 엔진]
    ↓
[빈도 제한 검증]
    ↓
[메시지 생성 큐] ← Gemini API
    ↓
[메시지 저장소] ← PostgreSQL
    ↓
[알림 서비스] → 푸시 알림, 이메일
    ↓
[클라이언트] → 메시지 표시 및 응답
```

---

## 2. 기술 스택

### 2.1 백엔드
- **런타임**: Node.js 20 LTS
- **프레임워크**: Express.js
- **언어**: TypeScript
- **스케줄러**: Node-cron
- **메시지 큐**: Bull (Redis 기반)

### 2.2 데이터베이스
- **메인 DB**: PostgreSQL 15
- **캐시**: Redis 7
- **ORM**: Prisma 5

### 2.3 외부 서비스
- **LLM**: Google Gemini 1.5 Pro
- **푸시 알림**: Firebase Cloud Messaging (FCM)
- **이메일**: SendGrid

---

## 3. 데이터베이스 스키마

### 3.1 async_knock_messages 테이블
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

  -- 트리거 컨텍스트
  trigger_context JSONB, -- {"daysSinceLastInteraction": 1, "relatedTopic": "게임"}

  -- 메타데이터
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_async_knock_user_status ON async_knock_messages(user_id, status);
CREATE INDEX idx_async_knock_persona ON async_knock_messages(persona_id, created_at DESC);
CREATE INDEX idx_async_knock_unread ON async_knock_messages(user_id, is_read)
  WHERE is_read = FALSE;
CREATE INDEX idx_async_knock_trigger ON async_knock_messages(user_id, trigger_type, created_at DESC);
```

### 3.2 async_knock_triggers 테이블 (히스토리)
```sql
CREATE TABLE async_knock_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  persona_id UUID REFERENCES personas(id),

  trigger_type VARCHAR(50) NOT NULL,
  trigger_data JSONB,

  -- 결과
  resulted_in_knock BOOLEAN DEFAULT FALSE,
  skip_reason VARCHAR(100), -- 'frequency_limit', 'already_sent', 'user_disabled'
  knock_message_id UUID REFERENCES async_knock_messages(id),

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_triggers_user_time ON async_knock_triggers(user_id, created_at DESC);
CREATE INDEX idx_triggers_result ON async_knock_triggers(resulted_in_knock, created_at DESC);
```

### 3.3 async_knock_settings 테이블
```sql
CREATE TABLE async_knock_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- 전역 설정
  enabled BOOLEAN DEFAULT TRUE,
  push_notification_enabled BOOLEAN DEFAULT TRUE,
  email_notification_enabled BOOLEAN DEFAULT FALSE,

  -- 빈도 제한
  max_knocks_per_day INT DEFAULT 3,

  -- 페르소나별 설정 (JSONB)
  persona_settings JSONB DEFAULT '{}', -- {"persona_123": {"enabled": false}}

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id)
);
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

Query Parameters:
{
  "personaId": "persona_123", // 선택
  "limit": 10
}

Response:
{
  "success": true,
  "unreadKnocks": [
    {
      "id": "knock_msg_789",
      "personaId": "persona_123",
      "personaName": "룸메이트",
      "personaAvatar": "https://cdn.knock.com/avatars/123.png",
      "message": "어제 하루 바빴어? 그 게임은 좀 더 했어? ㅎㅎ",
      "triggerType": "long_absence",
      "createdAt": "2025-10-28T10:00:00Z",
      "isRead": false,
      "hoursAgo": 4
    }
  ],
  "totalUnread": 1
}
```

### 4.2 모든 노크 조회 (히스토리)
```typescript
GET /api/v1/async-knock/list
Headers:
{
  "Authorization": "Bearer {token}"
}

Query Parameters:
{
  "status": "unread" | "read" | "replied", // 선택
  "limit": 20,
  "offset": 0
}

Response:
{
  "success": true,
  "knocks": [
    {
      "id": "knock_msg_789",
      "personaId": "persona_123",
      "personaName": "룸메이트",
      "message": "...",
      "status": "replied",
      "createdAt": "2025-10-28T10:00:00Z",
      "readAt": "2025-10-28T14:00:00Z",
      "repliedAt": "2025-10-28T14:05:00Z"
    }
  ],
  "total": 25
}
```

### 4.3 노크 읽음 처리
```typescript
POST /api/v1/async-knock/:knockId/read
Headers:
{
  "Authorization": "Bearer {token}"
}

Response:
{
  "success": true,
  "knockId": "knock_msg_789",
  "readAt": "2025-10-28T14:00:00Z"
}
```

### 4.4 노크 응답 (대화 시작)
```typescript
POST /api/v1/async-knock/:knockId/reply
Headers:
{
  "Authorization": "Bearer {token}"
}

Request:
{
  "replyMessage": "응 ㅎㅎ 좀 바빴어. 게임 엄청 재밌어!"
}

Response:
{
  "success": true,
  "knockId": "knock_msg_789",
  "repliedAt": "2025-10-28T14:05:00Z",
  "conversationStarted": true,
  "sessionId": "session_101112",
  "aiResponse": {
    "id": "msg_202020",
    "content": "오 진짜? 어디까지 갔어? 나도 궁금해 ㅎㅎ",
    "timestamp": "2025-10-28T14:05:03Z"
  }
}
```

### 4.5 노크 설정 조회
```typescript
GET /api/v1/async-knock/settings
Headers:
{
  "Authorization": "Bearer {token}"
}

Response:
{
  "success": true,
  "settings": {
    "enabled": true,
    "pushNotificationEnabled": true,
    "emailNotificationEnabled": false,
    "maxKnocksPerDay": 3,
    "personaSettings": {
      "persona_123": { "enabled": true },
      "persona_456": { "enabled": false }
    }
  }
}
```

### 4.6 노크 설정 업데이트
```typescript
PATCH /api/v1/async-knock/settings
Headers:
{
  "Authorization": "Bearer {token}"
}

Request:
{
  "enabled": true, // 선택
  "pushNotificationEnabled": false, // 선택
  "personaSettings": { // 선택
    "persona_123": { "enabled": false }
  }
}

Response:
{
  "success": true,
  "settings": { /* 업데이트된 설정 */ }
}
```

### 4.7 수동 노크 생성 (Admin/Test)
```typescript
POST /api/v1/async-knock/create
Headers:
{
  "Authorization": "Bearer {adminToken}",
  "X-Admin-Key": "{admin_key}"
}

Request:
{
  "userId": "user_456",
  "personaId": "persona_123",
  "triggerType": "long_absence",
  "context": {
    "daysSinceLastInteraction": 1
  },
  "forceGenerate": true // 빈도 제한 무시
}

Response:
{
  "success": true,
  "knockMessage": {
    "id": "knock_msg_789",
    "message": "...",
    "createdAt": "2025-10-28T10:00:00Z"
  }
}
```

---

## 5. 스케줄러 구현

### 5.1 Cron 설정
```typescript
import cron from 'node-cron';

// 매 시간 실행 (00분)
cron.schedule('0 * * * *', async () => {
  console.log('Running async knock scheduler...');
  await runAsyncKnockScheduler();
});

// 매일 자정 정리 작업
cron.schedule('0 0 * * *', async () => {
  console.log('Running async knock cleanup...');
  await cleanupOldKnocks();
});
```

### 5.2 메인 스케줄러 로직
```typescript
async function runAsyncKnockScheduler(): Promise<void> {
  const startTime = Date.now();

  try {
    // 1. 활성 사용자 조회 (최근 30일 내 접속)
    const activeUsers = await prisma.user.findMany({
      where: {
        lastLoginAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        },
        asyncKnockSettings: {
          enabled: true
        }
      },
      select: { id: true }
    });

    console.log(`Processing ${activeUsers.length} active users`);

    // 2. 각 사용자별 트리거 확인 (병렬 처리)
    const results = await Promise.allSettled(
      activeUsers.map(user => processUserTriggers(user.id))
    );

    // 3. 결과 집계
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    const duration = Date.now() - startTime;
    console.log(`Scheduler completed in ${duration}ms. Success: ${successful}, Failed: ${failed}`);

    // 4. 메트릭 기록
    recordSchedulerMetrics({ duration, successful, failed });

  } catch (error) {
    console.error('Scheduler error:', error);
    throw error;
  }
}
```

### 5.3 사용자별 트리거 처리
```typescript
async function processUserTriggers(userId: string): Promise<void> {
  // 사용자 설정 확인
  const settings = await getAsyncKnockSettings(userId);
  if (!settings.enabled) return;

  // 1일 최대 노크 개수 확인
  const todayKnocksCount = await prisma.asyncKnockMessage.count({
    where: {
      userId,
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }
  });

  if (todayKnocksCount >= settings.maxKnocksPerDay) {
    console.log(`User ${userId}: Daily knock limit reached`);
    return;
  }

  // 트리거 조건 확인 (병렬)
  await Promise.all([
    checkLongAbsence(userId, settings),
    checkNewNeighborVisit(userId, settings),
    checkRelatedTopicConversation(userId, settings)
  ]);
}
```

---

## 6. 트리거 구현

### 6.1 조건 1: 장기 미접속
```typescript
async function checkLongAbsence(
  userId: string,
  settings: AsyncKnockSettings
): Promise<void> {
  // 룸메이트 조회
  const roommate = await prisma.persona.findFirst({
    where: {
      userId,
      personaType: 'roommate'
    },
    include: {
      relationship: true
    }
  });

  if (!roommate) return;

  // 페르소나별 설정 확인
  if (settings.personaSettings[roommate.id]?.enabled === false) {
    return;
  }

  // 마지막 상호작용 시간 조회
  const lastInteraction = await prisma.conversationSession.findFirst({
    where: {
      userId,
      personaId: roommate.id
    },
    orderBy: { endedAt: 'desc' },
    select: { endedAt: true }
  });

  if (!lastInteraction?.endedAt) return;

  const hoursSinceLastInteraction =
    (Date.now() - lastInteraction.endedAt.getTime()) / (1000 * 60 * 60);

  // 24시간 미만이면 스킵
  if (hoursSinceLastInteraction < 24) {
    await logTrigger(userId, roommate.id, 'long_absence', false, 'too_recent');
    return;
  }

  // 최근 노크 확인 (24시간 내)
  const recentKnock = await prisma.asyncKnockMessage.findFirst({
    where: {
      userId,
      personaId: roommate.id,
      triggerType: 'long_absence',
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }
  });

  if (recentKnock) {
    await logTrigger(userId, roommate.id, 'long_absence', false, 'frequency_limit');
    return;
  }

  // 미응답 노크 확인 (3개 이상)
  const unrepliedCount = await prisma.asyncKnockMessage.count({
    where: {
      userId,
      status: 'unread',
      createdAt: { gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }
    }
  });

  if (unrepliedCount >= 3) {
    await logTrigger(userId, roommate.id, 'long_absence', false, 'too_many_unreplied');
    return;
  }

  // 노크 생성
  await createAsyncKnock(userId, roommate.id, 'long_absence', {
    daysSinceLastInteraction: Math.floor(hoursSinceLastInteraction / 24)
  });
}
```

### 6.2 조건 2: 새 이웃 방문
```typescript
async function checkNewNeighborVisit(
  userId: string,
  settings: AsyncKnockSettings
): Promise<void> {
  const roommate = await prisma.persona.findFirst({
    where: { userId, personaType: 'roommate' }
  });

  if (!roommate) return;
  if (settings.personaSettings[roommate.id]?.enabled === false) return;

  // 최근 1시간 내 새 이웃 조회
  const newNeighbors = await prisma.relationship.findMany({
    where: {
      userId,
      createdAt: {
        gte: new Date(Date.now() - 60 * 60 * 1000), // 1시간
        lte: new Date()
      }
    },
    include: {
      persona: true
    }
  });

  if (newNeighbors.length === 0) return;

  // 각 새 이웃에 대해 노크 생성 여부 확인
  for (const neighbor of newNeighbors) {
    // 이미 해당 이웃에 대한 노크가 있는지 확인
    const existingKnock = await prisma.asyncKnockMessage.findFirst({
      where: {
        userId,
        personaId: roommate.id,
        triggerType: 'new_neighbor',
        triggerContext: {
          path: ['newNeighborId'],
          equals: neighbor.personaId
        }
      }
    });

    if (!existingKnock) {
      await createAsyncKnock(userId, roommate.id, 'new_neighbor', {
        newNeighborId: neighbor.personaId,
        newNeighborName: neighbor.persona.name
      });
      break; // 1개만 생성
    }
  }
}
```

### 6.3 조건 3: 관련 주제 대화
```typescript
async function checkRelatedTopicConversation(
  userId: string,
  settings: AsyncKnockSettings
): Promise<void> {
  // 최근 1시간 내 종료된 대화 조회
  const recentSessions = await prisma.conversationSession.findMany({
    where: {
      userId,
      endedAt: {
        gte: new Date(Date.now() - 60 * 60 * 1000),
        lte: new Date()
      }
    },
    include: {
      memories: {
        select: { topics: true }
      }
    }
  });

  if (recentSessions.length === 0) return;

  // 주제 추출
  const topics = recentSessions.flatMap(s =>
    s.memories.flatMap(m => m.topics)
  );

  if (topics.length === 0) return;

  // 해당 주제에 관심 있는 페르소나 조회
  const relevantPersonas = await prisma.persona.findMany({
    where: {
      userId,
      id: { not: recentSessions[0].personaId }, // 대화 상대 제외
      interests: { hasSome: topics }
    }
  });

  for (const persona of relevantPersonas) {
    // 페르소나별 설정 확인
    if (settings.personaSettings[persona.id]?.enabled === false) continue;

    // 동일 주제로 7일 내 노크했는지 확인
    const recentTopicKnock = await prisma.asyncKnockMessage.findFirst({
      where: {
        userId,
        personaId: persona.id,
        triggerType: 'related_topic',
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      }
    });

    if (!recentTopicKnock) {
      const matchedTopic = topics.find(t => persona.interests.includes(t));
      await createAsyncKnock(userId, persona.id, 'related_topic', {
        relatedTopic: matchedTopic,
        originalPersonaId: recentSessions[0].personaId
      });
      break; // 1개만 생성
    }
  }
}
```

---

## 7. 메시지 생성 (Bull Queue)

### 7.1 큐 설정
```typescript
import Bull from 'bull';

const knockMessageQueue = new Bull('async-knock-message', {
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379')
  }
});

// 동시 처리 제한
knockMessageQueue.process(10, async (job) => {
  const { userId, personaId, triggerType, context } = job.data;

  try {
    // LLM으로 메시지 생성
    const message = await generateKnockMessage(
      userId,
      personaId,
      triggerType,
      context
    );

    // DB 저장
    const knockMessage = await prisma.asyncKnockMessage.create({
      data: {
        userId,
        personaId,
        message,
        triggerType,
        triggerContext: context
      }
    });

    // 알림 전송
    await sendKnockNotification(userId, knockMessage);

    return knockMessage;
  } catch (error) {
    console.error('Message generation failed:', error);
    throw error;
  }
});

// 실패 시 재시도
knockMessageQueue.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err);
  if (job.attemptsMade < 3) {
    job.retry();
  }
});
```

### 7.2 메시지 생성 함수
```typescript
async function generateKnockMessage(
  userId: string,
  personaId: string,
  triggerType: string,
  context: any
): Promise<string> {
  // 페르소나 정보 조회
  const persona = await prisma.persona.findUnique({
    where: { id: personaId },
    include: {
      relationship: true
    }
  });

  // 메모리 조회
  const memories = await prisma.memory.findMany({
    where: {
      userId,
      personaId,
      archivedAt: null
    },
    orderBy: { importance: 'desc' },
    take: 3
  });

  // 프롬프트 생성
  const prompt = createKnockPrompt(persona, memories, triggerType, context);

  // LLM 호출
  const result = await genAI.getGenerativeModel({ model: 'gemini-1.5-pro' })
    .generateContent(prompt);

  const message = result.response.text().trim();

  // 검증 (최소/최대 길이)
  if (message.length < 5 || message.length > 200) {
    throw new Error('Invalid message length');
  }

  return message;
}

function createKnockPrompt(
  persona: Persona,
  memories: Memory[],
  triggerType: string,
  context: any
): string {
  const relationship = persona.relationship;

  let situationDescription = '';

  switch (triggerType) {
    case 'long_absence':
      situationDescription = `사용자가 ${context.daysSinceLastInteraction}일 동안 접속하지 않았습니다.`;
      break;
    case 'new_neighbor':
      situationDescription = `사용자가 ${context.newNeighborName}님이라는 새 이웃을 만났습니다.`;
      break;
    case 'related_topic':
      situationDescription = `사용자가 다른 이웃과 "${context.relatedTopic}" 주제로 대화했습니다.`;
      break;
  }

  return `
당신은 ${persona.name}입니다.

[현재 상황]
${situationDescription}

[관계 레벨]
${relationship.level} - ${relationship.levelName}

[과거 메모리]
${memories.map(m => `- ${m.summary}`).join('\n') || '없음'}

[임무]
사용자에게 먼저 메시지를 보내세요.

[요구사항]
1. ${relationship.levelName}에 맞는 자연스러운 말투
2. 1-2문장으로 간결하게
3. 부담스럽지 않게
4. 상황에 맞는 내용

출력: 메시지만 작성하세요. 다른 설명은 불필요합니다.
`;
}
```

### 7.3 Fallback 메시지
```typescript
const FALLBACK_MESSAGES = {
  long_absence: {
    1: "안녕하세요~ 오랜만이에요. 잘 지내셨나요?",
    2: "어디 갔었어? 오랜만이네 ㅎㅎ",
    3: "보고 싶었어! 요즘 어때?",
    4: "어디 갔었어? 연락 없이... 궁금했어",
    5: "야~ 어디 갔었어 진짜ㅠㅠ 걱정했잖아"
  },
  new_neighbor: {
    1: "새로운 이웃 만나셨군요! 어떤 분이세요?",
    2: "새 이웃 만났구나! 어떤 사람이야?",
    3: "옆집에 누가 이사 왔대? 궁금한데~",
    4: "새 친구 생긴 거야? 나도 소개시켜줘!",
    5: "새 이웃이라고?! ㅋㅋ 어떤 애야?"
  },
  related_topic: {
    1: "그 주제 관심 있으시군요. 저도 좋아해요.",
    2: "그 얘기 나도 관심 있어! 같이 얘기해볼까?",
    3: "그거 얘기 들었어! 나도 좋아하는데 ㅎㅎ",
    4: "어! 그거 나도 진짜 좋아하는데! 같이 얘기하자",
    5: "야 그거 나도 완전 좋아해!!! 같이 얘기하자!!"
  }
};

function getFallbackMessage(triggerType: string, relationshipLevel: number): string {
  return FALLBACK_MESSAGES[triggerType]?.[relationshipLevel] ||
         FALLBACK_MESSAGES[triggerType][1];
}
```

---

## 8. 알림 전송

### 8.1 푸시 알림 (FCM)
```typescript
import admin from 'firebase-admin';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function sendKnockNotification(
  userId: string,
  knockMessage: AsyncKnockMessage
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { fcmToken: true, asyncKnockSettings: true }
  });

  if (!user?.fcmToken) return;
  if (!user.asyncKnockSettings?.pushNotificationEnabled) return;

  const persona = await prisma.persona.findUnique({
    where: { id: knockMessage.personaId },
    select: { name: true }
  });

  const message = {
    token: user.fcmToken,
    notification: {
      title: `${persona.name}님이 메시지를 보냈어요`,
      body: knockMessage.message.substring(0, 100)
    },
    data: {
      knockId: knockMessage.id,
      personaId: knockMessage.personaId,
      type: 'async_knock'
    }
  };

  try {
    await admin.messaging().send(message);
    console.log(`Push notification sent to user ${userId}`);
  } catch (error) {
    console.error('Push notification failed:', error);
  }
}
```

### 8.2 이메일 알림 (SendGrid)
```typescript
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

async function sendKnockEmail(
  userId: string,
  knockMessage: AsyncKnockMessage
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, asyncKnockSettings: true }
  });

  if (!user?.email) return;
  if (!user.asyncKnockSettings?.emailNotificationEnabled) return;

  const persona = await prisma.persona.findUnique({
    where: { id: knockMessage.personaId },
    select: { name: true }
  });

  const msg = {
    to: user.email,
    from: 'noreply@knock.com',
    subject: `[Knock] ${persona.name}님이 당신을 기다리고 있어요`,
    html: `
      <h2>${persona.name}님이 메시지를 보냈어요</h2>
      <p>"${knockMessage.message}"</p>
      <a href="https://knock.com/chat/${knockMessage.personaId}">
        답장하기
      </a>
    `
  };

  try {
    await sgMail.send(msg);
    console.log(`Email sent to ${user.email}`);
  } catch (error) {
    console.error('Email sending failed:', error);
  }
}
```

---

## 9. 성능 최적화

### 9.1 배치 처리
```typescript
// 사용자를 배치로 나눠서 처리
async function runAsyncKnockScheduler(): Promise<void> {
  const BATCH_SIZE = 100;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const users = await prisma.user.findMany({
      where: {
        lastLoginAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        asyncKnockSettings: { enabled: true }
      },
      select: { id: true },
      take: BATCH_SIZE,
      skip: offset
    });

    if (users.length === 0) {
      hasMore = false;
      break;
    }

    await Promise.allSettled(
      users.map(user => processUserTriggers(user.id))
    );

    offset += BATCH_SIZE;
  }
}
```

### 9.2 캐싱
```typescript
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 300 }); // 5분

async function getCachedAsyncKnockSettings(userId: string): Promise<AsyncKnockSettings> {
  const cacheKey = `knock_settings:${userId}`;
  const cached = cache.get<AsyncKnockSettings>(cacheKey);

  if (cached) return cached;

  const settings = await prisma.asyncKnockSettings.findUnique({
    where: { userId }
  }) || DEFAULT_SETTINGS;

  cache.set(cacheKey, settings);
  return settings;
}
```

---

## 10. 모니터링

### 10.1 메트릭
```typescript
import prometheus from 'prom-client';

const knocksCreated = new prometheus.Counter({
  name: 'async_knocks_created_total',
  help: 'Total number of async knocks created',
  labelNames: ['trigger_type']
});

const knocksReplied = new prometheus.Counter({
  name: 'async_knocks_replied_total',
  help: 'Total number of async knocks replied to'
});

const schedulerDuration = new prometheus.Histogram({
  name: 'async_knock_scheduler_duration_seconds',
  help: 'Duration of scheduler execution',
  buckets: [1, 5, 10, 30, 60, 120, 300, 600]
});

// 사용 예시
knocksCreated.inc({ trigger_type: 'long_absence' });
```

---

## 11. 환경 변수

```env
# Async Knock System
ASYNC_KNOCK_ENABLED=true
ASYNC_KNOCK_CRON_SCHEDULE=0 * * * *  # 매 시간
ASYNC_KNOCK_MAX_PER_DAY=3
ASYNC_KNOCK_UNREPLIED_LIMIT=3

# Notifications
FCM_PROJECT_ID=your_project_id
FCM_PRIVATE_KEY=your_private_key
FCM_CLIENT_EMAIL=your_client_email

SENDGRID_API_KEY=your_sendgrid_key
SENDGRID_FROM_EMAIL=noreply@knock.com

# Bull Queue
REDIS_URL=redis://localhost:6379
BULL_CONCURRENCY=10
```

---

## 12. 테스트

### 12.1 단위 테스트
```typescript
describe('checkLongAbsence', () => {
  it('should create knock when 24+ hours passed', async () => {
    const userId = 'test_user';
    await setLastInteraction(userId, 25); // 25시간 전

    await checkLongAbsence(userId, DEFAULT_SETTINGS);

    const knock = await prisma.asyncKnockMessage.findFirst({
      where: { userId, triggerType: 'long_absence' }
    });

    expect(knock).toBeDefined();
  });

  it('should skip if frequency limit reached', async () => {
    const userId = 'test_user';
    await createRecentKnock(userId, 'long_absence'); // 이미 노크 존재

    await checkLongAbsence(userId, DEFAULT_SETTINGS);

    const knockCount = await prisma.asyncKnockMessage.count({
      where: { userId, triggerType: 'long_absence' }
    });

    expect(knockCount).toBe(1); // 추가 생성 안 됨
  });
});
```

---

## 13. 확장 계획

### Phase 1 (현재)
- 기본 3가지 트리거
- LLM 메시지 생성
- 푸시/이메일 알림

### Phase 2
- 더 많은 트리거 조건
- 개인화된 노크 타이밍
- A/B 테스트

### Phase 3
- ML 기반 최적 노크 시간 예측
- 사용자 행동 패턴 학습
- 노크 효과 분석 대시보드
