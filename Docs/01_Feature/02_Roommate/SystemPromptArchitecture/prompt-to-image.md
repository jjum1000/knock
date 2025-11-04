# 프롬프트 → 이미지 생성 (Prompt to Image)

## 개요

시스템 프롬프트에서 추출한 **성격, 욕구, 과거, 전략**을 바탕으로 룸메이트의 **시각적 표현**을 생성하는 파이프라인입니다.

**핵심 원칙**: 겉모습이 아닌 **내면(WHY)**에서 시작하여 자연스럽게 외모, 스타일, 공간이 발현되도록 합니다.

```
시스템 프롬프트 (내면)
    ↓
성격 특성 추출
    ↓
시각적 요소 매핑
    ↓
이미지 생성 프롬프트
    ↓
룸메이트 + 방 시각화
```

---

## 1. 내면 → 외면 매핑 철학

### 잘못된 접근 ❌

```
"개발자 캐릭터니까"
→ 안경 쓰고, 후드티 입고, 노트북 들고
    ↓
스테레오타입, 1차원적
```

### 올바른 접근 ✅

```
내면 분석:
- 소속 욕구 (0.8): 외로움 → 따뜻한 색감, 부드러운 선
- 왕따 트라우마: 방어적 → 편안한 옷, 큰 후드
- 게임 커뮤니티: 정체성 → 게임 관련 소품 자연스럽게
- 인정 욕구 (0.7): 조용한 자부심 → 깔끔한 공간, 실력의 흔적
    ↓
자연스럽고 입체적
```

---

## 2. 성격 → 시각적 요소 매핑

### 2.1 욕구별 시각적 언어

| 근원적 욕구 | 시각적 표현 | 색상 | 선 스타일 | 공간 |
|------------|------------|------|----------|------|
| **소속 욕구** | 따뜻한 느낌, 부드러운 선, 연결감 | 따뜻한 색 (주황, 노랑, 베이지) | 곡선, 부드러움 | 편안하고 아늑한 공간 |
| **인정 욕구** | 깔끔함, 정돈됨, 성취의 흔적 | 차분한 색 (파랑, 회색, 흰색) | 명확한 선, 정리된 구조 | 미니멀, 실력의 증거 (트로피, 포트폴리오) |
| **자율 욕구** | 개성, 독특함, 나만의 스타일 | 개성 있는 색 조합 | 자유로운 배치 | 규칙 없는 배치, 나만의 규칙 |
| **성장 욕구** | 진행 중인 프로젝트, 책, 메모 | 생동감 있는 색 (초록, 청록) | 역동적 | 배움의 흔적 (책, 노트, 화이트보드) |
| **안전 욕구** | 질서, 대칭, 통제된 환경 | 중립색 (회색, 베이지, 흰색) | 직선, 대칭 | 정돈된 공간, 예측 가능한 배치 |
| **의미 욕구** | 상징, 깊이, 철학적 요소 | 깊은 색 (남색, 보라, 검정) | 의도적 배치 | 의미 있는 오브젝트 (예술, 책) |

### 2.2 성격 특성별 디테일

#### 공감적 (Empathetic)

```yaml
visual_traits:
  body_language: "부드러운 자세, 열린 팔"
  expression: "따뜻한 미소, 부드러운 눈빛"
  clothing: "편안한 옷, 부드러운 소재 (니트, 면)"
  color_palette: ["#FFE5B4", "#FFDAB9", "#F5DEB3"]  # 따뜻한 베이지/피치
  room_items:
    - "포근한 담요"
    - "아늑한 조명"
    - "식물"
  atmosphere: "따뜻하고 안전한 느낌"
```

#### 내향적이지만 호기심 많은 (Introverted but Curious)

```yaml
visual_traits:
  body_language: "조용하지만 관심 있는 자세"
  expression: "생각하는 표정, 관찰하는 눈빛"
  clothing: "편안하지만 개성 있는 (후드 + 독특한 디자인)"
  color_palette: ["#6B8E99", "#778899", "#B0C4DE"]  # 차분한 청회색
  room_items:
    - "책 더미"
    - "관심사 컬렉션 (피규어, 포스터)"
    - "헤드폰"
  atmosphere: "조용하지만 풍성한 내면세계"
```

#### 완벽주의적 (Perfectionist)

```yaml
visual_traits:
  body_language: "정돈된 자세, 긴장감"
  expression: "집중하는 눈빛, 진지한 표정"
  clothing: "깔끔한 옷, 정리된 스타일"
  color_palette: ["#F8F8F8", "#E8E8E8", "#4A90E2"]  # 흰색/회색 + 포인트
  room_items:
    - "정리된 책꽂이"
    - "레이블이 붙은 수납함"
    - "완료된 체크리스트"
  atmosphere: "깔끔하고 통제된 공간"
```

### 2.3 트라우마/과거 → 방어적 요소

| 트라우마/경험 | 시각적 방어 요소 | 설명 |
|--------------|-----------------|------|
| **왕따 경험** | 큰 후드, 헤드폰, 개인 공간 강조 | 자신을 감싸는 느낌의 옷/공간 |
| **조건부 사랑** | 완벽한 정돈, 성취 증거 | "내가 충분하다"는 증거 수집 |
| **감정 무시** | 감정 표현 아이템 (일기, 예술) | 억압된 감정의 출구 |
| **통제 상실** | 대칭적 배치, 라벨링 | 통제감 회복 |
| **거부 경험** | 소속 증거 (팀 굿즈, 커뮤니티 상징) | 소속의 증거 보존 |

---

## 3. 이미지 생성 프롬프트 구조

### 3.1 프롬프트 레이어

```
이미지 생성 프롬프트 =
  캐릭터 레이어 (40%) +
  환경 레이어 (30%) +
  분위기 레이어 (20%) +
  스타일 레이어 (10%)
```

### 3.2 레이어별 구조

#### Layer 1: 캐릭터 (40%)

```markdown
### 캐릭터 디스크립션

**기본 정보**:
- 나이대: {20대 초반/중반/후반}
- 체형: {자연스러운 묘사}
- 자세: {성격 반영}

**표정/눈빛**:
- 표정: {성격 특성 반영}
- 눈빛: {내면 상태 반영}

**의상**:
- 스타일: {편안함 vs 정돈 vs 개성}
- 소재: {성격 반영 - 부드러움 vs 딱딱함}
- 색상: {욕구 기반 팔레트}
- 디테일: {정체성 표현 - 로고, 패치, 액세서리}

**액세서리**:
- {성격/정체성 반영 아이템}
```

#### Layer 2: 환경 (30%)

```markdown
### 방/공간 디스크립션

**공간 구조**:
- 레이아웃: {정돈 vs 자유로움}
- 조명: {따뜻함 vs 차가움 vs 중립}
- 색감: {욕구 기반 팔레트}

**가구/오브젝트**:
- 책상: {깔끔함 vs 어지러움의 정도}
- 책장: {정리 vs 쌓여있음}
- 침대: {정돈 vs 편안함}

**개성 아이템** (과거/정체성 반영):
- {커뮤니티 관련 아이템}
- {성취 증거 아이템}
- {방어/안전 아이템}
- {취미/관심사 아이템}

**식물/생물**:
- {성격 반영 - 돌봄 vs 방치}
```

#### Layer 3: 분위기 (20%)

```markdown
### 무드/분위기

**전체 느낌**:
- {따뜻한 / 차분한 / 역동적 / 고요한}

**감정 톤**:
- {안전함 / 외로움 / 몰입 / 평화로움}

**시간대**:
- {아침 / 낮 / 저녁 / 밤} - 활동 패턴 반영

**빛의 질감**:
- {부드러운 자연광 / 따뜻한 전구 / 차가운 모니터 빛}
```

#### Layer 4: 스타일 (10%)

```markdown
### 아트 스타일

**스타일**:
- {픽셀아트 / 일러스트 / 3D / 만화풍}

**선 스타일**:
- {부드러운 곡선 / 명확한 직선 / 자유로운 스케치}

**색감 처리**:
- {채도 높음 / 파스텔 / 차분한 무채색}

**디테일 레벨**:
- {단순화 / 중간 / 매우 디테일}
```

---

## 4. 실전 예시: 민준 (Z세대 개발자 게이머)

### 4.1 내면 분석 (시스템 프롬프트에서 추출)

```yaml
character_essence:
  name: "민준"

  needs:
    belonging: 0.8      # 소속 욕구 - 외로움, 연결 갈망
    recognition: 0.7    # 인정 욕구 - 실력으로 증명
    growth: 0.6         # 성장 욕구
    solitude: 0.5       # 고독도 필요

  trauma:
    - "중학교 왕따" → 방어적, 편안함 추구
    - "게임 커뮤니티 발견" → 정체성, 소속
    - "코딩 인정" → 자부심, 성취

  personality:
    surface: ["친근함", "유머러스", "빠름"]
    shadow: ["외로움", "불안", "깊은 대화 회피"]

  strategies:
    - "커뮤니티 언어 사용" → 게이머 굿즈, 밈 포스터
    - "유머로 방어" → 가벼운 분위기
    - "실력 과시" → 프로젝트 흔적
```

### 4.2 시각적 요소 추출

#### 캐릭터 비주얼

```yaml
character_visual:
  age: "20대 중반"

  posture: "편안하지만 약간 웅크린 자세 (방어적)"

  expression:
    default: "부드러운 미소, 친근함"
    eyes: "따뜻하지만 약간 피곤한 눈빛 (밤샘의 흔적)"
    detail: "웃을 때 진짜 행복해 보이지만, 가끔 멍한 순간"

  clothing:
    top: "오버사이즈 후드티 (편안함 + 방어)"
    detail: "게임 로고나 개발 컨퍼런스 굿즈"
    color: ["#4A5568", "#718096", "#FFA500"]  # 차분한 회색 + 주황 포인트
    style: "편안하고 실용적, 커뮤니티 정체성 드러남"

  accessories:
    - "헤드폰 (목에 걸침 or 머리에 씀)"
    - "손목 스트랩 (게임 이벤트)"
    - "심플한 시계"

  hair: "약간 헝클어진 단발 (관리 안 함, 자연스러움)"
```

#### 환경 비주얼

```yaml
room_visual:
  layout: "약간 어질러졌지만 자기 규칙 있음"

  lighting:
    primary: "모니터의 차가운 빛 (청백색)"
    secondary: "따뜻한 간접 조명 (주황빛)"
    mood: "밤의 고요함, 집중과 안전감"

  desk:
    state: "사용 중 - 깔끔하진 않지만 본인은 아는 배치"
    items:
      - "듀얼 모니터 (코드 + 게임/영상)"
      - "기계식 키보드 (RGB 조명)"
      - "게이밍 마우스"
      - "커피 머그 (여러 개)"
      - "포스트잇 (TODO, 버그 메모)"
      - "헤드폰 스탠드"

  walls:
    - "게임 포스터 (인디 게임)"
    - "개발 컨퍼런스 스티커 보드"
    - "화이트보드 (알고리즘 낙서)"

  shelves:
    - "기술 서적 (쌓여 있음, 읽는 중)"
    - "피규어 (게임 캐릭터)"
    - "트로피/배지 (해커톤, 게임 랭크)"

  floor:
    - "빈백 소파 (편안함)"
    - "케이블 정리 안 됨 (실용주의)"

  personal_touches:
    - "게임 길드 깃발 (소속의 증거)"
    - "커뮤니티 밈 프린트 (유머)"
    - "직접 만든 프로젝트 스크린샷 (자부심)"
```

#### 분위기

```yaml
atmosphere:
  time: "밤 11시"
  mood: "고요하고 몰입, 안전한 나만의 시간"
  emotion: "편안함 + 약간의 외로움 + 집중"

  color_palette:
    dominant: ["#2D3748", "#4A5568"]  # 어두운 청회색 (밤)
    accent: ["#FFA500", "#4299E1"]    # 따뜻한 주황 (조명) + 파랑 (모니터)
    detail: ["#68D391", "#FC8181"]    # 초록 (코드) + 빨강 (게임)

  light_quality:
    - "모니터: 차가운 청백색 빛"
    - "간접조명: 따뜻한 주황빛"
    - "키보드 RGB: 은은한 무지개색"
    - "창문: 도시의 희미한 불빛"
```

### 4.3 최종 이미지 생성 프롬프트

```markdown
# 민준 - 룸메이트 이미지 생성 프롬프트

## Character (40%)

A young man in his mid-20s with a warm but slightly tired expression, sitting in a relaxed yet slightly curled posture (defensive comfort). Wearing an oversized hoodie with a game developer conference logo, in muted gray (#4A5568) with orange accents (#FFA500). Soft smile with genuine warmth but occasionally distant eyes. Slightly messy short hair, natural and uncared-for. Wearing headphones around neck. Comfortable, practical style that shows community identity.

**Body language**: Relaxed in his chair, one leg tucked under, leaning slightly toward monitor - focused but comfortable.

**Expression**: Friendly smile when engaged, but moments of contemplative loneliness. Eyes show intelligence and curiosity, with traces of late nights.

**Details**:
- Gaming event wrist strap
- Simple watch
- Comfortable socks
- Casual but intentional presentation

## Environment (30%)

**Room setting**: Small but personal bedroom/workspace at night (11 PM). Organized chaos - messy but has its own logic.

**Desk setup**:
- Dual monitors (left: code editor with syntax highlighting, right: Discord/game)
- Mechanical RGB keyboard with gentle rainbow glow
- Gaming mouse
- Multiple coffee mugs (evidence of long sessions)
- Post-it notes with TODO lists and bug notes
- Headphone stand

**Walls**:
- Indie game posters (thoughtfully chosen)
- Developer conference sticker board (achievement wall)
- Whiteboard with algorithm sketches and diagrams

**Shelves**:
- Stack of technical books (in use, bookmarks visible)
- Gaming character figurines (carefully displayed)
- Hackathon trophies and game rank badges

**Floor/Furniture**:
- Bean bag chair (comfort zone)
- Cables not perfectly organized (pragmatic)
- Soft rug

**Personal identity items**:
- Gaming guild flag on wall (proof of belonging)
- Printed community memes (humor as defense)
- Screenshots of own projects (quiet pride)
- Small plant (trying to care, partially successful)

## Atmosphere (20%)

**Mood**: Quiet immersion, safe personal time, comfortable solitude with hints of loneliness

**Time**: Late night (11 PM), the world is quiet

**Lighting**:
- Primary: Cool blue-white glow from monitors (#4299E1)
- Secondary: Warm orange indirect lighting (#FFA500)
- Accent: Gentle RGB keyboard glow
- Background: Dim city lights through window

**Emotional tone**:
- Safe and comfortable in own space
- Focused and engaged
- Slight loneliness underneath the comfort
- Pride in work and identity

**Color palette**:
- Base: Dark blue-gray (#2D3748, #4A5568) - night atmosphere
- Warm accent: Orange (#FFA500) - indirect light, comfort
- Cool accent: Blue (#4299E1) - monitor glow, technology
- Detail: Green (#68D391) - code syntax, success
- Detail: Red/pink (#FC8181) - game UI, alerts

## Art Style (10%)

**Style**: Soft digital illustration with gentle pixel art influences, warm and approachable

**Line style**: Soft curves for character (empathy), cleaner lines for tech items (precision)

**Color treatment**:
- Slightly desaturated overall (nighttime, calm)
- Warm and cool contrast (orange light vs blue monitor)
- Gentle glow effects on screens and RGB

**Detail level**: Medium-high - enough detail to see personality in objects, but not overwhelming

**Composition**:
- Character slightly off-center, facing monitors
- Camera angle: Slight side view, intimate but not intrusive
- Focus: Character and immediate workspace, room slightly softer
- Feeling: "Peeking into someone's safe personal space"

---

## Prompt Engineering Tags

```
Style: digital illustration, soft lighting, cozy workspace, nighttime scene
Mood: comfortable solitude, focused work, gentle loneliness, safe space
Character: young developer, warm personality, slightly introverted, gamer identity
Environment: personal bedroom workspace, organized chaos, identity-rich space
Lighting: monitor glow, warm indirect light, RGB accents, night atmosphere
Color: dark blue-gray base, warm orange accent, cool blue monitor, gentle glow
Composition: intimate third-person view, slightly off-center, focused on character and workspace
Details: gaming peripherals, developer books, community memorabilia, achievement evidence
Emotion: belonging through community, quiet pride, comfortable but slightly lonely
```

---

## Image Generation Prompt (Compact)

**For DALL-E / Midjourney / Stable Diffusion**:

```
A young man in his mid-20s sitting at a dual-monitor setup in a cozy bedroom workspace at night. Wearing an oversized gray hoodie with game logo, headphones around neck, warm smile with slightly tired eyes. Desk has mechanical RGB keyboard, multiple coffee mugs, post-it notes. Walls decorated with indie game posters, developer stickers, whiteboard with code sketches. Shelves with tech books, gaming figurines, hackathon trophies. Bean bag chair in corner, guild flag on wall. Lighting: cool blue monitor glow mixed with warm orange indirect lighting, gentle RGB keyboard accent. Atmosphere: comfortable solitude, focused but lonely, safe personal space. Digital illustration style, soft curves, medium detail, slightly desaturated colors with warm-cool contrast. Intimate side-view angle, organized chaos aesthetic. Colors: dark blue-gray (#2D3748), warm orange (#FFA500), cool blue (#4299E1), accent green and red from screens. Mood: belonging, quiet pride, comfortable loneliness, nighttime focus.

Style: soft digital illustration, cozy workspace aesthetic, nighttime scene, gentle glow effects, personal identity-rich environment
```
```

---

## 5. 욕구 벡터 → 색상 팔레트 자동 생성

### 5.1 욕구별 색상 매핑

```javascript
const needColorMapping = {
  survival: {
    primary: ["#8B4513", "#A0522D"],      // 갈색 - 땅, 안정
    accent: ["#228B22", "#006400"],       // 초록 - 생명
    mood: "grounded, safe"
  },

  belonging: {
    primary: ["#FFE5B4", "#FFDAB9"],      // 따뜻한 베이지/피치
    accent: ["#FFA500", "#FF8C00"],       // 주황 - 따뜻함
    mood: "warm, connected"
  },

  recognition: {
    primary: ["#4A90E2", "#5DADE2"],      // 파랑 - 명료함
    accent: ["#FFD700", "#FFA500"],       // 금색 - 성취
    mood: "clear, accomplished"
  },

  autonomy: {
    primary: ["#6B46C1", "#9B59B6"],      // 보라 - 독립
    accent: ["#E74C3C", "#C0392B"],       // 빨강 - 주장
    mood: "independent, strong"
  },

  growth: {
    primary: ["#68D391", "#48BB78"],      // 초록 - 성장
    accent: ["#4299E1", "#3182CE"],       // 청록 - 역동
    mood: "dynamic, evolving"
  },

  meaning: {
    primary: ["#2C3E50", "#34495E"],      // 남색 - 깊이
    accent: ["#8E44AD", "#9B59B6"],       // 보라 - 신비
    mood: "deep, philosophical"
  }
};
```

### 5.2 벡터 조합 → 팔레트 생성

```javascript
function generatePalette(needsVector) {
  // 욕구 벡터 정렬 (강도순)
  const sortedNeeds = Object.entries(needsVector)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);  // 상위 3개

  // 팔레트 생성
  const palette = {
    // 주 욕구의 primary color
    dominant: needColorMapping[sortedNeeds[0][0]].primary,

    // 부 욕구의 accent color
    accent: needColorMapping[sortedNeeds[1][0]].accent,

    // 3차 욕구의 detail color
    detail: needColorMapping[sortedNeeds[2][0]].accent,

    // 역설 조합
    paradox: sortedNeeds[0][1] > 0.6 && sortedNeeds[1][1] > 0.5
      ? {
          contrast: "high",
          blend: "mix warm and cool tones"
        }
      : {
          contrast: "low",
          blend: "harmonious similar tones"
        },

    // 전체 무드
    mood: needColorMapping[sortedNeeds[0][0]].mood
  };

  return palette;
}

// 예시: 민준
const minjunNeeds = {
  belonging: 0.8,
  recognition: 0.7,
  growth: 0.6,
  solitude: 0.5
};

const minjunPalette = generatePalette(minjunNeeds);
/*
{
  dominant: ["#FFE5B4", "#FFDAB9"],  // 따뜻한 베이지 (소속)
  accent: ["#FFD700", "#FFA500"],    // 금색/주황 (인정)
  detail: ["#4299E1", "#3182CE"],    // 청록 (성장)
  paradox: {
    contrast: "high",
    blend: "mix warm (belonging) and cool (recognition) tones"
  },
  mood: "warm, connected"
}
*/
```

---

## 6. 성격 특성 → 공간 레이아웃

### 6.1 정돈도 스펙트럼

```javascript
function determineOrganizationLevel(character) {
  const {
    safety,      // 안전 욕구 - 통제
    autonomy,    // 자율 욕구 - 자기 규칙
    growth       // 성장 욕구 - 진행형
  } = character.needs;

  const organizationScore =
    (safety * 0.5) +       // 안전 욕구 높으면 정돈
    (autonomy * -0.3) +    // 자율 욕구 높으면 자기 방식
    (growth * -0.2);       // 성장 욕구 높으면 진행형 어질러짐

  if (organizationScore > 0.6) {
    return {
      level: "highly_organized",
      description: "모든 것이 제자리, 라벨링, 대칭",
      visual: "clean desk, labeled containers, symmetry"
    };
  } else if (organizationScore > 0.3) {
    return {
      level: "organized_casual",
      description: "깔끔하지만 살아있는 느낌",
      visual: "tidy but lived-in, intentional placement"
    };
  } else if (organizationScore > -0.3) {
    return {
      level: "organized_chaos",
      description: "어질러졌지만 본인은 아는 배치",
      visual: "messy but has logic, personal system"
    };
  } else {
    return {
      level: "creative_chaos",
      description: "자유로운 배치, 예상 못함",
      visual: "free placement, unexpected combinations"
    };
  }
}
```

### 6.2 개인 아이템 선택

```javascript
function selectPersonalItems(character) {
  const items = [];

  // 소속 욕구 → 커뮤니티 증거
  if (character.needs.belonging > 0.6) {
    items.push({
      category: "community_proof",
      examples: [
        "guild flag / team poster",
        "community event photos",
        "group chat screenshots (framed)",
        "membership badges"
      ]
    });
  }

  // 인정 욕구 → 성취 증거
  if (character.needs.recognition > 0.6) {
    items.push({
      category: "achievement_proof",
      examples: [
        "trophies / medals",
        "certificates on wall",
        "project portfolio (displayed)",
        "skill badges / rank indicators"
      ]
    });
  }

  // 성장 욕구 → 배움의 흔적
  if (character.needs.growth > 0.5) {
    items.push({
      category: "learning_traces",
      examples: [
        "books with bookmarks",
        "notes and diagrams",
        "half-finished projects",
        "whiteboard with sketches"
      ]
    });
  }

  // 트라우마 → 방어 아이템
  if (character.trauma.includes("bullying")) {
    items.push({
      category: "comfort_defense",
      examples: [
        "oversized hoodie (on chair)",
        "noise-canceling headphones",
        "privacy screen",
        "cozy blanket"
      ]
    });
  }

  // 정체성 → 심볼
  if (character.identity) {
    items.push({
      category: "identity_symbols",
      examples: character.identity.map(id => `${id} related items`)
    });
  }

  return items;
}
```

---

## 7. 자동화 파이프라인

### 7.1 전체 프로세스

```javascript
async function generateRoommateImage(systemPrompt) {
  // Step 1: 시스템 프롬프트 파싱
  const character = parseSystemPrompt(systemPrompt);

  // Step 2: 시각적 요소 추출
  const visual = {
    palette: generatePalette(character.needs),
    layout: determineOrganizationLevel(character),
    items: selectPersonalItems(character),
    atmosphere: determineAtmosphere(character),
    style: selectArtStyle(character)
  };

  // Step 3: 이미지 프롬프트 생성
  const imagePrompt = buildImagePrompt(character, visual);

  // Step 4: 이미지 생성 API 호출
  const image = await generateImage(imagePrompt);

  return {
    image,
    metadata: {
      character: character.name,
      needs: character.needs,
      palette: visual.palette,
      prompt: imagePrompt
    }
  };
}
```

### 7.2 프롬프트 빌더

```javascript
function buildImagePrompt(character, visual) {
  const prompt = {
    // Character layer (40%)
    character: buildCharacterDescription(character, visual),

    // Environment layer (30%)
    environment: buildEnvironmentDescription(character, visual),

    // Atmosphere layer (20%)
    atmosphere: buildAtmosphereDescription(character, visual),

    // Style layer (10%)
    style: buildStyleDescription(visual)
  };

  // Combine into single prompt
  return `
${prompt.character}

${prompt.environment}

${prompt.atmosphere}

${prompt.style}

Color palette: ${visual.palette.dominant.join(', ')} (dominant), ${visual.palette.accent.join(', ')} (accent)
Mood: ${visual.palette.mood}
  `.trim();
}

function buildCharacterDescription(character, visual) {
  const age = character.age || "mid-20s";
  const personality = character.personality.surface.join(", ");

  return `
A person in their ${age} with ${personality} demeanor.
${character.appearance.posture}
${character.appearance.expression}
Wearing ${character.appearance.clothing}
${character.appearance.accessories.join(', ')}
  `.trim();
}

function buildEnvironmentDescription(character, visual) {
  const org = visual.layout.description;
  const items = visual.items.flatMap(i => i.examples).join(', ');

  return `
${org} personal workspace.
Room items: ${items}
Lighting: ${visual.atmosphere.lighting}
  `.trim();
}
```

---

## 8. 품질 체크리스트

### 이미지 생성 전 검증

- [ ] **내면에서 출발**: 성격/욕구에서 시작했는가? (스테레오타입 X)
- [ ] **역설 표현**: 충돌하는 욕구가 시각적으로 드러나는가?
- [ ] **개인사 반영**: 트라우마/경험이 공간/아이템에 나타나는가?
- [ ] **색상 조화**: 욕구 벡터 기반 팔레트를 사용하는가?
- [ ] **자연스러움**: 억지로 구겨넣은 요소가 없는가?
- [ ] **입체성**: 1차원적이지 않고 복잡한 인간으로 보이는가?

### 이미지 생성 후 검증

- [ ] **성격 일치**: 이미지를 보고 성격이 느껴지는가?
- [ ] **스토리 존재**: 이미지에서 과거/경험이 추론 가능한가?
- [ ] **감정 전달**: 설정한 무드가 전달되는가?
- [ ] **독창성**: 스테레오타입과 다른 독특한 캐릭터인가?

---

## 9. 예시 갤러리 (다양한 욕구 조합)

### 예시 1: 안전 + 성장 역설

```yaml
character: "지안"
needs:
  safety: 0.8      # 안전 욕구
  growth: 0.7      # 성장 욕구

paradox: "안전하게 성장하고 싶다"

visual:
  space: "깔끔하게 정돈되었지만, 진행 중인 프로젝트 많음"
  colors: ["#F8F8F8", "#68D391"]  # 흰색 (안전) + 초록 (성장)
  items:
    - "체크리스트 (완료된 것 많음)"
    - "새 책 (아직 안 읽음)"
    - "안전한 환경 속 새로운 시도"

mood: "조심스럽지만 도전하는"
```

### 예시 2: 소속 + 자율 역설

```yaml
character: "하은"
needs:
  belonging: 0.8   # 소속 욕구
  autonomy: 0.7    # 자율 욕구

paradox: "함께하되 독립적으로"

visual:
  space: "협업 도구 많지만 개인 공간 확실"
  colors: ["#FFE5B4", "#6B46C1"]  # 따뜻한 베이지 (소속) + 보라 (자율)
  items:
    - "팀 사진"
    - "개인 작업물 (나만의 스타일)"
    - "공유 가능하지만 개성 있는"

mood: "연결되었지만 독립적인"
```

---

## 10. 관련 문서

- [시스템 프롬프트 아키텍처](./README.md)
- [벡터 조합 규칙](./vector-composition-rules.md)
- [대화 방법론](../conversation-methodologies/README.md)

---

## 버전 히스토리

- v1.0 (2025-10-28): 초기 문서 작성
