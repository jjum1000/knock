# 사용자 컨텍스트 수집 시스템 제안서

## 📋 목표

사용자의 접속 기록과 행동 패턴을 수집하여 개인화된 경험을 제공하는 시스템 구축

---

## 🎯 핵심 가치

### 1. 사용자 이해
- 언제 접속하는지 (시간대 분석)
- 얼마나 오래 사용하는지 (세션 시간)
- 어떤 룸메이트를 좋아하는지 (상호작용 빈도)
- 어떤 대화 스타일을 선호하는지 (메시지 패턴)

### 2. 개인화 기능
- **추천 시스템**: 선호하는 성격의 룸메이트 추천
- **맞춤 대화**: 사용자 대화 스타일에 맞는 AI 응답
- **타이밍 최적화**: 활동 시간대에 알림/이벤트 발생
- **관계 발전**: 자주 대화하는 룸메이트와의 관계 심화

### 3. 서비스 개선
- 이탈 예측 및 방지
- 사용자 여정 분석
- 기능 사용률 파악
- 버그 및 문제점 발견

---

## 📊 수집할 데이터

### A. 세션 데이터
```typescript
{
  userId: string              // 사용자 ID
  sessionId: string           // 세션 고유 ID
  startTime: Timestamp        // 세션 시작 시간
  endTime?: Timestamp         // 세션 종료 시간
  duration: number            // 세션 지속 시간 (초)
  events: number              // 세션 중 발생한 이벤트 수
  deviceInfo: {
    userAgent: string
    platform: string
    screenSize: string
    language: string
  }
}
```

**활용**:
- 평균 세션 시간 분석
- 재방문율 계산
- 활동 시간대 패턴 파악

### B. 이벤트 데이터
```typescript
{
  userId: string
  eventType: EventType        // 이벤트 종류
  timestamp: Timestamp
  metadata: {                 // 이벤트별 추가 정보
    roommateId?: string
    messageLength?: number
    knockSuccess?: boolean
    ...
  }
}
```

**이벤트 종류**:
- `session_start` / `session_end` - 접속/종료
- `onboarding_start` / `onboarding_complete` - 온보딩
- `knock_attempt` / `knock_success` - 노크
- `chat_start` / `chat_message_sent` - 대화
- `roommate_view` / `roommate_select` - 룸메이트 선택
- `error_occurred` - 오류 발생

**활용**:
- 사용자 여정 맵핑
- 기능별 사용률 분석
- 병목 구간 파악

### C. 컨텍스트 요약 데이터
```typescript
{
  userId: string
  totalSessions: number           // 총 세션 수
  totalEvents: number             // 총 이벤트 수
  lastSeen: Timestamp             // 마지막 접속
  onboardingCompleted: boolean    // 온보딩 완료 여부
  knocksTotal: number             // 총 노크 횟수
  messagesTotal: number           // 총 메시지 수
  favoriteRoommates: string[]     // 자주 대화하는 룸메이트 (Top 3)
  averageSessionDuration: number  // 평균 세션 시간 (초)
  preferredChatTimes: string[]    // 선호 시간대 ['morning', 'afternoon', ...]
}
```

**활용**:
- 대시보드 표시
- AI 개인화 프롬프트 생성
- 추천 알고리즘 입력

---

## 🏗️ 시스템 아키텍처

### 1. 데이터 수집 레이어

```
Frontend (Next.js)
    ↓
Analytics Service (src/services/analytics.ts)
    ↓
Firestore Collections
    - analytics_events     (이벤트 로그)
    - user_sessions        (세션 기록)
    - user_context         (컨텍스트 요약)
```

### 2. Firestore 컬렉션 구조

#### `analytics_events`
```
{
  id: auto-generated
  userId: string
  eventType: string
  timestamp: Timestamp
  sessionId: string
  metadata: object
  deviceInfo: object
}
```

**인덱스**:
- `userId` + `timestamp` (DESC)
- `eventType` + `timestamp` (DESC)

#### `user_sessions`
```
{
  id: auto-generated
  userId: string
  sessionId: string
  startTime: Timestamp
  endTime: Timestamp
  duration: number
  events: number
  lastActivity: Timestamp
}
```

**인덱스**:
- `userId` + `startTime` (DESC)

#### `user_context` (캐싱용)
```
{
  userId: string (document ID)
  totalSessions: number
  totalEvents: number
  lastSeen: Timestamp
  favoriteRoommates: array
  preferredChatTimes: array
  updatedAt: Timestamp
}
```

---

## 🔧 구현 계획

### Phase 1: 기본 추적 시스템 (1-2시간)

#### 작업 1: Analytics 서비스 생성 ✅
- [x] `src/services/analytics.ts` 생성
- [x] 이벤트 추적 함수
- [x] 세션 관리 함수
- [x] 컨텍스트 분석 함수

#### 작업 2: 앱에 Analytics 통합 (1시간)
- [ ] `src/hooks/useAnalytics.ts` 커스텀 훅 생성
- [ ] page.tsx에 세션 추적 추가
- [ ] 온보딩 이벤트 추적
- [ ] 노크 이벤트 추적
- [ ] 채팅 이벤트 추적

#### 작업 3: Firestore 보안 규칙 업데이트 (10분)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 기존 규칙...

    // Analytics (사용자는 자신의 데이터만)
    match /analytics_events/{eventId} {
      allow read: if request.auth != null &&
                   resource.data.userId == request.auth.uid;
      allow write: if request.auth != null;
    }

    match /user_sessions/{sessionId} {
      allow read: if request.auth != null &&
                   resource.data.userId == request.auth.uid;
      allow write: if request.auth != null;
    }

    match /user_context/{userId} {
      allow read: if request.auth != null &&
                   userId == request.auth.uid;
      allow write: if request.auth != null;
    }
  }
}
```

### Phase 2: 컨텍스트 활용 (2-3시간)

#### 작업 4: 대시보드 컴포넌트 (1시간)
- [ ] 사용자 활동 요약 표시
- [ ] 최근 접속 기록
- [ ] 자주 대화하는 룸메이트

#### 작업 5: AI 개인화 (1시간)
- [ ] 컨텍스트 기반 시스템 프롬프트 생성
- [ ] 사용자 선호도 반영한 대화 스타일

#### 작업 6: 추천 시스템 (1시간)
- [ ] 선호 성격 유형 분석
- [ ] 새 룸메이트 추천 알고리즘
- [ ] 대화 시작 제안

### Phase 3: 고급 기능 (추후)

#### 작업 7: 실시간 분석
- [ ] 현재 온라인 사용자 수
- [ ] 실시간 이벤트 스트림
- [ ] 이상 행동 감지

#### 작업 8: 예측 모델
- [ ] 이탈 예측
- [ ] 다음 행동 예측
- [ ] 최적 알림 시간 예측

---

## 📈 예상 효과

### 단기 효과 (1주일)
- 사용자 행동 데이터 축적 시작
- 기본 패턴 파악 가능
- 버그 및 문제점 조기 발견

### 중기 효과 (1개월)
- 개인화된 추천 시스템 작동
- 사용자 만족도 향상
- 재방문율 10-20% 증가 예상

### 장기 효과 (3개월)
- 예측 모델 학습 완료
- 이탈률 감소
- 평균 세션 시간 증가
- 프리미엄 전환율 향상

---

## 🔒 개인정보 보호

### 수집 데이터 최소화
- 개인 식별 불가능한 ID만 사용
- 메시지 내용은 저장하지 않음 (길이, 빈도만)
- IP 주소 저장 안 함

### 데이터 보안
- Firestore 보안 규칙로 사용자별 격리
- 사용자는 자신의 데이터만 접근 가능
- Firebase Authentication 필수

### 투명성
- 데이터 수집 내역 사용자에게 표시
- 설정에서 추적 끄기 옵션 제공 (추후)
- 데이터 삭제 요청 지원 (추후)

---

## 💰 비용 추정 (Firebase)

### Firestore 비용
- 쓰기: 사용자당 세션 1회 + 이벤트 10-20회/세션
- 읽기: 세션 시작 시 1회 (컨텍스트 로드)

**예상**:
- DAU 100명: $1-2/월
- DAU 1,000명: $10-20/월
- DAU 10,000명: $100-200/월

충분히 감당 가능한 수준!

---

## 🚀 시작 방법

### 즉시 시작
```bash
# Phase 1 작업 시작
# 1. Analytics 서비스 이미 생성됨 ✅
# 2. 앱에 통합 시작
```

### 다음 단계 선택

**A. 전체 구현 (추천)**
- Phase 1-2를 순서대로 진행
- 3-4시간 소요
- 완전한 컨텍스트 시스템 완성

**B. 최소 구현**
- Phase 1만 진행
- 1-2시간 소요
- 데이터 수집만 시작

**C. 개인화 우선**
- Phase 1 + Phase 2 작업 5만
- 2-3시간 소요
- AI 대화 개인화에 집중

---

어떤 방식으로 진행할까요?
