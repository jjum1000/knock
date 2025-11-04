# 최초방 구현 가이드
**작성일**: 2025-10-28
**목적**: 온보딩 완료 후 자동 생성되는 룸메이트 방 구현

---

## 📋 개요

사용자가 온보딩을 완료하면 자동으로 생성된 룸메이트와 그의 방이 메인 화면에 표시됩니다. 이 문서는 최초방 생성 및 렌더링 프로세스를 정의합니다.

---

## 🔄 전체 플로우

```
[온보딩 완료]
    ↓
┌─────────────────────────────────────┐
│ Step 1: 사용자 데이터 수집 완료     │
│ - 도메인, 키워드, 관심사            │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ Step 2: 자동 캐릭터 생성            │
│ - 욕구 벡터 분석                    │
│ - 시스템 프롬프트 생성              │
│ - 이미지 프롬프트 생성              │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ Step 3: 룸메이트 방 이미지 생성     │
│ - AI 이미지 생성 (Gemini Imagen)    │
│ - 또는 Fallback 프리셋 사용         │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ Step 4: DB 저장                     │
│ - personas 테이블                   │
│ - rooms 테이블                      │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ Step 5: 첫 인사말 생성              │
│ - 시스템 프롬프트 기반 환영 메시지  │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ Step 6: 메인 화면 렌더링            │
│ - 룸메이트 방 중앙 (0, 0) 표시      │
│ - 첫 인사말 팝업                    │
└─────────────────────────────────────┘
```

---

## Step 1: 온보딩 데이터 수집

### 온보딩 플로우 (4단계)

```typescript
// 기존 온보딩 시스템과 통합

interface OnboardingData {
  userId: string;

  // Step 1: Extension에서 자동 수집
  browsing: {
    domains: string[];        // 방문 도메인
    keywords: string[];       // 검색 키워드
    categories: string[];     // 자동 분류된 카테고리
  };

  // Step 2: 수동 입력 (선택)
  manual: {
    interests: string[];      // 관심사
    avoidTopics: string[];    // 금기 주제
  };

  // Step 3: 선호도 설정 (선택)
  preferences: {
    conversationStyle: 'casual' | 'formal' | 'mixed';
    responseLength: 'short' | 'medium' | 'long';
  };

  // Step 4: 완료
  completed: boolean;
  completedAt: Date;
}
```

### 완료 트리거

```typescript
// frontend/src/app/onboarding/complete/page.tsx

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboardingStore } from '@/stores/useOnboardingStore';

export default function OnboardingCompletePage() {
  const router = useRouter();
  const { data, markComplete } = useOnboardingStore();

  useEffect(() => {
    const completeOnboarding = async () => {
      try {
        // 1. 온보딩 데이터 서버 전송
        const response = await fetch('/api/v1/onboarding/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
          // 2. 로컬 상태 완료 표시
          markComplete();

          // 3. 생성된 룸메이트 정보 표시 후 메인으로
          setTimeout(() => {
            router.push('/');
          }, 3000);
        }

      } catch (error) {
        console.error('Onboarding completion failed:', error);
      }
    };

    completeOnboarding();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="pixel-card max-w-md p-8">
        <h1 className="pixel-text text-2xl mb-4">
          당신의 룸메이트를 만들고 있어요...
        </h1>
        <div className="loading-spinner" />
        <p className="pixel-text text-sm mt-4 text-gray-600">
          곧 만날 수 있어요!
        </p>
      </div>
    </div>
  );
}
```

---

## Step 2: 자동 캐릭터 생성

### Backend API 엔드포인트

```typescript
// backend/src/routes/onboarding.ts

import express from 'express';
import { autoGenerateRoommate } from '../services/roommateService';

const router = express.Router();

router.post('/complete', async (req, res) => {
  const { userId, browsing, manual, preferences } = req.body;

  try {
    // 1. 온보딩 데이터 저장
    await saveOnboardingData(userId, { browsing, manual, preferences });

    // 2. 자동 캐릭터 생성
    const roommate = await autoGenerateRoommate(userId, {
      domains: browsing.domains,
      keywords: browsing.keywords,
      interests: manual.interests,
      avoidTopics: manual.avoidTopics
    });

    // 3. 첫 인사말 생성
    const firstMessage = await generateFirstMessage(roommate.systemPrompt);

    return res.json({
      success: true,
      roommate: {
        id: roommate.id,
        name: roommate.name,
        keywords: roommate.keywords,
        firstMessage
      }
    });

  } catch (error) {
    console.error('Onboarding completion error:', error);
    return res.status(500).json({
      success: false,
      error: 'ONBOARDING_FAILED',
      message: error.message
    });
  }
});

export default router;
```

### 자동 생성 서비스

```typescript
// backend/src/services/roommateService.ts

import { PrismaClient } from '@prisma/client';
import {
  extractPresenceVector,
  buildCompleteVector,
  detectParadoxes,
  designComplementaryRoommate,
  assembleSystemPrompt
} from './characterGenerator';
import { generateRoomImage } from './imageGenerator';

const prisma = new PrismaClient();

interface AutoGenerateParams {
  domains: string[];
  keywords: string[];
  interests: string[];
  avoidTopics: string[];
}

export async function autoGenerateRoommate(
  userId: string,
  data: AutoGenerateParams
) {

  // 1. 중복 확인
  const existing = await prisma.personas.findFirst({
    where: { userId, personaType: 'roommate' }
  });

  if (existing) {
    throw new Error('ROOMMATE_ALREADY_EXISTS');
  }

  // 2. 욕구 벡터 분석
  const presenceVector = await extractPresenceVector(data);
  const completeVector = buildCompleteVector(presenceVector, []);
  const paradoxes = detectParadoxes(completeVector);
  const complementaryStrategy = designComplementaryRoommate(completeVector);

  // 3. 캐릭터 이름 생성 (간단한 규칙 기반)
  const name = generateKoreanName();

  // 4. 시스템 프롬프트 조립
  const systemPrompt = assembleSystemPrompt(
    name,
    completeVector,
    paradoxes,
    complementaryStrategy
  );

  // 5. 이미지 생성 (비동기)
  let imageUrl = '';
  try {
    const imageResult = await generateRoomImage(completeVector);
    imageUrl = imageResult.url;
  } catch (error) {
    console.error('Image generation failed, using fallback:', error);
    imageUrl = selectFallbackPreset(completeVector);
  }

  // 6. DB 저장
  const roommate = await prisma.personas.create({
    data: {
      userId,
      personaType: 'roommate',
      name,
      systemPrompt,
      basePrompt: systemPrompt,
      personalityTraits: extractPersonalityTraits(systemPrompt),
      interests: data.interests,
      conversationStyle: inferConversationStyle(completeVector),
      keywords: generateKeywords(completeVector),
      focusTopics: data.interests,
      avoidTopics: data.avoidTopics,

      // 분석 결과도 저장 (JSONB)
      analysisData: {
        presenceVector,
        completeVector,
        paradoxes,
        complementaryStrategy
      }
    }
  });

  // 7. 방 생성
  const room = await prisma.rooms.create({
    data: {
      userId,
      personaId: roommate.id,
      imageUrl,
      positionX: 0,  // 중앙
      positionY: 0,
      isUnlocked: true
    }
  });

  return {
    id: roommate.id,
    name,
    systemPrompt,
    keywords: roommate.keywords,
    imageUrl,
    roomId: room.id
  };
}

function generateKoreanName(): string {
  const surnames = ['김', '이', '박', '최', '정', '강', '조', '윤'];
  const names = ['민수', '서준', '하준', '도윤', '시우', '주원', '지후', '준서'];

  const surname = surnames[Math.floor(Math.random() * surnames.length)];
  const name = names[Math.floor(Math.random() * names.length)];

  return `${surname}${name}`;
}
```

---

## Step 3: 첫 인사말 생성

### LLM 기반 환영 메시지

```typescript
// backend/src/services/messageService.ts

import { callGeminiAPI } from './geminiService';

export async function generateFirstMessage(
  systemPrompt: string
): Promise<string> {

  const prompt = `
You are a roommate character with the following personality:

${systemPrompt}

The user just moved into the building and you are meeting them for the first time.
Generate a warm, natural first greeting message.

[Requirements]
- 2-3 sentences in Korean
- Friendly and welcoming tone
- Include one small detail that reflects your personality/interests
- End with a light question to start conversation
- Stay in character

[Example (DO NOT copy, create original)]
"어, 드디어 왔구나! 기다리고 있었어. 나 방금 새로운 게임 발견했는데, 너도 게임 좋아해?"

[Output]
Only return the greeting message, no explanation.
`.trim();

  try {
    const result = await callGeminiAPI(prompt, {
      temperature: 0.8,  // 더 creative
      maxTokens: 150
    });

    return result.trim();

  } catch (error) {
    console.error('Failed to generate first message:', error);

    // Fallback 기본 인사
    return '안녕! 드디어 만났네. 잘 부탁해!';
  }
}
```

---

## Step 4: 메인 화면 렌더링

### 방 목록 조회 API

```typescript
// backend/src/routes/room.ts

router.get('/my-rooms', authMiddleware, async (req, res) => {
  const userId = req.userId;

  const rooms = await prisma.rooms.findMany({
    where: { userId },
    include: {
      persona: {
        select: {
          id: true,
          name: true,
          personaType: true,
          keywords: true
        }
      }
    },
    orderBy: {
      createdAt: 'asc'  // 룸메이트 방이 첫 번째
    }
  });

  return res.json({
    success: true,
    rooms: rooms.map(room => ({
      id: room.id,
      position: { x: room.positionX, y: room.positionY },
      imageUrl: room.imageUrl,
      isUnlocked: room.isUnlocked,
      persona: room.persona
    }))
  });
});
```

### Frontend 메인 화면

```typescript
// frontend/src/app/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import RoomGrid from '@/components/RoomGrid';
import FirstMessageModal from '@/components/FirstMessageModal';

interface Room {
  id: string;
  position: { x: number; y: number };
  imageUrl: string;
  isUnlocked: boolean;
  persona: {
    id: string;
    name: string;
    personaType: string;
    keywords: string[];
  };
}

export default function MainPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [firstMessage, setFirstMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    try {
      const res = await fetch('/api/v1/rooms/my-rooms', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await res.json();

      if (data.success) {
        setRooms(data.rooms);

        // 룸메이트 방이 처음 생성되었으면 첫 인사말 표시
        const roommateRoom = data.rooms.find(
          r => r.persona.personaType === 'roommate'
        );

        if (roommateRoom && isNewUser()) {
          // 첫 인사말 가져오기
          const msg = await fetchFirstMessage(roommateRoom.persona.id);
          setFirstMessage(msg);
        }
      }

    } catch (error) {
      console.error('Failed to load rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFirstMessage = async (personaId: string): Promise<string> => {
    try {
      const res = await fetch(`/api/v1/chat/first-message/${personaId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await res.json();
      return data.message || '안녕! 잘 부탁해!';

    } catch (error) {
      return '안녕! 만나서 반가워!';
    }
  };

  const isNewUser = (): boolean => {
    // 로컬 스토리지에서 체크 (간단한 방법)
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
    if (!hasSeenWelcome) {
      localStorage.setItem('hasSeenWelcome', 'true');
      return true;
    }
    return false;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* 메인 빌딩 뷰 */}
      <RoomGrid rooms={rooms} />

      {/* 첫 인사말 모달 */}
      {firstMessage && (
        <FirstMessageModal
          message={firstMessage}
          roommateName={rooms.find(r => r.persona.personaType === 'roommate')?.persona.name || '룸메이트'}
          onClose={() => setFirstMessage(null)}
        />
      )}
    </div>
  );
}
```

### 방 그리드 컴포넌트

```typescript
// frontend/src/components/RoomGrid.tsx

'use client';

import Image from 'next/image';

interface Room {
  id: string;
  position: { x: number; y: number };
  imageUrl: string;
  isUnlocked: boolean;
  persona: {
    id: string;
    name: string;
    keywords: string[];
  };
}

interface RoomGridProps {
  rooms: Room[];
}

export default function RoomGrid({ rooms }: RoomGridProps) {
  const handleRoomClick = (room: Room) => {
    if (!room.isUnlocked) {
      // 잠긴 방 클릭 시 노크 시스템
      alert('이 방은 아직 잠겨 있어요. 노크를 보내보세요!');
      return;
    }

    // 대화 시작
    window.location.href = `/chat/${room.persona.id}`;
  };

  // 중앙 좌표 계산 (룸메이트 방 기준)
  const roommateRoom = rooms.find(r => r.persona.personaType === 'roommate');
  const centerX = roommateRoom?.position.x || 0;
  const centerY = roommateRoom?.position.y || 0;

  return (
    <div className="relative w-full h-screen overflow-auto">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative" style={{ width: '800px', height: '600px' }}>
          {rooms.map(room => {
            const offsetX = (room.position.x - centerX) * 280;
            const offsetY = (room.position.y - centerY) * 280;

            return (
              <div
                key={room.id}
                className="absolute cursor-pointer transition-transform hover:scale-105"
                style={{
                  left: `${400 + offsetX}px`,
                  top: `${300 + offsetY}px`,
                  width: '256px',
                  height: '512px'
                }}
                onClick={() => handleRoomClick(room)}
              >
                {/* 방 이미지 */}
                <div className="relative w-full h-full border-4 border-yellow-400 rounded-lg overflow-hidden">
                  <Image
                    src={room.imageUrl}
                    alt={`${room.persona.name}'s room`}
                    fill
                    className="object-cover pixel-art"
                  />

                  {/* 잠금 오버레이 */}
                  {!room.isUnlocked && (
                    <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center">
                      <div className="text-6xl">🔒</div>
                    </div>
                  )}
                </div>

                {/* 방 정보 */}
                <div className="mt-2 text-center">
                  <div className="pixel-text text-lg font-bold">
                    {room.persona.name}
                  </div>
                  <div className="flex justify-center gap-1 mt-1 flex-wrap">
                    {room.persona.keywords.slice(0, 3).map(keyword => (
                      <span
                        key={keyword}
                        className="pixel-text text-xs px-2 py-1 bg-blue-600 rounded"
                      >
                        #{keyword}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

### 첫 인사말 모달

```typescript
// frontend/src/components/FirstMessageModal.tsx

'use client';

interface FirstMessageModalProps {
  message: string;
  roommateName: string;
  onClose: () => void;
}

export default function FirstMessageModal({
  message,
  roommateName,
  onClose
}: FirstMessageModalProps) {

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
      <div className="pixel-card max-w-md p-8 animate-fade-in">
        <h2 className="pixel-text text-2xl mb-4 text-yellow-400">
          {roommateName}님이 인사를 건넸어요!
        </h2>

        <div className="pixel-speech-bubble p-4 mb-6">
          <p className="pixel-text text-lg">
            {message}
          </p>
        </div>

        <button
          onClick={onClose}
          className="pixel-button w-full"
        >
          대화 시작하기
        </button>
      </div>
    </div>
  );
}
```

---

## 🎨 픽셀아트 스타일 CSS

### 글로벌 스타일

```css
/* frontend/src/app/globals.css */

/* 픽셀아트 이미지 렌더링 */
.pixel-art {
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
}

/* 말풍선 */
.pixel-speech-bubble {
  position: relative;
  background: #2d3748;
  border: 4px solid #4a5568;
  border-radius: 8px;
}

.pixel-speech-bubble::before {
  content: '';
  position: absolute;
  bottom: -20px;
  left: 20px;
  width: 0;
  height: 0;
  border-left: 20px solid transparent;
  border-right: 0 solid transparent;
  border-top: 20px solid #4a5568;
}

/* 페이드인 애니메이션 */
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fade-in 0.3s ease-out;
}

/* 픽셀 버튼 */
.pixel-button {
  font-family: 'Press Start 2P', cursive;
  font-size: 14px;
  padding: 12px 24px;
  background: #ecc94b;
  border: 4px solid #000;
  color: #000;
  cursor: pointer;
  transition: transform 0.1s;
}

.pixel-button:hover {
  transform: scale(1.05);
}

.pixel-button:active {
  transform: scale(0.95);
}

/* 픽셀 카드 */
.pixel-card {
  background: #1a202c;
  border: 4px solid #2d3748;
  border-radius: 8px;
  box-shadow: 8px 8px 0 rgba(0, 0, 0, 0.5);
}

/* 픽셀 텍스트 */
.pixel-text {
  font-family: 'Press Start 2P', cursive;
  line-height: 1.6;
}
```

---

## 🔧 환경 변수

```env
# backend/.env

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/knock

# Gemini API
GEMINI_API_KEY=your_gemini_api_key_here

# Image Storage
CDN_BASE_URL=https://cdn.knock.com
CDN_UPLOAD_PATH=/rooms

# Feature Flags
AUTO_GENERATE_ROOMMATE=true
USE_AI_IMAGE_GENERATION=true  # false면 항상 프리셋 사용
```

---

## 📊 성능 최적화

### 이미지 로딩

```typescript
// 프리로딩으로 첫 화면 빠르게 표시

const preloadImages = async (imageUrls: string[]) => {
  const promises = imageUrls.map(url => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });
  });

  await Promise.all(promises);
};
```

### 백그라운드 생성

```typescript
// 이미지 생성이 오래 걸리면 백그라운드에서 처리

router.post('/complete', async (req, res) => {
  const { userId, browsing, manual, preferences } = req.body;

  // 즉시 응답 (프리셋 이미지 사용)
  const roommate = await autoGenerateRoommate(userId, {
    ...data,
    usePreset: true  // 일단 프리셋으로
  });

  res.json({
    success: true,
    roommate: {
      id: roommate.id,
      firstMessage: await generateFirstMessage(roommate.systemPrompt)
    }
  });

  // 백그라운드에서 AI 이미지 생성
  generateRoomImageBackground(roommate.id, roommate.completeVector)
    .then(imageUrl => {
      // 생성 완료 후 업데이트
      updateRoommateImage(roommate.id, imageUrl);

      // 사용자에게 알림 (WebSocket 또는 다음 접속 시)
      notifyImageReady(userId, roommate.id);
    })
    .catch(error => {
      console.error('Background image generation failed:', error);
      // 프리셋 그대로 유지
    });
});
```

---

## ✅ 테스트 시나리오

### 1. 정상 플로우
```
1. 온보딩 완료
2. 자동 캐릭터 생성 (5초 이내)
3. 이미지 생성 (10초 이내 또는 Fallback)
4. DB 저장 확인
5. 메인 화면 렌더링
6. 첫 인사말 모달 표시
7. 대화 시작
```

### 2. 예외 처리
```
- 이미지 생성 실패 → 프리셋 사용
- 첫 인사말 생성 실패 → 기본 메시지
- 중복 룸메이트 생성 시도 → 기존 룸메이트 반환
```

### 3. 성능 테스트
```
- 100명 동시 온보딩 완료 처리
- 이미지 생성 병목 확인 (queue 시스템 필요성)
- 메인 화면 로딩 속도 (2초 이내 목표)
```

---

## 📝 다음 단계

1. ✅ 이 문서 완성
2. → [05_API_SPECIFICATIONS.md](./05_API_SPECIFICATIONS.md) 참조
3. 온보딩 완료 API 구현
4. 자동 캐릭터 생성 서비스 구현
5. 메인 화면 UI 구현
6. 첫 인사말 시스템 구현

---

**참조 문서**:
- [feature-spec.md](../01_Feature/02_Roommate/feature-spec.md)
- [tech-spec.md](../01_Feature/02_Roommate/tech-spec.md)
- [02_CHARACTER_GENERATOR_FLOW.md](./02_CHARACTER_GENERATOR_FLOW.md)
- [03_IMAGE_GENERATION_SYSTEM.md](./03_IMAGE_GENERATION_SYSTEM.md)
