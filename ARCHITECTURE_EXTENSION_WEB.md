# 🏗️ Knock 아키텍처: Chrome Extension + Web App

## 📋 핵심 설계 원칙

**Chrome Extension이 메인, Web App이 뷰어**

사용자는 브라우저에서 일상을 보내며, Extension이 항상 함께하고, Web App은 필요할 때만 방문합니다.

---

## 🎯 역할 정의

### Chrome Extension (주인공)

**역할**: 사용자의 디지털 라이프 파트너

#### 1. 데이터 수집 (Background)
```
항상 실행 중:
├─ 브라우징 히스토리 수집
├─ 관심사/성격 분석
├─ 사용 패턴 학습
└─ Firebase에 자동 동기화
```

#### 2. 실시간 알림 (Notification)
```
적절한 타이밍에:
├─ "Emma가 당신에게 말을 걸고 싶어 해요!"
├─ "새로운 룸메이트를 만날 시간이에요 (노크 가능)"
├─ "좋아하는 룸메이트가 답장을 기다려요"
└─ "오늘의 대화 주제 추천: 최근 본 영화"
```

#### 3. 퀵 액세스 (Popup)
```
브라우저 툴바에서 클릭:
├─ 빠른 대화 (현재 룸메이트와)
├─ 노크 카운트 표시
├─ 최근 알림 확인
└─ "웹앱 열기" 버튼
```

#### 4. 컨텍스트 주입 (Content Script)
```
웹 서핑 중:
├─ 특정 키워드 감지 시 룸메이트 추천
│   예: "요리" 검색 → "Emma(셰프)와 대화해보세요"
├─ 웹페이지 위에 미니 채팅창 (선택 사항)
└─ 관심사 관련 콘텐츠 하이라이트
```

---

### Web App (무대)

**역할**: 풍부한 경험과 깊은 상호작용

#### 1. 메인 경험
```
웹에서만 가능:
├─ 건물 전체 뷰 (픽셀 아트 UI)
├─ 모든 룸메이트 한눈에 보기
├─ 긴 대화 세션
└─ 프로필 편집
```

#### 2. 온보딩
```
최초 1회:
├─ 서비스 소개
├─ 데이터 수집 동의
├─ Extension 설치 유도
└─ 첫 룸메이트 생성
```

#### 3. 설정 & 대시보드
```
심층 기능:
├─ 개인정보 설정
├─ 수집된 데이터 확인/삭제
├─ 통계 대시보드 (활동, 관계 등)
└─ 프리미엄 구독 관리
```

#### 4. 소셜 기능 (추후)
```
커뮤니티:
├─ 다른 사용자와 룸메이트 공유
├─ 대화 스크린샷 공유
└─ 이벤트 참여
```

---

## 🔄 데이터 흐름

### 시나리오 1: 사용자가 요리 레시피를 검색

```mermaid
User: 유튜브에서 "파스타 레시피" 검색
     ↓
Extension (Background):
     - URL 캡처: youtube.com/watch?v=...
     - 카테고리 분류: "food_cooking"
     - Firebase에 저장
     ↓
Extension (Analysis):
     - 관심사 점수 업데이트: food_cooking +10
     - 성격 추론: nurturing +5
     ↓
Firebase:
     - browsing_history 컬렉션에 추가
     - user_interests 업데이트
     ↓
Extension (Smart Notification):
     - 30분 후 알림: "Emma(셰프)가 새로운 레시피를 공유하고 싶어 해요!"
     ↓
User: 알림 클릭
     ↓
Extension (Popup):
     - 미니 채팅창 열림
     - Emma: "오늘 파스타 만들어봤어? 내가 좋은 팁 알려줄게!"
     ↓
User: "응! 크림 소스 만드는 법 알려줘"
     ↓
OpenAI API (with context):
     - System prompt: "User recently searched for pasta recipes"
     - Response: 맞춤형 요리 팁
     ↓
Extension: 대화 저장 (Firebase)
```

### 시나리오 2: 웹앱에서 깊은 탐색

```mermaid
User: knock.app 접속
     ↓
Web App:
     - Firebase에서 사용자 데이터 로드
     - 건물 뷰 렌더링
     - 관심사 기반 룸메이트 추천
     ↓
User: 4층 "Max(게이머)" 방 클릭
     ↓
Web App:
     - 대화 히스토리 로드 (Firebase)
     - 채팅 인터페이스 표시
     ↓
User: 30분간 대화
     ↓
Web App:
     - 모든 메시지 Firebase에 저장
     - 관계 점수 업데이트
     ↓
User: 웹앱 닫음
     ↓
Extension (Background):
     - 계속 실행 중
     - 다음 대화 타이밍 분석
     - 적절한 시간에 알림 예약
```

---

## 📦 기술 스택

### Chrome Extension

#### Manifest V3
```json
{
  "manifest_version": 3,
  "name": "Knock - Your Digital Roommates",
  "version": "1.0.0",
  "permissions": [
    "history",           // 브라우징 히스토리
    "tabs",              // 탭 정보
    "storage",           // 로컬 스토리지
    "notifications",     // 알림
    "alarms"             // 스케줄 작업
  ],
  "host_permissions": [
    "https://*/*"        // 모든 HTTPS 사이트
  ],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "action": {
    "default_popup": "popup.html",
    "default_icon": "icon128.png"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ]
}
```

#### 구조
```
knock-extension/
├── manifest.json
├── background.js          # 백그라운드 로직
├── popup/
│   ├── popup.html         # 팝업 UI
│   ├── popup.js           # 팝업 로직
│   └── popup.css          # 스타일
├── content/
│   ├── content.js         # 페이지 주입 스크립트
│   └── overlay.css        # 오버레이 스타일
├── lib/
│   ├── firebase.js        # Firebase SDK
│   ├── analytics.js       # 분석 로직
│   └── ai-chat.js         # AI 채팅 (OpenAI)
└── assets/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

#### 주요 기능

**background.js** (Service Worker)
```javascript
// 1. 브라우징 히스토리 수집
chrome.history.onVisited.addListener(async (historyItem) => {
  const data = await analyzeUrl(historyItem);
  await saveToFirebase('browsing_history', data);
  await updateUserInterests(data.category);
});

// 2. 스마트 알림 스케줄
chrome.alarms.create('checkNotifications', {
  periodInMinutes: 30
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'checkNotifications') {
    const shouldNotify = await analyzeNotificationTiming();
    if (shouldNotify) {
      await sendNotification();
    }
  }
});

// 3. 웹앱과 동기화
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SYNC_REQUEST') {
    syncWithWebApp().then(sendResponse);
    return true; // async response
  }
});
```

**popup.html/js** (퀵 액세스)
```javascript
// 미니 채팅 인터페이스
async function loadQuickChat() {
  const lastRoommate = await getLastChatRoommate();
  const messages = await getRecentMessages(lastRoommate.id, 5);

  renderMiniChat(lastRoommate, messages);
}

async function sendQuickMessage(text) {
  const response = await callOpenAI(text, currentRoommate);
  await saveMessage(response);
  displayMessage(response);
}
```

**content.js** (페이지 오버레이)
```javascript
// 키워드 감지 및 추천
const observer = new MutationObserver((mutations) => {
  const text = document.body.innerText;
  const keywords = detectInterestKeywords(text);

  if (keywords.length > 0) {
    showRoommateRecommendation(keywords);
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});
```

---

### Web App (Next.js)

#### 현재 구조 활용
```
src/
├── app/
│   ├── page.tsx              # 메인 (건물 뷰 + 채팅)
│   ├── onboarding/           # 온보딩 플로우
│   ├── settings/             # 설정
│   └── dashboard/            # 대시보드
├── components/
│   ├── ui/                   # UI 컴포넌트
│   ├── Building.tsx          # 건물 비주얼
│   ├── ChatPanel.tsx         # 채팅 패널
│   └── RoommateCard.tsx      # 룸메이트 카드
├── services/
│   ├── firebase.ts           # Firebase 통합
│   ├── chat.ts               # OpenAI 채팅
│   ├── analytics.ts          # 분석
│   └── extension-bridge.ts   # Extension 통신 (NEW)
├── stores/
│   ├── useAppStore.ts
│   └── useFirebaseAuthStore.ts
└── hooks/
    ├── useAnalytics.ts
    └── useExtensionSync.ts   # Extension 동기화 (NEW)
```

#### Extension Bridge
```typescript
// src/services/extension-bridge.ts
export const extensionBridge = {
  /**
   * Extension 설치 여부 확인
   */
  async isExtensionInstalled(): Promise<boolean> {
    try {
      const response = await chrome.runtime.sendMessage(
        EXTENSION_ID,
        { type: 'PING' }
      );
      return response?.status === 'OK';
    } catch {
      return false;
    }
  },

  /**
   * Extension에서 데이터 동기화
   */
  async syncFromExtension(): Promise<UserContext> {
    return chrome.runtime.sendMessage(EXTENSION_ID, {
      type: 'SYNC_REQUEST'
    });
  },

  /**
   * Extension에 알림 요청
   */
  async requestNotification(data: NotificationData): Promise<void> {
    await chrome.runtime.sendMessage(EXTENSION_ID, {
      type: 'NOTIFY',
      data
    });
  }
}
```

---

## 🔄 통신 프로토콜

### Extension ↔ Web App

```typescript
// 메시지 타입 정의
type Message =
  | { type: 'PING' }
  | { type: 'SYNC_REQUEST' }
  | { type: 'SYNC_RESPONSE'; data: UserContext }
  | { type: 'NOTIFY'; data: NotificationData }
  | { type: 'CHAT_MESSAGE'; message: string; roommateId: string }
  | { type: 'KNOCK'; action: 'execute' | 'check' }

// Extension → Web App
chrome.runtime.sendMessage(message, (response) => {
  // handle response
});

// Web App → Extension
chrome.runtime.sendMessage(EXTENSION_ID, message);
```

### Extension ↔ Firebase

```typescript
// Background에서 직접 Firebase 사용
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function saveHistory(data) {
  await addDoc(collection(db, 'browsing_history'), {
    ...data,
    timestamp: new Date()
  });
}
```

---

## 🚀 개발 로드맵

### Phase 1: Extension 기본 (1-2주)

#### Week 1: 기본 구조
- [ ] Manifest V3 설정
- [ ] Background service worker
- [ ] Popup UI (React 기반)
- [ ] Firebase 연동
- [ ] 브라우징 히스토리 수집

#### Week 2: 분석 & 알림
- [ ] URL 카테고리 분류
- [ ] 관심사 점수 계산
- [ ] 스마트 알림 로직
- [ ] 미니 챗 인터페이스

### Phase 2: Web App 개선 (1주)

- [ ] Extension 설치 유도 UI
- [ ] Extension bridge 구현
- [ ] 동기화 시스템
- [ ] 설정 페이지 (Extension 제어)

### Phase 3: 고도화 (2-3주)

- [ ] Content script (페이지 오버레이)
- [ ] 컨텍스트 기반 추천
- [ ] AI 프롬프트 강화
- [ ] 사용 패턴 학습

---

## 📊 사용자 여정

### 신규 사용자

```
1. 웹사이트 방문 (knock.app)
   ↓
2. 온보딩 완료
   ↓
3. "Chrome Extension 설치" 권유
   - 혜택 설명: "더 똑똑한 룸메이트"
   - 선택 사항 (나중에도 가능)
   ↓
4. Extension 설치
   ↓
5. 권한 승인 (브라우징 히스토리)
   ↓
6. 백그라운드 수집 시작
   ↓
7. 첫 알림 (24시간 후)
   ↓
8. 습관화
```

### 일상 사용

```
Morning:
- 브라우저 켜기
- Extension 백그라운드 활성화
- 뉴스 읽기 → 관심사 수집

Afternoon:
- 일하며 검색
- Extension이 패턴 학습

Evening (7시):
- 알림: "Max가 오늘 본 게임 영상 얘기하고 싶어 해요!"
- 클릭 → 미니 채팅
- 짧은 대화 (5분)

Night (10시):
- 웹앱 방문
- 긴 대화 세션 (30분)
- 프로필 확인
```

---

## 💡 핵심 인사이트

### Extension이 우선인 이유

1. **항상 함께**: 사용자가 웹서핑하는 시간이 훨씬 길다
2. **실시간 수집**: 관심사를 놓치지 않고 캡처
3. **적시 알림**: 사용자가 웹앱을 떠나도 연결 유지
4. **낮은 장벽**: 브라우저에서 한 클릭이면 접근
5. **데이터 품질**: 더 많은 컨텍스트 = 더 나은 개인화

### Web App의 역할

1. **첫 만남**: 온보딩과 서비스 소개
2. **깊은 경험**: 풍부한 UI와 긴 세션
3. **설정 허브**: 모든 설정과 데이터 관리
4. **소셜 공간**: 커뮤니티와 공유 (추후)

---

## 🔒 개인정보 보호

### Extension 권한 최소화

```javascript
// 필수 권한만 요청
"permissions": [
  "history",           // 히스토리 (명시적 동의 후)
  "notifications",     // 알림
  "storage"            // 로컬 저장
],

// 선택 권한 (런타임 요청)
"optional_permissions": [
  "tabs"               // 탭 정보 (고급 기능)
]
```

### 투명성

```typescript
// Extension 설치 시 명확한 설명
const consentScreen = {
  title: "Knock Extension이 사용할 권한",
  permissions: [
    {
      name: "브라우징 히스토리",
      why: "관심사를 파악하여 맞춤형 룸메이트 추천",
      can_disable: true
    },
    {
      name: "알림",
      why: "룸메이트가 말을 걸 때 알려드려요",
      can_disable: true
    }
  ],
  data_policy: "수집된 데이터는 언제든지 확인하고 삭제할 수 있습니다."
};
```

---

## 📈 성공 지표

### Extension 관련
- 설치율: 웹앱 사용자의 60%+
- 활성 사용자: 설치 후 30일 리텐션 70%+
- 알림 응답률: 30%+
- 평균 응답 시간: 5분 이내

### 전체 서비스
- DAU: Extension 사용자가 2배 더 활발
- 세션 빈도: 주 5회+ (Extension) vs 주 2회 (Web만)
- 대화 만족도: 80%+ (Extension) vs 60% (Web만)

---

## ✅ 다음 단계

지금 바로 시작할 수 있는 작업:

1. **Extension 프로젝트 생성**
   ```bash
   mkdir knock-extension
   cd knock-extension
   npm init -y
   npm install firebase
   ```

2. **기본 Manifest 작성**

3. **Popup UI 개발** (React)

4. **Background worker 구현**

5. **Web App에 Extension bridge 추가**

**시작할까요?**
