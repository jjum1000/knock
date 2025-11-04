# 하이브리드 생성 시스템 (Hybrid Generation System)

## 개요

룸메이트 캐릭터를 생성할 때 **결정론적 추론(Deterministic)**과 **확률적 선택(Probabilistic)**을 결합하여, 사용자 데이터에서 출발해 일관되면서도 다양한 캐릭터를 만드는 시스템입니다.

**핵심 통찰**:
- 내면(욕구, 성격) → 결정론적 추론 가능
- 외면(구체적 표현) → 확률적 선택 필요
- 같은 욕구 벡터에서 다양한 시각적 변형 가능

---

## 1. 문제 정의: 역계산 vs 순계산

### 1.1 역계산 (Backward Engineering) - 불가능

```
❌ 역계산 (우리가 처음 시뮬레이션한 방식):

"전신 문신 + 배나온 + 모범생" (원하는 결과)
    ↓
이걸 설명할 욕구 벡터를 찾자
    ↓
표현(0.9) + 통제(0.85) + 의미(0.8) + 쾌락(0.6)
    ↓
이 욕구를 만들 과거 경험을 만들자
    ↓
억압적 가정 + 대학 자유 + 문신 편견...
```

**문제**: 결과를 알고 시작함 → 실제 시스템에서 불가능

### 1.2 순계산 (Forward Engineering) - 목표

```
✅ 순계산 (실제 시스템이 해야 할 것):

사용자 온보딩 데이터
    ↓
욕구 벡터 추론
    ↓
성격/역설 도출
    ↓
시각적 표현 생성
    ↓
캐릭터 완성
```

**도전**: "문신"을 어떻게 알 수 있나? "배나옴"을 어떻게 결정하나?

---

## 2. 핵심 통찰: 결정론과 확률론의 분리

### 2.1 결정론적 영역 (Deterministic Zone)

**사용자 데이터에서 직접 추론 가능한 것들**

```javascript
const deterministicInference = {
  // ✅ 추론 가능
  needs: {
    // 웹 히스토리 → 욕구 벡터
    belonging: 0.7,      // 커뮤니티 활동
    growth: 0.6,         // 학습 검색
    control: 0.8,        // 계획/정리 도구
    expression: 0.9      // 창작 관련 검색
  },

  paradoxes: [
    // 욕구 벡터 → 역설 자동 발견
    {pair: ['expression', 'control'], tension: 0.85}
  ],

  personality: {
    // 욕구 + 전략 → 성격
    surface: ['신중함', '표현적', '계획적'],
    shadow: ['경직됨', '완벽주의']
  },

  organizationLevel: 0.8,  // 통제 욕구 → 정돈도

  colorMood: 'deep + expressive',  // 의미 + 표현 욕구

  conversationStyle: {
    length: 'medium-long',
    speed: 'thoughtful',
    tone: 'serious but warm'
  }
};
```

**특징**:
- 항상 같은 입력 → 같은 출력
- 논리적 추론 가능
- 일관성 보장

### 2.2 확률론적 영역 (Probabilistic Zone)

**같은 욕구 벡터에서 여러 시각적 표현 가능**

```javascript
const probabilisticSelection = {
  // ❓ 표현 욕구 0.9 → 어떻게 표현?
  expressionMethods: [
    {method: 'extensive_tattoos', probability: 0.3},
    {method: 'unique_fashion', probability: 0.25},
    {method: 'artistic_works', probability: 0.25},
    {method: 'bold_hair_style', probability: 0.2}
  ],

  // ❓ 쾌락 욕구 0.6 → 어떤 결과?
  pleasureManifestations: [
    {result: 'comfortable_build', probability: 0.4},
    {result: 'athletic_build', probability: 0.3},
    {result: 'average_build', probability: 0.3}
  ],

  // ❓ 통제 욕구 0.8 → 어떤 스타일?
  controlExpressions: [
    {style: 'minimalist', probability: 0.4},
    {style: 'labeled_organized', probability: 0.35},
    {style: 'systematic_collections', probability: 0.25}
  ]
};
```

**특징**:
- 같은 입력 → 다양한 출력 (확률 분포)
- 가중치 기반 선택
- 다양성 보장

---

## 3. 하이브리드 시스템 아키텍처

### 3.1 전체 흐름도

```
┌─────────────────────────────────────────────────────────┐
│ INPUT: 사용자 온보딩 데이터                                │
│ - 웹 히스토리, 키워드, 시간 패턴                           │
│ - 직접 입력 (선호도, 회피 주제)                            │
└────────────────┬────────────────────────────────────────┘
                 ↓
┌────────────────────────────────────────────────────────┐
│ PHASE 1: 결정론적 추론 (Deterministic Inference)        │
├────────────────────────────────────────────────────────┤
│ 1. 욕구 벡터 추론                                        │
│    - 다각도 해석 (표면/내면/역설/그림자)                  │
│    - 욕구 강도 계산                                      │
│                                                         │
│ 2. 역설 발견                                            │
│    - 충돌하는 욕구 쌍 찾기                               │
│    - 긴장도 계산                                         │
│                                                         │
│ 3. 성격 특성 도출                                        │
│    - 욕구 → 전략 → 성격                                 │
│    - 대화 패턴 결정                                      │
│                                                         │
│ OUTPUT: 내면 프로필                                      │
│ {needs, paradoxes, personality, strategies}            │
└────────────────┬────────────────────────────────────────┘
                 ↓
┌────────────────────────────────────────────────────────┐
│ PHASE 2: 아키타입 매칭 (Archetype Matching)             │
├────────────────────────────────────────────────────────┤
│ 1. 욕구 벡터 → 아키타입 후보군                           │
│    - 유사도 계산                                         │
│    - 상위 3-5개 선택                                    │
│                                                         │
│ 2. 역설 → 시각화 전략 매핑                               │
│    - 각 역설에 대한 표현 방법 리스트                      │
│                                                         │
│ OUTPUT: 후보 아키타입 + 시각화 옵션                       │
└────────────────┬────────────────────────────────────────┘
                 ↓
┌────────────────────────────────────────────────────────┐
│ PHASE 3: 확률적 선택 (Probabilistic Selection)          │
├────────────────────────────────────────────────────────┤
│ 1. 아키타입 선택 (가중치 랜덤)                           │
│                                                         │
│ 2. 시각적 요소 선택                                      │
│    - 각 역설별 표현 방법 선택                            │
│    - 체형, 스타일, 아이템 선택                           │
│                                                         │
│ 3. 제약 조건 검증                                        │
│    - 모순 체크                                          │
│    - 일관성 검증                                         │
│                                                         │
│ OUTPUT: 구체적 외형 프로필                               │
│ {appearance, body, style, items}                       │
└────────────────┬────────────────────────────────────────┘
                 ↓
┌────────────────────────────────────────────────────────┐
│ PHASE 4: 통합 및 생성 (Integration & Generation)        │
├────────────────────────────────────────────────────────┤
│ 1. 시스템 프롬프트 생성                                  │
│    - WHY (내면) + HOW (전략) + WHAT (표현) 통합         │
│                                                         │
│ 2. 이미지 프롬프트 생성                                  │
│    - 캐릭터 + 환경 + 분위기 + 스타일                    │
│                                                         │
│ OUTPUT: 완성된 룸메이트                                  │
│ {systemPrompt, imagePrompt, metadata}                  │
└────────────────────────────────────────────────────────┘
```

### 3.2 코드 구조

```javascript
class HybridRoommateGenerator {

  // ===== PHASE 1: 결정론적 추론 =====

  async inferNeeds(userData) {
    // 다각도 해석
    const interpretations = {
      surface: this.surfaceInterpretation(userData),
      deep: this.deepInterpretation(userData),
      inverse: this.inverseInterpretation(userData),
      shadow: this.shadowInterpretation(userData)
    };

    // 욕구 벡터 집계
    const needsVector = this.aggregateNeeds(interpretations);

    return needsVector;
  }

  findParadoxes(needsVector) {
    const paradoxes = [];
    const needs = Object.entries(needsVector)
      .filter(([_, value]) => value > 0.5)
      .sort((a, b) => b[1] - a[1]);

    // 충돌하는 욕구 쌍 찾기
    for (let i = 0; i < needs.length; i++) {
      for (let j = i + 1; j < needs.length; j++) {
        if (this.isParadoxical(needs[i][0], needs[j][0])) {
          paradoxes.push({
            pair: [needs[i][0], needs[j][0]],
            tension: Math.min(needs[i][1], needs[j][1]),
            intensity: (needs[i][1] + needs[j][1]) / 2
          });
        }
      }
    }

    return paradoxes;
  }

  buildPersonality(needsVector, paradoxes) {
    // 욕구 → 전략 → 성격 (결정론적)
    const strategies = needsVector.map(need =>
      this.needToStrategy(need)
    );

    const personality = {
      surface: strategies.map(s => s.surfaceTrait),
      shadow: strategies.map(s => s.shadowTrait),
      contradictions: paradoxes.map(p => p.manifestation)
    };

    return personality;
  }

  // ===== PHASE 2: 아키타입 매칭 =====

  matchArchetypes(needsVector) {
    // 아키타입 라이브러리에서 유사도 계산
    const scores = ARCHETYPE_LIBRARY.map(archetype => ({
      archetype,
      similarity: this.cosineSimilarity(needsVector, archetype.needsVector)
    }));

    // 상위 후보 반환 (가중치 포함)
    return scores
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5)
      .map(s => ({
        ...s.archetype,
        weight: s.similarity
      }));
  }

  mapParadoxToVisuals(paradoxes) {
    return paradoxes.map(paradox => {
      const key = paradox.pair.sort().join('+');
      const strategies = PARADOX_VISUAL_MAPPING[key] || [];

      return {
        paradox,
        visualOptions: strategies.map(strategy => ({
          ...strategy,
          // 긴장도에 따라 가중치 조정
          adjustedProbability: strategy.probability * paradox.tension
        }))
      };
    });
  }

  // ===== PHASE 3: 확률적 선택 =====

  selectArchetype(candidates) {
    // 가중치 기반 랜덤 선택
    return this.weightedRandom(candidates, c => c.weight);
  }

  selectVisuals(paradoxVisuals, selectedArchetype) {
    const visuals = {
      paradoxExpressions: [],
      archetypeVisuals: selectedArchetype.visualOptions
    };

    // 각 역설에 대해 시각화 방법 선택
    for (const pv of paradoxVisuals) {
      const selected = this.weightedRandom(
        pv.visualOptions,
        opt => opt.adjustedProbability
      );
      visuals.paradoxExpressions.push(selected);
    }

    return visuals;
  }

  validateConsistency(innerProfile, visuals) {
    // 모순 체크
    const contradictions = this.findContradictions(innerProfile, visuals);

    if (contradictions.length > 0) {
      // 재선택 또는 조정
      return this.resolveContradictions(visuals, contradictions);
    }

    return visuals;
  }

  // ===== PHASE 4: 통합 및 생성 =====

  async generate(userData) {
    // Phase 1: 결정론적 추론
    const needsVector = await this.inferNeeds(userData);
    const paradoxes = this.findParadoxes(needsVector);
    const personality = this.buildPersonality(needsVector, paradoxes);

    const innerProfile = {
      needs: needsVector,
      paradoxes,
      personality,
      strategies: this.deriveStrategies(needsVector)
    };

    // Phase 2: 아키타입 매칭
    const archetypeCandidates = this.matchArchetypes(needsVector);
    const paradoxVisuals = this.mapParadoxToVisuals(paradoxes);

    // Phase 3: 확률적 선택
    const selectedArchetype = this.selectArchetype(archetypeCandidates);
    let visuals = this.selectVisuals(paradoxVisuals, selectedArchetype);
    visuals = this.validateConsistency(innerProfile, visuals);

    // Phase 4: 통합
    const systemPrompt = this.buildSystemPrompt(innerProfile, visuals);
    const imagePrompt = this.buildImagePrompt(innerProfile, visuals);

    return {
      innerProfile,
      visuals,
      systemPrompt,
      imagePrompt,
      metadata: {
        archetypeUsed: selectedArchetype.name,
        paradoxesVisualized: paradoxes.length,
        generationTimestamp: Date.now()
      }
    };
  }
}
```

---

## 4. 아키타입 라이브러리 구조

### 4.1 아키타입 정의

```javascript
const ARCHETYPE_LIBRARY = [
  {
    id: 'planned_rebel',
    name: '계획적 반항가',
    description: '규칙을 깨되 신중하게',

    // 욕구 프로필 (매칭용)
    needsVector: {
      expression: 0.9,
      control: 0.85,
      meaning: 0.8,
      autonomy: 0.7
    },

    // 시각적 옵션들
    visualOptions: {
      expressionMethods: [
        {
          type: 'tattoos',
          style: 'traditional_meaningful',
          intensity: 'extensive',
          probability: 0.4
        },
        {
          type: 'fashion',
          style: 'curated_alternative',
          intensity: 'bold',
          probability: 0.3
        },
        {
          type: 'art',
          style: 'personal_gallery',
          intensity: 'displayed',
          probability: 0.3
        }
      ],

      spaceStyle: {
        organization: 0.9,  // 매우 정돈됨
        personalization: 0.8,  // 개성 강함
        items: ['meaningful_objects', 'achievement_wall', 'identity_symbols']
      },

      bodyLanguage: {
        posture: 'confident_composed',
        expression: 'serious_warm',
        style: 'neat_but_individual'
      }
    },

    // 과거 템플릿
    backstoryTemplates: [
      {
        trauma: 'oppressive_environment',
        turning_point: 'discovered_autonomy',
        current_state: 'controlled_freedom'
      }
    ]
  },

  {
    id: 'perfectionist_explorer',
    name: '완벽주의 탐험가',
    description: '안전하게 성장하고 싶다',

    needsVector: {
      growth: 0.9,
      control: 0.85,
      safety: 0.7
    },

    visualOptions: {
      learningTraces: [
        {type: 'books', state: 'organized_with_notes', probability: 0.5},
        {type: 'courses', state: 'certificates_displayed', probability: 0.3},
        {type: 'projects', state: 'documented_progress', probability: 0.2}
      ],

      spaceStyle: {
        organization: 0.95,
        items: ['learning_materials', 'progress_trackers', 'safe_experiments']
      }
    }
  },

  {
    id: 'selective_connector',
    name: '선택적 연결가',
    description: '함께하되 독립적으로',

    needsVector: {
      belonging: 0.8,
      autonomy: 0.75,
      authenticity: 0.7
    },

    visualOptions: {
      communityProof: [
        {type: 'small_group_photos', probability: 0.4},
        {type: 'niche_community_items', probability: 0.4},
        {type: 'collaborative_work', probability: 0.2}
      ],

      personalSpace: {
        openness: 0.4,  // 반쯤 열려있음
        boundaries: 0.8,  // 경계는 명확
        items: ['community_symbols', 'personal_projects', 'privacy_items']
      }
    }
  }

  // ... 더 많은 아키타입
];
```

### 4.2 역설 시각화 매핑

```javascript
const PARADOX_VISUAL_MAPPING = {
  'expression+control': [
    {
      method: 'planned_tattoos',
      description: 'Extensive but meaningful tattoos, each carefully chosen',
      visual: 'traditional style tattoos with clear symbolism',
      probability: 0.35,
      requirements: {expression: 0.8, control: 0.7}
    },
    {
      method: 'curated_collection',
      description: 'Organized display of expressive items',
      visual: 'neat shelves with bold art pieces',
      probability: 0.35,
      requirements: {expression: 0.7, control: 0.8}
    },
    {
      method: 'systematic_creativity',
      description: 'Creative projects with documented process',
      visual: 'art supplies organized by color, WIP displayed',
      probability: 0.3,
      requirements: {expression: 0.7, control: 0.7}
    }
  ],

  'belonging+autonomy': [
    {
      method: 'selective_community',
      description: 'Small group photos, niche community items',
      visual: 'guild flag + personal workspace clearly separated',
      probability: 0.4,
      requirements: {belonging: 0.7, autonomy: 0.7}
    },
    {
      method: 'collaborative_independence',
      description: 'Team items with personal contributions highlighted',
      visual: 'group project + "my part" label',
      probability: 0.35,
      requirements: {belonging: 0.8, autonomy: 0.6}
    },
    {
      method: 'connected_solitude',
      description: 'Communication tools + privacy screens',
      visual: 'headphones + Discord open but status: away',
      probability: 0.25,
      requirements: {belonging: 0.6, autonomy: 0.8}
    }
  ],

  'pleasure+control': [
    {
      method: 'scheduled_indulgence',
      description: 'Planned comfort, routine rewards',
      visual: 'comfort food + meal planner visible',
      bodyEffect: 'comfortable_build',
      probability: 0.45,
      requirements: {pleasure: 0.6, control: 0.7}
    },
    {
      method: 'organized_collection',
      description: 'Curated pleasure items, labeled containers',
      visual: 'snack drawer with perfect organization',
      probability: 0.35,
      requirements: {pleasure: 0.5, control: 0.8}
    },
    {
      method: 'earned_rewards',
      description: 'Achievement-based treats',
      visual: 'checklist + reward items',
      probability: 0.2,
      requirements: {pleasure: 0.5, control: 0.9}
    }
  ],

  'growth+safety': [
    {
      method: 'incremental_learning',
      description: 'Step-by-step progress tracking',
      visual: 'course progress bars, beginner-friendly books',
      probability: 0.5,
      requirements: {growth: 0.7, safety: 0.7}
    },
    {
      method: 'safe_experiments',
      description: 'Try new things in controlled environment',
      visual: 'sandbox projects, backup plans visible',
      probability: 0.3,
      requirements: {growth: 0.8, safety: 0.6}
    },
    {
      method: 'guided_exploration',
      description: 'Learning with safety nets',
      visual: 'tutorial bookmarks, mentor contacts displayed',
      probability: 0.2,
      requirements: {growth: 0.6, safety: 0.8}
    }
  ]
};
```

---

## 5. 실전 예시: "전신 문신 + 배나온 + 모범생" 순계산

### 5.1 입력: 사용자 데이터

```javascript
const userData = {
  domains: [
    "github.com",
    "stackoverflow.com",
    "notion.so",
    "reddit.com/r/tattoos",
    "goodreads.com"
  ],
  keywords: [
    "best study methods",
    "traditional tattoo meaning",
    "project management",
    "comfort food recipes"
  ],
  timePattern: "규칙적 (오전 6시-밤 10시)",
  manualInput: {
    interests: ["공부", "문신", "정리"],
    avoid: ["즉흥", "무계획"]
  }
};
```

### 5.2 Phase 1: 결정론적 추론

```javascript
// 욕구 벡터 추론
const needsVector = {
  expression: 0.9,    // tattoo 검색
  control: 0.85,      // notion, 규칙적 패턴
  meaning: 0.8,       // traditional meaning
  growth: 0.75,       // study methods
  pleasure: 0.6,      // comfort food
  safety: 0.7         // 규칙적 패턴
};

// 역설 발견
const paradoxes = [
  {
    pair: ['expression', 'control'],
    tension: 0.85,
    manifestation: "표현하되 계획적으로"
  },
  {
    pair: ['pleasure', 'control'],
    tension: 0.65,
    manifestation: "즐기되 통제하며"
  }
];

// 성격 도출
const personality = {
  surface: ['신중함', '의미 중시', '성실함'],
  shadow: ['완벽주의', '경직됨', '과로']
};
```

### 5.3 Phase 2: 아키타입 매칭

```javascript
// 유사도 계산
const matches = [
  {
    archetype: 'planned_rebel',
    similarity: 0.92,  // 매우 높음!
    weight: 0.92
  },
  {
    archetype: 'perfectionist_explorer',
    similarity: 0.78,
    weight: 0.78
  },
  {
    archetype: 'meaning_seeker',
    similarity: 0.71,
    weight: 0.71
  }
];

// 역설 → 시각화 옵션
const visualOptions = {
  'expression+control': [
    {method: 'planned_tattoos', probability: 0.35},
    {method: 'curated_collection', probability: 0.35},
    {method: 'systematic_creativity', probability: 0.3}
  ],
  'pleasure+control': [
    {method: 'scheduled_indulgence', probability: 0.45, bodyEffect: 'comfortable_build'},
    {method: 'organized_collection', probability: 0.35},
    {method: 'earned_rewards', probability: 0.2}
  ]
};
```

### 5.4 Phase 3: 확률적 선택

```javascript
// 아키타입 선택 (가중치 랜덤)
const selected = weightedRandom(matches);
// → 'planned_rebel' (92% 확률)

// 시각화 방법 선택
const visuals = {
  // expression+control 역설
  expressionMethod: weightedRandom(visualOptions['expression+control']),
  // → 'planned_tattoos' (35% 확률로 선택됨)
  //   결과: "extensive traditional tattoos"

  // pleasure+control 역설
  pleasureMethod: weightedRandom(visualOptions['pleasure+control']),
  // → 'scheduled_indulgence' (45% 확률로 선택됨)
  //   결과: "comfortable_build" (배나옴)

  // archetype 기본 특성
  spaceOrganization: 0.9,  // planned_rebel의 control 반영
  personalityDisplay: 'visible_meaningful_items'
};

// 일관성 검증
const validated = validateConsistency(innerProfile, visuals);
// ✅ 통과: 모든 요소가 욕구 벡터와 일치
```

### 5.5 Phase 4: 최종 결과

```javascript
const generatedCharacter = {
  innerProfile: {
    needs: {expression: 0.9, control: 0.85, meaning: 0.8, ...},
    paradoxes: [...],
    personality: {surface: ['신중함', '의미중시', '성실함'], ...}
  },

  visuals: {
    appearance: {
      tattoos: 'extensive traditional style',
      bodyType: 'comfortable build with visible belly',
      style: 'neat but individual'
    },

    space: {
      organization: 0.9,  // 매우 정돈됨
      items: [
        'tattoo_sketchbook',
        'notion_dashboard',
        'achievement_certificates',
        'comfort_food_items',
        'meaningful_objects'
      ]
    },

    mood: 'disciplined serenity with rebellious undercurrent'
  },

  archetype: 'planned_rebel',

  // 결과: "전신 문신 + 배나온 + 모범생"
  summary: 'Heavily tattooed perfectionist with comfortable build'
};
```

### 5.6 핵심: 확률이지만 일관성 있음

**같은 입력으로 10번 생성하면**:

```javascript
// 시도 1
visuals: {
  expressionMethod: 'planned_tattoos',  // 35%
  pleasureMethod: 'scheduled_indulgence'  // 45%
}
→ "전신 문신 + 배나온 + 모범생"

// 시도 2
visuals: {
  expressionMethod: 'curated_collection',  // 35%
  pleasureMethod: 'scheduled_indulgence'  // 45%
}
→ "예술 컬렉션 + 배나온 + 모범생"

// 시도 3
visuals: {
  expressionMethod: 'planned_tattoos',  // 35%
  pleasureMethod: 'organized_collection'  // 35%
}
→ "전신 문신 + 마른체형 + 모범생"

// ...
```

**관찰**:
- ✅ 모두 "계획적 반항가" 본질 유지
- ✅ 역설 (expression + control) 시각화됨
- ✅ 다양한 변형 가능
- ✅ 모두 일관성 있음

---

## 6. 시스템 파라미터 조정

### 6.1 다양성 vs 일관성 조절

```javascript
const GENERATION_CONFIG = {
  // 높을수록 예측 가능, 낮을수록 다양
  determinismLevel: 0.7,

  // 아키타입 선택 시 랜덤 정도
  archetypeRandomness: 0.3,  // 0: 항상 1등, 1: 완전 랜덤

  // 시각화 선택 시 랜덤 정도
  visualRandomness: 0.5,

  // 재생성 허용 횟수 (일관성 검증 실패 시)
  maxRetries: 3
};

// 사용 예
function generateWithConfig(userData, config) {
  if (config.determinismLevel > 0.8) {
    // 높은 결정론: 항상 최고 확률 선택
    return selectTopProbability(options);
  } else {
    // 낮은 결정론: 확률 분포대로 선택
    return weightedRandom(options);
  }
}
```

### 6.2 사용자 제어 옵션

```javascript
// 사용자가 특정 요소 고정 가능
const userPreferences = {
  fixedElements: {
    bodyType: 'comfortable_build',  // 배나온 체형 고정
    // expressionMethod는 시스템이 선택
  },

  avoidElements: {
    hairColor: ['bright_colors'],  // 밝은 색 머리 회피
  },

  preferredArchetypes: ['planned_rebel', 'meaning_seeker']
};

// 생성 시 반영
function generateWithPreferences(userData, preferences) {
  let visuals = selectVisuals(paradoxVisuals);

  // 고정 요소 적용
  if (preferences.fixedElements.bodyType) {
    visuals.bodyType = preferences.fixedElements.bodyType;
  }

  // 회피 요소 필터링
  visuals = filterAvoidedElements(visuals, preferences.avoidElements);

  return visuals;
}
```

---

## 7. 장점 및 한계

### 7.1 장점

**✅ 일관성**:
- 내면(욕구, 성격)은 결정론적 → 항상 일관
- 시스템 프롬프트 대화 패턴 안정적

**✅ 다양성**:
- 같은 욕구에서 다양한 시각적 표현
- 재생성 시 다른 룸메이트 (같은 본질)

**✅ 편향 회피**:
- 스테레오타입 직접 사용 안 함
- 욕구 벡터에서 자연스럽게 도출

**✅ 설명 가능성**:
- "왜 문신?" → expression(0.9) + control(0.85) 역설
- "왜 배나옴?" → pleasure(0.6) + scheduled_indulgence 선택
- 모든 결정에 이유 존재

**✅ 확장 가능**:
- 새 아키타입 추가 용이
- 새 시각화 전략 추가 가능

### 7.2 한계

**⚠️ 확률적 불확실성**:
- 같은 입력 → 다른 출력 (매번)
- 사용자가 특정 결과 재현 어려움
- 해결: seed 값 저장, 재생성 옵션

**⚠️ 아키타입 의존성**:
- 아키타입 라이브러리 품질에 따라 결과 좌우
- 초기 라이브러리 구축 필요
- 해결: 지속적 확장, 사용자 피드백

**⚠️ 극단적 조합 위험**:
- 랜덤 선택 시 이상한 조합 가능
- 해결: 일관성 검증, 제약 조건

**⚠️ 온보딩 데이터 품질 의존**:
- 부족한 데이터 → 부정확한 욕구 추론
- 해결: 최소 온보딩 데이터 요구사항 설정

---

## 8. 구현 로드맵

### Phase 1: 기본 시스템 (MVP)

```
Week 1-2: 결정론적 추론 엔진
- 욕구 벡터 추론 알고리즘
- 역설 탐지
- 성격 도출

Week 3-4: 아키타입 라이브러리 (5-10개)
- 주요 아키타입 정의
- 시각화 옵션 매핑
- 역설 시각화 전략

Week 5-6: 확률적 선택 엔진
- 가중치 랜덤 선택
- 일관성 검증
- 통합 파이프라인

Week 7-8: 프롬프트 생성
- 시스템 프롬프트 템플릿
- 이미지 프롬프트 빌더
- 테스트 및 검증
```

### Phase 2: 확장 (v2)

```
- 아키타입 라이브러리 확장 (30-50개)
- 시각화 전략 다양화
- 사용자 피드백 루프
- 선호도 학습 시스템
```

### Phase 3: 고도화 (v3)

```
- 다중 룸메이트 생성 (방 전체)
- 룸메이트 간 관계 설정
- 시간에 따른 성장/변화 시뮬레이션
- 고급 커스터마이징 옵션
```

---

## 9. 정리: 핵심 원칙

### 원칙 1: 내면은 결정론, 외면은 확률론

```
사용자 데이터 → 욕구 벡터 (결정론)
욕구 벡터 → 성격/전략 (결정론)
역설 → 시각화 옵션 (확률론)
옵션 → 구체적 외형 (확률론)
```

### 원칙 2: 일관성 > 다양성

확률적 선택이지만:
- 욕구 벡터와 모순되는 선택 불가
- 역설 시각화는 필수
- 아키타입 본질 유지

### 원칙 3: 설명 가능성

모든 선택에 이유:
```
"왜 이런 외모?" → 욕구 벡터 + 역설 + 확률적 선택
"왜 이런 성격?" → 욕구 → 전략 → 성격
"왜 이런 과거?" → 욕구를 만든 경험 역추론
```

### 원칙 4: 편향 회피

스테레오타입 사용 금지:
```
❌ "개발자니까 안경 + 후드티"
✅ "통제 욕구(0.8) → 정돈된 스타일 → 옵션 중 선택"
```

### 원칙 5: 확장 가능성

```
새 아키타입 추가 → 자동으로 선택지 증가
새 시각화 전략 → 다양성 증가
새 역설 매핑 → 표현력 증가
```

---

## 관련 문서

- [시스템 프롬프트 아키텍처](./README.md) - WHY-HOW-WHAT 프레임워크
- [벡터 조합 규칙](./vector-composition-rules.md) - 다각도 해석, 역설 발견
- [프롬프트 → 이미지](./prompt-to-image.md) - 시각화 파이프라인

---

## 버전 히스토리

- v1.0 (2025-10-28): 초기 문서 작성 - 하이브리드 시스템 설계
