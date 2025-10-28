# 온보딩 시스템 - 기술 명세서 v2.0

## 1. 아키텍처 개요

```
┌────────────────────────────────────────────┐
│           Frontend (React + TypeScript)     │
│  ┌──────────────────────────────────────┐  │
│  │  App Component                       │  │
│  │  ├─ OnboardingManager                │  │
│  │  ├─ RoomRevealAnimation (3s)         │  │
│  │  ├─ ChatManager                      │  │
│  │  ├─ LeftPopupManager                 │  │
│  │  └─ LocalStorageManager              │  │
│  └──────────────────────────────────────┘  │
│                   ↕                        │
│  ┌──────────────────────────────────────┐  │
│  │  State Management (useReducer)       │  │
│  │  - OnboardingState                   │  │
│  │  - ChatState                         │  │
│  └──────────────────────────────────────┘  │
└────────────────────────────────────────────┘
                   ↕
┌────────────────────────────────────────────┐
│              Backend API                    │
│  POST /api/v1/onboarding/privacy-consent   │
│  POST /api/v1/onboarding/terms-consent     │
│  POST /api/v1/roommate/generate            │
└────────────────────────────────────────────┘
```

---

## 2. 핵심 컴포넌트

### 2.1 상태 관리 (State Management)

**TypeScript 타입 정의**:
```typescript
type OnboardingStep =
  | 'room_reveal'
  | 'greeting'
  | 'ask_name'
  | 'ask_age'
  | 'privacy_policy'
  | 'terms'
  | 'guide'
  | 'complete'

type AppState = {
  isOnboarding: boolean
  onboardingStep: OnboardingStep
  userName: string
  userAge: string
  hasAgreedPrivacy: boolean
  hasAgreedPrivacyOptional: boolean
  hasAgreedTerms: boolean
  showLeftPopup: boolean
  leftPopupContent: 'intro' | 'privacy' | 'terms' | 'guide' | null
  rooms: Room[]
  selectedRoom: Room | null
  chatMessages: Message[]
  chatInput: string
  isRoomRevealing: boolean
}

type Action =
  | { type: 'START_ROOM_REVEAL' }
  | { type: 'COMPLETE_ROOM_REVEAL' }
  | { type: 'NEXT_ONBOARDING_STEP' }
  | { type: 'SHOW_LEFT_POPUP'; payload: LeftPopupContent }
  | { type: 'HIDE_LEFT_POPUP' }
  | { type: 'AGREE_PRIVACY'; required: boolean; optional: boolean }
  | { type: 'AGREE_TERMS' }
  | { type: 'COMPLETE_ONBOARDING' }
  | { type: 'SKIP_ONBOARDING' }
  | { type: 'SEND_MESSAGE' }
  | { type: 'RECEIVE_MESSAGE'; payload: string }
```

---

### 2.2 방 밝아지기 애니메이션

**CSS Animation**:
```css
@keyframes revealRoom {
  0% {
    opacity: 0;
    background-color: #1a1a1a;
    transform: scale(0.95);
  }
  50% {
    opacity: 0.5;
    background-color: #4a5568;
  }
  100% {
    opacity: 1;
    background-color: #1e40af; /* bg-blue-800 */
    transform: scale(1);
  }
}

.room-revealing {
  animation: revealRoom 3s ease-in-out forwards;
}
```

**React Hook 구현**:
```typescript
useEffect(() => {
  if (state.onboardingStep === 'room_reveal') {
    // 0.5초 대기
    const startTimeout = setTimeout(() => {
      dispatch({ type: 'START_ROOM_REVEAL' })

      // 3초 후 완료
      const completeTimeout = setTimeout(() => {
        dispatch({ type: 'COMPLETE_ROOM_REVEAL' })

        // 0.5초 후 첫 메시지
        setTimeout(() => {
          dispatch({ type: 'NEXT_ONBOARDING_STEP' })
        }, 500)
      }, 3000)

      return () => clearTimeout(completeTimeout)
    }, 500)

    return () => clearTimeout(startTimeout)
  }
}, [state.onboardingStep])
```

---

### 2.3 좌측 팝업 컴포넌트

**React Component**:
```typescript
function LeftPopup({ content, onClose, onAction }: PopupProps) {
  const [requiredChecked, setRequiredChecked] = useState(false)
  const [optionalChecked, setOptionalChecked] = useState(false)

  const renderContent = () => {
    switch (content) {
      case 'intro':
        return (
          <div className="left-popup-card">
            <h2 className="pixel-text text-xl">Knock에 오신 걸 환영합니다</h2>
            <div className="pixel-text text-xs mt-4">
              <p>🚪 하루 한 번 노크로 새로운 이웃 발견</p>
              <p>💬 AI 이웃과 자유롭게 대화</p>
              <p>❤️ 관계를 쌓아가며 외로움 해소</p>
            </div>
            <Button onClick={onAction} className="mt-6">다음</Button>
          </div>
        )

      case 'privacy':
        return (
          <div className="left-popup-card">
            <h2>개인정보 처리방침</h2>
            <ScrollArea className="max-h-96">
              {/* 약관 내용 */}
            </ScrollArea>
            <Checkbox checked={requiredChecked} onCheckedChange={setRequiredChecked}>
              (필수) 기본 정보 수집 동의
            </Checkbox>
            <Checkbox checked={optionalChecked} onCheckedChange={setOptionalChecked}>
              (선택) 추가 정보 수집
            </Checkbox>
            <Button
              onClick={() => onAction({ required: requiredChecked, optional: optionalChecked })}
              disabled={!requiredChecked}
            >
              동의하기
            </Button>
          </div>
        )

      // terms, guide 케이스 생략
    }
  }

  return (
    <div className="left-popup-overlay" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}>
        {renderContent()}
      </div>
    </div>
  )
}
```

---

### 2.4 채팅 자동 진행 로직

**메시지 자동 전송**:
```typescript
useEffect(() => {
  if (state.isOnboarding && state.onboardingStep !== 'room_reveal') {
    const message = ONBOARDING_MESSAGES[state.onboardingStep]

    if (message) {
      // 타이핑 효과 (선택적)
      const timer = setTimeout(() => {
        dispatch({
          type: 'RECEIVE_MESSAGE',
          payload: message
        })
      }, 1000)

      return () => clearTimeout(timer)
    }
  }
}, [state.onboardingStep])
```

**사용자 입력 처리**:
```typescript
const handleSendMessage = () => {
  if (!state.chatInput.trim()) return

  dispatch({ type: 'SEND_MESSAGE' })

  // 온보딩 중이면 자동 응답
  if (state.isOnboarding) {
    handleOnboardingResponse(state.chatInput)
  }
}

const handleOnboardingResponse = (userInput: string) => {
  switch (state.onboardingStep) {
    case 'ask_name':
      // 이름 검증
      if (userInput.length > 0 && userInput.length <= 20) {
        dispatch({ type: 'SET_USER_NAME', payload: userInput })

        // 자동 응답
        setTimeout(() => {
          dispatch({
            type: 'RECEIVE_MESSAGE',
            payload: `반가워요, ${userInput}님! 🎉`
          })

          // 다음 단계
          setTimeout(() => {
            dispatch({ type: 'NEXT_ONBOARDING_STEP' })
          }, 1000)
        }, 1000)
      }
      break

    case 'ask_age':
      const age = parseInt(userInput)
      if (age >= 13 && age <= 99) {
        dispatch({ type: 'SET_USER_AGE', payload: userInput })
        // 응답 로직...
      }
      break
  }
}
```

---

## 3. localStorage 관리

**저장 키**:
```typescript
const STORAGE_KEYS = {
  ONBOARDING_COMPLETE: 'knockOnboardingComplete',
  USER_NAME: 'knockUserName', // 선택적
  USER_AGE: 'knockUserAge',   // 선택적
}
```

**저장 타이밍**:
- 온보딩 완료 시: `knockOnboardingComplete = 'true'`
- 각 입력 단계마다 선택적으로 저장 가능

**로드 로직**:
```typescript
const initializeApp = () => {
  const hasCompleted = localStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETE)

  if (hasCompleted === 'true') {
    // 재방문 사용자
    dispatch({ type: 'SKIP_ONBOARDING' })
  } else {
    // 신규 사용자
    dispatch({ type: 'START_ONBOARDING' })
  }
}
```

---

## 4. API 통합

### 4.1 개인정보 동의 API

```typescript
const submitPrivacyConsent = async (
  requiredConsent: boolean,
  optionalConsent: boolean
) => {
  try {
    const response = await fetch('/api/v1/onboarding/privacy-consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: getUserId(),
        requiredConsent,
        optionalConsent,
        timestamp: new Date().toISOString()
      })
    })

    const data = await response.json()
    return data.success
  } catch (error) {
    console.error('Privacy consent failed:', error)
    // 로컬에서 계속 진행 (선택적)
    return true
  }
}
```

### 4.2 이용약관 동의 API

```typescript
const submitTermsConsent = async () => {
  try {
    const response = await fetch('/api/v1/onboarding/terms-consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: getUserId(),
        termsAccepted: true,
        timestamp: new Date().toISOString()
      })
    })

    return await response.json()
  } catch (error) {
    console.error('Terms consent failed:', error)
    return { success: true } // Fallback
  }
}
```

---

## 5. 성능 최적화

### 5.1 애니메이션 최적화

```typescript
// GPU 가속 활용
.room-revealing {
  will-change: opacity, transform, background-color;
  animation: revealRoom 3s ease-in-out forwards;
}

// 애니메이션 완료 후 will-change 제거
useEffect(() => {
  if (!state.isRoomRevealing && roomRef.current) {
    roomRef.current.style.willChange = 'auto'
  }
}, [state.isRoomRevealing])
```

### 5.2 메모이제이션

```typescript
const LeftPopup = memo(({ content, onClose, onAction }: PopupProps) => {
  // 컴포넌트 내용...
})

const ChatMessage = memo(({ message }: MessageProps) => {
  return <div className="message">{message.text}</div>
}, (prev, next) => prev.message.id === next.message.id)
```

---

## 6. 보안 고려사항

### 6.1 입력 검증

```typescript
const validateName = (name: string): boolean => {
  // 길이 검증
  if (name.length < 1 || name.length > 20) return false

  // 특수문자 검증
  const regex = /^[가-힣a-zA-Z0-9\s]+$/
  return regex.test(name)
}

const validateAge = (age: string): boolean => {
  const num = parseInt(age, 10)
  return !isNaN(num) && num >= 13 && num <= 99
}
```

### 6.2 XSS 방어

```typescript
// React는 기본적으로 XSS 방어하지만, 추가 검증
const sanitizeInput = (input: string): string => {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .trim()
}
```

---

## 7. 테스트 전략

### 7.1 단위 테스트

```typescript
describe('Onboarding Reducer', () => {
  it('should start room reveal animation', () => {
    const state = initialState
    const action = { type: 'START_ROOM_REVEAL' }
    const newState = appReducer(state, action)

    expect(newState.isRoomRevealing).toBe(true)
  })

  it('should validate name input', () => {
    expect(validateName('철수')).toBe(true)
    expect(validateName('')).toBe(false)
    expect(validateName('a'.repeat(21))).toBe(false)
  })
})
```

### 7.2 통합 테스트

```typescript
describe('Onboarding Flow', () => {
  it('should complete full onboarding flow', async () => {
    render(<App />)

    // 1. 애니메이션 대기
    await waitFor(() => {
      expect(screen.getByText(/안녕하세요/)).toBeInTheDocument()
    }, { timeout: 5000 })

    // 2. 이름 입력
    const input = screen.getByPlaceholderText('Type your message')
    fireEvent.change(input, { target: { value: '철수' } })
    fireEvent.click(screen.getByText('▶'))

    // 3. 완료 확인
    await waitFor(() => {
      expect(localStorage.getItem('knockOnboardingComplete')).toBe('true')
    })
  })
})
```

---

## 8. 배포 및 모니터링

### 8.1 성능 메트릭

```typescript
// 온보딩 완료 시간 추적
const trackOnboardingTime = () => {
  const startTime = performance.now()

  return () => {
    const endTime = performance.now()
    const duration = endTime - startTime

    // Analytics 전송
    analytics.track('onboarding_completed', {
      duration_ms: duration,
      user_age: state.userAge,
      privacy_optional: state.hasAgreedPrivacyOptional
    })
  }
}
```

### 8.2 에러 모니터링

```typescript
const errorBoundary = (error: Error, errorInfo: any) => {
  // Sentry, LogRocket 등으로 전송
  console.error('Onboarding error:', error, errorInfo)

  // 사용자에게 친절한 에러 메시지
  dispatch({
    type: 'RECEIVE_MESSAGE',
    payload: '오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
  })
}
```

---

## 9. 기술 스택 요약

| 카테고리 | 기술 |
|---------|------|
| Frontend | React 18 + TypeScript 5.3 |
| 상태 관리 | useReducer (Context API 선택적) |
| 스타일링 | Tailwind CSS + Custom Pixel Animations |
| 애니메이션 | CSS Animations + useEffect |
| 영속성 | localStorage |
| API 통신 | Fetch API |
| 테스트 | Jest + React Testing Library |
| 번들러 | Vite 5 |

---

## 버전 이력
- **v2.0** (2025-10-27): 채팅 기반 온보딩, 애니메이션 명세 추가
- **v1.0** (2025-10-27): 초기 버전
