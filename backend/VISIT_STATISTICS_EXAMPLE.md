# 방문 기록 (Visit Statistics) 사용 가이드

## 개요

사용자와 룸메이트의 상호작용 통계를 자동으로 추적하고 조회할 수 있는 기능입니다.

---

## 🔄 자동 추적 시스템

### 메시지 전송 시 자동 업데이트

매번 사용자가 메시지를 보낼 때마다 다음 정보가 자동으로 업데이트됩니다:

```typescript
// POST /api/v1/chat/message 호출 시 자동 실행
await prisma.persona.update({
  where: { id: personaId },
  data: {
    interactionCount: { increment: 1 },  // 상호작용 횟수 +1
    lastInteractionAt: new Date(),       // 마지막 방문 시간 업데이트
  },
});
```

**별도 API 호출 불필요** - 채팅만 하면 자동으로 기록됩니다!

---

## 📊 통계 조회 API

### Endpoint

```
GET /api/v1/chat/statistics/:personaId
```

### 요청 예시

```bash
curl http://localhost:3003/api/v1/chat/statistics/clxyz123abc \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 응답 예시

```json
{
  "success": true,
  "data": {
    "persona": {
      "id": "clxyz123abc",
      "name": "지우"
    },
    "statistics": {
      // 총 상호작용 횟수 (메시지 보낼 때마다 +1)
      "totalInteractions": 42,

      // 총 메시지 수 (유저 메시지 + AI 응답)
      "totalMessages": 84,

      // 유저가 보낸 메시지 수
      "userMessages": 42,

      // AI가 보낸 메시지 수
      "assistantMessages": 42,

      // 마지막 방문 시간
      "lastInteractionAt": "2025-10-28T09:30:00Z",

      // 첫 방문 시간
      "firstInteractionAt": "2025-10-20T10:00:00Z",

      // 첫 방문 이후 경과 일수
      "daysSinceFirstInteraction": 8,

      // 일평균 메시지 수
      "averageMessagesPerDay": "10.50",

      // 최근 7일간 날짜별 메시지 수
      "messagesByDay": {
        "2025-10-28": 12,
        "2025-10-27": 8,
        "2025-10-26": 15,
        "2025-10-25": 10,
        "2025-10-24": 6,
        "2025-10-23": 9,
        "2025-10-22": 11
      }
    }
  }
}
```

---

## 📈 통계 항목 설명

### 1. totalInteractions (총 상호작용 횟수)
- **의미**: 사용자가 메시지를 보낸 총 횟수
- **업데이트**: 메시지 전송 시마다 자동 +1
- **용도**: 룸메이트와 얼마나 자주 대화했는지 파악

### 2. totalMessages (총 메시지 수)
- **의미**: 유저 메시지 + AI 응답 메시지 합계
- **계산**: `userMessages + assistantMessages`
- **용도**: 전체 대화량 파악

### 3. userMessages vs assistantMessages
- **userMessages**: 사용자가 보낸 메시지만
- **assistantMessages**: AI가 보낸 응답만
- **용도**: 대화 균형 확인 (정상적으로는 1:1 비율)

### 4. lastInteractionAt (마지막 방문 시간)
- **의미**: 가장 최근에 메시지를 보낸 시간
- **형식**: ISO 8601 (`2025-10-28T09:30:00Z`)
- **용도**: "마지막 방문: 2시간 전" 같은 UI 표시

### 5. firstInteractionAt (첫 방문 시간)
- **의미**: 처음으로 대화를 시작한 시간
- **용도**: "함께한 지 8일째" 같은 표시

### 6. daysSinceFirstInteraction (경과 일수)
- **의미**: 첫 대화 이후 몇 일이 지났는지
- **계산**: `(현재 - firstInteractionAt) / 86400000ms`
- **용도**: 관계 지속 기간 표시

### 7. averageMessagesPerDay (일평균 메시지)
- **의미**: 하루 평균 몇 개의 메시지를 주고받았는지
- **계산**: `totalMessages / daysSinceFirstInteraction`
- **용도**: 활동성 지표

### 8. messagesByDay (날짜별 메시지)
- **의미**: 최근 7일간 날짜별 메시지 수
- **형식**: `{ "2025-10-28": 12, ... }`
- **용도**: 그래프/차트로 활동 추이 시각화

---

## 🎯 사용 사례

### 1. 프로필 화면에 표시

```typescript
// 통계 조회
const stats = await fetch(`/api/v1/chat/statistics/${personaId}`);
const { data } = await stats.json();

// UI에 표시
<div>
  <h3>{data.persona.name}님과의 대화</h3>
  <p>함께한 지: {data.statistics.daysSinceFirstInteraction}일</p>
  <p>총 대화 횟수: {data.statistics.totalInteractions}회</p>
  <p>마지막 대화: {formatRelativeTime(data.statistics.lastInteractionAt)}</p>
  <p>일평균 메시지: {data.statistics.averageMessagesPerDay}개</p>
</div>
```

### 2. 활동 그래프 그리기

```typescript
const { messagesByDay } = data.statistics;

// Chart.js, Recharts 등으로 그래프 표시
const chartData = Object.entries(messagesByDay).map(([date, count]) => ({
  date,
  messages: count,
}));

<BarChart data={chartData}>
  <Bar dataKey="messages" />
</BarChart>
```

### 3. 뱃지/업적 시스템

```typescript
const { totalInteractions, daysSinceFirstInteraction } = data.statistics;

// 뱃지 부여 로직
const badges = [];

if (totalInteractions >= 100) {
  badges.push('수다쟁이 🗣️');
}

if (daysSinceFirstInteraction >= 30) {
  badges.push('한달 친구 💙');
}

if (data.statistics.averageMessagesPerDay > 10) {
  badges.push('열정적인 대화가 🔥');
}
```

### 4. 알림/리마인더

```typescript
const daysSinceLastInteraction = calculateDaysSince(
  data.statistics.lastInteractionAt
);

if (daysSinceLastInteraction >= 7) {
  showNotification('지우가 당신을 기다리고 있어요! 😊');
}
```

---

## 🔍 데이터베이스 구조

### personas 테이블 (관련 필드)

```sql
CREATE TABLE personas (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,

  -- 방문 통계 필드
  interaction_count INTEGER NOT NULL DEFAULT 0,
  last_interaction_at DATETIME,

  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL
);
```

### chat_messages 테이블

```sql
CREATE TABLE chat_messages (
  id TEXT PRIMARY KEY,
  persona_id TEXT NOT NULL,
  role TEXT NOT NULL,  -- 'user' | 'assistant'
  content TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (persona_id) REFERENCES personas(id)
);
```

---

## 🧪 테스트 시나리오

### 시나리오 1: 첫 대화

```bash
# 1. 사용자 등록 및 온보딩
curl -X POST http://localhost:3003/api/v1/auth/register -d '{...}'
curl -X POST http://localhost:3003/api/v1/onboarding/complete -d '{...}'

# 2. 첫 메시지 전송
curl -X POST http://localhost:3003/api/v1/chat/message \
  -H "Authorization: Bearer TOKEN" \
  -d '{"personaId":"xxx","content":"안녕!"}'

# 3. 통계 확인
curl http://localhost:3003/api/v1/chat/statistics/xxx \
  -H "Authorization: Bearer TOKEN"

# 예상 결과:
# - totalInteractions: 1
# - totalMessages: 2 (유저 1 + AI 1)
# - daysSinceFirstInteraction: 0
# - messagesByDay: { "2025-10-28": 2 }
```

### 시나리오 2: 일주일간 대화

```bash
# 매일 10개씩 메시지 전송 (7일)
for day in {1..7}; do
  for msg in {1..10}; do
    curl -X POST http://localhost:3003/api/v1/chat/message \
      -H "Authorization: Bearer TOKEN" \
      -d "{\"personaId\":\"xxx\",\"content\":\"메시지 $msg\"}"
  done
done

# 통계 확인
curl http://localhost:3003/api/v1/chat/statistics/xxx

# 예상 결과:
# - totalInteractions: 70
# - totalMessages: 140
# - daysSinceFirstInteraction: 7
# - averageMessagesPerDay: "20.00"
# - messagesByDay: 7일치 데이터
```

---

## ⚡ 성능 고려사항

### 인덱스 최적화

```sql
-- persona_id로 메시지 조회 최적화
CREATE INDEX idx_chat_messages_persona_id ON chat_messages(persona_id);

-- 최근 메시지 조회 최적화
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at DESC);

-- persona_id + created_at 복합 인덱스
CREATE INDEX idx_chat_messages_persona_created
  ON chat_messages(persona_id, created_at DESC);
```

### 캐싱 전략

```typescript
// Redis 캐싱 예시 (추후 구현)
const cacheKey = `stats:${personaId}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const stats = await getStatistics(personaId);
await redis.setex(cacheKey, 300, JSON.stringify(stats)); // 5분 캐시
return stats;
```

---

## 🚀 향후 개선 사항

1. **실시간 통계**: WebSocket으로 실시간 업데이트
2. **월간/연간 통계**: 더 긴 기간의 통계 제공
3. **감정 분석**: 대화의 감정 톤 분석
4. **주제 추출**: 가장 많이 대화한 주제 분석
5. **비교 통계**: 다른 사용자와의 평균 비교

---

## 📝 정리

✅ **구현 완료**
- 자동 상호작용 추적 (메시지 전송 시)
- 통계 조회 API
- 7일간 날짜별 메시지 수
- 평균 계산 및 메타데이터

✅ **사용 방법**
1. 메시지 보내기: `POST /api/v1/chat/message`
2. 통계 조회하기: `GET /api/v1/chat/statistics/:personaId`

✅ **주요 통계**
- 총 대화 횟수, 메시지 수
- 첫/마지막 방문 시간
- 일평균 메시지 수
- 날짜별 활동 추이

**모든 기능이 정상 작동하며, 프론트엔드에서 바로 사용 가능합니다!** 🎉
