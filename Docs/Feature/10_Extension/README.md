# 10. Chrome Extension - 채팅 메신저

## 📋 피쳐 개요

**Chrome Extension을 채팅 메신저로 포지셔닝**

카카오톡, 슬랙, 디스코드처럼 브라우저에 항상 떠있는 메신저. 룸메이트들이 실시간으로 말을 걸고, 사용자는 언제든 한 클릭으로 응답.

---

## 🎯 핵심 가치

### 사용자에게

> "웹 서핑 중에도 룸메이트들이 항상 나와 함께 있어요"

- 🔔 **즉시 알림**: 룸메이트가 말 걸면 브라우저 알림
- 💬 **빠른 응답**: 클릭 한 번으로 채팅창 오픈
- 🎯 **컨텍스트 인지**: 내가 보는 콘텐츠와 관련된 대화
- ⚡ **끊김 없음**: 웹앱 닫아도 대화 계속됨

### 서비스에게

- **Stickiness**: 브라우저 열면 항상 함께
- **Engagement**: 웹앱 방문 없이도 상호작용
- **Retention**: 일상 속 습관화
- **데이터**: 풍부한 컨텍스트 수집

---

## 💡 주요 기능

### 1. 알림 센터 (Notification Hub)

#### 기능
```
룸메이트가 말을 걸면:
├─ 브라우저 알림 표시
├─ Badge 숫자 업데이트 (툴바 아이콘)
├─ 소리 알림 (선택 가능)
└─ 미확인 메시지 표시
```

#### UX
```
[알림 예시]
┌────────────────────────────┐
│ 🎨 Emma                     │
│ "오늘 본 파스타 레시피      │
│  정말 좋아 보이던데!"       │
│                             │
│ [답장하기] [나중에]         │
└────────────────────────────┘
```

#### 알림 타이밍
- **즉시**: 룸메이트 메시지 (5분 내)
- **지능적**: 사용자 활동 패턴 학습
  - 집중 시간 피하기
  - 선호 시간대 우선
  - 웹 서핑 중일 때

### 2. 채팅 팝업 (Chat Popup)

#### 기능
```
툴바 아이콘 클릭 시:
├─ 메신저 UI 표시 (300x600px)
├─ 활성 대화 목록
├─ 새 메시지 뱃지
└─ 빠른 응답 버튼
```

#### UI 구조
```
┌─────────────────────────┐
│ Knock 🏠          [⚙️]  │ ← 헤더
├─────────────────────────┤
│ 💬 대화                  │ ← 탭
├─────────────────────────┤
│ 🎨 Emma (2)        3분전 │ ← 대화 리스트
│   "레시피 궁금해!"       │   (최신 메시지 미리보기)
│                          │
│ 🎮 Max (1)        10분전 │
│   "게임 같이 할래?"      │
│                          │
│ 📚 Sofia          1시간  │
│   "책 읽었어?"           │
├─────────────────────────┤
│ [웹앱 열기] 🚀           │ ← 푸터
└─────────────────────────┘
```

### 3. 인라인 채팅 (Inline Chat)

#### 기능
```
대화 목록에서 룸메이트 클릭:
├─ 전체 대화 히스토리 표시
├─ 메시지 입력창
├─ AI 응답 실시간 스트리밍
└─ 미디어 공유 (이미지, 링크)
```

#### UI 구조
```
┌─────────────────────────┐
│ ← Emma 🎨               │ ← 헤더 (뒤로가기)
├─────────────────────────┤
│                          │
│  [Emma] 안녕! 오늘 뭐해? │ ← 메시지 (왼쪽)
│  3분 전                  │
│                          │
│      나는 파스타 만들어  │ ← 내 메시지 (오른쪽)
│      봤어! [나] 1분 전    │
│                          │
│  [Emma] 오 대박! 소스는  │
│  뭐 썼어? 3초 전         │
│                          │
│  [입력 중...]           │ ← AI 타이핑 인디케이터
│                          │
├─────────────────────────┤
│ 메시지 입력...      [📎] │ ← 입력창
└─────────────────────────┘
```

### 4. 컨텍스트 인지 (Context-Aware)

#### 기능
```
현재 브라우징 컨텍스트 활용:
├─ 보는 페이지 관련 대화 시작
├─ URL 공유 자동 제안
├─ 관심사 기반 룸메이트 추천
└─ 페이지 오버레이 추천 말풍선
```

#### 예시
```
[사용자가 YouTube 요리 영상 시청 중]
     ↓
[Extension 팝업 Badge: 1]
     ↓
[클릭하면]
     ↓
┌─────────────────────────┐
│ 💡 추천                  │
│                          │
│ Emma가 이 영상에 관심이  │
│ 있을 것 같아요!         │
│                          │
│ [Emma에게 공유하기]      │
└─────────────────────────┘
```

### 5. 페이지 오버레이 (Page Overlay)

#### 기능
```
웹 서핑 중 페이지 위에:
├─ 우측 하단 미니 버튼 (Floating)
├─ 클릭 시 작은 채팅창 (250x400px)
├─ 페이지 가리지 않음 (투명도 조절)
└─ 드래그로 위치 이동 가능
```

#### UI 구조
```
[웹페이지]
              ┌──────────────┐
              │ 🏠 Knock     │ ← 미니 채팅창
              ├──────────────┤
              │ 🎨 Emma      │
              │ "좋은 글이네!│
              │  공유 감사!"  │
              │              │
              │ [답장]       │
              └──────────────┘
                    ↑
              [💬 2] ← 플로팅 버튼
                     (우측 하단 고정)
```

### 6. 노크 시스템 (Knock System)

#### 기능
```
팝업 내에서 노크 가능:
├─ 노크 가능 상태 표시
├─ "노크하기" 버튼
├─ 노크 결과 즉시 표시
└─ 새 룸메이트 소개 애니메이션
```

#### UI 플로우
```
[팝업 메인]
     ↓
[노크 탭] 클릭
     ↓
┌─────────────────────────┐
│ 🚪 오늘의 노크          │
│                          │
│ ⭐ 1회 남음             │
│                          │
│ [노크하기! 🚪]          │
│                          │
│ 다음 리셋: 3시간 후      │
└─────────────────────────┘
     ↓ 클릭
┌─────────────────────────┐
│ 🎉                       │
│                          │
│ 4층에 새 이웃 등장!      │
│                          │
│ 🎸 Noah (Musician)      │
│ "안녕! 음악 좋아해?"     │
│                          │
│ [대화 시작하기]          │
└─────────────────────────┘
```

---

## 🎨 디자인 가이드

### 메신저 느낌 (Messaging App Feel)

#### 컬러 테마
```css
/* Primary - 픽셀 아트 기반 */
--knock-blue: #4A90E2;
--knock-purple: #9B59B6;
--knock-green: #2ECC71;

/* Message Bubbles */
--my-message: #DCF8C6;      /* 카톡 스타일 */
--their-message: #FFFFFF;
--background: #F5F5F5;

/* Status */
--unread-badge: #E74C3C;    /* 빨간 뱃지 */
--online: #2ECC71;
--offline: #95A5A6;
```

#### 아이콘 스타일
```
픽셀 아트 아이콘:
├─ 16x16px (툴바 아이콘)
├─ 48x48px (팝업 내 룸메이트)
└─ 128x128px (확장프로그램 스토어)
```

#### 애니메이션
```
메시지 도착:
├─ Badge 숫자 튀어오르기
├─ 새 메시지 슬라이드 인
├─ AI 타이핑 애니메이션 (...)
└─ 읽음 표시 체크 애니메이션
```

### 반응형 레이아웃

```
팝업 크기별 조정:
├─ 300x400px (기본): 대화 리스트 + 입력
├─ 300x600px (확장): 대화 + 히스토리
└─ 전체 화면 (detached): 웹앱과 동일
```

---

## 🔔 알림 전략

### 알림 종류

#### 1. 룸메이트 메시지
```
우선순위: 높음
타이밍: 즉시
소리: 부드러운 알림음
예시: "Emma: 오늘 뭐해?"
```

#### 2. 노크 가능
```
우선순위: 중간
타이밍: 오전 9시, 저녁 8시
소리: 없음 (Badge만)
예시: "🚪 오늘의 노크가 준비되었어요!"
```

#### 3. 룸메이트 추천
```
우선순위: 낮음
타이밍: 컨텍스트 기반
소리: 없음
예시: "Emma가 이 주제에 관심 있어요"
```

### 알림 설정

```
사용자 커스터마이징:
├─ 알림 ON/OFF (룸메이트별)
├─ 방해 금지 시간대
├─ 소리 ON/OFF
└─ Badge 표시 여부
```

---

## 🚀 핵심 UX 플로우

### 플로우 1: 첫 대화

```
1. 웹앱에서 온보딩 완료
   ↓
2. "Extension 설치" 권유
   ↓
3. Chrome Web Store → 설치
   ↓
4. 툴바에 아이콘 추가됨
   ↓
5. 환영 팝업: "Emma가 기다려요!"
   ↓
6. 클릭 → 팝업 오픈
   ↓
7. Emma: "안녕! 반가워!"
   ↓
8. 답장 입력 → AI 응답
   ↓
9. Badge 사라짐
```

### 플로우 2: 일상 사용 (Context-Aware)

```
[아침 9시]
1. 브라우저 열기
   ↓
2. 뉴스 사이트 방문
   ↓
3. Extension 백그라운드 활성화
   ↓
4. 관심사 수집 시작

[점심 12시]
5. YouTube 요리 영상 시청
   ↓
6. Extension: "Emma가 말 걸고 싶어 해요!" (알림)
   ↓
7. 알림 클릭 → 팝업 오픈
   ↓
8. Emma: "오늘 점심 뭐 먹어?"
   ↓
9. 5분 짧은 대화

[저녁 8시]
10. Badge 표시: "노크 가능!"
    ↓
11. 클릭 → 노크 탭
    ↓
12. 노크 실행 → 새 룸메이트 등장
    ↓
13. 새 룸메이트와 첫 대화

[밤 10시]
14. 웹앱 방문 (심화 탐색)
    ↓
15. 긴 대화 세션 (30분)
```

### 플로우 3: 페이지 오버레이

```
1. 유튜브 영상 시청 중
   ↓
2. 우측 하단 플로팅 버튼 표시
   ↓
3. Badge: 1 (Emma 메시지)
   ↓
4. 클릭 → 미니 채팅창 오픈
   ↓
5. Emma: "이 영상 좋다!"
   ↓
6. 답장: "그치? 유용해"
   ↓
7. 영상 계속 시청 (대화 병행)
   ↓
8. 미니 채팅창 최소화 (X 버튼)
```

---

## 🔧 기술 명세

### Manifest V3

```json
{
  "manifest_version": 3,
  "name": "Knock - Digital Roommates",
  "version": "1.0.0",
  "description": "채팅 메신저처럼 항상 함께하는 AI 룸메이트",

  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },

  "background": {
    "service_worker": "background.js",
    "type": "module"
  },

  "permissions": [
    "notifications",
    "storage",
    "alarms",
    "history"
  ],

  "host_permissions": [
    "https://*/*"
  ],

  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "css": ["overlay.css"],
      "run_at": "document_idle"
    }
  ]
}
```

### 팝업 UI (React)

```typescript
// popup/App.tsx
export default function Popup() {
  const [tab, setTab] = useState<'chats' | 'knock'>('chats');
  const [selectedRoommate, setSelectedRoommate] = useState<Roommate | null>(null);

  if (selectedRoommate) {
    return <ChatView roommate={selectedRoommate} onBack={() => setSelectedRoommate(null)} />;
  }

  return (
    <div className="popup-container">
      <Header />
      <Tabs active={tab} onChange={setTab} />
      {tab === 'chats' ? (
        <ChatList onSelect={setSelectedRoommate} />
      ) : (
        <KnockView />
      )}
      <Footer />
    </div>
  );
}
```

### 알림 시스템

```typescript
// background.js
import { messaging } from './lib/firebase';

// Firebase Cloud Messaging으로 푸시 알림 수신
messaging.onMessage((payload) => {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: payload.data.roommateAvatar,
    title: payload.data.roommateName,
    message: payload.data.messagePreview,
    buttons: [
      { title: '답장하기' },
      { title: '나중에' }
    ]
  });

  // Badge 업데이트
  chrome.action.setBadgeText({ text: payload.data.unreadCount });
});

// 알림 클릭 핸들러
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (buttonIndex === 0) {
    // 답장하기 - 팝업 열기
    chrome.action.openPopup();
  }
});
```

---

## 📊 성공 지표

### 사용 지표
- **설치율**: 웹앱 사용자의 70%+
- **일일 활성**: DAU/MAU 비율 60%+
- **알림 응답률**: 40%+
- **평균 응답 시간**: 5분 이내

### 참여 지표
- **일일 대화 수**: 사용자당 3회+
- **팝업 오픈 횟수**: 일 5회+
- **평균 세션 길이**: 2-5분 (짧고 자주)

### 만족도 지표
- **Extension 평점**: 4.5+ / 5.0
- **리뷰 긍정률**: 80%+
- **제거율**: 10% 미만

---

## 🎯 우선순위

### MVP (Phase 1) - 필수
- [x] 알림 센터
- [x] 채팅 팝업 (대화 리스트)
- [x] 인라인 채팅 (1:1 대화)
- [x] 노크 시스템 (팝업 내)
- [x] Badge 알림

### Enhancement (Phase 2) - 추가
- [ ] 페이지 오버레이
- [ ] 컨텍스트 인지 추천
- [ ] 미디어 공유 (이미지, 링크)
- [ ] 읽음 표시
- [ ] 반응 이모지

### Advanced (Phase 3) - 고급
- [ ] 음성 메시지
- [ ] 그룹 채팅 (여러 룸메이트)
- [ ] 테마 커스터마이징
- [ ] 단축키 지원

---

## 📝 다음 단계

1. **UI/UX 디자인 완성**
   - Figma 목업 제작
   - 픽셀 아트 아이콘 디자인
   - 애니메이션 프로토타입

2. **기술 프로토타입**
   - Manifest V3 기본 구조
   - React 팝업 UI
   - Firebase 연동

3. **테스트**
   - Chrome Web Store 비공개 배포
   - 베타 테스터 피드백
   - 반복 개선

---

**결론**: Extension을 "룸메이트와의 메신저"로 포지셔닝하여 일상 속에서 자연스럽게 녹아들도록 설계. 웹앱은 "깊은 탐색"을, Extension은 "빠른 소통"을 담당.
