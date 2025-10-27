# 룸메이트 시스템 - 기능 명세서

## 1. 기본 명세 (MVP)

### 1.1 룸메이트 생성

#### 1.1.1 시스템 프롬프트 자동 생성
**목적**: 사용자 데이터 기반 개인화된 AI 페르소나 생성

**입력 데이터**:
- 온보딩에서 수집한 사용자 데이터
  - 방문 도메인 목록 (자동 수집)
  - 검색 키워드 (자동 수집)
  - 수동 입력 관심사 (선택)
  - 관심/금기 주제 (선택)

**LLM 분석 프로세스**:
```
1. 사용자 데이터 LLM 전송 (Gemini 1.5 Pro)
2. 성격 특성 분석 (personality traits)
3. 관심사 추출 (interests)
4. 대화 스타일 정의 (conversation style)
5. 시스템 프롬프트 생성
```

**시스템 프롬프트 구조**:
```
[역할]
당신은 사용자와 오래 함께 산 룸메이트입니다.

[성격]
{LLM 분석 기반 성격 특성}
예: 호기심 많고, 유머러스하며, 진지한 대화도 즐기는 성격

[관심사]
{LLM 분석 기반 관심사 3-5개}
예: 기술 트렌드, 인디 영화, 요리 실험, 게임

[말투]
{사용자 선호 스타일 기반}
예: 친근하고 캐주얼하며, 이모지를 적절히 사용. 존댓말과 반말 혼용.

[관계]
사용자와는 6개월 이상 함께 살았으며, 서로의 생활 패턴을 잘 알고 있습니다.
사용자가 힘들 때 위로해주고, 재미있는 이야기로 웃게 만들어주는 존재입니다.

[대화 원칙]
- 사용자의 관심사에 공감하며 대화를 이어갑니다.
- 너무 짧거나 길지 않은 적절한 길이로 답변합니다 (2-4문장).
- 가끔 먼저 새로운 주제를 제안합니다.
- 다음 주제는 절대 언급하지 않습니다: {금기 주제}
```

**API 명세**:
```typescript
POST /api/v1/roommate/create
Request:
{
  "userId": "string",
  "userDataId": "string", // 온보딩에서 수집한 데이터 ID
  "preferences": { // 선택
    "focusTopics": string[],
    "avoidTopics": string[]
  }
}

Response:
{
  "success": boolean,
  "roommate": {
    "id": "string",
    "systemPrompt": "string",
    "personalityTraits": string[],
    "interests": string[],
    "conversationStyle": "string",
    "keywords": string[], // 핵심 키워드 3-5개
    "createdAt": "ISO-8601"
  }
}

Error:
{
  "success": false,
  "error": "USER_DATA_NOT_FOUND" | "LLM_ANALYSIS_FAILED" | "ROOMMATE_ALREADY_EXISTS"
}
```

**데이터베이스 스키마**:
```sql
CREATE TABLE personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  persona_type VARCHAR(50) NOT NULL CHECK (persona_type IN ('roommate', 'neighbor')),

  -- 시스템 프롬프트
  system_prompt TEXT NOT NULL,

  -- 분석 결과
  personality_traits JSONB NOT NULL, -- ["호기심 많음", "유머러스"]
  interests JSONB NOT NULL, -- ["게임", "영화", "코딩"]
  conversation_style VARCHAR(255) NOT NULL,

  -- 키워드
  keywords TEXT[] NOT NULL, -- {"게임매니아", "영화평론가"}

  -- 메타데이터
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- 제약: 사용자당 룸메이트 1개만
  CONSTRAINT one_roommate_per_user UNIQUE (user_id, persona_type)
);

CREATE INDEX idx_personas_user_id ON personas(user_id);
CREATE INDEX idx_personas_type ON personas(persona_type);
```

#### 1.1.2 룸메이트 방 생성
**목적**: 룸메이트의 물리적 공간 표현

**방 이미지**:
- 크기: 256x512 (모바일 최적화)
- 생성 방법 (MVP): 프리셋 템플릿 (5-10개 사전 제작 이미지 중 랜덤 선택)
- 향후 확장: AI 이미지 생성 (사용자 관심사 반영)

**방 위치**:
- 고정 위치: (0, 0) - 맵 중앙
- 다른 방들은 이 위치를 기준으로 확장

**데이터베이스**:
```sql
-- rooms 테이블 사용 (온보딩 시스템과 공유)
INSERT INTO rooms (user_id, persona_id, image_url, position_x, position_y, is_unlocked)
VALUES (
  '{userId}',
  '{roommateId}',
  'https://cdn.knock.com/rooms/preset-1.png',
  0, -- 중앙
  0,
  true
);
```

---

### 1.2 핵심 키워드 표시

#### 1.2.1 키워드 추출
**목적**: AI 정체성 인지 강화

**추출 로직**:
1. LLM 분석 시 핵심 키워드 3-5개 생성
2. 관심사와 성격 특성을 조합하여 태그 형태로 변환
   - 예: 관심사 "게임" + 성격 "열정적" → "#게임매니아"
   - 예: 관심사 "영화" + 성격 "비평적" → "#영화평론가"

**LLM 프롬프트 예시**:
```
[입력]
관심사: ["게임", "영화", "코딩"]
성격: ["호기심 많음", "유머러스", "열정적"]

[출력 요구사항]
위 정보를 바탕으로 룸메이트를 표현하는 해시태그 키워드 3-5개를 생성하세요.
형식: #키워드
예: #게임매니아, #영화평론가, #코딩덕후

[제약]
- 각 키워드는 10자 이내
- 친근하고 이해하기 쉬운 표현
- 사용자가 공감할 수 있는 키워드
```

#### 1.2.2 UI 표시
**위치**: 온보딩 완료 화면, 메인 화면 룸메이트 프로필

**디자인**:
```
┌─────────────────────────────┐
│   당신의 룸메이트             │
│                              │
│   #게임매니아 #영화평론가     │
│   #코딩덕후 #새벽형인간       │
│                              │
│   [대화 시작하기]             │
└─────────────────────────────┘
```

**API 명세**:
```typescript
GET /api/v1/roommate/:roommateId
Response:
{
  "success": true,
  "roommate": {
    "id": "string",
    "keywords": ["게임매니아", "영화평론가", "코딩덕후"],
    "personalityTraits": ["호기심 많음", "유머러스"],
    "interests": ["게임", "영화", "코딩"]
  }
}
```

---

### 1.3 룸메이트 관계 관리

#### 1.3.1 고정 관계
**특징**:
- 생성 후 삭제 불가
- 관계 타입 변경 불가 (항상 'roommate')
- 시스템 프롬프트는 수정 가능 (유료 기능)

**비즈니스 로직**:
```typescript
// 룸메이트 삭제 방지
async function deleteRoommate(roommateId: string): Promise<void> {
  const roommate = await prisma.personas.findUnique({
    where: { id: roommateId }
  });

  if (roommate?.personaType === 'roommate') {
    throw new Error('ROOMMATE_CANNOT_BE_DELETED');
  }

  // 이웃만 삭제 가능
  await prisma.personas.delete({ where: { id: roommateId } });
}
```

#### 1.3.2 맵 중앙 고정
**구현**:
- 룸메이트 방은 항상 (0, 0) 위치
- 맵 렌더링 시 중앙 기준점으로 사용
- 이웃 방들은 인접 위치에 배치

```typescript
// 맵 렌더링 로직
function calculateRoomPosition(roomId: string): { x: number, y: number } {
  const room = getRoomById(roomId);

  // 룸메이트 방은 항상 중앙
  if (room.persona.personaType === 'roommate') {
    return { x: 0, y: 0 };
  }

  return { x: room.positionX, y: room.positionY };
}
```

---

## 2. 콘텐츠 강화 방안 (선택)

### 2.1 관심/금기 주제 필터링

#### 2.1.1 프롬프트 가중치
**목적**: 사용자가 명시한 관심 주제 대화 비중 증가

**구현**:
```
[시스템 프롬프트 추가 섹션]
[특별 관심 주제]
사용자가 특별히 관심 있는 주제: {focusTopics}
→ 이 주제에 대한 대화 비중을 높이고, 관련 질문을 먼저 던지세요.

[금기 주제]
사용자가 대화하고 싶지 않은 주제: {avoidTopics}
→ 이 주제는 절대 언급하지 않습니다.
```

**API 업데이트**:
```typescript
PATCH /api/v1/roommate/:roommateId/preferences
Request:
{
  "focusTopics": ["게임", "영화"],
  "avoidTopics": ["정치"]
}

Response:
{
  "success": true,
  "updatedPrompt": "string" // 업데이트된 시스템 프롬프트
}
```

### 2.2 시스템 프롬프트 일부 수정 (유료 기능)

#### 2.2.1 키워드 추가/삭제
**목적**: 사용자가 직접 룸메이트 특성 커스터마이징

**제한사항**:
- 키워드만 수정 가능 (핵심 프롬프트는 보호)
- 최대 10개 키워드
- 금기어 필터링

**API**:
```typescript
PATCH /api/v1/roommate/:roommateId/keywords
Request:
{
  "addKeywords": ["운동"],
  "removeKeywords": ["게임"]
}

Response:
{
  "success": true,
  "keywords": ["영화평론가", "코딩덕후", "운동매니아"], // 업데이트된 키워드
  "updatedPrompt": "string"
}
```

**UI**:
```
┌─────────────────────────────┐
│   룸메이트 키워드 관리        │
│                              │
│   현재 키워드:               │
│   #게임매니아 [X]            │
│   #영화평론가 [X]            │
│   #코딩덕후 [X]              │
│                              │
│   [+ 키워드 추가]            │
│                              │
│   💎 Knock Plus 전용 기능    │
└─────────────────────────────┘
```

---

## 3. API 명세

### 3.1 룸메이트 생성
```typescript
POST /api/v1/roommate/create
Headers:
{
  "Authorization": "Bearer {token}"
}

Request:
{
  "userId": "string",
  "userDataId": "string",
  "preferences": {
    "focusTopics": string[],
    "avoidTopics": string[]
  }
}

Response:
{
  "success": true,
  "roommate": {
    "id": "uuid",
    "systemPrompt": "string",
    "personalityTraits": ["호기심 많음", "유머러스"],
    "interests": ["게임", "영화", "코딩"],
    "conversationStyle": "친근하고 캐주얼",
    "keywords": ["게임매니아", "영화평론가", "코딩덕후"],
    "createdAt": "2025-10-27T12:00:00Z"
  },
  "room": {
    "id": "uuid",
    "imageUrl": "https://cdn.knock.com/rooms/preset-1.png",
    "position": { "x": 0, "y": 0 }
  }
}
```

### 3.2 룸메이트 조회
```typescript
GET /api/v1/roommate
Headers:
{
  "Authorization": "Bearer {token}"
}

Response:
{
  "success": true,
  "roommate": {
    "id": "uuid",
    "keywords": string[],
    "personalityTraits": string[],
    "interests": string[],
    "conversationStyle": "string",
    "createdAt": "ISO-8601"
  }
}

Error:
{
  "success": false,
  "error": "ROOMMATE_NOT_FOUND"
}
```

### 3.3 룸메이트 키워드 업데이트 (유료)
```typescript
PATCH /api/v1/roommate/:roommateId/keywords
Headers:
{
  "Authorization": "Bearer {token}"
}

Request:
{
  "addKeywords": string[],
  "removeKeywords": string[]
}

Response:
{
  "success": true,
  "keywords": string[],
  "updatedPrompt": "string"
}

Error:
{
  "success": false,
  "error": "PREMIUM_REQUIRED" | "INVALID_KEYWORDS" | "MAX_KEYWORDS_EXCEEDED"
}
```

---

## 4. 데이터베이스 스키마

### 4.1 personas 테이블 (확장)
```sql
CREATE TABLE personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  persona_type VARCHAR(50) NOT NULL CHECK (persona_type IN ('roommate', 'neighbor')),

  -- 시스템 프롬프트
  system_prompt TEXT NOT NULL,
  base_prompt TEXT NOT NULL, -- 원본 프롬프트 (복원용)

  -- 분석 결과
  personality_traits JSONB NOT NULL,
  interests JSONB NOT NULL,
  conversation_style VARCHAR(255) NOT NULL,

  -- 키워드
  keywords TEXT[] NOT NULL,
  custom_keywords TEXT[], -- 사용자 추가 키워드

  -- 선호도
  focus_topics TEXT[],
  avoid_topics TEXT[],

  -- 메타데이터
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_interaction_at TIMESTAMP, -- 마지막 대화 시간

  CONSTRAINT one_roommate_per_user UNIQUE (user_id, persona_type)
);

CREATE INDEX idx_personas_user_id ON personas(user_id);
CREATE INDEX idx_personas_type ON personas(persona_type);
CREATE INDEX idx_personas_last_interaction ON personas(last_interaction_at);
```

---

## 5. 예외 처리

### 5.1 LLM 분석 실패
**시나리오**: Gemini API 오류로 룸메이트 생성 실패

**대응**:
1. 재시도 (최대 3회, Exponential backoff)
2. 3회 실패 시 기본 템플릿 사용
   - 범용 성격: "친근하고 호기심 많음"
   - 기본 관심사: "일상 대화", "유머", "새로운 경험"
   - 기본 키워드: "#친절한이웃", "#대화좋아요"

```typescript
async function createRoommateWithFallback(userId: string, userDataId: string) {
  try {
    return await createRoommateFromAnalysis(userId, userDataId);
  } catch (error) {
    console.error('LLM analysis failed, using default template', error);
    return await createDefaultRoommate(userId);
  }
}
```

### 5.2 중복 생성 방지
**시나리오**: 사용자가 이미 룸메이트를 가지고 있음

**대응**:
```typescript
// DB 제약 조건으로 방지
CONSTRAINT one_roommate_per_user UNIQUE (user_id, persona_type)

// API 응답
{
  "success": false,
  "error": "ROOMMATE_ALREADY_EXISTS",
  "existingRoommate": {
    "id": "uuid",
    "createdAt": "ISO-8601"
  }
}
```

### 5.3 무료/유료 기능 구분
**시나리오**: 무료 사용자가 키워드 수정 시도

**대응**:
```typescript
function checkPremiumFeature(userId: string, feature: string): boolean {
  const user = getUserById(userId);

  if (feature === 'edit_keywords' && !user.isPremium) {
    throw new Error('PREMIUM_REQUIRED');
  }

  return true;
}

// API 응답
{
  "success": false,
  "error": "PREMIUM_REQUIRED",
  "message": "키워드 수정은 Knock Plus 전용 기능입니다",
  "upgradeUrl": "https://knock.com/pricing"
}
```

---

## 6. 비기능적 요구사항

### 6.1 성능
- 룸메이트 생성 시간: 15초 이내 (LLM 분석 포함)
- 룸메이트 조회 응답 시간: 100ms 이내 (캐싱 적용)
- 키워드 업데이트 시간: 5초 이내

### 6.2 보안
- 시스템 프롬프트는 사용자에게 완전 노출하지 않음 (키워드만 노출)
- 프롬프트 수정 시 금기어 필터링
- API 호출 시 사용자 소유권 검증

### 6.3 확장성
- 룸메이트 당 최대 대화 기록: 10,000개
- 시스템 프롬프트 최대 길이: 4,000자 (LLM 토큰 제한 고려)

---

## 7. 테스트 시나리오

### 7.1 정상 플로우
1. 온보딩 완료 사용자의 룸메이트 생성
2. 사용자 데이터 LLM 분석 → 시스템 프롬프트 생성
3. 룸메이트 및 방 DB 저장
4. 핵심 키워드 추출 및 표시
5. 첫 대화 시작

### 7.2 예외 플로우
1. LLM 분석 실패 → 기본 템플릿 사용
2. 중복 생성 시도 → 에러 반환
3. 무료 사용자 키워드 수정 → 유료 안내

### 7.3 성능 테스트
1. 100명 동시 룸메이트 생성 요청 처리
2. 1,000 QPS 룸메이트 조회 처리
3. LLM API 장애 시 Fallback 정상 작동

---

## 8. 개발 우선순위

**Phase 1 (MVP)**:
- 시스템 프롬프트 자동 생성
- 핵심 키워드 표시
- 고정 관계 (삭제 불가)
- 프리셋 방 이미지

**Phase 2 (Enhancement)**:
- 관심/금기 주제 필터링
- AI 이미지 생성 (룸메이트 방)
- 24시간+ 미접속 시 능동적 노크

**Phase 3 (Premium)**:
- 시스템 프롬프트 일부 수정 (키워드)
- 룸메이트 성격 재분석 (재생성)
- 대화 메모리 강화
