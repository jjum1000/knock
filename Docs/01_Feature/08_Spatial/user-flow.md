# 공간 시각화 시스템 - 사용자 플로우

## 플로우 다이어그램

```
[메인 화면 진입]
    ↓
[최초 맵 렌더링]
    - 룸메이트 방 1개 (0, 0)
    - 주변 8칸 블랙아웃
    ↓
[사용자 인터랙션 대기]
    ↓
    ├─ [방 클릭] → [채팅 모달 오픈]
    │
    ├─ [드래그/스와이프] → [맵 이동]
    │
    └─ [노크 실행] → [새 방 생성 프로세스]
                        ↓
                   [인접 좌표 선택]
                        ↓
                   [새 이웃 생성]
                        ↓
                   [블랙아웃 해제 애니메이션]
                        ↓
                   [새 방 표시]
                        ↓
                   [맵 업데이트 완료]
```

---

## 상세 단계별 플로우

### Step 1: 메인 화면 진입
**트리거**: 온보딩 완료 또는 기존 사용자 로그인

**화면 전환 조건**:
- 온보딩 완료 직후 → 룸메이트 방 중앙 배치, 채팅 모달 자동 오픈
- 재방문 사용자 → 마지막 뷰포트 위치 복원

**기술 구현**:
```javascript
const hasOnboardingJustCompleted = sessionStorage.getItem('onboarding_just_completed');

if (hasOnboardingJustCompleted) {
  // 중앙 포커스, 채팅 자동 오픈
  mapCenter = { x: 0, y: 0 };
  openChatModal(roommatePersonaId);
  sessionStorage.removeItem('onboarding_just_completed');
} else {
  // 마지막 뷰포트 복원
  const savedViewport = localStorage.getItem('map_viewport');
  mapCenter = savedViewport ? JSON.parse(savedViewport) : { x: 0, y: 0 };
}
```

---

### Step 2: 최초 맵 렌더링
**목표**: 사용자의 현재 공간 상태 시각화

**화면 요소**:
- 캔버스/SVG 맵 컨테이너
- 룸메이트 방 블록 (중앙)
  - 방 이미지 (256x512 → 축소 표시)
  - 이름 태그: "룸메이트"
- 주변 8칸 블랙아웃 오버레이
  - 어두운 반투명 배경
  - 물음표(?) 아이콘
  - 호버 시: "노크하여 발견하기" 툴팁

**API 호출**:
```javascript
GET /api/v1/spatial/map

// Response:
{
  "rooms": [
    {
      "id": "room_001",
      "personaId": "persona_001",
      "personaName": "룸메이트",
      "position": { "x": 0, "y": 0 },
      "imageUrl": "https://cdn.knock.com/rooms/001.png",
      "isUnlocked": true
    }
  ],
  "viewportCenter": { "x": 0, "y": 0 },
  "zoomLevel": 1.0
}
```

**렌더링 시간**: 500ms - 1초

**소요 시간**: 2-3초 (사용자 화면 둘러보기)

---

### Step 3: 방 클릭 - 채팅 시작
**트리거**: 사용자가 방 블록 클릭

**화면 요소**:
- 방 블록 하이라이트 효과 (테두리 강조)
- 클릭 리플 애니메이션

**사용자 액션**:
- 방 클릭 → 채팅 모달 오픈

**API 호출**:
```javascript
// 채팅 시스템으로 전환
openChatModal(clickedRoom.personaId);

// 내부적으로 최근 대화 기록 로드
GET /api/v1/chat/history?personaId={personaId}&limit=20
```

**애니메이션**:
1. 방 블록 스케일 업 (1.0 → 1.05, 100ms)
2. 채팅 모달 슬라이드 인 (300ms)

**예외 처리**:
- 블랙아웃 영역 클릭 → "노크하여 발견하기" 툴팁 표시
- 네트워크 오류 → 재시도 안내

**소요 시간**: 즉시 (< 100ms)

---

### Step 4: 맵 드래그 이동
**트리거**: 마우스 드래그 또는 터치 스와이프

**인터랙션**:
1. 마우스 다운/터치 시작
2. 드래그 시작 (커서 변경: grab → grabbing)
3. 맵 실시간 이동
4. 마우스 업/터치 종료

**기술 구현**:
```javascript
let isDragging = false;
let startPos = { x: 0, y: 0 };
let currentOffset = { x: 0, y: 0 };

mapContainer.addEventListener('mousedown', (e) => {
  isDragging = true;
  startPos = { x: e.clientX, y: e.clientY };
  mapContainer.style.cursor = 'grabbing';
});

mapContainer.addEventListener('mousemove', (e) => {
  if (!isDragging) return;

  const deltaX = e.clientX - startPos.x;
  const deltaY = e.clientY - startPos.y;

  currentOffset.x += deltaX;
  currentOffset.y += deltaY;

  updateMapPosition(currentOffset);

  startPos = { x: e.clientX, y: e.clientY };
});

mapContainer.addEventListener('mouseup', () => {
  isDragging = false;
  mapContainer.style.cursor = 'grab';

  // 뷰포트 위치 저장
  localStorage.setItem('map_viewport', JSON.stringify(currentOffset));
});
```

**성능 요구사항**:
- 60 FPS 유지
- 드래그 지연 < 16ms

**모바일 최적화**:
- 터치 이벤트 지원 (touchstart, touchmove, touchend)
- 관성 스크롤 (momentum scrolling)

**소요 시간**: 5-10초 (탐험 행동)

---

### Step 5: 노크 실행 - 공간 확장 시작
**트리거**: 사용자가 "이웃 노크하기" 버튼 클릭 (노크 시스템)

**전제 조건**:
- 1일 1회 노크 가능 (또는 유료 플랜)
- 인접 빈 좌표 존재

**화면 요소**:
- 노크 버튼 → 로딩 상태 전환
- 진행 메시지: "새로운 이웃을 찾고 있어요..."

**API 호출**:
```javascript
POST /api/v1/knock/execute

// Response:
{
  "success": true,
  "newRoom": {
    "id": "room_002",
    "personaId": "persona_002",
    "personaName": "이웃 1",
    "position": { "x": 1, "y": 0 },
    "imageUrl": "https://cdn.knock.com/rooms/002.png",
    "isUnlocked": true
  },
  "message": "새로운 이웃을 발견했어요!"
}
```

**백엔드 프로세스**:
1. 기존 방 목록 조회 (500ms)
2. 인접 좌표 계산 (100ms)
3. 랜덤 위치 선택 (50ms)
4. 새 이웃 LLM 생성 (5초)
5. 방 이미지 할당 (500ms)
6. DB 저장 (200ms)

**총 소요 시간**: 6-7초

**예외 처리**:
- 노크 횟수 부족 → "오늘의 노크를 모두 사용했어요" 안내
- LLM 생성 실패 → 재시도 후 기본 템플릿 사용
- 인접 좌표 없음 → "더 이상 확장할 수 없어요" 안내

---

### Step 6: 블랙아웃 해제 애니메이션
**목표**: 새 방 발견의 극적인 경험 제공

**애니메이션 시퀀스**:

1. **뷰포트 자동 이동** (1초)
   - 새 방 위치가 화면 밖이면 부드럽게 스크롤
   - Easing: ease-in-out

```javascript
async function panToRoom(targetPos: { x: number; y: number }) {
  const startOffset = { ...currentOffset };
  const targetOffset = {
    x: -(targetPos.x * CELL_SIZE) + canvas.width / 2,
    y: -(targetPos.y * CELL_SIZE) + canvas.height / 2
  };

  await animate(startOffset, targetOffset, {
    duration: 1000,
    easing: 'ease-in-out',
    onUpdate: (offset) => {
      currentOffset = offset;
      updateMapPosition(offset);
    }
  });
}
```

2. **블랙아웃 페이드아웃** (500ms)
   - opacity: 0.9 → 0
   - 물음표 아이콘 사라짐

```javascript
const blackoutOverlay = document.getElementById(`blackout-${pos.x}-${pos.y}`);
await animate(blackoutOverlay, {
  opacity: [0.9, 0]
}, {
  duration: 500,
  easing: 'ease-out'
});
blackoutOverlay.remove();
```

3. **방 이미지 등장** (300ms)
   - scale: 0 → 1
   - opacity: 0 → 1
   - Easing: ease-out-back (튀는 효과)

```javascript
const roomBlock = createRoomBlock(newRoom);
roomBlock.style.transform = 'scale(0)';
roomBlock.style.opacity = '0';

await animate(roomBlock, {
  scale: [0, 1],
  opacity: [0, 1]
}, {
  duration: 300,
  easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)' // back ease
});
```

4. **이름 태그 페이드인** (200ms)
   - opacity: 0 → 1

```javascript
const nameLabel = roomBlock.querySelector('.room-label');
await animate(nameLabel, {
  opacity: [0, 1]
}, {
  duration: 200,
  delay: 100
});
```

5. **파티클 효과** (선택, 1초)
   - 반짝이는 작은 파티클 방출
   - 색상: 골드/옐로우

**전체 애니메이션 시간**: 2-3초

**사용자 피드백**:
- 토스트 메시지: "새로운 이웃 '이웃 1'을 발견했어요!"
- 햅틱 피드백 (모바일)

---

### Step 7: 맵 업데이트 완료
**상태 변경**:
- 새 방 블록 추가 완료
- 주변 인접 칸들 새로 블랙아웃 처리
- 노크 버튼 비활성화 (1일 1회 제한)

**화면 요소**:
- 새 방 블록 활성 상태
- 클릭 가능 상태 (채팅 시작 가능)
- 주변 8칸 중 기존 방 없는 칸 블랙아웃

**로컬 상태 업데이트**:
```javascript
// rooms 배열에 새 방 추가
rooms.push(newRoom);

// 주변 블랙아웃 재계산
updateBlackoutCells(rooms);

// 노크 상태 업데이트
knockAvailable = false;
nextKnockTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
```

**자동 액션 (선택)**:
- 3초 후 새 방 자동 하이라이트 ("클릭하여 대화 시작")
- 5초 후 첫 인사 푸시 알림 (비동기 노크 기능)

**소요 시간**: 즉시

---

## 전체 타임라인

| Step | 화면 | 평균 소요 시간 | 누적 시간 |
|------|------|----------------|-----------|
| 1 | 메인 화면 진입 | 0초 | 0초 |
| 2 | 최초 맵 렌더링 | 1초 | 1초 |
| 3 | 방 클릭 (선택) | 0초 | 1초 |
| 4 | 맵 드래그 (선택) | 10초 | 11초 |
| 5 | 노크 실행 | 7초 | 18초 |
| 6 | 블랙아웃 해제 애니메이션 | 3초 | 21초 |
| 7 | 맵 업데이트 완료 | 0초 | 21초 |

**핵심 경로**: 노크 실행 → 새 방 발견 (약 10초)

---

## 화면 구성

### 메인 맵 화면 레이아웃

```
┌──────────────────────────────────────────┐
│ [헤더: 로고, 프로필]                     │
├──────────────────────────────────────────┤
│                                          │
│   ┌───┐  ┌───┐  ┌───┐                   │
│   │ ? │  │ ? │  │ ? │   ← 블랙아웃     │
│   └───┘  └───┘  └───┘                   │
│                                          │
│   ┌───┐  ┌───────┐  ┌───┐               │
│   │ ? │  │       │  │ ? │               │
│   └───┘  │룸메이트│  └───┘               │
│          │ (0,0) │                      │
│          └───────┘                      │
│   ┌───┐  ┌───┐  ┌───┐                   │
│   │ ? │  │ ? │  │ ? │                   │
│   └───┘  └───┘  └───┘                   │
│                                          │
├──────────────────────────────────────────┤
│ [푸터: 노크 버튼, 미니맵]                │
└──────────────────────────────────────────┘
```

### 노크 후 확장된 맵

```
┌──────────────────────────────────────────┐
│ [헤더: 로고, 프로필]                     │
├──────────────────────────────────────────┤
│                                          │
│   ┌───┐  ┌───┐  ┌───┐  ┌───┐            │
│   │ ? │  │ ? │  │ ? │  │ ? │            │
│   └───┘  └───┘  └───┘  └───┘            │
│                                          │
│   ┌───┐  ┌───────┐  ┌───────┐  ┌───┐    │
│   │ ? │  │       │  │       │  │ ? │    │
│   └───┘  │룸메이트│  │ 이웃1 │  └───┘    │
│          │ (0,0) │  │ (1,0) │ ← 새 방   │
│          └───────┘  └───────┘           │
│   ┌───┐  ┌───┐  ┌───┐  ┌───┐            │
│   │ ? │  │ ? │  │ ? │  │ ? │            │
│   └───┘  └───┘  └───┘  └───┘            │
│                                          │
├──────────────────────────────────────────┤
│ [푸터: 노크 불가 (24시간 후)]            │
└──────────────────────────────────────────┘
```

---

## 모바일 최적화 플로우

### 터치 제스처

1. **싱글 탭**: 방 선택/채팅
2. **드래그**: 맵 이동
3. **핀치 줌**: 확대/축소 (Phase 2)
4. **더블 탭**: 해당 위치 줌 인

### 화면 크기 대응

**모바일 (< 768px)**:
- 방 블록 크기: 120px
- 드래그 감도 증가
- 풀스크린 맵

**태블릿 (768px - 1024px)**:
- 방 블록 크기: 150px
- 사이드바 패널 (미니맵)

**데스크톱 (> 1024px)**:
- 방 블록 크기: 200px
- 미니맵, 상세 정보 패널

---

## 에지 케이스 플로우

### 케이스 1: 인접 좌표 없음 (최대 확장)
1. 노크 버튼 클릭
2. 서버 응답: "더 이상 확장할 수 없습니다"
3. 안내 모달 표시
4. 기존 이웃과 대화 유도

### 케이스 2: 노크 중 네트워크 끊김
1. 노크 요청 전송
2. 타임아웃 (10초)
3. 재시도 버튼 표시
4. 재시도 또는 취소

### 케이스 3: 동시 접속 시 맵 동기화
1. 웹소켓/폴링으로 맵 변경 감지
2. 새 방 자동 추가 (애니메이션 없이)
3. 토스트: "맵이 업데이트되었습니다"

---

## A/B 테스트 아이디어

### Test 1: 블랙아웃 스타일
- **A**: 완전 검은색 (0.9 opacity)
- **B**: 블러 처리 (반투명 블러)

### Test 2: 애니메이션 속도
- **A**: 빠른 애니메이션 (1.5초 전체)
- **B**: 느린 애니메이션 (3초 전체, 현재)

### Test 3: 새 방 자동 오픈
- **A**: 새 방 생성 후 자동으로 채팅 모달 오픈
- **B**: 사용자가 직접 클릭해야 오픈 (현재)

**측정 지표**: 새 방 발견 후 대화 시작률, 노크 재사용률
