# 온보딩 시스템 - 기능 명세서 v2.0

## 개요
메인 화면에서 즉시 시작되는 채팅 기반 인터랙티브 온보딩 시스템. 3초 페이드인 애니메이션, 대화형 정보 수집, 좌측 팝업 약관 동의로 구성됩니다.

---

## 1. 기본 명세 (MVP)

### 1.1 초기 화면 구성

#### 1.1.1 앱 시작 시 상태
**목적**: 즉시 메인 화면 진입으로 진입 장벽 최소화

**화면 구성**:
- 메인 빌딩 뷰 즉시 표시
- 1F~5F 모두 블랙아웃 상태
- 우측 채팅창 비활성 (회색 처리)
- 좌측 상단: 사용자 프로필 영역 비활성

**초기 상태 데이터**:
```typescript
{
  isOnboarding: true,
  onboardingStep: 'room_reveal',
  rooms: [
    { floor: 5, isBlackedOut: true },
    { floor: 4, isBlackedOut: true },
    { floor: 3, isBlackedOut: true },
    { floor: 2, isBlackedOut: true },
    { floor: 1, isBlackedOut: true, roommate: {...} } // 데이터는 있지만 안 보임
  ]
}
```

#### 1.1.2 재방문 감지 및 스킵
**목적**: 재방문 사용자의 온보딩 생략

**구현 방법**:
```typescript
// localStorage 확인
const hasCompleted = localStorage.getItem('knockOnboardingComplete')
if (hasCompleted === 'true') {
  // 온보딩 스킵, 바로 메인 화면
  dispatch({ type: 'SKIP_ONBOARDING' })
}
```

**저장 시점**: Step 6 (노크 가이드) 완료 후

---

### 1.2 방 밝아지기 애니메이션 (3초)

#### 1.2.1 애니메이션 명세
**타이밍**: 앱 로드 후 0.5초 대기 → 3초간 페이드인

**CSS 구현**:
```css
.room-reveal-animation {
  animation: revealRoom 3s ease-in-out forwards;
}

@keyframes revealRoom {
  0% {
    opacity: 0;
    background-color: #1a1a1a;
  }
  100% {
    opacity: 1;
    background-color: #1e40af; /* bg-blue-800 */
  }
}
```

**JavaScript 트리거**:
```typescript
useEffect(() => {
  if (state.onboardingStep === 'room_reveal') {
    setTimeout(() => {
      dispatch({ type: 'START_ROOM_REVEAL' })

      // 3초 후 완료
      setTimeout(() => {
        dispatch({ type: 'COMPLETE_ROOM_REVEAL' })
      }, 3000)
    }, 500)
  }
}, [state.onboardingStep])
```

#### 1.2.2 애니메이션 상세 단계
1. **0초**: 1F 방 완전히 어두움 (opacity: 0)
2. **0.5초**: 애니메이션 시작
3. **1.5초**: 배경색 변화 시작 (회색 → 파란색)
4. **2.5초**: 룸메이트 아바타 서서히 나타남
5. **3.5초**: 완전히 밝아짐, 자동으로 1F 방 선택
6. **4초**: 첫 번째 채팅 메시지 등장

---

### 1.3 채팅 기반 온보딩 플로우

#### Step 1: 첫 인사 (greeting)
**트리거**: 방 밝아지기 애니메이션 완료 (3.5초 시점)

**자동 메시지**:
```
룸메이트: "안녕하세요! 처음 뵙네요. 저는 당신의 첫 룸메이트예요 🏠"
```

**좌측 팝업**:
- 제목: "Knock에 오신 걸 환영합니다"
- 내용:
  ```
  🚪 하루 한 번 노크로 새로운 이웃 발견
  💬 AI 이웃과 자유롭게 대화
  ❤️ 관계를 쌓아가며 외로움 해소
  ```
- 버튼: [다음]

**API**: 없음 (클라이언트 진행)

---

#### Step 2: 이름 입력 (ask_name)
**트리거**: Step 1의 [다음] 버튼 클릭

**자동 메시지**:
```
룸메이트: "당신의 이름을 알려주시겠어요?"
```

**사용자 액션**: 채팅 입력창에 이름 입력 후 전송

**자동 응답**:
```
룸메이트: "반가워요, {이름}님! 🎉"
```

**상태 업데이트**:
```typescript
dispatch({
  type: 'SET_USER_NAME',
  payload: userInput
})
```

**좌측 팝업**: 닫힘

**다음 단계 자동 진행**: 1초 후 Step 3로

---

#### Step 3: 나이 입력 (ask_age)
**트리거**: 이름 입력 후 1초

**자동 메시지**:
```
룸메이트: "몇 살이신지 여쭤봐도 될까요? (더 나은 대화를 위해 필요해요)"
```

**사용자 액션**: 숫자 입력

**자동 응답**:
```
룸메이트: "감사합니다!"
```

**상태 업데이트**:
```typescript
dispatch({
  type: 'SET_USER_AGE',
  payload: userInput
})
```

**다음 단계**: 1초 후 Step 4로

---

#### Step 4: 개인정보 처리방침 동의 (privacy_policy)
**트리거**: 나이 입력 후 1초

**자동 메시지**:
```
룸메이트: "더 나은 대화를 위해 일부 정보를 사용해도 될까요?"
```

**좌측 팝업**:
- 제목: "개인정보 처리방침"
- 내용: (스크롤 가능)
  ```
  [개인정보 처리방침 전문]

  1. 수집하는 정보
  - 이름, 나이 (필수)
  - 대화 내용 (서비스 제공 목적)

  2. 정보의 이용 목적
  - AI 응답 개인화
  - 서비스 품질 개선

  3. 정보의 보유 기간
  - 회원 탈퇴 시까지
  ```
- 체크박스:
  - ☐ (필수) 서비스 이용을 위한 기본 정보 수집 동의
  - ☐ (선택) 맞춤형 경험 제공을 위한 추가 정보 수집
- 버튼: [동의하기] (필수 체크 시 활성화)

**사용자 액션**: 체크박스 선택 후 [동의하기] 클릭

**자동 응답**:
```
사용자: "개인정보 처리방침에 동의했습니다."
룸메이트: "감사합니다!"
```

**API 명세**:
```typescript
POST /api/v1/onboarding/privacy-consent
Request:
{
  "userId": "string",
  "requiredConsent": true,
  "optionalConsent": boolean,
  "timestamp": "ISO-8601"
}

Response:
{
  "success": boolean,
  "consentId": "string"
}
```

**다음 단계**: 1초 후 Step 5로

---

#### Step 5: 이용약관 동의 (terms)
**트리거**: 개인정보 동의 후 1초

**자동 메시지**:
```
룸메이트: "서비스 이용 전 마지막으로 약관을 확인해주세요."
```

**좌측 팝업**:
- 제목: "서비스 이용약관"
- 내용: (스크롤 가능)
  ```
  [이용약관 전문]

  제1조 (목적)
  본 약관은 Knock 서비스 이용에 관한 조건 및 절차를 규정합니다.

  제2조 (서비스 내용)
  - AI 기반 대화 서비스 제공
  - 1일 1회 노크 시스템

  제3조 (이용 제한)
  - 부적절한 대화 금지
  - 타인 사칭 금지
  ```
- 체크박스:
  - ☐ 이용약관 동의 (필수)
- 버튼: [동의 후 계속하기]

**사용자 액션**: 체크박스 선택 후 버튼 클릭

**자동 응답**:
```
사용자: "이용약관에 동의했습니다."
룸메이트: "모든 준비가 끝났어요!"
```

**API 명세**:
```typescript
POST /api/v1/onboarding/terms-consent
Request:
{
  "userId": "string",
  "termsAccepted": true,
  "timestamp": "ISO-8601"
}

Response:
{
  "success": boolean
}
```

**다음 단계**: 1초 후 Step 6으로

---

#### Step 6: 노크 가이드 (guide)
**트리거**: 약관 동의 후 1초

**자동 메시지**:
```
룸메이트: "지금 바로 노크해보세요! 새로운 이웃을 만날 수 있어요 🚪"
```

**좌측 팝업**:
- 제목: "Knock 사용 가이드"
- 내용:
  ```
  🚪 하루 1회 노크
  - 매일 하단의 노크 버튼 클릭
  - 새로운 이웃의 방이 나타남

  💬 자유로운 대화
  - 공개된 방을 클릭하여 대화 시작
  - 우측 채팅창에서 실시간 응답

  ❤️ 관계 구축
  - 자주 대화할수록 친밀도 상승
  - 특별한 이벤트 해금
  ```
- 버튼: [시작하기]

**사용자 액션**: [시작하기] 클릭

**상태 변화**:
```typescript
// localStorage에 저장
localStorage.setItem('knockOnboardingComplete', 'true')

// 온보딩 완료
dispatch({ type: 'COMPLETE_ONBOARDING' })
```

**화면 변화**:
- 좌측 팝업 닫힘
- 하단에 노크 버튼 활성화
- 우측 채팅창 계속 활성 (룸메이트와 대화 가능)
- 정상 플레이 상태로 전환

---

## 2. 좌측 팝업 컴포넌트 명세

### 2.1 레이아웃
```
┌─────────────────────────────────┐
│  [반투명 오버레이]               │
│    ┌───────────────────────┐    │
│    │  [팝업 카드]          │    │
│    │                       │    │
│    │  제목                 │    │
│    │  ─────────────        │    │
│    │                       │    │
│    │  [스크롤 가능 영역]   │    │
│    │  내용                 │    │
│    │  내용                 │    │
│    │  내용                 │    │
│    │                       │    │
│    │  ─────────────        │    │
│    │                       │    │
│    │  ☐ 체크박스 (선택)    │    │
│    │                       │    │
│    │     [버튼]            │    │
│    └───────────────────────┘    │
└─────────────────────────────────┘
```

### 2.2 스타일 명세
```css
/* 오버레이 */
.left-popup-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 384px; /* 우측 채팅창 제외 */
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}

/* 팝업 카드 */
.left-popup-card {
  background: white;
  border: 4px solid black;
  max-width: 500px;
  max-height: 70vh;
  padding: 24px;
  font-family: 'Press Start 2P', cursive;
}

/* 제목 */
.left-popup-title {
  font-size: 18px;
  margin-bottom: 16px;
  text-align: center;
}

/* 내용 영역 */
.left-popup-content {
  max-height: 400px;
  overflow-y: auto;
  font-size: 10px;
  line-height: 1.8;
  margin-bottom: 16px;
}

/* 체크박스 */
.left-popup-checkbox {
  font-size: 10px;
  margin-bottom: 16px;
}

/* 버튼 */
.left-popup-button {
  width: 100%;
  padding: 12px;
  background: #4a90e2;
  color: white;
  border: 3px solid black;
  font-family: 'Press Start 2P', cursive;
  cursor: pointer;
}
```

---

## 3. AI 생성 룸메이트 명세

### 3.1 생성 시점
온보딩 완료 직후 (백그라운드에서 비동기 처리)

### 3.2 입력 데이터
```typescript
{
  userName: string,      // Step 2에서 수집
  userAge: string,       // Step 3에서 수집
  timestamp: Date        // 가입 시간
}
```

### 3.3 LLM 프롬프트
```
당신은 Knock 서비스의 AI 룸메이트 생성 시스템입니다.

사용자 정보:
- 이름: {userName}
- 나이: {userAge}

위 정보를 바탕으로 사용자와 잘 맞는 룸메이트 페르소나를 생성하세요.

출력 형식 (JSON):
{
  "name": "룸메이트 이름",
  "age": 나이,
  "personality": "성격 설명 (간단히)",
  "bio": "자기소개 한 줄",
  "avatar": "이모지 하나",
  "interests": ["관심사1", "관심사2", "관심사3"]
}
```

### 3.4 API 명세
```typescript
POST /api/v1/roommate/generate
Request:
{
  "userId": "string",
  "userName": "string",
  "userAge": "string"
}

Response:
{
  "roommateId": "string",
  "name": "string",
  "age": number,
  "personality": "string",
  "bio": "string",
  "avatar": "string",
  "interests": string[],
  "systemPrompt": "string" // LLM 대화용 프롬프트
}
```

---

## 4. 데이터베이스 스키마

```sql
-- 사용자 온보딩 진행 상태
CREATE TABLE onboarding_progress (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  current_step VARCHAR(50), -- 'room_reveal', 'greeting', 'ask_name', etc.
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 동의 기록
CREATE TABLE user_consents (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  consent_type VARCHAR(50), -- 'privacy_required', 'privacy_optional', 'terms'
  is_agreed BOOLEAN NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  ip_address VARCHAR(45)
);

-- 생성된 룸메이트
CREATE TABLE initial_roommates (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  name VARCHAR(100),
  age INTEGER,
  personality TEXT,
  bio TEXT,
  avatar VARCHAR(10),
  interests JSONB,
  system_prompt TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 5. 예외 처리

### 5.1 네트워크 오류
- **상황**: API 호출 실패
- **처리**: 로컬에서 계속 진행, 완료 후 재시도

### 5.2 입력 검증
- **이름**: 1-20자, 특수문자 제한
- **나이**: 13-99, 숫자만 허용

### 5.3 스킵 중복 방지
```typescript
if (localStorage.getItem('knockOnboardingComplete')) {
  // 이미 완료된 경우
  return
}
```

---

## 6. 성능 요구사항

- 애니메이션 FPS: 60fps 유지
- 팝업 오픈 속도: <100ms
- AI 생성 응답: <5초 (비동기)
- localStorage 읽기/쓰기: <10ms

---

## 버전 이력
- **v2.0** (2025-10-27): 채팅 기반 온보딩으로 전면 개편
- **v1.0** (2025-10-27): 초기 별도 페이지 방식
