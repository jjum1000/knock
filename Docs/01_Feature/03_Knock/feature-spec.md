# 노크 시스템 - 기능 명세서

## 1. 기본 명세 (MVP)

### 1.1 노크 제한 관리

#### 1.1.1 1일 1회 제한
**목적**: 희소성 확보 및 재방문 유도

**제한 규칙**:
- 무료 사용자: 1일 1회
- 유료 사용자 (Knock Plus): 무제한 또는 일일 3회
- 매일 00시(서버 시간 기준) 자동 초기화

**데이터베이스 스키마**:
```sql
CREATE TABLE knock_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  daily_limit INT NOT NULL DEFAULT 1, -- 무료: 1, 유료: 999
  used_today INT NOT NULL DEFAULT 0,
  last_knock_at TIMESTAMP,
  last_reset_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_knock_limits_user_id ON knock_limits(user_id);
```

**API 명세**:
```typescript
GET /api/v1/knock/limit
Response:
{
  "success": true,
  "limit": {
    "dailyLimit": 1, // 무료: 1, 유료: 999
    "usedToday": 0,
    "remaining": 1,
    "nextResetAt": "2025-10-28T00:00:00Z"
  }
}
```

#### 1.1.2 자정 초기화
**구현**: Cron Job (매일 00시 실행)

```typescript
// 매일 00시 실행
cron.schedule('0 0 * * *', async () => {
  await prisma.knockLimits.updateMany({
    data: {
      usedToday: 0,
      lastResetAt: new Date()
    }
  });

  console.log('Knock limits reset at midnight');
});
```

**대안**: 실시간 검증 (Cron Job 불필요)
```typescript
function shouldResetLimit(lastResetAt: Date): boolean {
  const now = new Date();
  const lastReset = new Date(lastResetAt);

  // 날짜가 바뀌었는지 확인 (00시 이후)
  return now.toDateString() !== lastReset.toDateString();
}

async function checkKnockLimit(userId: string): Promise<boolean> {
  const limit = await prisma.knockLimits.findUnique({
    where: { userId }
  });

  if (!limit) return false;

  // 자동 초기화 체크
  if (shouldResetLimit(limit.lastResetAt)) {
    await prisma.knockLimits.update({
      where: { userId },
      data: {
        usedToday: 0,
        lastResetAt: new Date()
      }
    });
    return true;
  }

  return limit.usedToday < limit.dailyLimit;
}
```

---

### 1.2 이웃 노크 실행

#### 1.2.1 노크 프로세스
**플로우**:
```
[노크 버튼 클릭]
    ↓
[노크 가능 여부 확인]
    ↓
    ├─ [가능] → [새로운 이웃 생성]
    │             ↓
    │          [방 위치 결정]
    │             ↓
    │          [콘텐츠 다양성 분석]
    │             ↓
    │          [LLM으로 이웃 페르소나 생성]
    │             ↓
    │          [방 이미지 할당]
    │             ↓
    │          [블랙아웃 해제 애니메이션]
    │             ↓
    │          [이웃 소개 화면]
    │
    └─ [불가능] → [제한 안내 화면]
                    ↓
                 [유료 안내 또는 대기]
```

**API 명세**:
```typescript
POST /api/v1/knock/execute
Request:
{
  "userId": "string"
}

Response (Success):
{
  "success": true,
  "neighbor": {
    "id": "uuid",
    "keywords": ["여행러버", "철학덕후"],
    "personalityTraits": ["사색적", "모험적"],
    "interests": ["여행", "철학", "독서"],
    "conversationStyle": "string",
    "firstMessage": "안녕! 처음 보는 얼굴인데, 혹시 새로 이사왔어?"
  },
  "room": {
    "id": "uuid",
    "imageUrl": "https://cdn.knock.com/rooms/neighbor-1.png",
    "position": { "x": 1, "y": 0 }
  },
  "limit": {
    "usedToday": 1,
    "remaining": 0,
    "nextResetAt": "2025-10-28T00:00:00Z"
  }
}

Response (Error - 제한 초과):
{
  "success": false,
  "error": "KNOCK_LIMIT_EXCEEDED",
  "message": "오늘의 노크를 모두 사용했습니다",
  "limit": {
    "usedToday": 1,
    "remaining": 0,
    "nextResetAt": "2025-10-28T00:00:00Z"
  },
  "upgradeUrl": "https://knock.com/pricing"
}
```

#### 1.2.2 방 위치 결정 알고리즘
**목적**: 기존 방에 인접한 위치에 새 방 생성

**알고리즘**:
```typescript
interface Position {
  x: number;
  y: number;
}

function getAdjacentPositions(position: Position): Position[] {
  return [
    { x: position.x + 1, y: position.y }, // 우
    { x: position.x - 1, y: position.y }, // 좌
    { x: position.x, y: position.y + 1 }, // 하
    { x: position.x, y: position.y - 1 }, // 상
  ];
}

async function findNextRoomPosition(userId: string): Promise<Position> {
  // 1. 사용자의 기존 방 위치 조회
  const existingRooms = await prisma.rooms.findMany({
    where: { userId },
    select: { positionX: true, positionY: true }
  });

  const occupied = new Set(
    existingRooms.map(r => `${r.positionX},${r.positionY}`)
  );

  // 2. 각 방의 인접 위치 중 비어있는 곳 찾기
  const candidates: Position[] = [];

  for (const room of existingRooms) {
    const adjacent = getAdjacentPositions({
      x: room.positionX,
      y: room.positionY
    });

    for (const pos of adjacent) {
      const key = `${pos.x},${pos.y}`;
      if (!occupied.has(key)) {
        candidates.push(pos);
      }
    }
  }

  // 3. 중복 제거
  const uniqueCandidates = Array.from(
    new Set(candidates.map(p => `${p.x},${p.y}`))
  ).map(key => {
    const [x, y] = key.split(',').map(Number);
    return { x, y };
  });

  // 4. 랜덤 선택
  if (uniqueCandidates.length === 0) {
    throw new Error('NO_AVAILABLE_POSITION');
  }

  return uniqueCandidates[Math.floor(Math.random() * uniqueCandidates.length)];
}
```

---

### 1.3 콘텐츠 다양성 알고리즘

#### 1.3.1 미커버 주제 추출
**목적**: 기존 AI와 다른 관심사를 가진 이웃 생성

**알고리즘**:
```typescript
interface InterestPool {
  covered: string[]; // 기존 AI가 다루는 주제
  uncovered: string[]; // 아직 커버되지 않은 주제
}

async function analyzeInterestCoverage(userId: string): Promise<InterestPool> {
  // 1. 사용자의 모든 페르소나(룸메이트 + 이웃들) 조회
  const personas = await prisma.personas.findMany({
    where: { userId },
    select: { interests: true }
  });

  // 2. 모든 관심사 추출
  const covered = new Set<string>();
  personas.forEach(p => {
    const interests = p.interests as string[];
    interests.forEach(i => covered.add(i));
  });

  // 3. 전체 주제 풀
  const allTopics = [
    '게임', '영화', '음악', '요리', '운동', '여행',
    '독서', '사진', '그림', '코딩', '디자인',
    '철학', '과학', '역사', '언어', '패션',
    '반려동물', '식물', '인테리어', '차', '커피'
  ];

  // 4. 미커버 주제 계산
  const uncovered = allTopics.filter(topic => !covered.has(topic));

  return {
    covered: Array.from(covered),
    uncovered
  };
}

async function selectNewInterests(userId: string): Promise<string[]> {
  const { uncovered } = await analyzeInterestCoverage(userId);

  if (uncovered.length === 0) {
    // 모든 주제가 커버됨 → 전체 풀에서 랜덤 선택
    console.warn('All topics covered, selecting from full pool');
    return shuffleArray(allTopics).slice(0, 3);
  }

  // 미커버 주제 중 3개 랜덤 선택
  return shuffleArray(uncovered).slice(0, 3);
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
```

#### 1.3.2 이웃 페르소나 생성
**LLM 프롬프트**:
```typescript
function buildNeighborPrompt(newInterests: string[]): string {
  return `
당신은 새로운 AI 이웃을 생성하는 전문가입니다.

[이웃 설정]
관심사: ${newInterests.join(', ')}

위 관심사를 기반으로 새로운 이웃의 성격과 특성을 생성하세요.

[출력 형식 - JSON]
{
  "personality": {
    "traits": ["성격 특성 1", "성격 특성 2", "성격 특성 3"],
    "conversationStyle": "대화 스타일 설명 (1-2문장)"
  },
  "keywords": ["키워드1", "키워드2", "키워드3"]
}

[제약사항]
- traits는 정확히 3개
- keywords는 3개 (관심사와 성격 조합)
- 친근하고 흥미로운 성격으로 설정
- JSON 외 다른 텍스트 포함 금지

[예시]
관심사: ["여행", "철학", "독서"]
→
{
  "personality": {
    "traits": ["사색적", "모험적", "호기심 많음"],
    "conversationStyle": "깊이 있는 대화를 좋아하며, 여행 경험을 철학적으로 해석하는 스타일"
  },
  "keywords": ["여행러버", "철학덕후", "독서광"]
}
`.trim();
}
```

**시스템 프롬프트 생성**:
```typescript
function buildNeighborSystemPrompt(
  interests: string[],
  analysis: {
    personality: { traits: string[]; conversationStyle: string };
    keywords: string[];
  }
): string {
  return `
[역할]
당신은 사용자의 새로운 이웃입니다. 처음 만난 관계입니다.

[성격]
${analysis.personality.traits.join(', ')}

[관심사]
${interests.join(', ')}

[말투]
${analysis.personality.conversationStyle}
처음 만난 관계이므로 약간 거리를 두되, 친근하게 대합니다.

[관계]
사용자와는 이제 막 알게 된 이웃입니다.
서로에 대해 잘 모르므로, 호기심을 가지고 질문합니다.
시간이 지나면서 점점 친해질 수 있습니다.

[대화 원칙]
- 자신의 관심사에 대해 열정적으로 이야기합니다.
- 사용자의 관심사도 궁금해하며 질문합니다.
- 2-4문장으로 간결하게 답변합니다.
- 너무 친밀하지 않게, 적절한 거리를 유지합니다.
`.trim();
}
```

---

### 1.4 블랙아웃 해제

#### 1.4.1 블랙아웃 렌더링
**프론트엔드 구현**:
```typescript
// 맵 렌더링 시 블랙아웃 영역 표시
interface MapCell {
  position: Position;
  room: Room | null; // null이면 블랙아웃
}

function renderMap(rooms: Room[]): MapCell[][] {
  const grid: MapCell[][] = createEmptyGrid(10, 10); // 10x10 그리드

  // 기존 방 위치에 방 할당
  rooms.forEach(room => {
    const { positionX, positionY } = room;
    grid[positionY][positionX] = {
      position: { x: positionX, y: positionY },
      room
    };
  });

  // 인접 위치는 "다음 노크 가능" 표시
  // 나머지는 블랙아웃

  return grid;
}
```

**CSS 스타일**:
```css
.map-cell {
  width: 256px;
  height: 512px;
  position: relative;
}

.map-cell.blackout {
  background: linear-gradient(135deg, #1a1a1a 0%, #000000 100%);
  opacity: 0.9;
}

.map-cell.blackout::after {
  content: '???';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #333;
  font-size: 48px;
  font-weight: bold;
}

.map-cell.next-knock {
  background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);
  border: 2px dashed #555;
  cursor: pointer;
  opacity: 0.7;
}

.map-cell.next-knock:hover {
  opacity: 1;
  border-color: #FFD700;
}
```

#### 1.4.2 해제 애니메이션
**목적**: 블랙아웃이 사라지며 새 방이 드러나는 효과

**구현**:
```typescript
async function revealRoom(position: Position) {
  const cell = document.querySelector(
    `.map-cell[data-x="${position.x}"][data-y="${position.y}"]`
  );

  if (!cell) return;

  // 1. 블랙아웃 페이드 아웃
  cell.classList.add('revealing');

  await new Promise(resolve => setTimeout(resolve, 1000));

  // 2. 방 이미지 페이드 인
  cell.classList.remove('blackout', 'revealing');
  cell.classList.add('revealed');
}
```

```css
.map-cell.revealing {
  animation: fadeOutBlackout 1s ease-out forwards;
}

@keyframes fadeOutBlackout {
  0% {
    opacity: 0.9;
    filter: brightness(0.3);
  }
  100% {
    opacity: 0;
    filter: brightness(1);
  }
}

.map-cell.revealed {
  animation: fadeInRoom 0.8s ease-in forwards;
}

@keyframes fadeInRoom {
  0% {
    opacity: 0;
    transform: scale(0.9);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}
```

---

## 2. 콘텐츠 강화 방안 (선택)

### 2.1 노크 스트릭 (Streak)

#### 2.1.1 연속 노크 일수 추적
**목적**: 습관 형성 유도

**데이터베이스**:
```sql
ALTER TABLE knock_limits ADD COLUMN streak_days INT DEFAULT 0;
ALTER TABLE knock_limits ADD COLUMN best_streak INT DEFAULT 0;
```

**로직**:
```typescript
async function updateStreak(userId: string) {
  const limit = await prisma.knockLimits.findUnique({
    where: { userId }
  });

  if (!limit) return;

  const lastKnock = new Date(limit.lastKnockAt);
  const now = new Date();
  const daysDiff = Math.floor(
    (now.getTime() - lastKnock.getTime()) / (1000 * 60 * 60 * 24)
  );

  let newStreak = limit.streakDays;

  if (daysDiff === 1) {
    // 연속 노크
    newStreak += 1;
  } else if (daysDiff > 1) {
    // 스트릭 끊김
    newStreak = 1;
  }

  await prisma.knockLimits.update({
    where: { userId },
    data: {
      streakDays: newStreak,
      bestStreak: Math.max(newStreak, limit.bestStreak)
    }
  });
}
```

#### 2.1.2 스트릭 보상
**보상 예시**:
- 7일 연속: 추가 노크 1회
- 30일 연속: 특별 이웃 (희귀 관심사)
- 100일 연속: 프리미엄 1개월 무료

---

### 2.2 이웃 희귀도

#### 2.2.1 희귀 이웃 시스템
**목적**: 발견의 재미 극대화

**희귀도 등급**:
- 일반 (Common): 90%
- 희귀 (Rare): 8%
- 전설 (Legendary): 2%

**차별화**:
- 희귀 이웃: 독특한 관심사 (예: "천문학", "고고학")
- 전설 이웃: 특별한 능력 (예: "시를 써주는 이웃")

**구현**:
```typescript
function determineNeighborRarity(): 'common' | 'rare' | 'legendary' {
  const rand = Math.random() * 100;

  if (rand < 2) return 'legendary';
  if (rand < 10) return 'rare';
  return 'common';
}

async function generateNeighborByRarity(
  rarity: string,
  userId: string
) {
  if (rarity === 'legendary') {
    return generateLegendaryNeighbor(userId);
  } else if (rarity === 'rare') {
    return generateRareNeighbor(userId);
  } else {
    return generateCommonNeighbor(userId);
  }
}
```

---

## 3. 예외 처리

### 3.1 노크 제한 초과
**시나리오**: 무료 사용자가 1일 1회 초과 시도

**대응**:
```typescript
{
  "success": false,
  "error": "KNOCK_LIMIT_EXCEEDED",
  "message": "오늘의 노크를 모두 사용했습니다",
  "limit": {
    "nextResetAt": "2025-10-28T00:00:00Z"
  },
  "premium": {
    "upgradeUrl": "https://knock.com/pricing",
    "benefits": ["무제한 노크", "특별 이웃 발견"]
  }
}
```

### 3.2 방 위치 부족
**시나리오**: 모든 인접 위치가 이미 채워짐

**대응**:
- 2칸 떨어진 위치 허용
- 또는 최대 방 개수 제한 (예: 100개)

### 3.3 LLM 이웃 생성 실패
**시나리오**: Gemini API 오류

**대응**:
- 재시도 (최대 3회)
- 실패 시 기본 템플릿 이웃 사용
- 사용자에게 "임시 이웃" 안내

---

## 4. 비기능적 요구사항

### 4.1 성능
- 노크 실행 → 이웃 생성 완료: 15초 이내
- 블랙아웃 해제 애니메이션: 2초 이내
- 노크 제한 확인: 100ms 이내 (캐싱)

### 4.2 확장성
- 사용자당 최대 방 개수: 100개
- 동시 노크 요청 처리: 1,000 QPS

### 4.3 공정성
- 이웃 관심사 분포 균등성 보장
- 희귀 이웃 확률 정확성 (가중 랜덤)

---

## 5. 테스트 시나리오

### 5.1 정상 플로우
1. 노크 버튼 클릭 → 제한 확인 통과
2. 새로운 이웃 생성 (미커버 주제)
3. 인접 위치에 방 생성
4. 블랙아웃 해제 애니메이션
5. 이웃 소개 화면 표시

### 5.2 예외 플로우
1. 제한 초과 → 유료 안내
2. 모든 주제 커버 → 전체 풀에서 랜덤 선택
3. LLM 실패 → 기본 템플릿 사용

### 5.3 경계 조건
1. 첫 노크 (룸메이트 1개만 있음)
2. 100번째 노크 (최대 방 개수)
3. 자정 직후 노크 (초기화 확인)

---

## 6. 개발 우선순위

**Phase 1 (MVP)**:
- 1일 1회 노크 제한
- 인접 위치 방 생성
- 미커버 주제 선택 알고리즘
- 이웃 페르소나 생성 (LLM)
- 블랙아웃 해제 (간단한 페이드)

**Phase 2 (Enhancement)**:
- 블랙아웃 해제 애니메이션 고도화
- 노크 스트릭 시스템
- 유료 사용자 무제한 노크

**Phase 3 (Premium)**:
- 이웃 희귀도 시스템
- 특별 이웃 (전설)
- 노크 히스토리 통계
