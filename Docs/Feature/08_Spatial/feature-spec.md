# 공간 시각화 시스템 - 기능 명세서

## 1. 기본 명세 (MVP)

### 1.1 좌표 시스템

#### 1.1.1 그리드 구조
**기준점**: (0, 0) 중앙 기준, 데카르트 좌표계

**좌표 체계**:
```
(-1, 1)  (0, 1)  (1, 1)
(-1, 0)  (0, 0)  (1, 0)   ← 룸메이트 방 최초 위치
(-1,-1)  (0,-1)  (1,-1)
```

**인접 방향**:
- 상하좌우: 4방향 우선
- 대각선: 8방향 전체 (선택 가능)

**최대 확장 범위**:
- MVP: 무제한 (실질적으로 ±100 좌표 내)
- 제약 추가 가능 (예: 25개 방 제한)

#### 1.1.2 데이터베이스 스키마
```sql
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  persona_id UUID REFERENCES personas(id) ON DELETE CASCADE,
  position_x INT NOT NULL,
  position_y INT NOT NULL,
  image_url VARCHAR(500),
  is_unlocked BOOLEAN DEFAULT TRUE,
  unlocked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, position_x, position_y)
);

CREATE INDEX idx_rooms_user_position ON rooms(user_id, position_x, position_y);
CREATE INDEX idx_rooms_persona ON rooms(persona_id);
```

---

### 1.2 최초 맵 렌더링

#### 1.2.1 초기 상태
**화면 구성**:
- 캔버스/SVG 기반 2D 맵
- 중앙에 룸메이트 방 1개 표시
- 주변 8칸 블랙아웃 오버레이

**방 블록 시각 요소**:
```
┌─────────────┐
│             │
│   [이미지]  │  ← 256x512 이미지 축소 표시
│             │
│ [이름 태그] │  ← "룸메이트"
└─────────────┘
```

**블랙아웃 표현**:
- 어두운 반투명 오버레이 (rgba(0, 0, 0, 0.9))
- 물음표(?) 아이콘 중앙 배치
- 호버 시 "노크하여 발견하기" 툴팁

#### 1.2.2 API 명세
```typescript
GET /api/v1/spatial/map
Headers:
{
  "Authorization": "Bearer {token}"
}

Response:
{
  "success": true,
  "rooms": [
    {
      "id": "room_001",
      "personaId": "persona_001",
      "personaName": "룸메이트",
      "position": { "x": 0, "y": 0 },
      "imageUrl": "https://cdn.knock.com/rooms/001.png",
      "isUnlocked": true,
      "unlockedAt": "2025-10-27T10:00:00Z"
    }
  ],
  "viewportCenter": { "x": 0, "y": 0 },
  "zoomLevel": 1.0
}
```

#### 1.2.3 프론트엔드 렌더링
```typescript
interface Room {
  id: string;
  personaId: string;
  personaName: string;
  position: { x: number; y: number };
  imageUrl: string;
  isUnlocked: boolean;
}

const CELL_SIZE = 200; // 픽셀 단위

function renderMap(rooms: Room[], center: { x: number; y: number }) {
  const canvas = document.getElementById('map-canvas') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d')!;

  // 중앙 정렬 오프셋 계산
  const offsetX = canvas.width / 2 - center.x * CELL_SIZE;
  const offsetY = canvas.height / 2 - center.y * CELL_SIZE;

  rooms.forEach(room => {
    const screenX = offsetX + room.position.x * CELL_SIZE;
    const screenY = offsetY + room.position.y * CELL_SIZE;

    if (room.isUnlocked) {
      drawRoomBlock(ctx, screenX, screenY, room);
    } else {
      drawBlackout(ctx, screenX, screenY);
    }
  });
}
```

---

### 1.3 노크를 통한 공간 확장

#### 1.3.1 인접 위치 선택 알고리즘
**목표**: 기존 방들과 인접한 빈 좌표 중 랜덤 선택

**알고리즘**:
```typescript
function getAvailableAdjacentPositions(
  existingRooms: Room[]
): { x: number; y: number }[] {
  const occupied = new Set(
    existingRooms.map(r => `${r.position.x},${r.position.y}`)
  );

  const adjacent: { x: number; y: number }[] = [];
  const directions = [
    { dx: 0, dy: 1 },   // 상
    { dx: 1, dy: 0 },   // 우
    { dx: 0, dy: -1 },  // 하
    { dx: -1, dy: 0 },  // 좌
    // 대각선 (선택)
    { dx: 1, dy: 1 },
    { dx: 1, dy: -1 },
    { dx: -1, dy: 1 },
    { dx: -1, dy: -1 }
  ];

  existingRooms.forEach(room => {
    directions.forEach(dir => {
      const newX = room.position.x + dir.dx;
      const newY = room.position.y + dir.dy;
      const key = `${newX},${newY}`;

      if (!occupied.has(key)) {
        adjacent.push({ x: newX, y: newY });
      }
    });
  });

  // 중복 제거
  const unique = Array.from(
    new Set(adjacent.map(p => `${p.x},${p.y}`))
  ).map(key => {
    const [x, y] = key.split(',').map(Number);
    return { x, y };
  });

  return unique;
}

function selectRandomPosition(
  available: { x: number; y: number }[]
): { x: number; y: number } {
  return available[Math.floor(Math.random() * available.length)];
}
```

#### 1.3.2 새 방 생성 프로세스
**트리거**: 노크 시스템에서 `/api/v1/knock/execute` 호출

**백엔드 로직**:
1. 기존 방 목록 조회
2. 인접 빈 좌표 계산
3. 랜덤 위치 선택
4. 새 이웃 페르소나 생성 (LLM)
5. 방 이미지 할당
6. DB 저장
7. 프론트엔드로 새 방 데이터 반환

**API 명세**:
```typescript
POST /api/v1/knock/execute
Headers:
{
  "Authorization": "Bearer {token}"
}

Response:
{
  "success": true,
  "newRoom": {
    "id": "room_002",
    "personaId": "persona_002",
    "personaName": "이웃 1",
    "position": { "x": 1, "y": 0 },
    "imageUrl": "https://cdn.knock.com/rooms/002.png",
    "isUnlocked": true,
    "unlockedAt": "2025-10-27T11:00:00Z"
  },
  "message": "새로운 이웃을 발견했어요!"
}
```

#### 1.3.3 프론트엔드 애니메이션
**단계별 효과**:
1. 블랙아웃 페이드아웃 (500ms)
2. 방 이미지 스케일 업 (0 → 1, 300ms)
3. 이름 태그 페이드인 (200ms)
4. 파티클 효과 (선택)

```typescript
async function animateNewRoom(room: Room) {
  const cell = document.getElementById(`cell-${room.position.x}-${room.position.y}`);

  // 1. 블랙아웃 제거
  await animate(cell, { opacity: [0.9, 0] }, { duration: 500 });

  // 2. 방 이미지 등장
  const img = cell.querySelector('.room-image');
  await animate(img, {
    scale: [0, 1],
    opacity: [0, 1]
  }, {
    duration: 300,
    easing: 'ease-out'
  });

  // 3. 이름 태그
  const label = cell.querySelector('.room-label');
  await animate(label, { opacity: [0, 1] }, { duration: 200 });
}
```

---

### 1.4 맵 네비게이션

#### 1.4.1 드래그 이동
**기능**: 마우스/터치 드래그로 맵 이동

**구현**:
```typescript
let isDragging = false;
let startX = 0, startY = 0;
let offsetX = 0, offsetY = 0;

canvas.addEventListener('mousedown', (e) => {
  isDragging = true;
  startX = e.clientX - offsetX;
  startY = e.clientY - offsetY;
});

canvas.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  offsetX = e.clientX - startX;
  offsetY = e.clientY - startY;
  renderMap(rooms, { x: -offsetX / CELL_SIZE, y: -offsetY / CELL_SIZE });
});

canvas.addEventListener('mouseup', () => {
  isDragging = false;
});
```

#### 1.4.2 방 클릭 인터랙션
**기능**: 방 블록 클릭 시 채팅 모달 오픈

**이벤트 처리**:
```typescript
canvas.addEventListener('click', (e) => {
  const clickedRoom = getRoomAtPosition(e.clientX, e.clientY);

  if (clickedRoom && clickedRoom.isUnlocked) {
    openChatModal(clickedRoom.personaId);
  }
});

function getRoomAtPosition(screenX: number, screenY: number): Room | null {
  const gridX = Math.floor((screenX - offsetX) / CELL_SIZE);
  const gridY = Math.floor((screenY - offsetY) / CELL_SIZE);

  return rooms.find(r => r.position.x === gridX && r.position.y === gridY) || null;
}
```

#### 1.4.3 미니맵 (선택 기능)
**위치**: 화면 우하단 고정

**표시 내용**:
- 전체 방 위치 도트 표시
- 현재 뷰포트 영역 하이라이트
- 클릭 시 해당 위치로 이동

---

## 2. 콘텐츠 강화 방안 (선택)

### 2.1 방향 가중치 알고리즘
**목표**: 특정 방향 선호 (예: 오른쪽/위쪽 우선)으로 자연스러운 확장

**구현**:
```typescript
const DIRECTION_WEIGHTS = {
  right: 2.0,   // 우측 우선
  up: 1.5,      // 상단 선호
  left: 1.0,    // 좌측 기본
  down: 0.8     // 하단 덜 선호
};

function selectWeightedRandomPosition(
  available: { x: number; y: number }[],
  currentCenter: { x: number; y: number }
): { x: number; y: number } {
  const weighted = available.map(pos => {
    let weight = 1.0;

    if (pos.x > currentCenter.x) weight *= DIRECTION_WEIGHTS.right;
    if (pos.x < currentCenter.x) weight *= DIRECTION_WEIGHTS.left;
    if (pos.y > currentCenter.y) weight *= DIRECTION_WEIGHTS.up;
    if (pos.y < currentCenter.y) weight *= DIRECTION_WEIGHTS.down;

    return { pos, weight };
  });

  const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;

  for (const item of weighted) {
    random -= item.weight;
    if (random <= 0) return item.pos;
  }

  return available[0];
}
```

### 2.2 방 그룹핑 시각화
**목표**: 관련 있는 이웃들 그룹 표시

**구현**:
- 공통 관심사 이웃들에게 배경 색상 힌트
- 예: 게임 관련 이웃들 → 파란색 계열
- 예: 예술 관련 이웃들 → 보라색 계열

### 2.3 방 업그레이드 시각 효과
**목표**: 친밀도 상승 시 방 이미지 변화

**구현**:
- 관계 레벨 0-2: 기본 이미지
- 관계 레벨 3-4: 밝은 이미지 (조명 효과)
- 관계 레벨 5: 특별 테두리/파티클

---

## 3. 예외 처리

### 3.1 맵 데이터 로드 실패
- 재시도 (최대 3회)
- 실패 시 기본 템플릿 맵 표시 (룸메이트 방 1개)

### 3.2 이미지 로드 오류
- 플레이스홀더 이미지 표시
- 백그라운드 재로딩

### 3.3 좌표 충돌
- 이론상 UNIQUE 제약으로 방지
- 충돌 감지 시 재시도 로직

### 3.4 인접 좌표 부족
- 최대 방 개수 도달 시 노크 비활성화
- 사용자에게 안내 메시지

---

## 4. 비기능적 요구사항

### 4.1 성능
- 최초 맵 렌더링: 1초 이내
- 방 100개까지 60 FPS 유지
- 이미지 레이지 로딩 (뷰포트 외부)

### 4.2 반응형 디자인
- 모바일: 터치 드래그, 핀치 줌
- 태블릿: 하이브리드 인터랙션
- 데스크톱: 마우스 드래그, 휠 줌

### 4.3 접근성
- 키보드 네비게이션 (화살표 키)
- 스크린 리더: 방 이름/좌표 읽기
- 고대비 모드 지원

---

## 5. 테스트 시나리오

### 5.1 정상 플로우
1. 메인 화면 진입 → 룸메이트 방 1개 표시
2. 주변 8칸 블랙아웃 확인
3. 노크 실행 → 새 방 인접 위치 생성
4. 블랙아웃 해제 애니메이션 확인
5. 방 클릭 → 채팅 모달 오픈

### 5.2 예외 플로우
1. 네트워크 오류 → 재시도 후 기본 맵
2. 이미지 로드 실패 → 플레이스홀더 표시
3. 최대 방 개수 도달 → 노크 비활성화

### 5.3 성능 테스트
1. 방 50개 렌더링 → FPS 측정
2. 빠른 드래그 → 렌더링 지연 확인
3. 이미지 로딩 → 레이지 로딩 동작 확인

---

## 6. 개발 우선순위

**Phase 1 (MVP)**:
- 그리드 좌표 시스템
- 최초 맵 렌더링 (룸메이트 방 1개)
- 블랙아웃 표시
- 인접 좌표 선택 알고리즘
- 방 생성 애니메이션
- 기본 드래그 이동

**Phase 2 (Enhancement)**:
- 방향 가중치 알고리즘
- 줌 인/아웃 기능
- 미니맵
- 고급 애니메이션 효과

**Phase 3 (Optimization)**:
- 레이지 로딩
- 가상 스크롤 (대규모 맵)
- WebGL 렌더링 (성능 개선)
