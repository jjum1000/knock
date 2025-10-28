# Extension Technical Specification

## 목차

1. [프로젝트 구조](#프로젝트-구조)
2. [개발 환경 설정](#개발-환경-설정)
3. [Manifest V3 설정](#manifest-v3-설정)
4. [아키텍처 상세](#아키텍처-상세)
5. [데이터 흐름](#데이터-흐름)
6. [Firebase 통합](#firebase-통합)
7. [OpenAI 통합](#openai-통합)
8. [빌드 & 배포](#빌드--배포)
9. [테스트 전략](#테스트-전략)
10. [성능 최적화](#성능-최적화)
11. [보안](#보안)

---

## 프로젝트 구조

```
extension/
├── manifest.json              # Chrome Extension 설정
├── package.json               # 의존성 & 빌드 스크립트
├── tsconfig.json              # TypeScript 설정
├── webpack.config.js          # 빌드 설정
│
├── public/
│   ├── icons/                 # Extension 아이콘 (16, 32, 48, 128)
│   │   ├── icon-16.png
│   │   ├── icon-32.png
│   │   ├── icon-48.png
│   │   └── icon-128.png
│   └── _locales/              # 다국어 지원
│       └── en/
│           └── messages.json
│
├── src/
│   ├── background/            # Background Service Worker
│   │   ├── index.ts
│   │   ├── messaging.ts       # 알림 시스템
│   │   ├── sync.ts            # Firebase 동기화
│   │   └── history.ts         # 브라우징 히스토리 수집
│   │
│   ├── popup/                 # 팝업 UI
│   │   ├── index.tsx          # React 진입점
│   │   ├── App.tsx            # 메인 컴포넌트
│   │   ├── components/        # UI 컴포넌트
│   │   │   ├── RoommateList.tsx
│   │   │   ├── ChatView.tsx
│   │   │   ├── BuildingView.tsx
│   │   │   └── Settings.tsx
│   │   ├── hooks/             # 커스텀 훅
│   │   │   ├── useAuth.ts
│   │   │   ├── useChat.ts
│   │   │   └── useNotifications.ts
│   │   └── styles/            # 스타일
│   │       └── popup.css
│   │
│   ├── content/               # Content Script (인라인 채팅)
│   │   ├── index.tsx
│   │   ├── InlineChat.tsx     # 사이드 패널
│   │   ├── FloatingButton.tsx # 플로팅 버튼
│   │   └── styles/
│   │       └── content.css
│   │
│   ├── shared/                # 공유 코드
│   │   ├── services/
│   │   │   ├── firebase.ts    # Firebase 초기화
│   │   │   ├── chat.ts        # OpenAI 채팅
│   │   │   ├── analytics.ts   # 사용자 추적
│   │   │   └── storage.ts     # Chrome Storage API
│   │   ├── types/
│   │   │   ├── message.ts
│   │   │   ├── roommate.ts
│   │   │   └── user.ts
│   │   ├── utils/
│   │   │   ├── helpers.ts
│   │   │   └── constants.ts
│   │   └── stores/            # Zustand 스토어
│   │       ├── authStore.ts
│   │       ├── chatStore.ts
│   │       └── appStore.ts
│   │
│   └── options/               # 설정 페이지 (선택)
│       ├── index.tsx
│       └── Options.tsx
│
├── dist/                      # 빌드 출력 (자동 생성)
│   ├── manifest.json
│   ├── background.js
│   ├── popup.html
│   ├── popup.js
│   └── content.js
│
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
```

---

## 개발 환경 설정

### 필수 도구

```bash
# Node.js 18+ 필수
node --version  # v18.0.0+

# npm 또는 yarn
npm --version   # 9.0.0+
```

### 초기 설정

```bash
# Extension 프로젝트 생성
mkdir extension
cd extension

# package.json 초기화
npm init -y

# 의존성 설치
npm install --save \
  react react-dom \
  firebase \
  openai \
  zustand \
  date-fns

# 개발 의존성
npm install --save-dev \
  @types/react @types/react-dom \
  @types/chrome \
  typescript \
  webpack webpack-cli \
  ts-loader \
  html-webpack-plugin \
  copy-webpack-plugin \
  css-loader style-loader \
  tailwindcss postcss autoprefixer
```

### package.json 스크립트

```json
{
  "name": "knock-extension",
  "version": "1.0.0",
  "scripts": {
    "dev": "webpack --mode development --watch",
    "build": "webpack --mode production",
    "test": "jest",
    "lint": "eslint src --ext .ts,.tsx"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "firebase": "^10.7.0",
    "openai": "^4.20.0",
    "zustand": "^4.4.0",
    "date-fns": "^2.30.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@types/chrome": "^0.0.254",
    "typescript": "^5.3.0",
    "webpack": "^5.89.0",
    "webpack-cli": "^5.1.0",
    "ts-loader": "^9.5.0",
    "html-webpack-plugin": "^5.5.0",
    "copy-webpack-plugin": "^11.0.0",
    "css-loader": "^6.8.0",
    "style-loader": "^3.3.0",
    "tailwindcss": "^3.3.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0"
  }
}
```

---

## Manifest V3 설정

### manifest.json

```json
{
  "manifest_version": 3,
  "name": "KNOCK - AI Roommate Chat",
  "version": "1.0.0",
  "description": "Chat with AI roommates while browsing",

  "icons": {
    "16": "icons/icon-16.png",
    "32": "icons/icon-32.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  },

  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "32": "icons/icon-32.png"
    }
  },

  "background": {
    "service_worker": "background.js",
    "type": "module"
  },

  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "css": ["content.css"],
      "run_at": "document_idle"
    }
  ],

  "permissions": [
    "storage",
    "alarms",
    "notifications"
  ],

  "optional_permissions": [
    "history"
  ],

  "host_permissions": [
    "https://*.firebaseio.com/*",
    "https://api.openai.com/*"
  ],

  "web_accessible_resources": [
    {
      "resources": ["icons/*", "fonts/*"],
      "matches": ["<all_urls>"]
    }
  ],

  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

### 주요 설정 설명

#### `manifest_version: 3`
- Chrome의 최신 Extension API 사용
- Service Worker 기반 background 스크립트

#### `permissions`
- `storage`: Chrome Storage API (로컬 데이터 저장)
- `alarms`: 주기적 작업 (동기화)
- `notifications`: 푸시 알림

#### `optional_permissions`
- `history`: 브라우징 히스토리 (사용자 선택)

#### `host_permissions`
- Firebase와 OpenAI API 호출 허용

---

## 아키텍처 상세

### 1. Background Service Worker

**역할**: 항상 실행, Firebase 동기화, 알림 관리

#### `src/background/index.ts`

```typescript
import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { getFirestore, onSnapshot, collection, query, where, orderBy } from 'firebase/firestore'
import { setupMessaging } from './messaging'
import { setupSync } from './sync'
import { setupHistoryTracking } from './history'

const firebaseConfig = {
  // Firebase 설정 (환경변수에서 로드)
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  // ...
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

// Extension 설치 시 자동 로그인
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Extension installed')

  // 익명 로그인
  const { user } = await signInAnonymously(auth)
  await chrome.storage.local.set({ userId: user.uid })

  // 초기 설정
  await chrome.storage.local.set({
    historyPermission: false,
    notificationsEnabled: true,
  })
})

// Firestore 실시간 리스너
auth.onAuthStateChanged(async (user) => {
  if (!user) return

  // 메시지 리스너 설정
  const messagesRef = collection(db, 'messages')
  const q = query(
    messagesRef,
    where('recipientId', '==', user.uid),
    where('read', '==', false),
    orderBy('timestamp', 'desc')
  )

  onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const message = change.doc.data()
        showNotification(message)
      }
    })
  })
})

// 알림 표시
async function showNotification(message: any) {
  const { notificationsEnabled } = await chrome.storage.local.get('notificationsEnabled')
  if (!notificationsEnabled) return

  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon-128.png',
    title: `${message.roommateEmoji} ${message.roommateName}`,
    message: message.text,
    contextMessage: new Date(message.timestamp).toLocaleTimeString(),
    buttons: [
      { title: '답장' },
      { title: '전체 대화 보기' }
    ]
  })
}

// 알림 클릭 핸들러
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (buttonIndex === 0) {
    // 답장: 팝업 열기
    chrome.action.openPopup()
  } else {
    // 전체 대화: 웹앱 열기
    chrome.tabs.create({ url: 'https://knock.app/chat' })
  }
})

// 주기적 동기화 (5분마다)
chrome.alarms.create('sync', { periodInMinutes: 5 })
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'sync') {
    setupSync()
  }
})

// 브라우징 히스토리 추적 (권한 있을 때만)
setupHistoryTracking()
```

#### `src/background/history.ts`

```typescript
import { getFirestore, doc, setDoc } from 'firebase/firestore'

export async function setupHistoryTracking() {
  // 권한 확인
  const hasPermission = await chrome.permissions.contains({ permissions: ['history'] })
  if (!hasPermission) return

  // 최근 방문 기록 수집 (24시간)
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
  const visits = await chrome.history.search({
    text: '',
    startTime: oneDayAgo,
    maxResults: 100
  })

  // 카테고리 분석
  const categories = await analyzeCategories(visits)

  // Firestore에 저장
  const { userId } = await chrome.storage.local.get('userId')
  const db = getFirestore()
  await setDoc(doc(db, 'user_browsing_context', userId), {
    categories,
    lastUpdated: new Date(),
    visitCount: visits.length
  }, { merge: true })
}

async function analyzeCategories(visits: chrome.history.HistoryItem[]) {
  // URL 분류 로직
  const categories: Record<string, number> = {}

  visits.forEach(visit => {
    const url = visit.url || ''

    // 간단한 키워드 매칭
    if (url.includes('github') || url.includes('stackoverflow')) {
      categories['개발'] = (categories['개발'] || 0) + 1
    } else if (url.includes('youtube') && url.includes('game')) {
      categories['게임'] = (categories['게임'] || 0) + 1
    } else if (url.includes('recipe') || url.includes('cooking')) {
      categories['요리'] = (categories['요리'] || 0) + 1
    }
    // ... 더 많은 카테고리
  })

  return categories
}
```

### 2. Popup UI (React)

**역할**: 룸메이트 목록, 채팅, 설정

#### `src/popup/App.tsx`

```typescript
import React, { useEffect, useState } from 'react'
import { useAuthStore } from '../shared/stores/authStore'
import { useChatStore } from '../shared/stores/chatStore'
import RoommateList from './components/RoommateList'
import ChatView from './components/ChatView'
import BuildingView from './components/BuildingView'
import Settings from './components/Settings'

type View = 'list' | 'chat' | 'building' | 'settings'

export default function App() {
  const [view, setView] = useState<View>('list')
  const { userId, initialize } = useAuthStore()
  const { selectedRoommate } = useChatStore()

  useEffect(() => {
    initialize()
  }, [])

  if (!userId) {
    return <div className="loading">Loading...</div>
  }

  return (
    <div className="popup-container">
      {view === 'list' && (
        <RoommateList
          onSelectRoommate={(id) => {
            useChatStore.getState().selectRoommate(id)
            setView('chat')
          }}
          onOpenBuilding={() => setView('building')}
          onOpenSettings={() => setView('settings')}
        />
      )}

      {view === 'chat' && (
        <ChatView
          onBack={() => setView('list')}
        />
      )}

      {view === 'building' && (
        <BuildingView
          onBack={() => setView('list')}
        />
      )}

      {view === 'settings' && (
        <Settings
          onBack={() => setView('list')}
        />
      )}
    </div>
  )
}
```

#### `src/popup/components/ChatView.tsx`

```typescript
import React, { useState, useEffect, useRef } from 'react'
import { useChatStore } from '../../shared/stores/authStore'
import { chatService } from '../../shared/services/chat'
import { addDoc, collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '../../shared/services/firebase'

interface ChatViewProps {
  onBack: () => void
}

export default function ChatView({ onBack }: ChatViewProps) {
  const { selectedRoommate, messages, addMessage } = useChatStore()
  const [input, setInput] = useState('')
  const [isAITyping, setIsAITyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Firestore 실시간 리스너
  useEffect(() => {
    if (!selectedRoommate) return

    const q = query(
      collection(db, 'messages'),
      where('roommateId', '==', selectedRoommate.id),
      orderBy('timestamp', 'asc')
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          addMessage(change.doc.data())
        }
      })
    })

    return () => unsubscribe()
  }, [selectedRoommate])

  // 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || !selectedRoommate) return

    // 사용자 메시지 전송
    const userMessage = {
      text: input,
      sender: 'user',
      timestamp: new Date(),
      roommateId: selectedRoommate.id,
    }

    await addDoc(collection(db, 'messages'), userMessage)
    setInput('')

    // AI 응답 생성
    setIsAITyping(true)
    try {
      const chatHistory = messages.map(msg => ({
        role: msg.sender === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.text
      }))

      const response = await chatService.chat(
        chatHistory,
        selectedRoommate.personality
      )

      // AI 메시지 저장
      await addDoc(collection(db, 'messages'), {
        text: response,
        sender: 'assistant',
        timestamp: new Date(),
        roommateId: selectedRoommate.id,
      })
    } catch (error) {
      console.error('AI response failed:', error)
    } finally {
      setIsAITyping(false)
    }
  }

  return (
    <div className="chat-view">
      <header>
        <button onClick={onBack}>←</button>
        <span>{selectedRoommate?.emoji} {selectedRoommate?.name}</span>
      </header>

      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.sender}`}>
            <div className="bubble">{msg.text}</div>
            <div className="time">
              {new Date(msg.timestamp).toLocaleTimeString()}
            </div>
          </div>
        ))}

        {isAITyping && (
          <div className="message assistant">
            <div className="bubble typing">💭 typing...</div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <footer>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="메시지 입력..."
        />
        <button onClick={handleSend}>↑</button>
      </footer>
    </div>
  )
}
```

### 3. Content Script (인라인 채팅)

**역할**: 웹페이지에 채팅 UI 주입

#### `src/content/index.tsx`

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import InlineChat from './InlineChat'

// 플로팅 버튼 생성
const button = document.createElement('div')
button.id = 'knock-floating-button'
button.innerHTML = '💬'
document.body.appendChild(button)

// 사이드 패널 컨테이너
const container = document.createElement('div')
container.id = 'knock-inline-chat'
document.body.appendChild(container)

// React 마운트
const root = ReactDOM.createRoot(container)

let isOpen = false

button.addEventListener('click', () => {
  isOpen = !isOpen
  root.render(<InlineChat isOpen={isOpen} onClose={() => {
    isOpen = false
    root.render(<InlineChat isOpen={false} onClose={() => {}} />)
  }} />)
})

// 초기 렌더링
root.render(<InlineChat isOpen={false} onClose={() => {}} />)
```

#### `src/content/InlineChat.tsx`

```typescript
import React, { useEffect, useState } from 'react'
import { useChatStore } from '../shared/stores/chatStore'

interface InlineChatProps {
  isOpen: boolean
  onClose: () => void
}

export default function InlineChat({ isOpen, onClose }: InlineChatProps) {
  const [pageContext, setPageContext] = useState('')

  useEffect(() => {
    // 현재 페이지 정보 가져오기
    setPageContext(`${document.title} - ${window.location.hostname}`)
  }, [])

  if (!isOpen) return null

  return (
    <div className="inline-chat-panel">
      <header>
        <span>💬 KNOCK</span>
        <button onClick={onClose}>✕</button>
      </header>

      <div className="page-context">
        <small>🌐 {pageContext}</small>
      </div>

      <div className="chat-content">
        {/* ChatView 컴포넌트 재사용 */}
      </div>
    </div>
  )
}
```

---

## 데이터 흐름

### 메시지 전송 플로우

```
User Input (Popup/Content)
    ↓
Local State Update (Zustand)
    ↓
Firestore Write
    collection('messages').add({
      text: '...',
      sender: 'user',
      timestamp: now,
      roommateId: '...'
    })
    ↓
Background Service Worker (onSnapshot)
    ↓
OpenAI API Request
    chatService.chat(messages, personality)
    ↓
AI Response
    ↓
Firestore Write
    collection('messages').add({
      text: '...',
      sender: 'assistant',
      timestamp: now,
      roommateId: '...'
    })
    ↓
All Clients Update (Real-time)
    - Popup
    - Content Script
    - Web App
```

### 알림 플로우

```
New Message in Firestore
    ↓
Background Service Worker (onSnapshot)
    ↓
Check Notification Settings
    ↓
Chrome Notification API
    chrome.notifications.create({
      title: 'Alex 🎮',
      message: '너 뭐해?'
    })
    ↓
User Click Notification
    ↓
Open Popup / Web App
```

---

## Firebase 통합

### Firestore Collections

```
users/
  {userId}/
    - displayName: string
    - mbti: string
    - interests: string[]
    - createdAt: Timestamp
    - lastSeen: Timestamp

roommates/
  {roommateId}/
    - name: string
    - emoji: string
    - personality: string
    - mbti: string
    - interests: string[]
    - userId: string (소유자)
    - createdAt: Timestamp

messages/
  {messageId}/
    - text: string
    - sender: 'user' | 'assistant'
    - timestamp: Timestamp
    - roommateId: string
    - userId: string
    - read: boolean

user_browsing_context/
  {userId}/
    - categories: { [key: string]: number }
    - lastUpdated: Timestamp
    - visitCount: number

analytics_events/
  {eventId}/
    - userId: string
    - eventType: string
    - timestamp: Timestamp
    - metadata: object
```

### Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 인증 필수
    function isAuthenticated() {
      return request.auth != null;
    }

    // 본인 확인
    function isOwner(userId) {
      return request.auth.uid == userId;
    }

    // Users
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow write: if isOwner(userId);
    }

    // Roommates
    match /roommates/{roommateId} {
      allow read: if isAuthenticated() &&
                   resource.data.userId == request.auth.uid;
      allow write: if isAuthenticated() &&
                    request.resource.data.userId == request.auth.uid;
    }

    // Messages
    match /messages/{messageId} {
      allow read: if isAuthenticated() &&
                   resource.data.userId == request.auth.uid;
      allow create: if isAuthenticated() &&
                     request.resource.data.userId == request.auth.uid;
    }

    // Browsing Context
    match /user_browsing_context/{userId} {
      allow read, write: if isOwner(userId);
    }

    // Analytics
    match /analytics_events/{eventId} {
      allow read: if isAuthenticated() &&
                   resource.data.userId == request.auth.uid;
      allow write: if isAuthenticated();
    }
  }
}
```

---

## OpenAI 통합

### Chat Service

#### `src/shared/services/chat.ts`

```typescript
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  dangerouslyAllowBrowser: true, // Extension only
})

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export const chatService = {
  /**
   * AI 대화 생성 (컨텍스트 포함)
   */
  async chat(
    messages: ChatMessage[],
    roommatePersonality: string,
    userContext?: UserContext
  ): Promise<string> {
    try {
      // 시스템 프롬프트 생성
      const systemPrompt = buildSystemPrompt(roommatePersonality, userContext)

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        temperature: 0.8,
        max_tokens: 150,
        presence_penalty: 0.6,
        frequency_penalty: 0.3,
      })

      return completion.choices[0]?.message?.content || getFallbackResponse()
    } catch (error) {
      console.error('OpenAI API error:', error)
      return getFallbackResponse()
    }
  },
}

function buildSystemPrompt(personality: string, context?: UserContext): string {
  let prompt = `You are ${personality}. Respond naturally and stay in character. Keep responses conversational, friendly, and not too long (2-3 sentences max).`

  if (context?.categories) {
    const topInterests = Object.entries(context.categories)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([category]) => category)

    prompt += `\n\nUser's interests: ${topInterests.join(', ')}. Reference these naturally in conversation.`
  }

  if (context?.currentPage) {
    prompt += `\n\nUser is currently viewing: ${context.currentPage}. You can mention this if relevant.`
  }

  return prompt
}

function getFallbackResponse(): string {
  const responses = [
    "Sorry, I'm having trouble responding right now.",
    "Give me a sec, I'm a bit distracted!",
    "My brain's a bit fuzzy right now, can we try again?",
  ]
  return responses[Math.floor(Math.random() * responses.length)]
}

interface UserContext {
  categories?: Record<string, number>
  currentPage?: string
}
```

---

## 빌드 & 배포

### Webpack Configuration

#### `webpack.config.js`

```javascript
const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')

module.exports = {
  mode: process.env.NODE_ENV || 'development',

  entry: {
    background: './src/background/index.ts',
    popup: './src/popup/index.tsx',
    content: './src/content/index.tsx',
  },

  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true,
  },

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader', 'postcss-loader'],
      },
    ],
  },

  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: './src/popup/popup.html',
      filename: 'popup.html',
      chunks: ['popup'],
    }),

    new CopyWebpackPlugin({
      patterns: [
        { from: 'manifest.json', to: 'manifest.json' },
        { from: 'public/icons', to: 'icons' },
      ],
    }),
  ],
}
```

### 빌드 프로세스

```bash
# 개발 모드 (watch)
npm run dev

# 프로덕션 빌드
npm run build

# dist/ 폴더 생성
# Chrome에서 로드:
# 1. chrome://extensions/
# 2. "개발자 모드" 활성화
# 3. "압축해제된 확장 프로그램 로드"
# 4. dist/ 폴더 선택
```

### Chrome Web Store 배포

```bash
# 1. 프로덕션 빌드
npm run build

# 2. ZIP 파일 생성
cd dist
zip -r ../knock-extension-v1.0.0.zip .

# 3. Chrome Web Store Developer Dashboard
#    https://chrome.google.com/webstore/devconsole
#    - 새 항목 업로드
#    - ZIP 파일 선택
#    - 스크린샷, 설명 추가
#    - 검토 제출
```

---

## 테스트 전략

### Unit Tests

```typescript
// tests/unit/chatService.test.ts
import { chatService } from '@/shared/services/chat'

describe('chatService', () => {
  it('should generate AI response', async () => {
    const messages = [
      { role: 'user' as const, content: 'Hello!' }
    ]

    const response = await chatService.chat(messages, 'friendly gamer Alex')
    expect(response).toBeTruthy()
    expect(response.length).toBeGreaterThan(0)
  })

  it('should handle errors gracefully', async () => {
    // Mock OpenAI error
    const response = await chatService.chat([], 'invalid')
    expect(response).toContain('Sorry')
  })
})
```

### Integration Tests

```typescript
// tests/integration/firestore.test.ts
import { addDoc, collection } from 'firebase/firestore'
import { db } from '@/shared/services/firebase'

describe('Firestore integration', () => {
  it('should save message to Firestore', async () => {
    const message = {
      text: 'Test message',
      sender: 'user',
      timestamp: new Date(),
      roommateId: 'test-roommate',
      userId: 'test-user',
    }

    const docRef = await addDoc(collection(db, 'messages'), message)
    expect(docRef.id).toBeTruthy()
  })
})
```

### E2E Tests (Puppeteer)

```typescript
// tests/e2e/popup.test.ts
import puppeteer from 'puppeteer'

describe('Extension Popup', () => {
  let browser: puppeteer.Browser
  let page: puppeteer.Page

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: false,
      args: [
        `--disable-extensions-except=${__dirname}/../../dist`,
        `--load-extension=${__dirname}/../../dist`,
      ],
    })
    page = await browser.newPage()
  })

  it('should display roommate list', async () => {
    await page.goto('chrome-extension://[extension-id]/popup.html')

    const title = await page.$eval('h1', el => el.textContent)
    expect(title).toBe('내 룸메이트들')
  })

  afterAll(() => browser.close())
})
```

---

## 성능 최적화

### 1. Bundle Size 최적화

```javascript
// webpack.config.js
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10,
        },
        firebase: {
          test: /[\\/]node_modules[\\/]firebase[\\/]/,
          name: 'firebase',
          priority: 20,
        },
      },
    },
  },
}
```

### 2. Lazy Loading

```typescript
// src/popup/App.tsx
import React, { lazy, Suspense } from 'react'

const ChatView = lazy(() => import('./components/ChatView'))
const BuildingView = lazy(() => import('./components/BuildingView'))

export default function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      {view === 'chat' && <ChatView />}
      {view === 'building' && <BuildingView />}
    </Suspense>
  )
}
```

### 3. Firestore Query 최적화

```typescript
// 인덱스 활용
const q = query(
  collection(db, 'messages'),
  where('userId', '==', userId),
  where('roommateId', '==', roommateId),
  orderBy('timestamp', 'desc'),
  limit(20) // 최신 20개만
)

// 캐싱
import { getDocsFromCache } from 'firebase/firestore'

try {
  const snapshot = await getDocsFromCache(q)
  // 캐시 사용
} catch {
  const snapshot = await getDocs(q)
  // 네트워크 사용
}
```

### 4. Debouncing

```typescript
import { debounce } from 'lodash-es'

const handleInputChange = debounce((value: string) => {
  // API 호출 또는 상태 업데이트
}, 300)
```

---

## 보안

### 1. API Key 보호

```typescript
// ❌ 잘못된 방법 (소스코드에 직접)
const apiKey = 'sk-proj-...'

// ✅ 올바른 방법 (환경변수)
const apiKey = process.env.OPENAI_API_KEY

// Webpack에서 주입
// webpack.config.js
const webpack = require('webpack')

plugins: [
  new webpack.DefinePlugin({
    'process.env.OPENAI_API_KEY': JSON.stringify(process.env.OPENAI_API_KEY),
  }),
]
```

### 2. Content Security Policy

```json
// manifest.json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

### 3. XSS 방어

```typescript
// React는 기본적으로 XSS 방어
// 하지만 dangerouslySetInnerHTML 사용 시 주의

// ❌ 위험
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ 안전
<div>{userInput}</div>

// 필요하다면 sanitize
import DOMPurify from 'dompurify'
const clean = DOMPurify.sanitize(userInput)
```

### 4. Firestore Security Rules

```javascript
// 읽기/쓰기 모두 인증 필수
allow read, write: if request.auth != null;

// 본인 데이터만 접근
allow read, write: if request.auth.uid == userId;

// 필드 검증
allow create: if request.resource.data.keys().hasAll(['text', 'timestamp', 'sender']);
```

---

## 모니터링 & 디버깅

### Chrome DevTools

```bash
# Background Service Worker 디버깅
chrome://extensions/ → "service worker 검사"

# Popup 디버깅
Extension 아이콘 우클릭 → "팝업 검사"

# Content Script 디버깅
웹페이지에서 F12 → Console → "top" 드롭다운 → Extension 선택
```

### Logging

```typescript
// 개발 환경에서만 로그
const isDev = process.env.NODE_ENV === 'development'

function log(...args: any[]) {
  if (isDev) {
    console.log('[KNOCK]', ...args)
  }
}

// Firestore 쓰기 로그
await addDoc(collection(db, 'messages'), message)
log('Message sent:', message)
```

### Error Tracking (Sentry)

```typescript
import * as Sentry from '@sentry/browser'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
})

// 에러 캡처
try {
  await chatService.chat(messages, personality)
} catch (error) {
  Sentry.captureException(error)
  throw error
}
```

---

## 다음 단계

1. ✅ Extension 문서 완성
2. ⬜ Chrome Extension 프로젝트 초기화
3. ⬜ Manifest V3 & Webpack 설정
4. ⬜ Background Service Worker 구현
5. ⬜ Popup UI (React) 구현
6. ⬜ Content Script (인라인 채팅) 구현
7. ⬜ Firebase 통합
8. ⬜ OpenAI 통합
9. ⬜ 테스트 & 디버깅
10. ⬜ Chrome Web Store 배포
