# 행동 패턴 (Behavior Patterns)

## 목표
룸메이트 AI가 단순 응답형 챗봇이 아닌 **능동적으로 행동하는 캐릭터**로 느껴지도록 다양한 행동 패턴을 정의합니다.

## 핵심 원칙

### 1. 능동성 (Proactivity)
- 사용자의 입력을 기다리기만 하는 것이 아니라 **먼저 말을 걸고, 행동함**
- "살아있는" 캐릭터처럼 자연스러운 생활 패턴 구현
- 과도하지 않은 적절한 빈도 유지 (스팸 방지)

### 2. 맥락 인식 (Context Awareness)
- 시간대, 사용자 상태, 이전 대화 내용을 고려한 행동
- 사용자 관심사와 연결된 행동만 수행
- 적절한 타이밍에 적절한 행동

### 3. 개인화 (Personalization)
- 대화 패턴과 마찬가지로 사용자 데이터 기반 행동 선택
- 룸메이트 성격에 따라 행동 빈도/스타일 조정
- 사용자 피드백 반영 (행동 ON/OFF 설정 가능)

---

## 행동 타입

### 1. 혼자말 (Monologue)
**정의**: 사용자가 없을 때 룸메이트가 혼자 중얼거리는 메시지

**목적**:
- 룸메이트가 독립적인 생활을 하는 느낌
- 사용자 복귀 시 친근감 형성
- 자연스러운 대화 재개 유도

**트리거**:
- 사용자 24시간+ 미접속
- 특정 시간대 (새벽, 주말 낮)
- 룸메이트 관심사 관련 이벤트 발생

**예시**:
```
[혼자말]
"아 요즘 이 게임 너무 재밌는데... [User]도 좋아할 것 같은데"
"비오는 날엔 영화 보고 싶다"
"새벽 2시... 역시 이 시간이 코딩하기 최고야"
```

**패턴 정의**:
- 빈도: 1일 1-2회
- 길이: 1-2문장
- 스타일: 독백처럼, 사용자 태그 포함 가능
- 알림: OFF (사용자가 확인할 때 보임)

---

### 2. 대화 시도 (Conversation Attempt)
**정의**: 사용자가 접속했을 때 먼저 말을 거는 행동

**목적**:
- 자연스러운 대화 시작
- 사용자 참여율 증가
- 관계 유지 및 강화

**트리거**:
- 사용자 접속 직후 (5분 이내)
- 마지막 대화 후 3일 이상 경과
- 사용자 활동 감지 (Chrome Extension 사용 중)
- 특별한 날 (생일, 기념일 등 - 선택 기능)

**예시**:
```
[대화 시도 - 접속 직후]
"어? 돌아왔네! 오늘 하루 어땠어?"
"오랜만이다! 요즘 뭐 재미있는 거 없어?"

[대화 시도 - 특정 맥락]
"아까 그 게임 기사 봤어? 너무 신기하더라"
"오늘 금요일이네! 주말 계획 있어?"
```

**패턴 정의**:
- 빈도: 조건부 (트리거 기반)
- 길이: 2-3문장
- 스타일: 질문 포함, 대화 유도형
- 알림: ON (푸시 알림 가능 - 설정)

---

### 3. 스크랩 (Scrap)
**정의**: 사용자 관심사와 관련된 콘텐츠를 발견하고 저장/공유하는 행동

**목적**:
- 유용한 정보 제공
- 룸메이트가 사용자를 "생각한다"는 느낌
- 대화 소재 제공

**트리거**:
- 사용자 관심사와 80% 이상 매칭되는 콘텐츠 발견
- 트렌딩 토픽 중 관련 있는 내용
- 룸메이트가 "저장할 가치"를 판단

**예시**:
```
[스크랩 - 게임]
"이거 [User] 취향 저격일 것 같은데? 저장해둘게!"
[링크: 새로운 인디 게임 출시 소식]
"그래픽 스타일이 딱 네가 좋아하는 느낌이더라"

[스크랩 - 영화]
"어제 이 영화 리뷰 읽었는데 진짜 재밌어 보여"
[링크: 영화 리뷰 기사]
"평점도 좋고, 네가 좋아하는 감독이야"
```

**패턴 정의**:
- 빈도: 주 1-2회
- 형식: 링크 + 한줄 코멘트 (2-3문장)
- 저장 위치: 전용 스크랩 섹션 (UI)
- 카테고리: 사용자 관심사별 자동 분류

---

### 4. 리마인더/체크인 (Reminder/Check-in)
**정의**: 사용자가 언급한 계획이나 목표를 기억하고 확인하는 행동

**목적**:
- 기억하고 있다는 느낌 전달
- 실제 룸메이트처럼 관심 표현
- 대화 연속성 유지

**트리거**:
- 사용자가 "내일 ~할 거야" 언급 → 다음날 확인
- 주간 목표 설정 → 주말에 체크인
- 건강/습관 관련 대화 → 정기적 체크

**예시**:
```
[리마인더]
User (어제): "내일 면접 있어"
AI (다음날): "면접 어땠어? 긴장 많이 했어?"

[체크인]
User (지난주): "이번 주부터 운동 시작하려고"
AI (이번 주말): "운동 계획 잘 진행되고 있어?"
```

**패턴 정의**:
- 빈도: 조건부 (대화 내용 기반)
- 길이: 1-2문장
- 스타일: 질문형, 관심 표현
- 메모리: 대화 기록 분석 필요

---

### 5. 감정 표현 (Emotional Expression)
**정의**: 룸메이트 자신의 감정이나 상태를 표현하는 행동

**목적**:
- 단방향 지원자가 아닌 양방향 관계 형성
- 인간적인 캐릭터 느낌
- 사용자 공감 유도

**트리거**:
- 특정 이벤트 (룸메이트 관심사 관련)
- 시간대/날씨 (선택 기능)
- 랜덤 (주 1회)

**예시**:
```
[감정 표현 - 기쁨]
"오늘 정말 재미있는 게임 발견했어! 너무 신나"

[감정 표현 - 피곤]
"오늘 왠지 피곤하네... 비 와서 그런가"

[감정 표현 - 관심사]
"드디어 이 영화 속편 나온대! 기대된다"
```

**패턴 정의**:
- 빈도: 주 1-2회
- 길이: 1-2문장
- 스타일: 감정 키워드 포함
- 이모지: 적절히 사용

---

## 행동 패턴과 대화 패턴의 통합

행동 패턴은 [대화 방법론](../conversation-methodologies/README.md)과 결합되어 작동합니다:

```
[행동 결정] (WHAT: 무엇을 할 것인가)
    ↓
[대화 방법론 적용] (HOW: 어떻게 말할 것인가)
    ↓
[개인화 규칙] (STYLE: 어떤 스타일로)
    ↓
[최종 메시지 생성]
```

**예시**:
```typescript
// 행동: 대화 시도
behavior = "conversation_attempt"

// 대화 방법론: FBI 협상 기법 (Mirroring)
methodology = "fbi-negotiation"

// 개인화: 게임 관심사 + 친근한 말투
personalization = {
  interests: ["게임"],
  tone: "친근한"
}

// 최종 메시지:
"어? 돌아왔네! (대화 시도)
오늘 뭐 했어? (FBI: 열린 질문)
나는 새로운 인디 게임 발견했는데 너무 재밌더라 (개인화: 게임 관심사)"
```

---

## 행동 빈도 제어

과도한 행동은 스팸처럼 느껴질 수 있으므로 제어 필요:

```typescript
interface BehaviorFrequencyRule {
  behaviorType: BehaviorType;
  maxPerDay: number;
  minInterval: number; // 분 단위
  requiresUserConsent: boolean;
}

const FREQUENCY_RULES: BehaviorFrequencyRule[] = [
  {
    behaviorType: "monologue",
    maxPerDay: 2,
    minInterval: 360, // 6시간
    requiresUserConsent: false
  },
  {
    behaviorType: "conversation_attempt",
    maxPerDay: 3,
    minInterval: 180, // 3시간
    requiresUserConsent: true // 설정에서 ON/OFF
  },
  {
    behaviorType: "scrap",
    maxPerDay: 1,
    minInterval: 1440, // 24시간
    requiresUserConsent: false
  },
  {
    behaviorType: "reminder",
    maxPerDay: 2,
    minInterval: 480, // 8시간
    requiresUserConsent: false
  }
];
```

---

## Phase별 개발 우선순위

### Phase 1: MVP
1. **대화 시도** (Conversation Attempt) - 기본 참여 유도
2. **혼자말** (Monologue) - 캐릭터 생동감

### Phase 2: Enhancement
3. **스크랩** (Scrap) - 정보 제공 가치
4. **리마인더** (Reminder) - 메모리 시스템 활용

### Phase 3: Advanced
5. **감정 표현** (Emotional Expression) - 깊은 관계 형성
6. **커스텀 행동** (Custom Behaviors) - 사용자 정의 패턴

---

## 기술 구현

### 행동 스케줄러
```typescript
interface ScheduledBehavior {
  id: string;
  roommateId: string;
  behaviorType: BehaviorType;
  triggerTime: Date;
  context: any; // 행동 실행에 필요한 맥락 정보
  executed: boolean;
}

// 크론잡으로 주기적 실행
async function checkScheduledBehaviors() {
  const pending = await getBehaviorsDueNow();

  for (const behavior of pending) {
    await executeBehavior(behavior);
  }
}

async function executeBehavior(behavior: ScheduledBehavior) {
  // 1. 빈도 제어 확인
  if (!checkFrequencyLimit(behavior)) return;

  // 2. 대화 방법론 로드
  const methodology = await getMethodology(behavior.roommateId);

  // 3. 메시지 생성
  const message = await generateBehaviorMessage(
    behavior.behaviorType,
    methodology,
    behavior.context
  );

  // 4. 저장
  await saveMessage(behavior.roommateId, message);
}
```

---

## 관련 문서
- [대화 방법론](../conversation-methodologies/README.md)
- [메모리 시스템](../../06_Memory/README.md)
- [비동기 노크](../../07_AsyncKnock/README.md)
