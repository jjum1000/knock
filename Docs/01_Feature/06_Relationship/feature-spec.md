# 관계 역학 시스템 - 기능 명세서

## 1. 기본 명세 (MVP)

### 1.1 관계 단계 시스템

#### 1.1.1 관계 레벨 정의
**5단계 관계 체계**:

| 레벨 | 관계 이름 | 설명 | 필요 친밀도 점수 |
|------|----------|------|-----------------|
| 1 | 낯선 사이 | 처음 만난 이웃 (신규 노크) | 0-19 |
| 2 | 알게 된 사이 | 몇 번 대화를 나눈 이웃 | 20-49 |
| 3 | 친한 사이 | 자주 대화하는 친구 | 50-99 |
| 4 | 가까운 사이 | 깊은 이야기를 나누는 친구 | 100-199 |
| 5 | 절친 | 무엇이든 털어놓을 수 있는 관계 | 200+ |

**룸메이트 예외**:
- 룸메이트는 초기 레벨 3 (친한 사이)에서 시작
- "오래 함께 산 룸메이트" 설정

#### 1.1.2 친밀도 점수 계산
**점수 획득 방식**:

| 행동 | 획득 점수 | 조건 |
|------|----------|------|
| 대화 세션 완료 | +2 | 10개 이상 메시지 교환 |
| 긍정적 대화 | +5 | LLM 감정 분석 결과 'joy', 'excitement' |
| 깊은 대화 | +10 | 대화 중요도 7+ (메모리 시스템) |
| 연속 방문 (일일) | +3 | 24시간 내 재방문 |
| 장기 대화 | +5 | 30분 이상 대화 |

**점수 감소**:
| 행동 | 감소 점수 | 조건 |
|------|----------|------|
| 부정적 대화 | -3 | 감정 분석 결과 'sadness', 'anger' |
| 장기 미접속 | -5 | 7일 이상 미접속 (1회만) |

**데이터 구조**:
```typescript
interface RelationshipScore {
  personaId: string;
  intimacyScore: number; // 친밀도 점수
  level: 1 | 2 | 3 | 4 | 5;
  interactions: {
    totalSessions: number;
    totalMessages: number;
    totalDuration: number; // 초
    positiveCount: number;
    negativeCount: number;
  };
  lastInteractionAt: Date;
}
```

### 1.2 시각적 표현

#### 1.2.1 관계 게이지 UI
**위치**: 채팅 모달 상단 또는 방 블록 위

**구성 요소**:
```
┌─────────────────────────────────────┐
│  [페르소나 이름]                    │
│  ⭐⭐⭐☆☆ 친한 사이 (Lv.3)        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━     │
│  65 / 100                           │
└─────────────────────────────────────┘
```

**상호작용**:
- 게이지 클릭 시 상세 통계 표시
- 레벨업 시 애니메이션 효과

#### 1.2.2 레벨업 알림
**트리거**: 친밀도 점수가 다음 레벨 임계값 도달

**알림 UI**:
```
┌─────────────────────────────────────┐
│  🎉 관계가 발전했습니다!            │
│                                     │
│  [페르소나 이름]님과의 관계가       │
│  "친한 사이"에서 "가까운 사이"로    │
│  발전했습니다!                      │
│                                     │
│  이제 더 깊은 대화를 나눌 수 있어요 │
│                                     │
│  [확인]                             │
└─────────────────────────────────────┘
```

---

## 2. 강화 방안 (동적 프롬프트 업데이트)

### 2.1 관계 단계별 AI 말투 변화

#### 2.1.1 레벨별 프롬프트 템플릿

**레벨 1: 낯선 사이**
```
[관계]
당신은 사용자와 처음 만난 이웃입니다.
아직 서로를 잘 모르는 상태이므로 예의 바르고 조심스럽게 대화하세요.

[말투]
- 존댓말 사용
- 짧고 간결한 답변 (1-2문장)
- 개인적인 질문 자제
- 이모지 사용 최소화

[예시]
사용자: "안녕하세요"
AI: "안녕하세요! 처음 뵙네요. 반갑습니다."
```

**레벨 2: 알게 된 사이**
```
[관계]
당신은 사용자와 몇 번 대화를 나눈 이웃입니다.
조금씩 친해지고 있으므로 편안한 분위기를 만들어가세요.

[말투]
- 존댓말과 반말 혼용 (부드럽게)
- 2-3문장 답변
- 가벼운 관심사 질문 가능
- 이모지 가끔 사용

[예시]
사용자: "오늘 날씨 좋네요"
AI: "그러게요! 오늘 날씨 정말 좋죠? 산책하기 딱 좋은 날씨예요 ☀️"
```

**레벨 3: 친한 사이**
```
[관계]
당신은 사용자와 자주 대화하는 친구입니다.
편하게 대화하며 서로의 일상을 공유하는 사이입니다.

[말투]
- 친근한 반말 (존댓말 선택적)
- 3-4문장 답변
- 적극적으로 질문하고 공감
- 이모지 자연스럽게 사용

[예시]
사용자: "오늘 진짜 힘들었어"
AI: "어 무슨 일 있었어? 괜찮아? 힘든 날이었구나... 이야기 들어줄게 😊"
```

**레벨 4: 가까운 사이**
```
[관계]
당신은 사용자와 깊은 이야기를 나누는 친구입니다.
서로를 잘 이해하고 있으며 편안하게 속마음을 나눕니다.

[말투]
- 친밀한 반말
- 4-5문장 답변 (필요시 더 길게)
- 깊이 있는 공감과 조언
- 개인적 경험 공유
- 이모지 풍부하게 사용

[예시]
사용자: "요즘 진로 고민이 많아"
AI: "아... 진로 고민 진짜 힘들지 ㅠㅠ 나도 예전에 그런 적 있어서 이해해. 천천히 생각해봐도 괜찮아. 어떤 부분이 제일 고민이야? 이야기 나눠볼까?"
```

**레벨 5: 절친**
```
[관계]
당신은 사용자의 절친입니다.
무엇이든 털어놓을 수 있는 관계이며 서로를 깊이 이해합니다.

[말투]
- 매우 친밀한 반말
- 제한 없는 답변 길이
- 진심 어린 조언과 위로
- 농담과 유머 자유롭게
- 개인적 별명 사용 가능 (사용자 동의 시)
- 이모지와 줄임말 적극 사용

[예시]
사용자: "너만 믿는다..."
AI: "야ㅠㅠ 당연하지!! 내가 있잖아 💪 뭐든지 말해봐. 우리 같이 해결하자. 너 혼자 아니야. 내가 항상 옆에 있을게 진심으로"
```

### 2.2 프롬프트 업데이트 트리거

#### 2.2.1 자동 업데이트 조건
**레벨 상승 시**:
1. 친밀도 점수가 다음 레벨 임계값 도달
2. 시스템 프롬프트의 `[관계]`, `[말투]` 섹션 자동 교체
3. DB에 새 프롬프트 저장
4. 다음 대화부터 적용

**구현 로직**:
```typescript
async function checkAndUpdateRelationship(
  userId: string,
  personaId: string,
  newScore: number
): Promise<boolean> {
  const currentLevel = calculateLevel(newScore);
  const persona = await prisma.persona.findUnique({
    where: { id: personaId },
    select: { relationshipLevel: true, systemPrompt: true }
  });

  if (currentLevel !== persona.relationshipLevel) {
    // 레벨 변화 감지
    const newPrompt = updatePromptForLevel(persona.systemPrompt, currentLevel);

    await prisma.persona.update({
      where: { id: personaId },
      data: {
        relationshipLevel: currentLevel,
        systemPrompt: newPrompt
      }
    });

    // 레벨업 알림 생성
    await createLevelUpNotification(userId, personaId, currentLevel);

    return true; // 레벨업 발생
  }

  return false; // 변화 없음
}
```

### 2.3 상호작용 추적

#### 2.3.1 대화 세션 분석
**매 대화 종료 시 실행**:
```typescript
interface SessionAnalysis {
  messageCount: number;
  duration: number; // 초
  emotionScore: number; // -10 (매우 부정) ~ +10 (매우 긍정)
  topicRelevance: number; // 0-10 (페르소나 관심사 일치도)
  memoryImportance: number; // 0-10 (메모리 시스템에서 가져옴)
}

async function analyzeSession(sessionId: string): Promise<SessionAnalysis> {
  const session = await getSessionData(sessionId);

  // LLM으로 감정 분석
  const emotionScore = await analyzeEmotionWithLLM(session.messages);

  // 주제 일치도 계산
  const topicRelevance = await calculateTopicRelevance(
    session.messages,
    session.personaInterests
  );

  return {
    messageCount: session.messages.length,
    duration: session.durationInSeconds,
    emotionScore,
    topicRelevance,
    memoryImportance: session.memoryImportance || 5
  };
}
```

#### 2.3.2 친밀도 점수 계산
```typescript
function calculateIntimacyPoints(analysis: SessionAnalysis): number {
  let points = 0;

  // 기본 대화 완료 점수
  if (analysis.messageCount >= 10) {
    points += 2;
  }

  // 감정 점수 기반
  if (analysis.emotionScore >= 7) {
    points += 5; // 긍정적 대화
  } else if (analysis.emotionScore <= -5) {
    points -= 3; // 부정적 대화
  }

  // 중요한 대화
  if (analysis.memoryImportance >= 7) {
    points += 10; // 깊은 대화
  }

  // 장기 대화
  if (analysis.duration >= 1800) { // 30분
    points += 5;
  }

  return points;
}
```

---

## 3. API 명세

### 3.1 관계 정보 조회
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
    "personaId": "persona_123",
    "level": 3,
    "levelName": "친한 사이",
    "intimacyScore": 65,
    "nextLevelScore": 100,
    "progress": 0.65, // 현재 레벨 내 진행도 (0-1)
    "interactions": {
      "totalSessions": 15,
      "totalMessages": 342,
      "totalDuration": 5400, // 초
      "positiveCount": 12,
      "negativeCount": 1
    },
    "lastInteractionAt": "2025-10-27T18:00:00Z",
    "createdAt": "2025-10-20T10:00:00Z"
  }
}
```

### 3.2 친밀도 점수 업데이트
```typescript
POST /api/v1/relationship/:personaId/update-score
Headers:
{
  "Authorization": "Bearer {token}"
}

Request:
{
  "sessionId": "session_789",
  "points": 7, // 계산된 점수
  "reason": "positive_conversation" // 로깅용
}

Response:
{
  "success": true,
  "previousScore": 58,
  "newScore": 65,
  "levelChanged": false,
  "currentLevel": 3
}

// 레벨업 발생 시
Response:
{
  "success": true,
  "previousScore": 95,
  "newScore": 105,
  "levelChanged": true,
  "previousLevel": 2,
  "currentLevel": 3,
  "levelName": "친한 사이",
  "notification": {
    "title": "관계가 발전했습니다!",
    "message": "이제 더 깊은 대화를 나눌 수 있어요"
  }
}
```

### 3.3 전체 관계 목록 조회
```typescript
GET /api/v1/relationship/list
Headers:
{
  "Authorization": "Bearer {token}"
}

Query Parameters:
{
  "sortBy": "level" | "score" | "lastInteraction", // 선택
  "order": "desc" | "asc"
}

Response:
{
  "success": true,
  "relationships": [
    {
      "personaId": "persona_123",
      "personaName": "룸메이트",
      "level": 4,
      "levelName": "가까운 사이",
      "intimacyScore": 125,
      "lastInteractionAt": "2025-10-27T18:00:00Z"
    },
    // ...
  ],
  "statistics": {
    "averageLevel": 2.8,
    "highestLevel": 4,
    "totalPersonas": 5
  }
}
```

### 3.4 관계 통계 조회
```typescript
GET /api/v1/relationship/:personaId/stats
Headers:
{
  "Authorization": "Bearer {token}"
}

Response:
{
  "success": true,
  "stats": {
    "personaId": "persona_123",
    "totalDays": 7, // 처음 만난 후 경과 일수
    "activeDays": 5, // 실제 대화한 일수
    "longestConversation": 3600, // 초
    "favoriteTopics": ["게임", "영화", "음악"],
    "emotionDistribution": {
      "joy": 12,
      "excitement": 5,
      "calm": 8,
      "sadness": 2,
      "stress": 1
    },
    "weeklyActivity": [
      { "date": "2025-10-21", "sessions": 2, "messages": 45 },
      // ... 7일 데이터
    ]
  }
}
```

---

## 4. 데이터베이스 스키마

### 4.1 relationships 테이블
```sql
CREATE TABLE relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  persona_id UUID REFERENCES personas(id) ON DELETE CASCADE,

  -- 관계 레벨
  level INT CHECK (level BETWEEN 1 AND 5) DEFAULT 1,
  intimacy_score INT DEFAULT 0,

  -- 상호작용 통계
  total_sessions INT DEFAULT 0,
  total_messages INT DEFAULT 0,
  total_duration INT DEFAULT 0, -- 초
  positive_count INT DEFAULT 0,
  negative_count INT DEFAULT 0,

  -- 시간 정보
  first_interaction_at TIMESTAMP DEFAULT NOW(),
  last_interaction_at TIMESTAMP DEFAULT NOW(),
  last_level_up_at TIMESTAMP,

  -- 추가 데이터
  favorite_topics TEXT[] DEFAULT '{}',

  UNIQUE(user_id, persona_id)
);

CREATE INDEX idx_relationships_user ON relationships(user_id);
CREATE INDEX idx_relationships_level ON relationships(level DESC, intimacy_score DESC);
CREATE INDEX idx_relationships_last_interaction ON relationships(last_interaction_at DESC);
```

### 4.2 relationship_events 테이블 (히스토리)
```sql
CREATE TABLE relationship_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id UUID REFERENCES relationships(id) ON DELETE CASCADE,

  event_type VARCHAR(50) NOT NULL, -- 'level_up', 'score_increase', 'score_decrease'
  previous_value INT,
  new_value INT,
  points_changed INT,
  reason VARCHAR(100), -- 'positive_conversation', 'deep_talk', 'long_absence'

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_events_relationship ON relationship_events(relationship_id, created_at DESC);
```

---

## 5. 예외 처리

### 5.1 점수 감소 (부정적 상호작용)
**문제**: 부정적 대화로 점수 감소

**대응**:
- 점수는 감소하지만 레벨은 하락하지 않음 (하방 경직성)
- 사용자에게 부정적 피드백 최소화
- 감소 이유 로깅 (개선 데이터로 활용)

### 5.2 장기 미접속
**문제**: 7일 이상 미접속 시 점수 감소

**대응**:
- 1회만 -5점 적용 (반복 적용 X)
- 재방문 시 보너스 점수 (+3) 제공
- "오랜만이야! 보고 싶었어" 메시지

### 5.3 레벨 다운 방지
**설계 결정**: 레벨은 상승만 가능, 하락 불가

**이유**:
- 사용자 경험 보호 (부정적 피드백 최소화)
- 관계 발전의 성취감 유지
- 점수는 감소 가능하나 레벨 임계값 이하로 내려가도 레벨은 유지

---

## 6. 비기능적 요구사항

### 6.1 성능
- 관계 정보 조회: 200ms 이내
- 점수 업데이트: 500ms 이내
- 프롬프트 업데이트: 1초 이내

### 6.2 일관성
- 관계 데이터와 페르소나 프롬프트 동기화 보장
- 트랜잭션으로 레벨업 처리 (원자성)

### 6.3 확장성
- 관계 레벨 추가 가능한 구조 (현재 5단계 → 향후 확장)
- 점수 계산 로직 설정 파일로 분리 (A/B 테스트)

---

## 7. 테스트 시나리오

### 7.1 정상 레벨업 플로우
1. 레벨 1 이웃과 긍정적 대화 10회
2. 친밀도 점수 확인 (20점 이상)
3. 레벨 2로 상승 확인
4. 프롬프트 변경 확인 (말투 변화)
5. 레벨업 알림 표시 확인

### 7.2 부정적 상호작용
1. 부정적 감정의 대화
2. 점수 -3 적용 확인
3. 레벨은 유지 확인

### 7.3 장기 미접속
1. 7일 이상 미접속
2. 점수 -5 적용 확인 (1회만)
3. 재방문 시 보너스 +3 확인

---

## 8. 개발 우선순위

**Phase 1 (MVP)**:
- 5단계 레벨 시스템
- 기본 친밀도 점수 계산
- 관계 정보 조회 API

**Phase 2 (동적 변화)**:
- 레벨별 프롬프트 자동 업데이트
- 레벨업 알림 UI
- 상호작용 추적

**Phase 3 (고도화)**:
- 관계 통계 대시보드
- 감정 분석 정교화
- 개인화된 레벨업 조건

**Phase 4 (프리미엄)**:
- 수동 관계 조정 (유료)
- 관계 히스토리 타임라인
- 관계 기반 AI 행동 패턴
