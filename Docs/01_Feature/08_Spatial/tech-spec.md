# 공간 시각화 시스템 - 기술 명세서

## 1. 시스템 아키텍처

```
[클라이언트 - 브라우저]
    ↓
[렌더링 엔진]
    ├─ Canvas API (2D 렌더링)
    ├─ 좌표 시스템 (그리드 변환)
    ├─ 애니메이션 엔진 (Web Animations API)
    └─ 인터랙션 핸들러 (이벤트 리스너)
    ↓
[API 게이트웨이]
    ↓
[공간 관리 서비스]
    ├─ 맵 데이터 조회
    ├─ 인접 좌표 계산
    ├─ 방 생성 로직
    └─ 위치 충돌 방지
    ↓
[데이터베이스]
    └─ rooms 테이블 (좌표 인덱싱)
```

---

## 2. 기술 스택

### 2.1 프론트엔드
- **렌더링**: HTML5 Canvas API / SVG (선택)
- **프레임워크**: React 18 (Next.js 14)
- **애니메이션**: Web Animations API / GSAP (선택)
- **상태 관리**: Zustand
- **스타일링**: Tailwind CSS
- **이미지 최적화**: Next/Image

### 2.2 백엔드
- **언어**: TypeScript
- **프레임워크**: Express.js / Next.js API Routes
- **데이터베이스**: PostgreSQL 15
- **캐시**: Redis (맵 데이터 캐싱)

### 2.3 렌더링 전략
- **초기 렌더링**: Canvas 2D Context
- **확장성**: WebGL (100개 이상 방 시)
- **모바일**: 하드웨어 가속 최적화

---

## 3. 데이터베이스 스키마

### 3.1 rooms 테이블
```sql
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  persona_id UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,

  -- 좌표 정보
  position_x INT NOT NULL,
  position_y INT NOT NULL,

  -- 비주얼 정보
  image_url VARCHAR(500) NOT NULL,
  image_variant VARCHAR(50) DEFAULT 'default', -- 'default', 'cozy', 'bright'

  -- 상태 정보
  is_unlocked BOOLEAN DEFAULT TRUE,
  unlocked_at TIMESTAMP,

  -- 메타데이터
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- 제약 조건
  CONSTRAINT unique_user_position UNIQUE(user_id, position_x, position_y),
  CONSTRAINT position_range CHECK (position_x BETWEEN -100 AND 100 AND position_y BETWEEN -100 AND 100)
);

-- 인덱스
CREATE INDEX idx_rooms_user_id ON rooms(user_id);
CREATE INDEX idx_rooms_user_position ON rooms(user_id, position_x, position_y);
CREATE INDEX idx_rooms_persona ON rooms(persona_id);
CREATE INDEX idx_rooms_unlocked ON rooms(user_id, is_unlocked);
```

### 3.2 map_views 테이블 (뷰포트 저장)
```sql
CREATE TABLE map_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- 뷰포트 정보
  viewport_center_x FLOAT DEFAULT 0,
  viewport_center_y FLOAT DEFAULT 0,
  zoom_level FLOAT DEFAULT 1.0,

  -- 메타데이터
  last_updated TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_user_view UNIQUE(user_id)
);
```

---

## 4. API 명세

### 4.1 맵 데이터 조회
```typescript
GET /api/v1/spatial/map
Headers:
{
  "Authorization": "Bearer {token}"
}

Query Parameters:
{
  "includeBlackout"?: boolean  // 블랙아웃 영역 포함 여부 (default: true)
}

Response:
{
  "success": true,
  "data": {
    "rooms": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "personaId": "660e8400-e29b-41d4-a716-446655440000",
        "personaName": "룸메이트",
        "position": {
          "x": 0,
          "y": 0
        },
        "imageUrl": "https://cdn.knock.com/rooms/001.png",
        "isUnlocked": true,
        "unlockedAt": "2025-10-27T10:00:00Z"
      }
    ],
    "viewport": {
      "center": { "x": 0, "y": 0 },
      "zoomLevel": 1.0
    },
    "stats": {
      "totalRooms": 1,
      "unlockedRooms": 1,
      "availableKnocks": 1
    }
  }
}

Error:
{
  "success": false,
  "error": "UNAUTHORIZED" | "MAP_NOT_FOUND"
}
```

### 4.2 인접 좌표 조회
```typescript
GET /api/v1/spatial/adjacent-positions
Headers:
{
  "Authorization": "Bearer {token}"
}

Response:
{
  "success": true,
  "positions": [
    { "x": 1, "y": 0 },
    { "x": 0, "y": 1 },
    { "x": -1, "y": 0 },
    { "x": 0, "y": -1 }
  ],
  "count": 4
}
```

### 4.3 뷰포트 저장
```typescript
PUT /api/v1/spatial/viewport
Headers:
{
  "Authorization": "Bearer {token}"
}

Request:
{
  "center": { "x": 2.5, "y": -1.2 },
  "zoomLevel": 1.2
}

Response:
{
  "success": true
}
```

### 4.4 방 상세 정보
```typescript
GET /api/v1/spatial/rooms/:roomId
Headers:
{
  "Authorization": "Bearer {token}"
}

Response:
{
  "success": true,
  "room": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "personaId": "660e8400-e29b-41d4-a716-446655440000",
    "personaName": "룸메이트",
    "position": { "x": 0, "y": 0 },
    "imageUrl": "https://cdn.knock.com/rooms/001.png",
    "isUnlocked": true,
    "unlockedAt": "2025-10-27T10:00:00Z",
    "relationshipLevel": 0,
    "lastInteraction": "2025-10-27T12:00:00Z"
  }
}
```

---

## 5. 좌표 시스템 구현

### 5.1 좌표 변환 로직
```typescript
// 그리드 좌표 → 스크린 좌표 변환
interface GridPosition {
  x: number;  // 그리드 X 좌표
  y: number;  // 그리드 Y 좌표
}

interface ScreenPosition {
  x: number;  // 픽셀 X 좌표
  y: number;  // 픽셀 Y 좌표
}

const CELL_SIZE = 200;  // 한 칸 크기 (픽셀)

class CoordinateSystem {
  private canvasWidth: number;
  private canvasHeight: number;
  private offsetX: number = 0;  // 드래그 오프셋
  private offsetY: number = 0;
  private zoomLevel: number = 1.0;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  // 그리드 → 스크린 변환
  gridToScreen(grid: GridPosition): ScreenPosition {
    const centerX = this.canvasWidth / 2;
    const centerY = this.canvasHeight / 2;

    return {
      x: centerX + (grid.x * CELL_SIZE * this.zoomLevel) + this.offsetX,
      y: centerY - (grid.y * CELL_SIZE * this.zoomLevel) + this.offsetY  // Y축 반전
    };
  }

  // 스크린 → 그리드 변환 (클릭 감지용)
  screenToGrid(screen: ScreenPosition): GridPosition {
    const centerX = this.canvasWidth / 2;
    const centerY = this.canvasHeight / 2;

    const gridX = Math.floor((screen.x - centerX - this.offsetX) / (CELL_SIZE * this.zoomLevel));
    const gridY = Math.floor((centerY - screen.y - this.offsetY) / (CELL_SIZE * this.zoomLevel));

    return { x: gridX, y: gridY };
  }

  // 오프셋 업데이트 (드래그)
  updateOffset(deltaX: number, deltaY: number) {
    this.offsetX += deltaX;
    this.offsetY += deltaY;
  }

  // 줌 레벨 업데이트
  setZoom(level: number) {
    this.zoomLevel = Math.max(0.5, Math.min(2.0, level));  // 0.5x ~ 2.0x 제한
  }
}
```

### 5.2 인접 좌표 계산
```typescript
type Direction = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

const DIRECTION_OFFSETS: Record<Direction, { dx: number; dy: number }> = {
  N:  { dx: 0,  dy: 1 },
  NE: { dx: 1,  dy: 1 },
  E:  { dx: 1,  dy: 0 },
  SE: { dx: 1,  dy: -1 },
  S:  { dx: 0,  dy: -1 },
  SW: { dx: -1, dy: -1 },
  W:  { dx: -1, dy: 0 },
  NW: { dx: -1, dy: 1 }
};

function getAdjacentPositions(
  center: GridPosition,
  includesDiagonal: boolean = true
): GridPosition[] {
  const directions: Direction[] = includesDiagonal
    ? ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
    : ['N', 'E', 'S', 'W'];

  return directions.map(dir => {
    const { dx, dy } = DIRECTION_OFFSETS[dir];
    return {
      x: center.x + dx,
      y: center.y + dy
    };
  });
}

function getAvailableAdjacentPositions(
  existingRooms: Room[]
): GridPosition[] {
  const occupiedSet = new Set(
    existingRooms.map(r => `${r.position.x},${r.position.y}`)
  );

  const adjacentSet = new Set<string>();

  existingRooms.forEach(room => {
    const adjacent = getAdjacentPositions(room.position, true);
    adjacent.forEach(pos => {
      const key = `${pos.x},${pos.y}`;
      if (!occupiedSet.has(key)) {
        adjacentSet.add(key);
      }
    });
  });

  return Array.from(adjacentSet).map(key => {
    const [x, y] = key.split(',').map(Number);
    return { x, y };
  });
}
```

---

## 6. 렌더링 엔진

### 6.1 Canvas 렌더링
```typescript
class MapRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private coordSystem: CoordinateSystem;
  private imageCache: Map<string, HTMLImageElement> = new Map();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.coordSystem = new CoordinateSystem(canvas.width, canvas.height);
  }

  // 전체 맵 렌더링
  async render(rooms: Room[]) {
    // 캔버스 초기화
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 배경 그리드 (선택)
    this.drawGrid();

    // 블랙아웃 영역
    const blackoutPositions = this.calculateBlackoutPositions(rooms);
    blackoutPositions.forEach(pos => this.drawBlackout(pos));

    // 방 블록
    for (const room of rooms) {
      if (room.isUnlocked) {
        await this.drawRoom(room);
      }
    }
  }

  // 배경 그리드 그리기
  private drawGrid() {
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.lineWidth = 1;

    const gridRange = 20;  // ±20 그리드

    for (let x = -gridRange; x <= gridRange; x++) {
      const screenPos = this.coordSystem.gridToScreen({ x, y: 0 });
      this.ctx.beginPath();
      this.ctx.moveTo(screenPos.x, 0);
      this.ctx.lineTo(screenPos.x, this.canvas.height);
      this.ctx.stroke();
    }

    for (let y = -gridRange; y <= gridRange; y++) {
      const screenPos = this.coordSystem.gridToScreen({ x: 0, y });
      this.ctx.beginPath();
      this.ctx.moveTo(0, screenPos.y);
      this.ctx.lineTo(this.canvas.width, screenPos.y);
      this.ctx.stroke();
    }
  }

  // 블랙아웃 그리기
  private drawBlackout(position: GridPosition) {
    const screenPos = this.coordSystem.gridToScreen(position);
    const size = CELL_SIZE * this.coordSystem.zoomLevel;

    // 반투명 검은색 오버레이
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    this.ctx.fillRect(
      screenPos.x - size / 2,
      screenPos.y - size / 2,
      size,
      size
    );

    // 물음표 아이콘
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.font = `${size * 0.4}px Arial`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('?', screenPos.x, screenPos.y);
  }

  // 방 블록 그리기
  private async drawRoom(room: Room) {
    const screenPos = this.coordSystem.gridToScreen(room.position);
    const size = CELL_SIZE * this.coordSystem.zoomLevel;

    // 이미지 로드 (캐시 활용)
    const image = await this.loadImage(room.imageUrl);

    // 이미지 그리기
    this.ctx.drawImage(
      image,
      screenPos.x - size / 2,
      screenPos.y - size / 2,
      size,
      size
    );

    // 이름 태그
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(
      screenPos.x - size / 2,
      screenPos.y + size / 2 - 30,
      size,
      30
    );

    this.ctx.fillStyle = '#fff';
    this.ctx.font = `${size * 0.08}px Arial`;
    this.ctx.textAlign = 'center';
    this.ctx.fillText(
      room.personaName,
      screenPos.x,
      screenPos.y + size / 2 - 15
    );
  }

  // 이미지 로드 (캐시)
  private async loadImage(url: string): Promise<HTMLImageElement> {
    if (this.imageCache.has(url)) {
      return this.imageCache.get(url)!;
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.imageCache.set(url, img);
        resolve(img);
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  // 블랙아웃 위치 계산
  private calculateBlackoutPositions(rooms: Room[]): GridPosition[] {
    return getAvailableAdjacentPositions(rooms);
  }
}
```

### 6.2 레이지 로딩 (뷰포트 컬링)
```typescript
class OptimizedMapRenderer extends MapRenderer {
  private viewportPadding = 2;  // 뷰포트 외부 2칸까지 렌더링

  async render(rooms: Room[]) {
    const visibleRooms = this.getVisibleRooms(rooms);
    await super.render(visibleRooms);
  }

  private getVisibleRooms(rooms: Room[]): Room[] {
    const viewportBounds = this.getViewportBounds();

    return rooms.filter(room => {
      return (
        room.position.x >= viewportBounds.minX - this.viewportPadding &&
        room.position.x <= viewportBounds.maxX + this.viewportPadding &&
        room.position.y >= viewportBounds.minY - this.viewportPadding &&
        room.position.y <= viewportBounds.maxY + this.viewportPadding
      );
    });
  }

  private getViewportBounds() {
    const topLeft = this.coordSystem.screenToGrid({ x: 0, y: 0 });
    const bottomRight = this.coordSystem.screenToGrid({
      x: this.canvas.width,
      y: this.canvas.height
    });

    return {
      minX: topLeft.x,
      maxX: bottomRight.x,
      minY: bottomRight.y,
      maxY: topLeft.y
    };
  }
}
```

---

## 7. 애니메이션 시스템

### 7.1 Web Animations API 활용
```typescript
async function animateRoomAppearance(
  element: HTMLElement,
  duration: number = 800
) {
  // 블랙아웃 제거
  const blackout = element.querySelector('.blackout-overlay') as HTMLElement;
  if (blackout) {
    await blackout.animate(
      [
        { opacity: 0.9 },
        { opacity: 0 }
      ],
      {
        duration: 500,
        easing: 'ease-out',
        fill: 'forwards'
      }
    ).finished;

    blackout.remove();
  }

  // 방 이미지 등장
  const roomImage = element.querySelector('.room-image') as HTMLElement;
  await roomImage.animate(
    [
      { transform: 'scale(0)', opacity: 0 },
      { transform: 'scale(1)', opacity: 1 }
    ],
    {
      duration: 300,
      easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',  // back ease
      fill: 'forwards'
    }
  ).finished;

  // 이름 태그
  const nameLabel = element.querySelector('.room-label') as HTMLElement;
  await nameLabel.animate(
    [
      { opacity: 0 },
      { opacity: 1 }
    ],
    {
      duration: 200,
      delay: 100,
      fill: 'forwards'
    }
  ).finished;
}
```

### 7.2 뷰포트 부드러운 이동
```typescript
async function panToPosition(
  coordSystem: CoordinateSystem,
  targetGrid: GridPosition,
  duration: number = 1000
) {
  const startOffset = { x: coordSystem.offsetX, y: coordSystem.offsetY };
  const targetScreen = coordSystem.gridToScreen(targetGrid);
  const targetOffset = {
    x: coordSystem.canvasWidth / 2 - targetScreen.x,
    y: coordSystem.canvasHeight / 2 - targetScreen.y
  };

  const startTime = performance.now();

  return new Promise<void>(resolve => {
    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-in-out 함수
      const eased = progress < 0.5
        ? 2 * progress * progress
        : -1 + (4 - 2 * progress) * progress;

      coordSystem.offsetX = startOffset.x + (targetOffset.x - startOffset.x) * eased;
      coordSystem.offsetY = startOffset.y + (targetOffset.y - startOffset.y) * eased;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        resolve();
      }
    }

    requestAnimationFrame(animate);
  });
}
```

---

## 8. 인터랙션 핸들러

### 8.1 드래그 이동
```typescript
class DragHandler {
  private isDragging = false;
  private startPos = { x: 0, y: 0 };
  private lastPos = { x: 0, y: 0 };

  constructor(
    private canvas: HTMLCanvasElement,
    private coordSystem: CoordinateSystem,
    private onDrag: () => void
  ) {
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // 마우스 이벤트
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));

    // 터치 이벤트
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
  }

  private handleMouseDown(e: MouseEvent) {
    this.isDragging = true;
    this.startPos = { x: e.clientX, y: e.clientY };
    this.lastPos = { x: e.clientX, y: e.clientY };
    this.canvas.style.cursor = 'grabbing';
  }

  private handleMouseMove(e: MouseEvent) {
    if (!this.isDragging) return;

    const deltaX = e.clientX - this.lastPos.x;
    const deltaY = e.clientY - this.lastPos.y;

    this.coordSystem.updateOffset(deltaX, deltaY);
    this.lastPos = { x: e.clientX, y: e.clientY };

    this.onDrag();
  }

  private handleMouseUp() {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.canvas.style.cursor = 'grab';
  }

  private handleTouchStart(e: TouchEvent) {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      this.isDragging = true;
      this.startPos = { x: touch.clientX, y: touch.clientY };
      this.lastPos = { x: touch.clientX, y: touch.clientY };
    }
  }

  private handleTouchMove(e: TouchEvent) {
    if (!this.isDragging || e.touches.length !== 1) return;

    e.preventDefault();  // 스크롤 방지

    const touch = e.touches[0];
    const deltaX = touch.clientX - this.lastPos.x;
    const deltaY = touch.clientY - this.lastPos.y;

    this.coordSystem.updateOffset(deltaX, deltaY);
    this.lastPos = { x: touch.clientX, y: touch.clientY };

    this.onDrag();
  }

  private handleTouchEnd() {
    this.isDragging = false;
  }
}
```

### 8.2 클릭 감지
```typescript
class ClickHandler {
  private clickThreshold = 5;  // 5px 이하 움직임만 클릭으로 인정

  constructor(
    private canvas: HTMLCanvasElement,
    private coordSystem: CoordinateSystem,
    private rooms: Room[],
    private onClick: (room: Room) => void
  ) {
    this.setupEventListeners();
  }

  private setupEventListeners() {
    let mouseDownPos: { x: number; y: number } | null = null;

    this.canvas.addEventListener('mousedown', (e) => {
      mouseDownPos = { x: e.clientX, y: e.clientY };
    });

    this.canvas.addEventListener('mouseup', (e) => {
      if (!mouseDownPos) return;

      const distance = Math.sqrt(
        Math.pow(e.clientX - mouseDownPos.x, 2) +
        Math.pow(e.clientY - mouseDownPos.y, 2)
      );

      if (distance <= this.clickThreshold) {
        this.handleClick(e.clientX, e.clientY);
      }

      mouseDownPos = null;
    });
  }

  private handleClick(screenX: number, screenY: number) {
    const gridPos = this.coordSystem.screenToGrid({ x: screenX, y: screenY });
    const clickedRoom = this.rooms.find(
      r => r.position.x === gridPos.x && r.position.y === gridPos.y && r.isUnlocked
    );

    if (clickedRoom) {
      this.onClick(clickedRoom);
    }
  }
}
```

---

## 9. 성능 최적화

### 9.1 requestAnimationFrame 활용
```typescript
class RenderLoop {
  private isRunning = false;
  private lastFrameTime = 0;
  private fps = 60;
  private frameInterval = 1000 / this.fps;

  constructor(
    private renderer: MapRenderer,
    private rooms: Room[]
  ) {}

  start() {
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.loop();
  }

  stop() {
    this.isRunning = false;
  }

  private loop() {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    const elapsed = currentTime - this.lastFrameTime;

    if (elapsed >= this.frameInterval) {
      this.renderer.render(this.rooms);
      this.lastFrameTime = currentTime - (elapsed % this.frameInterval);
    }

    requestAnimationFrame(() => this.loop());
  }
}
```

### 9.2 Redis 캐싱
```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!);

async function getMapData(userId: string): Promise<MapData> {
  const cacheKey = `map:${userId}`;
  const cached = await redis.get(cacheKey);

  if (cached) {
    return JSON.parse(cached);
  }

  const mapData = await fetchMapFromDatabase(userId);
  await redis.setex(cacheKey, 300, JSON.stringify(mapData));  // 5분 TTL

  return mapData;
}

async function invalidateMapCache(userId: string): Promise<void> {
  await redis.del(`map:${userId}`);
}
```

### 9.3 이미지 최적화
```typescript
// Next.js Image 컴포넌트 활용
import Image from 'next/image';

function RoomImage({ room }: { room: Room }) {
  return (
    <Image
      src={room.imageUrl}
      alt={room.personaName}
      width={256}
      height={512}
      loading="lazy"
      placeholder="blur"
      blurDataURL={room.imageBlurDataUrl}
    />
  );
}
```

---

## 10. 보안

### 10.1 좌표 범위 제한
```typescript
function validatePosition(position: GridPosition): boolean {
  const MAX_COORDINATE = 100;

  return (
    position.x >= -MAX_COORDINATE &&
    position.x <= MAX_COORDINATE &&
    position.y >= -MAX_COORDINATE &&
    position.y <= MAX_COORDINATE
  );
}
```

### 10.2 인접 좌표 검증
```typescript
async function createRoomAtPosition(
  userId: string,
  position: GridPosition
): Promise<Room> {
  // 1. 좌표 범위 검증
  if (!validatePosition(position)) {
    throw new Error('INVALID_POSITION');
  }

  // 2. 기존 방과 인접 여부 확인
  const existingRooms = await getRoomsByUserId(userId);
  const adjacentPositions = getAvailableAdjacentPositions(existingRooms);

  const isAdjacent = adjacentPositions.some(
    pos => pos.x === position.x && pos.y === position.y
  );

  if (!isAdjacent) {
    throw new Error('POSITION_NOT_ADJACENT');
  }

  // 3. 중복 확인 (DB UNIQUE 제약)
  const newRoom = await prisma.room.create({
    data: {
      userId,
      personaId: generatedPersonaId,
      positionX: position.x,
      positionY: position.y,
      imageUrl: selectedImageUrl,
      isUnlocked: true,
      unlockedAt: new Date()
    }
  });

  // 4. 캐시 무효화
  await invalidateMapCache(userId);

  return newRoom;
}
```

---

## 11. 모니터링

### 11.1 성능 메트릭
```typescript
class PerformanceMonitor {
  private frameCount = 0;
  private lastFpsUpdate = performance.now();
  private currentFps = 60;

  recordFrame() {
    this.frameCount++;

    const now = performance.now();
    const elapsed = now - this.lastFpsUpdate;

    if (elapsed >= 1000) {
      this.currentFps = Math.round((this.frameCount * 1000) / elapsed);
      this.frameCount = 0;
      this.lastFpsUpdate = now;

      // 로깅 또는 분석 전송
      console.log(`FPS: ${this.currentFps}`);

      if (this.currentFps < 30) {
        console.warn('Low FPS detected');
        // Sentry 등으로 전송
      }
    }
  }

  getFps(): number {
    return this.currentFps;
  }
}
```

### 11.2 에러 추적
```typescript
window.addEventListener('error', (event) => {
  if (event.filename?.includes('spatial')) {
    console.error('Spatial rendering error:', event.error);
    // Sentry.captureException(event.error);
  }
});
```

---

## 12. 테스트 전략

### 12.1 단위 테스트
```typescript
describe('CoordinateSystem', () => {
  let coordSystem: CoordinateSystem;

  beforeEach(() => {
    coordSystem = new CoordinateSystem(800, 600);
  });

  it('should convert grid to screen correctly', () => {
    const screen = coordSystem.gridToScreen({ x: 1, y: 1 });
    expect(screen.x).toBe(400 + 200);  // center + CELL_SIZE
    expect(screen.y).toBe(300 - 200);  // center - CELL_SIZE (Y반전)
  });

  it('should convert screen to grid correctly', () => {
    const grid = coordSystem.screenToGrid({ x: 600, y: 100 });
    expect(grid.x).toBe(1);
    expect(grid.y).toBe(1);
  });
});

describe('getAvailableAdjacentPositions', () => {
  it('should return 8 positions for single room', () => {
    const rooms = [{ position: { x: 0, y: 0 } }];
    const adjacent = getAvailableAdjacentPositions(rooms);
    expect(adjacent).toHaveLength(8);
  });

  it('should exclude occupied positions', () => {
    const rooms = [
      { position: { x: 0, y: 0 } },
      { position: { x: 1, y: 0 } }
    ];
    const adjacent = getAvailableAdjacentPositions(rooms);
    expect(adjacent.some(p => p.x === 1 && p.y === 0)).toBe(false);
  });
});
```

### 12.2 통합 테스트
```typescript
describe('Spatial API', () => {
  it('should return map data for user', async () => {
    const response = await request(app)
      .get('/api/v1/spatial/map')
      .set('Authorization', `Bearer ${testToken}`)
      .expect(200);

    expect(response.body.data.rooms).toHaveLength(1);
    expect(response.body.data.rooms[0].position).toEqual({ x: 0, y: 0 });
  });
});
```

### 12.3 E2E 테스트 (Playwright)
```typescript
test('should render map and interact', async ({ page }) => {
  await page.goto('https://knock.com/main');

  // 맵 렌더링 확인
  const canvas = page.locator('canvas#map-canvas');
  await expect(canvas).toBeVisible();

  // 방 클릭
  await canvas.click({ position: { x: 400, y: 300 } });

  // 채팅 모달 오픈 확인
  await expect(page.locator('.chat-modal')).toBeVisible();
});
```

---

## 13. 배포 환경 변수

```env
# 렌더링 설정
MAP_CELL_SIZE=200
MAP_MAX_COORDINATE=100
MAP_RENDER_FPS=60

# 캐싱
MAP_CACHE_TTL=300  # 5분

# 이미지
CDN_BASE_URL=https://cdn.knock.com

# 성능
ENABLE_VIEWPORT_CULLING=true
ENABLE_IMAGE_LAZY_LOADING=true
```
