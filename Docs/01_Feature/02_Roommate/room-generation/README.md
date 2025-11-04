# 룸 이미지 생성 (Room Image Generation)

## 목표
온보딩 데이터를 기반으로 사용자 맞춤형 룸메이트 방 이미지를 AI로 생성하여 개인화된 경험을 제공합니다.

## 핵심 원칙

### 1. 개인화 (Personalization)
- 사용자 관심사와 성격을 반영한 방 분위기
- 획일적인 프리셋이 아닌 **유니크한 이미지**
- 룸메이트 성격과 시각적 일관성 유지

### 2. 효율성 (Efficiency)
- 생성 시간: 10초 이내 목표
- 비용 효율적 AI 모델 사용 (Gemini Imagen)
- Fallback: 프리셋 이미지 준비

### 3. 일관성 (Consistency)
- 픽셀아트 스타일 유지 (Knock 전체 디자인 통일)
- 고정 크기: 256x512px (모바일 최적화)
- 색상 팔레트 통일

---

## 생성 프로세스

### 1. 데이터 분석 → 분위기 정의

```
[온보딩 데이터]
  ├─ 방문 도메인: ["github.com", "stackoverflow.com", "steam.com"]
  ├─ 검색 키워드: ["react", "typescript", "indie game"]
  └─ 수동 입력: 관심사 ["개발", "게임"]

        ↓ [LLM 분석]

[방 분위기 정의]
  ├─ 스타일: "개발자 감성 + 게이머 룸"
  ├─ 요소: "책상 위 듀얼 모니터, RGB 키보드, 게임 포스터"
  ├─ 색감: "어두운 톤, 네온 블루 조명"
  └─ 분위기: "집중력 있고 아늑한"
```

### 2. 구조 프롬프트 + 분위기 병합

**구조 프롬프트 (고정 - 파일로 관리)**:
```
You are generating a pixel art room image for a character in a mobile game.

[Style Requirements]
- Pixel art style (8-bit or 16-bit aesthetic)
- Size: 256x512 pixels (portrait orientation)
- Color palette: Limited to 32 colors max
- Perspective: Isometric or side view
- Details: Clear but not cluttered

[Room Structure]
- Background: Wall with window or poster
- Furniture: Desk, chair, bed, bookshelf (select 2-3)
- Lighting: Natural or artificial light source
- Props: Personal items that reflect character interests

[Must Include]
- One focal point (desk/bed)
- At least one light source
- Window or door
- 2-3 decorative elements
```

**분위기 프롬프트 (개인화 - 동적 생성)**:
```
[Character Atmosphere]
Theme: Developer + Gamer room
Color Scheme: Dark tones with neon blue accents
Key Elements:
- Dual monitors on desk showing code editor
- RGB mechanical keyboard
- Gaming posters on wall (pixel art style)
- Small potted plant
- Warm desk lamp

Mood: Focused and cozy, late-night coding vibe
```

**최종 병합 프롬프트**:
```
Create a pixel art room (256x512px, isometric view) for a developer-gamer character.

Style: 16-bit pixel art, 32 color palette
Room: Small bedroom/study
Perspective: Isometric view

Elements:
- Desk with dual monitors (showing code editor UI in pixel art)
- RGB mechanical keyboard with blue backlight glow
- Black gaming chair
- Wall with 2 indie game posters (pixel art style)
- Small plant on desk corner
- Warm desk lamp (orange glow)
- Window showing night sky with stars

Color scheme: Dark navy walls, warm orange lamp light, neon blue accents from keyboard
Mood: Cozy late-night coding atmosphere

Technical requirements:
- 256x512 pixels
- Isometric perspective
- Clear pixel boundaries (no anti-aliasing)
- Limited color palette (max 32 colors)
```

---

## 기술 스택

### AI 이미지 생성 API

#### 옵션 1: Gemini Imagen (추천)
**장점**:
- Google Cloud 통합 (기존 Gemini API와 일관성)
- 무료 티어 제공 (월 100회)
- 빠른 생성 속도 (5-10초)

**단점**:
- 픽셀아트 스타일 정확도 중간
- 프롬프트 엔지니어링 필요

**비용**:
- 무료: 100회/월
- 유료: $0.020 per image

#### 옵션 2: DALL-E 3 (OpenAI)
**장점**:
- 높은 품질
- 프롬프트 이해도 우수

**단점**:
- 비용 높음 ($0.040 per image)
- 픽셀아트 스타일 제어 어려움

#### 옵션 3: Stable Diffusion (자체 호스팅)
**장점**:
- 무제한 생성
- 커스텀 모델 학습 가능 (픽셀아트 특화)

**단점**:
- 인프라 비용 (GPU 서버)
- 운영 복잡도 증가

**결론**: **Gemini Imagen** 사용 (MVP), 추후 Stable Diffusion 전환 고려

---

## 구현 상세

### 1. 분위기 분석 LLM 프롬프트

```typescript
interface RoomAtmospherePrompt {
  userData: {
    domains: string[];
    keywords: string[];
    interests: string[];
  };
  personality: {
    traits: string[];
    keywords: string[];
  };
}

function buildAtmosphereAnalysisPrompt(data: RoomAtmospherePrompt): string {
  return `
Analyze the following user data and define a room atmosphere for a pixel art image.

[User Data]
Visited Domains: ${data.userData.domains.join(", ")}
Search Keywords: ${data.userData.keywords.join(", ")}
Interests: ${data.userData.interests.join(", ")}

[Character Personality]
Traits: ${data.personality.traits.join(", ")}
Keywords: ${data.personality.keywords.join(", ")}

[Task]
Generate a room atmosphere definition in JSON format:

{
  "theme": "2-3 word description (e.g., 'Developer Gamer Room')",
  "colorScheme": "Main colors and accents (e.g., 'Dark tones with neon blue')",
  "keyElements": [
    "Element 1 (e.g., 'Dual monitors with code')",
    "Element 2 (e.g., 'RGB keyboard')",
    "Element 3-5"
  ],
  "lighting": "Light source description (e.g., 'Warm desk lamp + blue screen glow')",
  "mood": "1-2 sentence mood (e.g., 'Cozy late-night coding vibe')"
}

[Rules]
- Theme must be clear and specific
- Color scheme should have 2-3 colors max
- Key elements: 3-5 items that fit the theme
- All elements must be suitable for pixel art style
- Focus on visual elements (no abstract concepts)
`.trim();
}
```

### 2. 이미지 생성 프롬프트 병합

```typescript
interface RoomAtmosphere {
  theme: string;
  colorScheme: string;
  keyElements: string[];
  lighting: string;
  mood: string;
}

async function generateRoomImagePrompt(atmosphere: RoomAtmosphere): Promise<string> {
  // 구조 프롬프트 로드 (파일에서)
  const structurePrompt = await loadPromptTemplate('room-structure.txt');

  // 병합
  return `
${structurePrompt}

[Character Room Atmosphere]
Theme: ${atmosphere.theme}
Color Scheme: ${atmosphere.colorScheme}
Lighting: ${atmosphere.lighting}
Mood: ${atmosphere.mood}

Elements to include:
${atmosphere.keyElements.map((el, i) => `${i + 1}. ${el}`).join('\n')}

Generate a pixel art room image following these specifications.
`.trim();
}
```

### 3. 이미지 생성 API 호출

```typescript
import { ImageGenerationModel } from '@google-cloud/vertexai';

async function generateRoomImage(prompt: string): Promise<string> {
  const model = new ImageGenerationModel('imagen-3.0-generate-001');

  try {
    const result = await model.generateImages({
      prompt: prompt,
      numberOfImages: 1,
      aspectRatio: '9:16', // 256:512 비율
      negativePrompt: 'blurry, realistic, 3D, photography, text, watermark',
      // 픽셀아트 스타일 강제
      guidanceScale: 7.5,
    });

    const imageUrl = await uploadToCDN(result.images[0]);
    return imageUrl;

  } catch (error) {
    console.error('Image generation failed:', error);
    // Fallback: 프리셋 이미지 반환
    return selectFallbackImage();
  }
}

function selectFallbackImage(): string {
  const presets = [
    'https://cdn.knock.com/rooms/preset-dev-1.png',
    'https://cdn.knock.com/rooms/preset-gamer-1.png',
    'https://cdn.knock.com/rooms/preset-artist-1.png',
    'https://cdn.knock.com/rooms/preset-minimal-1.png',
    'https://cdn.knock.com/rooms/preset-cozy-1.png',
  ];

  // 사용자 데이터 기반 가장 가까운 프리셋 선택
  return presets[0]; // 임시: 단순 반환
}
```

---

## 프롬프트 템플릿 관리

### 파일 구조
```
backend/
  src/
    prompts/
      room-generation/
        structure.txt          # 기본 구조 프롬프트
        pixel-art-style.txt    # 픽셀아트 스타일 가이드
        themes/                # 테마별 프리셋
          developer.txt
          gamer.txt
          artist.txt
          minimal.txt
```

### structure.txt (예시)
```
You are generating a pixel art room image for a character in a mobile game called "Knock".

[Style Requirements]
- Art Style: 16-bit pixel art (SNES era aesthetic)
- Resolution: 256x512 pixels (portrait/vertical orientation)
- Color Palette: Limited to 32 colors maximum
- Perspective: Isometric or side-view
- Details: Clear pixel boundaries, no anti-aliasing, no gradients

[Room Layout]
- View: Single room interior (bedroom or study)
- Walls: Back wall and one side wall visible
- Floor: Flat isometric floor
- Ceiling: Optional, can be cropped

[Required Elements]
1. One main furniture piece (desk OR bed)
2. One seating (chair OR floor cushion)
3. One storage (bookshelf OR cabinet OR wardrobe)
4. At least one light source (lamp, window, screen glow)
5. 2-4 decorative items (posters, plants, props)

[Forbidden Elements]
- No text or readable words
- No human characters
- No photorealistic elements
- No 3D rendering look
- No blur or soft edges

[Color Guidelines]
- Use limited color palette (vintage game aesthetic)
- Consistent lighting direction
- Avoid pure black (#000000) and pure white (#FFFFFF)
- Use dithering for shading (pixel art technique)
```

---

## 품질 검증

생성된 이미지가 기준에 맞는지 자동 검증:

```typescript
interface ImageQualityCheck {
  resolution: boolean;      // 256x512 확인
  fileSize: boolean;        // 200KB 이하
  colorCount: boolean;      // 32색 이하
  style: boolean;           // 픽셀아트 스타일
}

async function validateGeneratedImage(imageUrl: string): Promise<boolean> {
  const image = await loadImage(imageUrl);

  const checks: ImageQualityCheck = {
    resolution: image.width === 256 && image.height === 512,
    fileSize: image.size < 200 * 1024, // 200KB
    colorCount: countUniqueColors(image) <= 32,
    style: detectPixelArt(image), // 간단한 에지 검출
  };

  const passed = Object.values(checks).every(v => v);

  if (!passed) {
    console.warn('Image quality check failed:', checks);
    // 재생성 또는 Fallback
  }

  return passed;
}
```

---

## Phase별 개발 계획

### Phase 1: MVP
- [x] 구조 프롬프트 템플릿 작성
- [ ] Gemini Imagen API 통합
- [ ] 분위기 분석 LLM 프롬프트 작성
- [ ] 프리셋 이미지 5개 준비 (Fallback)
- [ ] 기본 생성 파이프라인 구축

### Phase 2: Enhancement
- [ ] 테마별 프롬프트 템플릿 (10개)
- [ ] 이미지 품질 자동 검증
- [ ] 재생성 요청 기능 (유료)
- [ ] A/B 테스트 (AI 생성 vs 프리셋)

### Phase 3: Advanced
- [ ] Stable Diffusion 커스텀 모델 학습
- [ ] 픽셀아트 LoRA 파인튜닝
- [ ] 사용자 피드백 기반 프롬프트 개선
- [ ] 룸 커스터마이징 (가구 변경 등)

---

## 비용 예측

### Gemini Imagen (추천)
```
무료 티어: 100회/월
예상 사용: 신규 가입 시 1회 생성
월 신규 유저: 1,000명 가정

비용:
- 0-100명: $0 (무료)
- 101-1000명: 900 * $0.020 = $18/월
```

### Stable Diffusion (자체 호스팅)
```
GPU 인스턴스: AWS g4dn.xlarge
시간당 비용: $0.526
월 예상: $380 (24/7 운영)

손익분기점: 월 19,000회 생성 시 Imagen보다 저렴
→ MVP 단계에서는 Imagen 사용이 합리적
```

---

## 관련 문서
- [대화 방법론](../conversation-methodologies/README.md) - 룸메이트 성격 정의
- [룸메이트 기능 명세](../feature-spec.md) - 전체 시스템 구조
- [온보딩 시스템](../../01_Onboarding/README.md) - 데이터 수집
