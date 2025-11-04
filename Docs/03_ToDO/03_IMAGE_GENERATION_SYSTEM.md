# 이미지 생성 시스템 상세 설계
**작성일**: 2025-10-28
**목적**: 욕구 벡터 기반 룸메이트 방 이미지 자동 생성 시스템 구현

---

## 📋 개요

캐릭터의 **내면(WHY)**에서 시작하여 자연스럽게 외모, 스타일, 공간이 발현되도록 하는 이미지 생성 파이프라인을 구현합니다.

---

## 🎯 핵심 원칙

### 1. 내면 → 외면 발현
```
근원적 욕구 (WHY)
    ↓
트라우마/경험
    ↓
시각적 요소 자동 선택
    ↓
일관성 있는 이미지
```

### 2. 편향 회피
- 스테레오타입 직접 사용 금지
- 욕구 벡터를 시각적 언어로 변환 (간접 매핑)
- 같은 욕구 → 다양한 시각적 표현 가능

### 3. 하이브리드 시스템
- **결정론적**: 욕구 → 색상/분위기 (일관성)
- **확률론적**: 구체적 오브젝트/스타일 (다양성)

---

## 🔄 전체 파이프라인

```
[캐릭터 욕구 벡터]
        ↓
┌─────────────────────────────────────┐
│ Step 1: 욕구 → 시각적 언어 매핑      │
│ - 색상 팔레트 선택                   │
│ - 공간 스타일 정의                   │
│ - 분위기 결정                        │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ Step 2: 트라우마 → 방어 요소         │
│ - 보호 아이템 추가                   │
│ - 안전 공간 요소                     │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ Step 3: 아키타입 기반 오브젝트 선택  │
│ - 확률적 오브젝트 샘플링             │
│ - 일관성 검증                        │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ Step 4: 이미지 프롬프트 조립         │
│ - 구조 + 분위기 병합                 │
│ - 네거티브 프롬프트 추가             │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ Step 5: AI 이미지 생성               │
│ - Gemini Imagen API 호출             │
│ - 품질 검증                          │
│ - Fallback 처리                      │
└─────────────────────────────────────┘
```

---

## Step 1: 욕구 → 시각적 언어 매핑

### 매핑 테이블

```typescript
interface VisualLanguage {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  space: {
    layout: string;
    organization: string;
    openness: string;
  };
  lighting: {
    type: string;
    intensity: string;
    source: string;
  };
  mood: string;
}

const NEED_TO_VISUAL: Record<string, VisualLanguage> = {
  // 소속 욕구 (Belonging)
  belonging: {
    colors: {
      primary: 'warm orange tones',
      secondary: 'soft yellow',
      accent: 'gentle pink or peach'
    },
    space: {
      layout: 'clustered and intimate',
      organization: 'comfortable mess',
      openness: 'cozy enclosed feeling'
    },
    lighting: {
      type: 'warm natural light',
      intensity: 'soft and gentle',
      source: 'window with curtains, warm lamp'
    },
    mood: 'Safe, welcoming, embracing atmosphere where you want to stay'
  },

  // 인정 욕구 (Recognition)
  recognition: {
    colors: {
      primary: 'calm navy blue',
      secondary: 'professional gray',
      accent: 'white or silver highlights'
    },
    space: {
      layout: 'symmetrical and balanced',
      organization: 'highly organized',
      openness: 'open and showcasing'
    },
    lighting: {
      type: 'bright focused light',
      intensity: 'clear and sharp',
      source: 'desk lamp, spotlight on achievements'
    },
    mood: 'Professional, accomplished, competent atmosphere with visible proof of worth'
  },

  // 자율 욕구 (Autonomy)
  autonomy: {
    colors: {
      primary: 'deep purple or indigo',
      secondary: 'unique color combinations',
      accent: 'unexpected contrasts'
    },
    space: {
      layout: 'asymmetric and personal',
      organization: 'organized chaos',
      openness: 'personal boundaries defined'
    },
    lighting: {
      type: 'customized lighting',
      intensity: 'controllable mood lighting',
      source: 'RGB lights, dimmer switches, personal preference'
    },
    mood: 'Independent, unique, rule-breaking atmosphere with personal expression'
  },

  // 성장 욕구 (Growth)
  growth: {
    colors: {
      primary: 'vibrant green',
      secondary: 'energetic blue',
      accent: 'bright yellow or white'
    },
    space: {
      layout: 'expandable and evolving',
      organization: 'work-in-progress feel',
      openness: 'open for new additions'
    },
    lighting: {
      type: 'natural bright light',
      intensity: 'energizing brightness',
      source: 'large window, daylight, plant-growing lamps'
    },
    mood: 'Dynamic, evolving, learning-in-progress atmosphere with room to grow'
  },

  // 안전 욕구 (Survival)
  survival: {
    colors: {
      primary: 'neutral beige or taupe',
      secondary: 'calm earth tones',
      accent: 'minimal contrast'
    },
    space: {
      layout: 'predictable and routine',
      organization: 'extremely tidy',
      openness: 'protected and enclosed'
    },
    lighting: {
      type: 'consistent ambient light',
      intensity: 'moderate no extremes',
      source: 'overhead stable lighting, night light'
    },
    mood: 'Safe, predictable, calm atmosphere with no surprises'
  },

  // 의미 욕구 (Meaning)
  meaning: {
    colors: {
      primary: 'deep navy or midnight blue',
      secondary: 'rich burgundy or purple',
      accent: 'gold or bronze highlights'
    },
    space: {
      layout: 'thoughtful and intentional',
      organization: 'meaningful arrangement',
      openness: 'contemplative spaces'
    },
    lighting: {
      type: 'dramatic focused lighting',
      intensity: 'soft shadows and highlights',
      source: 'candles, reading lamp, symbolic light'
    },
    mood: 'Deep, contemplative, purposeful atmosphere with symbolic elements'
  }
};
```

### 복합 욕구 블렌딩

```typescript
function blendVisualLanguages(
  needs: Array<{need: string; intensity: number}>
): VisualLanguage {

  // 강도 기반 가중 평균
  const totalIntensity = needs.reduce((sum, n) => sum + n.intensity, 0);

  const blended: VisualLanguage = {
    colors: {primary: '', secondary: '', accent: ''},
    space: {layout: '', organization: '', openness: ''},
    lighting: {type: '', intensity: '', source: ''},
    mood: ''
  };

  // 가장 강한 욕구의 색상을 primary로
  const dominant = needs.sort((a, b) => b.intensity - a.intensity)[0];
  blended.colors.primary = NEED_TO_VISUAL[dominant.need].colors.primary;

  // 두 번째 강한 욕구의 색상을 secondary로
  if (needs.length > 1) {
    blended.colors.secondary = NEED_TO_VISUAL[needs[1].need].colors.secondary;
  }

  // accent는 세 번째 또는 첫 번째 욕구에서
  blended.colors.accent = needs.length > 2
    ? NEED_TO_VISUAL[needs[2].need].colors.accent
    : NEED_TO_VISUAL[dominant.need].colors.accent;

  // 공간/조명/분위기는 가장 강한 욕구 기반
  blended.space = NEED_TO_VISUAL[dominant.need].space;
  blended.lighting = NEED_TO_VISUAL[dominant.need].lighting;

  // 분위기는 모든 욕구 조합
  blended.mood = needs.map(n =>
    NEED_TO_VISUAL[n.need].mood
  ).join(' blended with ');

  return blended;
}
```

---

## Step 2: 트라우마 → 방어 요소

### 트라우마 타입별 방어 요소

```typescript
interface DefensiveElement {
  object: string;
  placement: string;
  symbolism: string;
}

const TRAUMA_TO_DEFENSE: Record<string, DefensiveElement[]> = {
  // 왕따/거부 경험
  rejection: [
    {
      object: 'oversized hoodie on chair',
      placement: 'easily accessible near desk',
      symbolism: 'protective layer, ability to hide and feel safe'
    },
    {
      object: 'large over-ear headphones',
      placement: 'on desk or hanging on wall',
      symbolism: 'sound barrier, create own world, control what enters'
    },
    {
      object: 'small enclosed reading nook or fort-like bed',
      placement: 'corner of room',
      symbolism: 'safe enclosed space, protection from outside'
    }
  ],

  // 조건부 사랑/인정 경험
  conditional_love: [
    {
      object: 'achievement certificates perfectly aligned',
      placement: 'prominently displayed on wall',
      symbolism: 'proof of worth, visible validation'
    },
    {
      object: 'extremely organized desk with labels',
      placement: 'center of room',
      symbolism: 'control and perfection as safety'
    },
    {
      object: 'trophies or medals on shelf',
      placement: 'at eye level when entering',
      symbolism: 'constant reminder of being good enough'
    }
  ],

  // 감정 무시/억압 경험
  emotional_suppression: [
    {
      object: 'art supplies or creative tools',
      placement: 'scattered but accessible',
      symbolism: 'outlet for suppressed emotions'
    },
    {
      object: 'journal or sketchbook',
      placement: 'partially hidden but present',
      symbolism: 'private emotional expression'
    },
    {
      object: 'music instruments or recording equipment',
      placement: 'corner dedicated to expression',
      symbolism: 'non-verbal emotional release'
    }
  ],

  // 통제 상실 경험
  loss_of_control: [
    {
      object: 'everything perfectly symmetric',
      placement: 'strict grid layout',
      symbolism: 'regaining control through order'
    },
    {
      object: 'labeled storage boxes',
      placement: 'stacked precisely',
      symbolism: 'everything has its place, predictability'
    },
    {
      object: 'routine-based calendar or schedule board',
      placement: 'visible wall space',
      symbolism: 'control over time and future'
    }
  ],

  // 혼자됨/고립 경험
  isolation: [
    {
      object: 'online community symbols (game merch, fandom posters)',
      placement: 'multiple around room',
      symbolism: 'connection to chosen communities'
    },
    {
      object: 'multiple communication devices always charged',
      placement: 'within arms reach',
      symbolism: 'always ready to connect, never truly alone'
    },
    {
      object: 'small potted plant',
      placement: 'desk or windowsill',
      symbolism: 'something alive to care for, gentle companionship'
    }
  ]
};

function selectDefensiveElements(
  traumaTypes: string[]
): DefensiveElement[] {

  const elements: DefensiveElement[] = [];

  traumaTypes.forEach(trauma => {
    const options = TRAUMA_TO_DEFENSE[trauma] || [];
    // 각 트라우마에서 1-2개 랜덤 선택
    const selected = randomSample(options, Math.min(2, options.length));
    elements.push(...selected);
  });

  return elements;
}
```

---

## Step 3: 아키타입 기반 오브젝트 선택

### 아키타입 정의

```typescript
interface Archetype {
  name: string;
  matchingNeeds: string[];    // 이 아키타입과 맞는 욕구들
  objects: ArchetypeObject[];
}

interface ArchetypeObject {
  name: string;
  weight: number;             // 출현 확률 가중치
  requirement?: string;       // 조건 (선택적)
}

const ARCHETYPES: Archetype[] = [
  {
    name: 'developer_gamer',
    matchingNeeds: ['recognition', 'belonging', 'autonomy'],
    objects: [
      { name: 'dual monitors with code editor UI', weight: 0.9 },
      { name: 'RGB mechanical keyboard', weight: 0.8 },
      { name: 'gaming posters (pixel art indie games)', weight: 0.7 },
      { name: 'energy drink cans on desk', weight: 0.5 },
      { name: 'small succulent plant', weight: 0.6 },
      { name: 'controller stand with multiple controllers', weight: 0.4 },
      { name: 'LED strip lights behind monitor', weight: 0.7 },
      { name: 'cable management visible', weight: 0.3, requirement: 'recognition > 0.7' }
    ]
  },

  {
    name: 'minimalist_achiever',
    matchingNeeds: ['recognition', 'autonomy', 'survival'],
    objects: [
      { name: 'single clean desk with laptop', weight: 0.9 },
      { name: 'achievement frames perfectly aligned', weight: 0.8 },
      { name: 'single small plant (exactly one)', weight: 0.7 },
      { name: 'neutral color bookshelf organized by size', weight: 0.6 },
      { name: 'simple geometric art', weight: 0.5 },
      { name: 'nothing on floor (extremely clean)', weight: 0.9 },
      { name: 'minimalist clock', weight: 0.4 }
    ]
  },

  {
    name: 'cozy_creative',
    matchingNeeds: ['belonging', 'growth', 'meaning'],
    objects: [
      { name: 'fairy lights strung across ceiling', weight: 0.8 },
      { name: 'multiple plants of varying sizes', weight: 0.9 },
      { name: 'art supplies scattered but organized', weight: 0.7 },
      { name: 'polaroid photos on wall in casual arrangement', weight: 0.8 },
      { name: 'cozy reading chair with blanket', weight: 0.9 },
      { name: 'handmade crafts displayed', weight: 0.6 },
      { name: 'warm table lamp', weight: 0.8 },
      { name: 'bookshelf with mixed books and trinkets', weight: 0.7 }
    ]
  },

  {
    name: 'focused_learner',
    matchingNeeds: ['growth', 'recognition', 'meaning'],
    objects: [
      { name: 'large desk with open textbooks', weight: 0.9 },
      { name: 'whiteboard with notes and diagrams', weight: 0.8 },
      { name: 'organized bookshelf full of books', weight: 0.9 },
      { name: 'desk lamp with bright focused light', weight: 0.8 },
      { name: 'sticky notes with study plans', weight: 0.6 },
      { name: 'coffee mug and water bottle', weight: 0.7 },
      { name: 'world map or educational posters', weight: 0.5 },
      { name: 'notebook stack organized by subject', weight: 0.6 }
    ]
  }
];

function selectArchetype(
  needs: Array<{need: string; intensity: number}>
): Archetype {

  // 욕구 벡터와 가장 잘 맞는 아키타입 찾기
  const scores = ARCHETYPES.map(archetype => {
    const matchScore = archetype.matchingNeeds.reduce((score, matchNeed) => {
      const userNeed = needs.find(n => n.need === matchNeed);
      return score + (userNeed?.intensity || 0);
    }, 0);

    return { archetype, score: matchScore / archetype.matchingNeeds.length };
  });

  // 상위 2개 중 확률적 선택 (다양성 확보)
  const topTwo = scores.sort((a, b) => b.score - a.score).slice(0, 2);

  return randomWeightedChoice(topTwo.map(t => ({
    value: t.archetype,
    weight: t.score
  })));
}

function sampleObjects(
  archetype: Archetype,
  needs: Array<{need: string; intensity: number}>,
  count: number = 5
): string[] {

  const eligible = archetype.objects.filter(obj => {
    if (!obj.requirement) return true;

    // requirement 평가 (예: "recognition > 0.7")
    const match = obj.requirement.match(/(\w+)\s*([><]=?)\s*([\d.]+)/);
    if (!match) return true;

    const [, need, operator, threshold] = match;
    const userNeed = needs.find(n => n.need === need);
    if (!userNeed) return false;

    switch (operator) {
      case '>': return userNeed.intensity > parseFloat(threshold);
      case '>=': return userNeed.intensity >= parseFloat(threshold);
      case '<': return userNeed.intensity < parseFloat(threshold);
      case '<=': return userNeed.intensity <= parseFloat(threshold);
      default: return true;
    }
  });

  // 가중치 기반 샘플링
  return weightedRandomSample(eligible, count);
}
```

---

## Step 4: 이미지 프롬프트 조립

### 구조 프롬프트 (고정)

```typescript
const STRUCTURE_PROMPT = `
You are generating a pixel art room image for a character in a mobile game called "Knock".

[Style Requirements]
- Art Style: 16-bit pixel art (SNES era aesthetic)
- Resolution: 256x512 pixels (portrait/vertical orientation)
- Color Palette: Limited to 32 colors maximum
- Perspective: Isometric view
- Details: Clear pixel boundaries, no anti-aliasing, no blur

[Room Layout]
- View: Single room interior (bedroom or study)
- Walls: Back wall visible, one side wall partially visible
- Floor: Flat isometric floor tiles
- Ceiling: Optional, can be cropped at top

[Required Structure]
- One main focal point (desk OR bed)
- One seating element (chair OR floor cushion)
- At least one light source (lamp, window, screen glow)
- 2-5 decorative/functional items
- Window or door (for depth)

[Forbidden Elements]
- No text or readable words
- No human characters or figures
- No photorealistic elements
- No 3D rendering appearance
- No gradients or soft edges (pure pixel art)
`.trim();

const NEGATIVE_PROMPT = `
blurry, realistic, 3D render, photograph, anti-aliasing, gradients,
text, words, letters, watermark, signature, human, person, character,
low quality, distorted, deformed, duplicate, oversaturated
`.trim();
```

### 최종 프롬프트 조립

```typescript
function assembleImagePrompt(
  visualLanguage: VisualLanguage,
  defensiveElements: DefensiveElement[],
  archetypeObjects: string[]
): string {

  return `
${STRUCTURE_PROMPT}

[CHARACTER'S INNER WORLD - Visual Language]
Color Palette:
- Primary: ${visualLanguage.colors.primary}
- Secondary: ${visualLanguage.colors.secondary}
- Accent: ${visualLanguage.colors.accent}

Space Atmosphere:
- Layout: ${visualLanguage.space.layout}
- Organization: ${visualLanguage.space.organization}
- Openness: ${visualLanguage.space.openness}

Lighting:
- Type: ${visualLanguage.lighting.type}
- Intensity: ${visualLanguage.lighting.intensity}
- Source: ${visualLanguage.lighting.source}

Overall Mood: ${visualLanguage.mood}

[KEY OBJECTS IN ROOM]
${archetypeObjects.map((obj, i) => `${i + 1}. ${obj}`).join('\n')}

[DEFENSIVE/PROTECTIVE ELEMENTS]
${defensiveElements.map(el => `- ${el.object} (${el.placement})`).join('\n')}

[TECHNICAL SPECIFICATIONS]
- Exact size: 256 pixels width × 512 pixels height
- Strict pixel art style with visible pixel grid
- Isometric perspective (30-degree angle)
- Limited color palette (max 32 distinct colors)
- No anti-aliasing, no smooth edges
- Dithering for shading (classic pixel art technique)

Generate the pixel art room following ALL specifications above.
`.trim();
}
```

---

## Step 5: AI 이미지 생성

### Gemini Imagen 통합

```typescript
import { ImageGenerationModel } from '@google-cloud/vertexai';

interface ImageGenerationConfig {
  prompt: string;
  negativePrompt: string;
  aspectRatio: string;
  guidanceScale: number;
  numberOfImages: number;
}

async function generateRoomImage(
  prompt: string
): Promise<{url: string; validated: boolean}> {

  const model = new ImageGenerationModel('imagen-3.0-generate-001');

  try {
    const result = await model.generateImages({
      prompt: prompt,
      negativePrompt: NEGATIVE_PROMPT,
      numberOfImages: 1,
      aspectRatio: '9:16',  // 256:512 비율
      guidanceScale: 7.5,   // 프롬프트 충실도 (7-10 권장)
      seed: Date.now()      // 재현 가능성
    });

    const imageData = result.images[0];

    // 이미지 품질 검증
    const validation = await validateImageQuality(imageData);

    if (!validation.passed) {
      console.warn('Image quality check failed:', validation.issues);

      // 재생성 시도 (1회)
      if (validation.retryable) {
        return await generateRoomImage(prompt);
      }

      // Fallback 사용
      return {
        url: selectFallbackPreset(),
        validated: false
      };
    }

    // CDN 업로드
    const url = await uploadToCDN(imageData, 'rooms');

    return { url, validated: true };

  } catch (error) {
    console.error('Image generation failed:', error);
    return {
      url: selectFallbackPreset(),
      validated: false
    };
  }
}
```

### 이미지 품질 검증

```typescript
interface ImageValidation {
  passed: boolean;
  retryable: boolean;
  issues: string[];
}

async function validateImageQuality(
  imageData: Buffer
): Promise<ImageValidation> {

  const issues: string[] = [];
  let retryable = false;

  // 1. 해상도 확인
  const dimensions = await getImageDimensions(imageData);
  if (dimensions.width !== 256 || dimensions.height !== 512) {
    issues.push(`Invalid dimensions: ${dimensions.width}x${dimensions.height}`);
    retryable = false; // 해상도 문제는 재생성해도 동일
  }

  // 2. 파일 크기 확인 (200KB 이하 권장)
  const sizeKB = imageData.length / 1024;
  if (sizeKB > 200) {
    issues.push(`File too large: ${sizeKB.toFixed(1)}KB`);
    retryable = true;
  }

  // 3. 색상 수 확인 (32색 이하)
  const colorCount = await countUniqueColors(imageData);
  if (colorCount > 40) {  // 약간의 여유
    issues.push(`Too many colors: ${colorCount} (max 32)`);
    retryable = true;
  }

  // 4. 픽셀아트 스타일 감지 (간단한 엣지 검출)
  const isPixelArt = await detectPixelArtStyle(imageData);
  if (!isPixelArt) {
    issues.push('Not pixel art style');
    retryable = true;
  }

  return {
    passed: issues.length === 0,
    retryable,
    issues
  };
}

async function detectPixelArtStyle(
  imageData: Buffer
): Promise<boolean> {

  // 간단한 엣지 검출: 픽셀아트는 sharp edge가 많음
  const image = await loadImage(imageData);
  const edges = detectEdges(image);

  // sharp edge 비율이 높으면 픽셀아트로 판단
  const sharpEdgeRatio = edges.sharp / edges.total;

  return sharpEdgeRatio > 0.7;  // 70% 이상 sharp edge
}
```

### Fallback 프리셋 시스템

```typescript
interface PresetImage {
  url: string;
  archetype: string;
  needs: string[];
}

const PRESET_IMAGES: PresetImage[] = [
  {
    url: 'https://cdn.knock.com/rooms/preset-dev-gamer-1.png',
    archetype: 'developer_gamer',
    needs: ['recognition', 'belonging']
  },
  {
    url: 'https://cdn.knock.com/rooms/preset-minimalist-1.png',
    archetype: 'minimalist_achiever',
    needs: ['recognition', 'autonomy']
  },
  {
    url: 'https://cdn.knock.com/rooms/preset-cozy-1.png',
    archetype: 'cozy_creative',
    needs: ['belonging', 'growth']
  },
  {
    url: 'https://cdn.knock.com/rooms/preset-learner-1.png',
    archetype: 'focused_learner',
    needs: ['growth', 'meaning']
  },
  {
    url: 'https://cdn.knock.com/rooms/preset-safe-1.png',
    archetype: 'safe_organized',
    needs: ['survival', 'autonomy']
  }
];

function selectFallbackPreset(
  needs?: Array<{need: string; intensity: number}>
): string {

  if (!needs || needs.length === 0) {
    // 랜덤 선택
    return randomChoice(PRESET_IMAGES).url;
  }

  // 욕구 벡터와 가장 가까운 프리셋 찾기
  const topNeeds = needs
    .sort((a, b) => b.intensity - a.intensity)
    .slice(0, 2)
    .map(n => n.need);

  const matches = PRESET_IMAGES.filter(preset =>
    topNeeds.some(need => preset.needs.includes(need))
  );

  if (matches.length === 0) {
    return randomChoice(PRESET_IMAGES).url;
  }

  return randomChoice(matches).url;
}
```

---

## 🔧 완전 통합 API

### 엔드포인트

```typescript
POST /api/v1/admin/characters/:id/generate-image

Request:
{
  "regenerate": false  // true면 기존 이미지 무시하고 재생성
}

Response:
{
  "success": true,
  "image": {
    "url": "https://cdn.knock.com/rooms/abc123.png",
    "validated": true,
    "prompt": "...",
    "metadata": {
      "visualLanguage": {...},
      "defensiveElements": [...],
      "archetype": "developer_gamer",
      "objects": [...]
    }
  }
}
```

### 구현

```typescript
async function generateCharacterRoomImage(
  characterId: string,
  regenerate: boolean = false
): Promise<ImageGenerationResult> {

  // 1. 캐릭터 데이터 로드
  const character = await loadCharacter(characterId);

  if (character.imageUrl && !regenerate) {
    return {
      url: character.imageUrl,
      validated: true,
      cached: true
    };
  }

  // 2. 욕구 벡터 추출
  const needs = character.analysis.completeVector
    .filter(v => v.actual > 0.3)
    .sort((a, b) => b.actual - a.actual)
    .slice(0, 3)
    .map(v => ({ need: v.need, intensity: v.actual }));

  // 3. 시각적 언어 생성
  const visualLanguage = blendVisualLanguages(needs);

  // 4. 트라우마 → 방어 요소
  const traumaTypes = inferTraumaTypes(character.analysis);
  const defensiveElements = selectDefensiveElements(traumaTypes);

  // 5. 아키타입 선택 및 오브젝트 샘플링
  const archetype = selectArchetype(needs);
  const objects = sampleObjects(archetype, needs, 5);

  // 6. 이미지 프롬프트 조립
  const imagePrompt = assembleImagePrompt(
    visualLanguage,
    defensiveElements,
    objects
  );

  // 7. 이미지 생성
  const { url, validated } = await generateRoomImage(imagePrompt);

  // 8. DB 업데이트
  await updateCharacterImage(characterId, {
    url,
    prompt: imagePrompt,
    metadata: {
      visualLanguage,
      defensiveElements,
      archetype: archetype.name,
      objects
    }
  });

  return { url, validated, imagePrompt, metadata: {...} };
}
```

---

## 📊 비용 및 성능

### 예상 비용 (Gemini Imagen)

```
무료 티어: 100회/월
유료: $0.020 per image

월 신규 캐릭터 생성: 100개 가정
- 무료: $0
- 유료: 0 * $0.020 = $0 (무료 범위 내)

재생성 포함 200회/월:
- 100회 무료
- 100회 * $0.020 = $2/월
```

### 생성 속도

```
평균 생성 시간: 5-10초
품질 검증: 1-2초
CDN 업로드: 1-2초

총 소요 시간: 7-14초 (acceptable)
```

---

## ✅ 품질 체크리스트

### 생성 전
- [ ] 욕구 벡터 2개 이상 (0.5 이상)
- [ ] 시각적 언어 매핑 완료
- [ ] 트라우마 타입 식별
- [ ] 아키타입 선택 완료

### 생성 후
- [ ] 256x512 해상도 확인
- [ ] 32색 이하 확인 (40색까지 허용)
- [ ] 픽셀아트 스타일 확인
- [ ] 파일 크기 200KB 이하
- [ ] 욕구와 색상 일치성 확인

---

## 📝 다음 단계

1. ✅ 이 문서 완성
2. → [04_INITIAL_ROOM_IMPLEMENTATION.md](./04_INITIAL_ROOM_IMPLEMENTATION.md) 참조
3. Gemini Imagen API 계정 설정
4. 프리셋 이미지 5개 제작
5. 이미지 생성 파이프라인 구현
6. 품질 검증 로직 구현

---

**참조 문서**:
- [COMPLETE_GUIDE.md](../01_Feature/02_Roommate/SystemPromptArchitecture/COMPLETE_GUIDE.md)
- [room-generation/README.md](../01_Feature/02_Roommate/room-generation/README.md)
- [02_CHARACTER_GENERATOR_FLOW.md](./02_CHARACTER_GENERATOR_FLOW.md)
