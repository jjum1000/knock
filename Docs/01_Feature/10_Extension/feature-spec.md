# Extension 기능 명세서

## 기능 목록

### 1. 알림 센터 (Notification Hub)

#### 기본 명세
- Chrome Notifications API 사용
- Firebase Cloud Messaging 통합
- 알림 종류별 우선순위 처리
- 소리/진동 설정 가능

#### 알림 타입

**타입 1: 룸메이트 메시지**
```typescript
interface RoommateMessageNotification {
  type: 'roommate_message';
  roommateId: string;
  roommateName: string;
  roommateAvatar: string;
  messagePreview: string; // 최대 100자
  timestamp: number;
  priority: 'high';
}
```

**타입 2: 노크 가능**
```typescript
interface KnockAvailableNotification {
  type: 'knock_available';
  knocksRemaining: number;
  nextResetTime: number;
  priority: 'medium';
}
```

**타입 3: 컨텍스트 추천**
```typescript
interface ContextRecommendation {
  type: 'context_recommendation';
  roommateId: string;
  reason: string; // "Emma가 요리에 관심 있어요"
  currentUrl: string;
  priority: 'low';
}
```

#### API

**알림 전송**
```typescript
async function sendNotification(data: NotificationData): Promise<string> {
  const notificationId = await chrome.notifications.create({
    type: 'basic',
    iconUrl: data.iconUrl,
    title: data.title,
    message: data.message,
    buttons: data.buttons || [],
    requireInteraction: data.priority === 'high'
  });

  return notificationId;
}
```

**Badge 업데이트**
```typescript
async function updateBadge(count: number): Promise<void> {
  if (count === 0) {
    await chrome.action.setBadgeText({ text: '' });
  } else {
    await chrome.action.setBadgeText({ text: count.toString() });
    await chrome.action.setBadgeBackgroundColor({ color: '#E74C3C' });
  }
}
```

---

### 2. 채팅 팝업 (Chat Popup)

#### 기본 명세
- 팝업 크기: 300x600px (기본), 400x800px (확장 가능)
- React 18 + TypeScript
- Tailwind CSS (픽셀 아트 테마)
- Firebase Realtime Database 동기화

#### 화면 구성

**메인 화면 (대화 리스트)**
```typescript
interface ChatListItem {
  roommateId: string;
  roommateName: string;
  roommateAvatar: string;
  lastMessage: string;
  lastMessageTime: number;
  unreadCount: number;
  isOnline: boolean;
}
```

**채팅 화면 (1:1 대화)**
```typescript
interface ChatMessage {
  id: string;
  roommateId: string;
  sender: 'user' | 'roommate';
  content: string;
  timestamp: number;
  isRead: boolean;
  type: 'text' | 'image' | 'link';
}
```

#### API

**대화 리스트 불러오기**
```typescript
async function getChatList(userId: string): Promise<ChatListItem[]> {
  const chats = await firebase.firestore()
    .collection('chats')
    .where('userId', '==', userId)
    .orderBy('lastMessageTime', 'desc')
    .limit(20)
    .get();

  return chats.docs.map(doc => doc.data() as ChatListItem);
}
```

**메시지 전송**
```typescript
async function sendMessage(
  roommateId: string,
  content: string
): Promise<ChatMessage> {
  // 1. Firestore에 저장
  const message = await saveMessage(roommateId, content);

  // 2. OpenAI API 호출
  const aiResponse = await getAIResponse(roommateId, content);

  // 3. AI 응답 저장
  const aiMessage = await saveMessage(roommateId, aiResponse, 'roommate');

  return aiMessage;
}
```

---

### 3. 노크 시스템 (Knock System)

#### 기본 명세
- 1일 1회 제한
- 자정 리셋 (사용자 로컬 시간)
- Firestore에 노크 기록 저장
- 애니메이션 효과

#### API

**노크 가능 여부 확인**
```typescript
async function canKnock(userId: string): Promise<{
  canKnock: boolean;
  knocksRemaining: number;
  nextResetTime: number;
}> {
  const knockData = await firebase.firestore()
    .collection('user_knocks')
    .doc(userId)
    .get();

  const data = knockData.data();
  const now = new Date();
  const lastReset = data?.lastResetDate?.toDate() || new Date(0);

  // 자정이 지났는지 확인
  if (isMidnightPassed(lastReset, now)) {
    return {
      canKnock: true,
      knocksRemaining: 1,
      nextResetTime: getNextMidnight(now)
    };
  }

  return {
    canKnock: data?.knocksRemaining > 0,
    knocksRemaining: data?.knocksRemaining || 0,
    nextResetTime: getNextMidnight(now)
  };
}
```

**노크 실행**
```typescript
async function executeKnock(userId: string): Promise<{
  success: boolean;
  newRoommate?: Roommate;
  error?: string;
}> {
  // 1. 가능 여부 확인
  const { canKnock } = await canKnock(userId);
  if (!canKnock) {
    return { success: false, error: 'No knocks remaining' };
  }

  // 2. 새 룸메이트 생성 (OpenAI + 사용자 관심사)
  const newRoommate = await generateRoommate(userId);

  // 3. 노크 차감
  await decrementKnock(userId);

  // 4. 룸메이트 저장
  await saveRoommate(userId, newRoommate);

  return { success: true, newRoommate };
}
```

---

### 4. 페이지 오버레이 (Page Overlay)

#### 기본 명세
- Content Script로 주입
- 우측 하단 플로팅 버튼
- 클릭 시 미니 채팅창 (250x400px)
- 드래그 가능
- z-index: 999999

#### UI 컴포넌트

**플로팅 버튼**
```html
<div id="knock-floating-button" style="
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  cursor: pointer;
  z-index: 999999;
">
  <div class="badge">2</div>
  💬
</div>
```

**미니 채팅창**
```html
<div id="knock-overlay-chat" style="
  position: fixed;
  bottom: 90px;
  right: 20px;
  width: 250px;
  height: 400px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
  z-index: 999998;
">
  <!-- 채팅 UI -->
</div>
```

#### API

**오버레이 주입**
```typescript
// content.js
function injectOverlay() {
  // Shadow DOM으로 격리
  const container = document.createElement('div');
  container.id = 'knock-extension-root';
  document.body.appendChild(container);

  const shadow = container.attachShadow({ mode: 'open' });

  // React 컴포넌트 렌더링
  ReactDOM.render(<OverlayApp />, shadow);
}

// 페이지 로드 완료 후 주입
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectOverlay);
} else {
  injectOverlay();
}
```

---

### 5. 컨텍스트 인지 (Context-Aware)

#### 기본 명세
- 현재 URL 분석
- 페이지 콘텐츠 키워드 추출
- 사용자 관심사와 매칭
- 관련 룸메이트 추천

#### API

**컨텍스트 분석**
```typescript
async function analyzeContext(url: string, pageContent: string): Promise<{
  category: string;
  keywords: string[];
  relevantRoommates: string[];
}> {
  // 1. URL 카테고리 분류
  const category = categorizeUrl(url);

  // 2. 페이지 키워드 추출
  const keywords = extractKeywords(pageContent);

  // 3. 사용자 관심사 로드
  const userInterests = await getUserInterests();

  // 4. 관련 룸메이트 찾기
  const relevantRoommates = await findRelevantRoommates(
    category,
    keywords,
    userInterests
  );

  return { category, keywords, relevantRoommates };
}
```

**추천 표시**
```typescript
async function showRecommendation(roommateId: string, reason: string): Promise<void> {
  // 1. 팝업에 추천 카드 표시
  await chrome.storage.local.set({
    recommendation: {
      roommateId,
      reason,
      timestamp: Date.now()
    }
  });

  // 2. Badge 업데이트
  await chrome.action.setBadgeText({ text: '💡' });

  // 3. 알림 (선택 사항)
  if (userSettings.contextNotifications) {
    await sendNotification({
      type: 'context_recommendation',
      roommateId,
      reason
    });
  }
}
```

---

## 데이터베이스 스키마

### Firestore Collections

#### `extension_chats`
```typescript
{
  id: string;
  userId: string;
  roommateId: string;
  lastMessage: string;
  lastMessageTime: Timestamp;
  unreadCount: number;
  messages: {
    [messageId: string]: {
      sender: 'user' | 'roommate';
      content: string;
      timestamp: Timestamp;
      isRead: boolean;
    }
  }
}
```

#### `user_knocks`
```typescript
{
  userId: string (document ID);
  knocksRemaining: number;
  lastKnockTime: Timestamp;
  lastResetDate: Timestamp;
  totalKnocks: number;
}
```

#### `extension_settings`
```typescript
{
  userId: string (document ID);
  notifications: {
    enabled: boolean;
    sound: boolean;
    quietHours: {
      start: string; // "22:00"
      end: string;   // "08:00"
    }
  };
  overlay: {
    enabled: boolean;
    position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  };
  contextAwareness: {
    enabled: boolean;
    autoRecommend: boolean;
  }
}
```

---

## 외부 API 연동

### Firebase Cloud Messaging

**푸시 알림 전송** (서버 사이드)
```typescript
import admin from 'firebase-admin';

async function sendPushToExtension(
  userId: string,
  notification: NotificationData
): Promise<void> {
  // 사용자의 Extension token 가져오기
  const token = await getExtensionToken(userId);

  await admin.messaging().send({
    token,
    notification: {
      title: notification.title,
      body: notification.message,
      icon: notification.iconUrl
    },
    data: {
      roommateId: notification.roommateId,
      type: notification.type
    }
  });
}
```

### OpenAI API

**AI 응답 생성**
```typescript
import OpenAI from 'openai';

async function getAIResponse(
  roommateId: string,
  userMessage: string,
  context?: string
): Promise<string> {
  const roommate = await getRoommate(roommateId);
  const userInterests = await getUserInterests();

  const systemPrompt = `You are ${roommate.name}, ${roommate.personality}.
User interests: ${userInterests.join(', ')}
${context ? `Current context: ${context}` : ''}

Reply naturally and stay in character. Keep it short (2-3 sentences).`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
    max_tokens: 150,
    temperature: 0.8
  });

  return completion.choices[0].message.content || 'Sorry, I could not respond.';
}
```

---

## 에러 처리

### 에러 타입

```typescript
enum ExtensionErrorType {
  NETWORK_ERROR = 'network_error',
  AUTH_ERROR = 'auth_error',
  PERMISSION_DENIED = 'permission_denied',
  STORAGE_ERROR = 'storage_error',
  AI_ERROR = 'ai_error',
  UNKNOWN = 'unknown'
}

interface ExtensionError {
  type: ExtensionErrorType;
  message: string;
  details?: any;
  timestamp: number;
}
```

### 에러 처리 전략

```typescript
async function handleError(error: ExtensionError): Promise<void> {
  // 1. 로컬 저장
  await logError(error);

  // 2. 사용자에게 표시 (심각한 경우만)
  if (isCritical(error)) {
    await showErrorNotification(error);
  }

  // 3. Firebase에 전송 (익명화)
  await reportError(anonymizeError(error));

  // 4. Fallback 동작
  switch (error.type) {
    case ExtensionErrorType.NETWORK_ERROR:
      await useCachedData();
      break;
    case ExtensionErrorType.AI_ERROR:
      await useMockResponse();
      break;
    // ...
  }
}
```

---

## 성능 최적화

### 1. 메모리 관리
```typescript
// Service Worker는 비활성 시 종료되므로
// 중요 데이터는 chrome.storage에 저장

async function persistState(): Promise<void> {
  await chrome.storage.local.set({
    chatCache: recentChats,
    userContext: userInterests,
    lastSync: Date.now()
  });
}

// 5분마다 자동 저장
chrome.alarms.create('persistState', { periodInMinutes: 5 });
```

### 2. 네트워크 최적화
```typescript
// 메시지 일괄 처리
const messageQueue: Message[] = [];

async function queueMessage(message: Message): Promise<void> {
  messageQueue.push(message);

  // 100ms 후 일괄 전송
  if (!flushTimeout) {
    flushTimeout = setTimeout(flushMessages, 100);
  }
}

async function flushMessages(): Promise<void> {
  if (messageQueue.length === 0) return;

  await firebase.firestore()
    .collection('messages')
    .add({ messages: messageQueue });

  messageQueue.length = 0;
  flushTimeout = null;
}
```

### 3. UI 렌더링 최적화
```typescript
// React.memo로 불필요한 리렌더링 방지
const ChatListItem = React.memo(({ chat }: { chat: ChatListItem }) => {
  return (
    <div className="chat-item">
      <Avatar src={chat.roommateAvatar} />
      <div>
        <h3>{chat.roommateName}</h3>
        <p>{chat.lastMessage}</p>
      </div>
      {chat.unreadCount > 0 && <Badge count={chat.unreadCount} />}
    </div>
  );
}, (prev, next) => {
  return prev.chat.lastMessageTime === next.chat.lastMessageTime &&
         prev.chat.unreadCount === next.chat.unreadCount;
});
```

---

## 보안

### 1. CSP (Content Security Policy)
```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

### 2. 메시지 검증
```typescript
// 악의적인 메시지 필터링
function sanitizeMessage(content: string): string {
  // XSS 방지
  const div = document.createElement('div');
  div.textContent = content;
  return div.innerHTML;
}
```

### 3. API 키 보호
```typescript
// API 키는 절대 하드코딩하지 않음
// Firebase Functions로 프록시
export async function callOpenAI(message: string): Promise<string> {
  const response = await fetch('https://us-central1-knock-xyz.cloudfunctions.net/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message })
  });

  return response.json();
}
```

---

## 테스트

### 단위 테스트
```typescript
describe('Knock System', () => {
  it('should allow knock when knocks remaining > 0', async () => {
    const result = await canKnock('user123');
    expect(result.canKnock).toBe(true);
  });

  it('should prevent knock when knocks remaining = 0', async () => {
    await decrementKnock('user123');
    const result = await canKnock('user123');
    expect(result.canKnock).toBe(false);
  });
});
```

### E2E 테스트
```typescript
describe('Chat Flow', () => {
  it('should send and receive message', async () => {
    await openPopup();
    await selectRoommate('emma');
    await typeMessage('Hello!');
    await clickSend();

    const aiResponse = await waitForAIResponse();
    expect(aiResponse).toBeDefined();
  });
});
```

---

**다음 단계**: user-flow.md 및 tech-spec.md 작성
