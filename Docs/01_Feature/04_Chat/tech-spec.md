# 대화 시스템 - 기술 명세서

## 1. 시스템 아키텍처

```
[클라이언트 (WebSocket / HTTP)]
    ↓
[API Gateway]
    ↓
[채팅 서비스]
    ↓
    ├─ [세션 관리 모듈] ← Redis
    ├─ [메시지 처리 모듈]
    ├─ [LLM 통합 모듈] ← Gemini API
    └─ [메모리 모듈] ← PostgreSQL (선택)
```

### 모듈별 역할

**세션 관리 모듈**:
- 채팅 세션 생성/조회/종료
- Redis 기반 임시 저장 (TTL: 1시간)
- 세션 히스토리 관리

**메시지 처리 모듈**:
- 메시지 검증 (빈 메시지, 길이 제한)
- 메시지 포맷팅
- 타임스탬프 생성

**LLM 통합 모듈**:
- Gemini API 호출
- 시스템 프롬프트 + 컨텍스트 조합
- 재시도 및 Fallback 처리

**메모리 모듈 (선택)**:
- 대화 요약 생성
- 영구 메모리 저장 (PostgreSQL)
- 과거 대화 컨텍스트 조회

---

## 2. 기술 스택

### 2.1 백엔드
- **런타임**: Node.js 20 LTS
- **프레임워크**: Express.js (HTTP) / Socket.IO (WebSocket, 선택)
- **언어**: TypeScript 5.3
- **ORM**: Prisma 5

### 2.2 데이터베이스
- **세션 저장**: Redis 7 (임시)
- **메모리 저장**: PostgreSQL 15 (영구, 선택)

### 2.3 외부 API
- **LLM**: Google Gemini 1.5 Pro API

### 2.4 프론트엔드
- **프레임워크**: React / Next.js
- **상태 관리**: Zustand
- **WebSocket**: Socket.IO Client (선택)

---

## 3. 데이터베이스 스키마

### 3.1 Redis 세션 구조
```typescript
// Key: chat_session:{sessionId}
// TTL: 3600 (1시간)
// Value (JSON):
{
  "sessionId": "uuid",
  "userId": "uuid",
  "personaId": "uuid",
  "messages": [
    {
      "id": "msg_1",
      "sender": "user" | "ai",
      "content": "string",
      "timestamp": "ISO-8601"
    }
  ],
  "createdAt": "ISO-8601",
  "lastActivityAt": "ISO-8601"
}
```

### 3.2 conversation_memories 테이블 (선택 - 영구 메모리)
```sql
CREATE TABLE conversation_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  persona_id UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,

  -- 요약 내용
  summary TEXT NOT NULL,
  keywords TEXT[],
  emotion VARCHAR(50), -- positive, neutral, negative

  -- 메타데이터
  conversation_date DATE NOT NULL,
  message_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_memories_user_persona ON conversation_memories(user_id, persona_id);
CREATE INDEX idx_memories_date ON conversation_memories(conversation_date DESC);
```

### 3.3 async_knocks 테이블 (선택 - 비동기 노크)
```sql
CREATE TABLE async_knocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  persona_id UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,

  -- 메시지 내용
  message TEXT NOT NULL,

  -- 상태
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_async_knocks_user ON async_knocks(user_id, is_read);
CREATE INDEX idx_async_knocks_created ON async_knocks(created_at DESC);
```

---

## 4. API 명세

### 4.1 채팅 세션 생성
```typescript
POST /api/v1/chat/session

Headers:
{
  "Authorization": "Bearer {token}",
  "Content-Type": "application/json"
}

Request:
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "personaId": "660e8400-e29b-41d4-a716-446655440000"
}

Response:
{
  "success": true,
  "sessionId": "770e8400-e29b-41d4-a716-446655440000",
  "persona": {
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "name": "룸메이트",
    "keywords": ["게임매니아", "영화평론가"],
    "relationshipLevel": "friend" // stranger, acquaintance, friend, close_friend
  },
  "initialMessage": "어, 왔어? 오늘 하루 어땠어?",
  "previousContext": "지난번에 새로운 게임 이야기했었지?" // 유료 - 영구 메모리
}
```

### 4.2 메시지 전송
```typescript
POST /api/v1/chat/message

Headers:
{
  "Authorization": "Bearer {token}",
  "Content-Type": "application/json"
}

Request:
{
  "sessionId": "770e8400-e29b-41d4-a716-446655440000",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "personaId": "660e8400-e29b-41d4-a716-446655440000",
  "message": "안녕! 잘 지냈어?"
}

Response:
{
  "success": true,
  "userMessage": {
    "id": "880e8400-e29b-41d4-a716-446655440000",
    "content": "안녕! 잘 지냈어?",
    "sender": "user",
    "timestamp": "2025-10-27T12:01:00Z"
  },
  "aiResponse": {
    "id": "990e8400-e29b-41d4-a716-446655440000",
    "content": "오 반가워! 요즘 뭐하고 지내? 나는 새로운 게임 발견했는데 진짜 재밌더라!",
    "sender": "ai",
    "timestamp": "2025-10-27T12:01:03Z"
  }
}

Error (LLM 실패):
{
  "success": false,
  "error": "LLM_ERROR",
  "message": "AI 응답 생성에 실패했습니다",
  "fallbackResponse": {
    "id": "uuid",
    "content": "앗, 잠깐 생각이 안 나네. 다시 말해줄래?",
    "sender": "ai",
    "timestamp": "2025-10-27T12:01:03Z"
  }
}

Error (빈 메시지):
{
  "success": false,
  "error": "EMPTY_MESSAGE",
  "message": "메시지를 입력해주세요"
}
```

### 4.3 세션 히스토리 조회
```typescript
GET /api/v1/chat/session/:sessionId/history

Headers:
{
  "Authorization": "Bearer {token}"
}

Response:
{
  "success": true,
  "sessionId": "770e8400-e29b-41d4-a716-446655440000",
  "messages": [
    {
      "id": "uuid",
      "sender": "ai",
      "content": "어, 왔어? 오늘 하루 어땠어?",
      "timestamp": "2025-10-27T12:00:00Z"
    },
    {
      "id": "uuid",
      "sender": "user",
      "content": "안녕! 잘 지냈어?",
      "timestamp": "2025-10-27T12:01:00Z"
    }
  ],
  "total": 10,
  "createdAt": "2025-10-27T12:00:00Z"
}
```

### 4.4 세션 종료
```typescript
DELETE /api/v1/chat/session/:sessionId

Headers:
{
  "Authorization": "Bearer {token}"
}

Response:
{
  "success": true,
  "message": "세션이 종료되었습니다",
  "summary": "사용자가 최근 새로운 게임을 시작했다고 이야기했다." // 유료 - 영구 메모리
}
```

### 4.5 비동기 노크 조회 (선택)
```typescript
GET /api/v1/chat/async-knocks?unreadOnly=true

Headers:
{
  "Authorization": "Bearer {token}"
}

Response:
{
  "success": true,
  "knocks": [
    {
      "id": "uuid",
      "personaId": "uuid",
      "personaName": "룸메이트",
      "message": "요즘 어떻게 지내? 오랜만이다!",
      "isRead": false,
      "createdAt": "2025-10-26T18:00:00Z"
    }
  ],
  "total": 1
}
```

---

## 5. 핵심 로직 구현

### 5.1 채팅 세션 생성
```typescript
import { PrismaClient } from "@prisma/client";
import Redis from "ioredis";
import { v4 as uuidv4 } from "uuid";

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL!);

const SESSION_TTL = 3600; // 1시간

interface ChatSession {
  sessionId: string;
  userId: string;
  personaId: string;
  messages: Message[];
  createdAt: string;
  lastActivityAt: string;
}

interface Message {
  id: string;
  sender: "user" | "ai";
  content: string;
  timestamp: string;
}

async function createChatSession(
  userId: string,
  personaId: string
): Promise<{
  sessionId: string;
  persona: any;
  initialMessage: string;
  previousContext?: string;
}> {
  // 1. 페르소나 조회
  const persona = await prisma.personas.findUnique({
    where: { id: personaId },
  });

  if (!persona || persona.userId !== userId) {
    throw new Error("PERSONA_NOT_FOUND");
  }

  // 2. 세션 ID 생성
  const sessionId = uuidv4();

  // 3. 초기 메시지 생성 (첫 인사)
  const initialMessage = await generateInitialMessage(persona.systemPrompt);

  // 4. 세션 초기화
  const session: ChatSession = {
    sessionId,
    userId,
    personaId,
    messages: [
      {
        id: uuidv4(),
        sender: "ai",
        content: initialMessage,
        timestamp: new Date().toISOString(),
      },
    ],
    createdAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
  };

  // 5. Redis 저장
  await redis.setex(
    `chat_session:${sessionId}`,
    SESSION_TTL,
    JSON.stringify(session)
  );

  // 6. 과거 대화 컨텍스트 조회 (유료 기능)
  const previousContext = await getPreviousContext(userId, personaId);

  return {
    sessionId,
    persona: {
      id: persona.id,
      name: persona.personaType === "roommate" ? "룸메이트" : "이웃",
      keywords: persona.keywords,
      relationshipLevel: persona.relationshipLevel || "stranger",
    },
    initialMessage,
    previousContext,
  };
}

async function generateInitialMessage(systemPrompt: string): Promise<string> {
  // LLM 호출 (간단한 첫 인사)
  const prompt = `
${systemPrompt}

사용자가 방금 대화를 시작했습니다. 자연스럽게 첫 인사를 건네주세요.

[조건]
- 1-2문장
- 친근하고 편안한 느낌
- 가벼운 질문 1개 포함
`.trim();

  // ... Gemini API 호출 (tech-spec 5.3 참조)
  return "어, 왔어? 오늘 하루 어땠어?";
}

async function getPreviousContext(
  userId: string,
  personaId: string
): Promise<string | undefined> {
  // 유료 기능: 최근 5개 메모리 조회
  const memories = await prisma.conversationMemories.findMany({
    where: { userId, personaId },
    orderBy: { conversationDate: "desc" },
    take: 5,
  });

  if (memories.length === 0) return undefined;

  return `[과거 대화 요약]\n${memories.map((m) => `- ${m.summary}`).join("\n")}`;
}
```

### 5.2 메시지 전송 및 LLM 응답
```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

async function sendMessage(
  sessionId: string,
  userId: string,
  personaId: string,
  userMessage: string
): Promise<{
  userMessage: Message;
  aiResponse: Message;
}> {
  // 1. 메시지 검증
  if (!userMessage.trim()) {
    throw new Error("EMPTY_MESSAGE");
  }

  if (userMessage.length > 500) {
    throw new Error("MESSAGE_TOO_LONG");
  }

  // 2. 세션 조회
  const sessionKey = `chat_session:${sessionId}`;
  const sessionData = await redis.get(sessionKey);

  if (!sessionData) {
    throw new Error("SESSION_NOT_FOUND");
  }

  const session: ChatSession = JSON.parse(sessionData);

  // 3. 사용자 메시지 추가
  const userMsg: Message = {
    id: uuidv4(),
    sender: "user",
    content: userMessage,
    timestamp: new Date().toISOString(),
  };

  session.messages.push(userMsg);

  // 4. LLM 응답 생성
  const aiResponseContent = await generateAIResponse(
    personaId,
    session.messages
  );

  const aiMsg: Message = {
    id: uuidv4(),
    sender: "ai",
    content: aiResponseContent,
    timestamp: new Date().toISOString(),
  };

  session.messages.push(aiMsg);

  // 5. 세션 업데이트 (최근 20개 메시지만 유지)
  if (session.messages.length > 20) {
    session.messages = session.messages.slice(-20);
  }

  session.lastActivityAt = new Date().toISOString();

  await redis.setex(sessionKey, SESSION_TTL, JSON.stringify(session));

  // 6. 페르소나 상호작용 횟수 업데이트
  await prisma.personas.update({
    where: { id: personaId },
    data: {
      interactionCount: { increment: 1 },
      lastInteractionAt: new Date(),
    },
  });

  return {
    userMessage: userMsg,
    aiResponse: aiMsg,
  };
}

async function generateAIResponse(
  personaId: string,
  sessionMessages: Message[]
): Promise<string> {
  // 1. 페르소나 시스템 프롬프트 조회
  const persona = await prisma.personas.findUnique({
    where: { id: personaId },
  });

  if (!persona) {
    throw new Error("PERSONA_NOT_FOUND");
  }

  // 2. 대화 히스토리 포맷팅 (최근 10개)
  const recentMessages = sessionMessages.slice(-10);
  const history = recentMessages.map((m) => ({
    role: m.sender === "user" ? "user" : "model",
    parts: [{ text: m.content }],
  }));

  // 3. Gemini API 호출
  const messages = [
    { role: "user", parts: [{ text: persona.systemPrompt }] },
    { role: "model", parts: [{ text: "알겠습니다." }] },
    ...history,
  ];

  try {
    const result = await model.generateContent({
      contents: messages,
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 256,
        topK: 40,
        topP: 0.95,
      },
    });

    return result.response.text().trim();
  } catch (error) {
    console.error("LLM error:", error);

    // Fallback 응답
    return selectFallbackResponse();
  }
}

function selectFallbackResponse(): string {
  const fallbacks = [
    "앗, 잠깐 생각이 안 나네. 다시 말해줄래?",
    "미안, 지금 좀 멍했어. 다시 한 번?",
    "어? 잠깐만, 무슨 말이었지?",
  ];

  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}
```

### 5.3 세션 종료 및 메모리 저장 (유료)
```typescript
async function endChatSession(
  sessionId: string,
  userId: string
): Promise<{ summary?: string }> {
  // 1. 세션 조회
  const sessionKey = `chat_session:${sessionId}`;
  const sessionData = await redis.get(sessionKey);

  if (!sessionData) {
    return {};
  }

  const session: ChatSession = JSON.parse(sessionData);

  // 2. 유료 사용자 확인
  const user = await prisma.users.findUnique({ where: { id: userId } });

  let summary: string | undefined;

  if (user?.isPremium && session.messages.length >= 5) {
    // 3. 대화 요약 생성 (LLM)
    summary = await summarizeConversation(session.messages);

    // 4. DB 저장
    await prisma.conversationMemories.create({
      data: {
        userId: session.userId,
        personaId: session.personaId,
        summary,
        keywords: extractKeywords(session.messages),
        emotion: analyzeEmotion(summary),
        conversationDate: new Date(),
        messageCount: session.messages.length,
      },
    });
  }

  // 5. Redis 세션 삭제
  await redis.del(sessionKey);

  return { summary };
}

async function summarizeConversation(messages: Message[]): Promise<string> {
  const conversation = messages
    .map((m) => `${m.sender === "user" ? "User" : "AI"}: ${m.content}`)
    .join("\n");

  const prompt = `
다음 대화를 1-2문장으로 요약하세요. 중요한 사실과 감정을 중심으로.

[대화 내용]
${conversation}

[출력 형식]
간결한 1-2문장 요약
`.trim();

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  return result.response.text().trim();
}

function extractKeywords(messages: Message[]): string[] {
  // 간단한 키워드 추출 (또는 LLM 활용)
  const text = messages.map((m) => m.content).join(" ");
  // ... 키워드 추출 로직
  return ["게임", "영화", "취미"];
}

function analyzeEmotion(summary: string): string {
  // 간단한 감정 분석 (또는 LLM 활용)
  if (summary.includes("좋아") || summary.includes("재밌")) {
    return "positive";
  } else if (summary.includes("힘들") || summary.includes("슬프")) {
    return "negative";
  }
  return "neutral";
}
```

---

## 6. WebSocket 통합 (선택)

### 6.1 Socket.IO 설정
```typescript
import { Server } from "socket.io";
import http from "http";

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // 채팅 세션 참여
  socket.on("join_session", async (sessionId: string) => {
    socket.join(sessionId);
    console.log(`Socket ${socket.id} joined session ${sessionId}`);
  });

  // 메시지 전송
  socket.on("send_message", async (data: {
    sessionId: string;
    userId: string;
    personaId: string;
    message: string;
  }) => {
    try {
      // 타이핑 인디케이터 전송
      io.to(data.sessionId).emit("typing", { sender: "ai" });

      const result = await sendMessage(
        data.sessionId,
        data.userId,
        data.personaId,
        data.message
      );

      // 타이핑 인디케이터 중지
      io.to(data.sessionId).emit("typing_stop");

      // AI 응답 전송
      io.to(data.sessionId).emit("ai_response", result.aiResponse);
    } catch (error) {
      socket.emit("error", { message: error.message });
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

httpServer.listen(3000);
```

### 6.2 클라이언트 (React)
```typescript
import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

function ChatModal({ sessionId, personaId }: Props) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    const newSocket = io("http://localhost:3000");
    setSocket(newSocket);

    newSocket.emit("join_session", sessionId);

    newSocket.on("ai_response", (message: Message) => {
      setMessages((prev) => [...prev, message]);
    });

    newSocket.on("typing", () => setIsTyping(true));
    newSocket.on("typing_stop", () => setIsTyping(false));

    return () => {
      newSocket.disconnect();
    };
  }, [sessionId]);

  const sendMessage = (content: string) => {
    const userMessage: Message = {
      id: uuidv4(),
      sender: "user",
      content,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);

    socket?.emit("send_message", {
      sessionId,
      userId: currentUser.id,
      personaId,
      message: content,
    });
  };

  return (
    <div className="chat-modal">
      <div className="chat-messages">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isTyping && <TypingIndicator />}
      </div>
      <ChatInput onSend={sendMessage} />
    </div>
  );
}
```

---

## 7. 성능 최적화

### 7.1 Redis 캐싱
```typescript
// 페르소나 시스템 프롬프트 캐싱 (자주 조회됨)
async function getPersonaSystemPrompt(personaId: string): Promise<string> {
  const cacheKey = `persona_prompt:${personaId}`;
  const cached = await redis.get(cacheKey);

  if (cached) {
    return cached;
  }

  const persona = await prisma.personas.findUnique({
    where: { id: personaId },
    select: { systemPrompt: true },
  });

  if (!persona) {
    throw new Error("PERSONA_NOT_FOUND");
  }

  await redis.setex(cacheKey, 3600, persona.systemPrompt);

  return persona.systemPrompt;
}
```

### 7.2 LLM 응답 타임아웃
```typescript
async function generateAIResponseWithTimeout(
  personaId: string,
  sessionMessages: Message[]
): Promise<string> {
  const TIMEOUT = 5000; // 5초

  const timeoutPromise = new Promise<string>((_, reject) =>
    setTimeout(() => reject(new Error("LLM_TIMEOUT")), TIMEOUT)
  );

  const responsePromise = generateAIResponse(personaId, sessionMessages);

  try {
    return await Promise.race([responsePromise, timeoutPromise]);
  } catch (error) {
    console.error("LLM timeout or error:", error);
    return selectFallbackResponse();
  }
}
```

---

## 8. 보안

### 8.1 세션 소유권 검증
```typescript
async function verifySessionOwnership(
  sessionId: string,
  userId: string
): Promise<boolean> {
  const sessionKey = `chat_session:${sessionId}`;
  const sessionData = await redis.get(sessionKey);

  if (!sessionData) {
    return false;
  }

  const session: ChatSession = JSON.parse(sessionData);

  return session.userId === userId;
}

// Express 미들웨어
async function sessionOwnershipMiddleware(req, res, next) {
  const { sessionId } = req.params;
  const userId = req.userId; // authMiddleware에서 설정

  const isOwner = await verifySessionOwnership(sessionId, userId);

  if (!isOwner) {
    return res.status(403).json({
      success: false,
      error: "FORBIDDEN",
      message: "이 세션에 대한 권한이 없습니다",
    });
  }

  next();
}
```

### 8.2 메시지 검증
```typescript
function validateMessage(message: string): void {
  if (!message.trim()) {
    throw new Error("EMPTY_MESSAGE");
  }

  if (message.length > 500) {
    throw new Error("MESSAGE_TOO_LONG");
  }

  // XSS 방지 (HTML 태그 제거)
  const sanitized = message.replace(/<[^>]*>/g, "");

  if (sanitized !== message) {
    throw new Error("INVALID_MESSAGE_FORMAT");
  }
}
```

---

## 9. 모니터링 및 로깅

### 9.1 이벤트 로깅
```typescript
enum ChatEvent {
  SESSION_CREATED = "chat_session_created",
  MESSAGE_SENT = "chat_message_sent",
  AI_RESPONSE_GENERATED = "chat_ai_response_generated",
  SESSION_ENDED = "chat_session_ended",
  LLM_ERROR = "chat_llm_error",
}

function logChatEvent(event: ChatEvent, userId: string, metadata?: any) {
  console.log(
    JSON.stringify({
      event,
      userId,
      timestamp: new Date().toISOString(),
      metadata,
    })
  );

  analytics.track(userId, event, metadata);
}
```

### 9.2 메트릭 수집
```typescript
import client from "prom-client";

const chatSessionCounter = new client.Counter({
  name: "knock_chat_sessions_total",
  help: "Total number of chat sessions created",
  labelNames: ["persona_type"], // roommate, neighbor
});

const llmResponseDuration = new client.Histogram({
  name: "knock_llm_response_duration_seconds",
  help: "LLM response generation duration",
  buckets: [0.5, 1, 2, 3, 5, 10],
});

// 사용
const timer = llmResponseDuration.startTimer();
const response = await generateAIResponse(personaId, messages);
timer();

chatSessionCounter.inc({ persona_type: "roommate" });
```

---

## 10. 테스트

### 10.1 단위 테스트
```typescript
describe("sendMessage", () => {
  it("should send user message and get AI response", async () => {
    const sessionId = await createTestSession();

    const result = await sendMessage(
      sessionId,
      "user_123",
      "persona_456",
      "안녕!"
    );

    expect(result.userMessage.content).toBe("안녕!");
    expect(result.aiResponse.content).toBeDefined();
    expect(result.aiResponse.sender).toBe("ai");
  });

  it("should throw error for empty message", async () => {
    await expect(
      sendMessage("session_123", "user_123", "persona_456", "")
    ).rejects.toThrow("EMPTY_MESSAGE");
  });
});
```

### 10.2 통합 테스트
```typescript
describe("POST /api/v1/chat/message", () => {
  it("should send message and receive AI response", async () => {
    const session = await createTestSession();

    const response = await request(app)
      .post("/api/v1/chat/message")
      .set("Authorization", `Bearer ${testToken}`)
      .send({
        sessionId: session.id,
        userId: testUser.id,
        personaId: testPersona.id,
        message: "안녕!",
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.aiResponse.content).toBeDefined();
  });
});
```

---

## 11. 환경 변수

```env
# Database
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgresql://user:password@localhost:5432/knock

# LLM
GEMINI_API_KEY=your_gemini_api_key

# Security
JWT_SECRET=your_jwt_secret

# App
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://knock.com

# Monitoring
SENTRY_DSN=https://xxx@sentry.io/xxx
```
