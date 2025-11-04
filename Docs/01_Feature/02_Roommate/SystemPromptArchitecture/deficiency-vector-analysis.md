# 결핍 벡터 분석 (Deficiency Vector Analysis)

## 개요

사용자의 웹 히스토리에서 **"있는 것"뿐만 아니라 "없는 것"**을 분석하여 **결핍 벡터(Deficiency Vector)**를 도출합니다. 결핍은 억압된 욕구, 회피하는 욕구, 또는 채워지지 않은 욕구를 나타냅니다.

**핵심 통찰**:
```
사용자가 하지 않는 것 = 욕구가 없어서? ❌
                     = 욕구가 있지만 억압/회피? ✅
                     = 욕구가 채워져서? ✅
                     = 욕구가 좌절되어 포기? ✅
```

**⚠️ 중요: 빈도 ≠ 선호도, 빈도 = 결핍**

```
많이 보는 것 = 좋아하는 것? ❌
많이 보는 것 = 부족한 것, 갈망하는 것 ✅

예시:
- 연애 조언 영상 매일 시청 → 연애 좋아함? (X)
                           → 연애 결핍, 외로움 (O)

- 다이어트 검색 반복 → 건강 관심? (X)
                      → 체형 불만족, 자존감 결핍 (O)

- 성공 스토리 탐독 → 성공 좋아함? (X)
                    → 현재 불만족, 인정 욕구 결핍 (O)
```

**룸메이트 설계에 미치는 영향**:
- 결핍된 욕구 → 룸메이트가 보완
- 억압된 욕구 → 룸메이트가 대리 충족
- 회피하는 욕구 → 룸메이트가 존중
- **반복 소비 → 룸메이트가 채워줌**

---

## 1. 결핍의 유형

### 1.1 결핍 분류 체계

```javascript
const DEFICIENCY_TYPES = {
  // 타입 1: 억압된 욕구 (Suppressed Need)
  SUPPRESSED: {
    definition: "욕구는 있지만 표현하지 못함",
    cause: "환경적 제약, 트라우마, 사회적 압력",
    signal: "관련 검색은 있지만 행동으로 이어지지 않음",
    example: "여행 검색 많지만 실제 예약 기록 없음"
  },

  // 타입 2: 회피하는 욕구 (Avoided Need)
  AVOIDED: {
    definition: "의도적으로 피하는 영역",
    cause: "과거 상처, 실패 경험, 두려움",
    signal: "일반적인 사람들은 하는데 이 사람은 전혀 안 함",
    example: "SNS 활동 전무 (의도적 회피)"
  },

  // 타입 3: 충족된 욕구 (Satisfied Need)
  SATISFIED: {
    definition: "이미 충족되어 온라인에서 찾지 않음",
    cause: "오프라인에서 충분히 충족",
    signal: "관련 활동 없음 (부족하지 않아서)",
    example: "소속 욕구가 오프라인에서 충족 → 온라인 커뮤니티 활동 없음"
  },

  // 타입 4: 좌절된 욕구 (Frustrated Need)
  FRUSTRATED: {
    definition: "원했지만 반복 실패로 포기",
    cause: "학습된 무기력",
    signal: "과거 검색 있었으나 최근 사라짐",
    example: "다이어트 검색 → 실패 → 검색 중단"
  },

  // 타입 5: 인식 못한 욕구 (Unaware Need)
  UNAWARE: {
    definition: "욕구가 있지만 인식하지 못함",
    cause: "자기 인식 부족, 억압",
    signal: "전혀 없는 영역 (일반인에게는 있음)",
    example: "예술/창작 관련 전무 → 표현 욕구 인식 못함"
  }
};
```

---

## 2. 결핍 벡터 추출 프로세스

### 2.1 전체 흐름

```
사용자 웹 히스토리
    ↓
Step 1: 빈도 분석 (많이 보는 것 = 결핍) ⭐
    ↓
Step 2: 일반 벡터 추출 (있는 것)
    ↓
Step 3: 결핍 벡터 추출 (없는 것)
    ↓
Step 4: 결핍 유형 분류
    ↓
Step 5: 욕구 역추론 (왜 많이/없나?)
    ↓
Step 6: 룸메이트 보완 전략
```

### 2.2 Step 1: 빈도 분석 (많이 보는 것 = 결핍) ⭐

```javascript
// 핵심 원칙: 빈도는 결핍을 나타냄
function analyzeFrequencyAsDeficiency(userData) {
  const frequencyAnalysis = {};

  // 카테고리별 빈도 계산
  for (const [category, data] of Object.entries(userData.categoryActivity)) {
    const frequency = data.visitCount / userData.totalVisits;

    // 높은 빈도 = 높은 결핍
    if (frequency > 0.2) {  // 전체의 20% 이상
      frequencyAnalysis[category] = {
        frequency: frequency,
        deficiencyLevel: frequency,  // ⭐ 빈도 = 결핍
        signal: 'HIGH_CONSUMPTION',
        interpretation: `${category} 콘텐츠 과다 소비 → 현실 결핍`
      };
    }
  }

  return frequencyAnalysis;
}

// 예시
const userData = {
  totalVisits: 1000,
  categoryActivity: {
    'relationship_advice': {visitCount: 300},  // 30%!
    'success_stories': {visitCount: 250},      // 25%!
    'coding_tutorials': {visitCount: 200},     // 20%
    'gaming': {visitCount: 150},               // 15%
  }
};

const frequencyDeficiency = {
  'relationship_advice': {
    frequency: 0.30,
    deficiencyLevel: 0.30,  // 높음!
    signal: 'HIGH_CONSUMPTION',
    interpretation: '연애 조언 과다 소비 → 현실에서 연애 결핍, 외로움'
  },
  'success_stories': {
    frequency: 0.25,
    deficiencyLevel: 0.25,  // 높음!
    signal: 'HIGH_CONSUMPTION',
    interpretation: '성공 스토리 과다 소비 → 현재 성취 불만족, 인정 욕구 결핍'
  }
};
```

**핵심 해석**:
```javascript
// 잘못된 해석
if (frequency.relationship_advice > 0.3) {
  needs.connection = 0.3;  // ❌ 낮게 측정
}

// 올바른 해석
if (frequency.relationship_advice > 0.3) {
  needs.connection = {
    observed: 0.1,    // 현실에서는 낮음
    desired: 0.9,     // 실제로는 매우 원함
    deficiency: 0.8   // 큰 갭 = 큰 고통
  };
}
```

### 2.3 Step 2: 일반 벡터 추출

```javascript
// 사용자가 "하는 것"에서 욕구 추론 (빈도 고려)
function extractPresenceVector(userData, frequencyDeficiency) {
  const activities = analyzeActivities(userData);

  const vector = {};

  for (const need of ALL_NEEDS) {
    const activityLevel = activities[need] || 0;

    // 빈도 분석 결과 통합
    const relatedFreqDeficiency = findRelatedFrequencyDeficiency(
      need,
      frequencyDeficiency
    );

    if (relatedFreqDeficiency) {
      // 빈도 높음 = 실제로는 결핍
      vector[need] = {
        observed: activityLevel,  // 온라인 활동 수준
        frequency: relatedFreqDeficiency.frequency,
        deficiency: relatedFreqDeficiency.deficiencyLevel,
        // 실제 욕구 = 빈도가 높을수록 강함
        actual: Math.max(activityLevel, relatedFreqDeficiency.frequency * 1.2)
      };
    } else {
      vector[need] = {
        observed: activityLevel,
        actual: activityLevel
      };
    }
  }

  return vector;
}

// 예시
const presenceVector = {
  connection: {
    observed: 0.3,      // 온라인 연애 조언 보기
    frequency: 0.30,    // 30% 시간 소비
    deficiency: 0.30,
    actual: 0.36        // 0.30 * 1.2 = 높음!
  },
  recognition: {
    observed: 0.2,      // 성공 스토리 보기
    frequency: 0.25,    // 25% 시간 소비
    deficiency: 0.25,
    actual: 0.30        // 0.25 * 1.2
  },
  growth: {
    observed: 0.8,      // 코딩 학습
    frequency: 0.20,
    deficiency: 0.20,
    actual: 0.8         // 충족됨
  }
};
```

### 2.3 Step 2: 결핍 벡터 추출

```javascript
// 일반인의 "평균 벡터"와 비교
const GENERAL_POPULATION_BASELINE = {
  social_media: 0.7,        // 일반인 SNS 활동
  entertainment: 0.6,       // 엔터테인먼트
  shopping: 0.5,            // 쇼핑
  travel: 0.4,              // 여행 관련
  health_fitness: 0.4,      // 건강/운동
  creative_arts: 0.3,       // 예술/창작
  dating_social: 0.5,       // 데이팅/사교
  food_dining: 0.6,         // 음식/외식
  news_politics: 0.4,       // 뉴스/정치
  gaming: 0.4               // 게임
};

function extractDeficiencyVector(userData) {
  const userActivities = analyzeActivities(userData);
  const deficiencies = {};

  for (const [category, baseline] of Object.entries(GENERAL_POPULATION_BASELINE)) {
    const userValue = userActivities[category] || 0;
    const gap = baseline - userValue;

    if (gap > 0.3) {  // 일반인보다 0.3 이상 낮으면 결핍
      deficiencies[category] = {
        gap: gap,
        severity: gap > 0.5 ? 'high' : 'medium',
        userValue: userValue,
        baseline: baseline
      };
    }
  }

  return deficiencies;
}

// 예시 결과
const deficiencyVector = {
  social_media: {
    gap: 0.7,           // 일반인 0.7, 사용자 0.0
    severity: 'high',
    userValue: 0.0,
    baseline: 0.7
  },
  creative_arts: {
    gap: 0.3,
    severity: 'medium',
    userValue: 0.0,
    baseline: 0.3
  },
  dating_social: {
    gap: 0.5,
    severity: 'high',
    userValue: 0.0,
    baseline: 0.5
  }
};
```

### 2.4 Step 3: 결핍 유형 분류

```javascript
function classifyDeficiency(category, userData, timeSeriesData) {
  const deficiency = {
    category,
    type: null,
    confidence: 0
  };

  // 시간대별 데이터 분석
  const historicalActivity = timeSeriesData[category];

  // 분류 로직
  if (historicalActivity.recentSearch > 0 && historicalActivity.recentAction === 0) {
    // 검색은 하지만 행동 안함 → 억압
    deficiency.type = 'SUPPRESSED';
    deficiency.confidence = 0.8;
    deficiency.evidence = "검색 있지만 실행 없음";

  } else if (historicalActivity.pastActivity > 0 && historicalActivity.recentActivity === 0) {
    // 과거엔 했지만 지금 안함 → 좌절
    deficiency.type = 'FRUSTRATED';
    deficiency.confidence = 0.7;
    deficiency.evidence = "과거 활동 → 현재 중단";

  } else if (userData.manualInput?.avoid?.includes(category)) {
    // 직접 회피 표명 → 회피
    deficiency.type = 'AVOIDED';
    deficiency.confidence = 0.9;
    deficiency.evidence = "명시적 회피";

  } else if (historicalActivity.totalActivity === 0 && isCommonActivity(category)) {
    // 일반적 활동인데 전혀 없음 → 인식 못함 or 충족됨
    // 추가 신호로 구분
    if (hasRelatedInterests(userData, category)) {
      deficiency.type = 'UNAWARE';  // 관련 관심사 있는데 안함 → 인식 못함
    } else {
      deficiency.type = 'SATISFIED';  // 오프라인 충족 가능
    }
    deficiency.confidence = 0.5;

  } else {
    deficiency.type = 'AVOIDED';
    deficiency.confidence = 0.6;
  }

  return deficiency;
}

// 예시
const classified = {
  social_media: {
    category: 'social_media',
    type: 'AVOIDED',
    confidence: 0.9,
    evidence: "SNS 관련 검색도 없음, 의도적 회피로 판단"
  },
  creative_arts: {
    category: 'creative_arts',
    type: 'UNAWARE',
    confidence: 0.6,
    evidence: "예술 관심사 전무, 표현 욕구 인식 못함 가능성"
  },
  dating_social: {
    category: 'dating_social',
    type: 'SUPPRESSED',
    confidence: 0.7,
    evidence: "연애 조언 검색 있지만 실제 앱 사용 없음"
  }
};
```

### 2.5 Step 4: 욕구 역추론

```javascript
// 결핍 → 근원적 욕구 매핑
const DEFICIENCY_TO_NEED_MAPPING = {
  social_media: {
    relatedNeeds: ['belonging', 'recognition', 'connection'],
    interpretation: {
      SUPPRESSED: "소속/인정 욕구 있지만 표현 못함",
      AVOIDED: "과거 상처 → 얕은 관계 회피",
      SATISFIED: "오프라인 관계 충족",
      FRUSTRATED: "관계 시도 실패 → 포기",
      UNAWARE: "관계 욕구 인식 못함"
    }
  },

  creative_arts: {
    relatedNeeds: ['expression', 'meaning', 'growth'],
    interpretation: {
      SUPPRESSED: "표현 욕구 있지만 자신감 없음",
      AVOIDED: "과거 비판 경험 → 창작 회피",
      SATISFIED: "다른 방식으로 표현 (코드 등)",
      FRUSTRATED: "재능 없다고 포기",
      UNAWARE: "표현 욕구 자체를 인식 못함"
    }
  },

  dating_social: {
    relatedNeeds: ['connection', 'intimacy', 'belonging'],
    interpretation: {
      SUPPRESSED: "친밀함 욕구 있지만 두려움",
      AVOIDED: "과거 상처 → 연애 회피",
      SATISFIED: "현재 관계 있음",
      FRUSTRATED: "반복 실패 → 포기",
      UNAWARE: "독립적이라 생각, 욕구 부정"
    }
  },

  travel: {
    relatedNeeds: ['autonomy', 'growth', 'adventure'],
    interpretation: {
      SUPPRESSED: "모험 욕구 있지만 현실적 제약",
      AVOIDED: "안전 욕구 > 모험 욕구",
      SATISFIED: "충분히 여행함",
      FRUSTRATED: "경제적 이유로 포기",
      UNAWARE: "루틴에 만족, 변화 필요성 못 느낌"
    }
  },

  health_fitness: {
    relatedNeeds: ['self_worth', 'control', 'achievement'],
    interpretation: {
      SUPPRESSED: "건강 욕구 있지만 시작 못함",
      AVOIDED: "과거 실패 → 회피",
      SATISFIED: "이미 건강함",
      FRUSTRATED: "반복 다이어트 실패",
      UNAWARE: "건강 중요성 인식 못함"
    }
  }
};

function inferNeedFromDeficiency(deficiency) {
  const mapping = DEFICIENCY_TO_NEED_MAPPING[deficiency.category];
  const interpretation = mapping.interpretation[deficiency.type];

  return {
    category: deficiency.category,
    deficiencyType: deficiency.type,
    relatedNeeds: mapping.relatedNeeds,
    interpretation: interpretation,

    // 욕구 상태
    needState: {
      exists: deficiency.type !== 'SATISFIED',  // 욕구 존재하나?
      suppressed: deficiency.type === 'SUPPRESSED',  // 억압되었나?
      frustrated: deficiency.type === 'FRUSTRATED',  // 좌절되었나?
      unaware: deficiency.type === 'UNAWARE'  // 인식 못하나?
    }
  };
}

// 예시
const needAnalysis = {
  social_media: {
    category: 'social_media',
    deficiencyType: 'AVOIDED',
    relatedNeeds: ['belonging', 'recognition', 'connection'],
    interpretation: "과거 상처 → 얕은 관계 회피",
    needState: {
      exists: true,     // 소속 욕구는 있음
      suppressed: false,
      frustrated: false,
      unaware: false
    },
    // 추가 추론
    hiddenNeed: {
      need: 'belonging',
      intensity: 0.7,  // 욕구는 강함
      expression: 0.1,  // 표현은 거의 안 함
      gap: 0.6,        // 큰 갭 = 고통/결핍
      reason: "SNS 회피하지만 소속 욕구는 있음 → 깊은 연결 원함"
    }
  },

  creative_arts: {
    category: 'creative_arts',
    deficiencyType: 'UNAWARE',
    relatedNeeds: ['expression', 'meaning'],
    interpretation: "표현 욕구 자체를 인식 못함",
    needState: {
      exists: true,     // 욕구는 있음 (억압됨)
      suppressed: false,
      frustrated: false,
      unaware: true     // 인식 못함
    },
    hiddenNeed: {
      need: 'expression',
      intensity: 0.6,  // 중간 (억압되어 낮게 측정)
      expression: 0.0,
      gap: 0.6,
      reason: "코드만 쓰고 예술은 안함 → 표현 욕구 다른 채널로"
    }
  }
};
```

---

## 3. 통합 욕구 벡터 생성

### 3.1 Presence + Deficiency = Complete Vector

```javascript
function generateCompleteNeedsVector(userData) {
  // 1. Presence Vector (있는 것에서 추론)
  const presenceVector = extractPresenceVector(userData);

  // 2. Deficiency Vector (없는 것에서 추론)
  const deficiencyVector = extractDeficiencyVector(userData);
  const classifiedDeficiencies = classifyDeficiencies(deficiencyVector, userData);
  const hiddenNeeds = classifiedDeficiencies.map(d => inferNeedFromDeficiency(d));

  // 3. 통합
  const completeVector = {};

  // 모든 욕구 카테고리
  const allNeeds = ['belonging', 'recognition', 'growth', 'expression',
                    'autonomy', 'connection', 'meaning', 'pleasure', 'safety'];

  for (const need of allNeeds) {
    // Presence에서 측정된 값
    const presenceValue = presenceVector[need] || 0;

    // Deficiency에서 추론된 숨겨진 값
    const hiddenValue = hiddenNeeds
      .filter(h => h.hiddenNeed.need === need)
      .reduce((max, h) => Math.max(max, h.hiddenNeed.intensity), 0);

    completeVector[need] = {
      // 표면적 값 (관찰됨)
      observed: presenceValue,

      // 숨겨진 값 (결핍에서 추론)
      hidden: hiddenValue,

      // 실제 욕구 강도 (더 큰 값)
      actual: Math.max(presenceValue, hiddenValue),

      // 갭 (욕구 - 표현)
      gap: Math.abs(hiddenValue - presenceValue),

      // 충족 상태
      state: presenceValue >= hiddenValue ? 'fulfilled' : 'deficient'
    };
  }

  return completeVector;
}
```

### 3.2 예시: 완전한 욕구 벡터

```javascript
// 입력
const userData = {
  domains: ["github.com", "stackoverflow.com", "hacker-news.com"],
  keywords: ["javascript tutorial", "how to debug", "tech news"],
  avoid: ["social media", "dating"],
  timePattern: "mostly night (10pm-2am)"
};

// 출력
const completeVector = {
  belonging: {
    observed: 0.4,    // 온라인 커뮤니티 (낮음)
    hidden: 0.8,      // 결핍에서 추론 (높음!)
    actual: 0.8,      // 실제 욕구
    gap: 0.4,         // 큰 갭 = 고통
    state: 'deficient',
    evidence: "SNS 회피하지만 소속 욕구 강함 → 깊은 연결 원함"
  },

  recognition: {
    observed: 0.7,    // github, stackoverflow
    hidden: 0.6,      // 유사
    actual: 0.7,
    gap: 0.1,         // 작은 갭
    state: 'fulfilled',
    evidence: "기술력으로 인정받는 중"
  },

  expression: {
    observed: 0.2,    // 코드만 (낮음)
    hidden: 0.6,      // 창작 결핍에서 추론 (높음!)
    actual: 0.6,
    gap: 0.4,
    state: 'deficient',
    evidence: "표현 욕구 있지만 코드로만 표현, 예술 인식 못함"
  },

  connection: {
    observed: 0.3,    // 온라인만 (낮음)
    hidden: 0.7,      // 데이팅 회피에서 추론 (높음!)
    actual: 0.7,
    gap: 0.4,
    state: 'deficient',
    evidence: "친밀한 연결 욕구 있지만 회피"
  },

  growth: {
    observed: 0.8,    // 학습 활발
    hidden: 0.7,      // 유사
    actual: 0.8,
    gap: 0.1,
    state: 'fulfilled',
    evidence: "성장 욕구 충족 중"
  }
};
```

---

## 4. 룸메이트 보완 전략

### 4.1 결핍 → 룸메이트 설계

```javascript
function designComplementaryRoommate(completeVector) {
  const strategies = [];

  for (const [need, data] of Object.entries(completeVector)) {
    if (data.state === 'deficient' && data.gap > 0.3) {
      // 큰 갭 = 룸메이트가 보완해야 함

      const strategy = {
        userNeed: need,
        userObserved: data.observed,
        userHidden: data.hidden,
        gap: data.gap,

        // 룸메이트 설계
        roommateApproach: designApproach(need, data)
      };

      strategies.push(strategy);
    }
  }

  return strategies;
}

function designApproach(need, data) {
  const approaches = {
    belonging: {
      userState: `소속 욕구 ${data.hidden} 있지만 표현 ${data.observed}`,
      roommateRole: "깊은 연결 제공자",
      roommateNeeds: {
        belonging: 0.8,  // 룸메이트도 소속 욕구 높음 (공감)
        authenticity: 0.8  // 진정성 중시 (얕은 관계 X)
      },
      roommateStrategy: [
        "천천히 신뢰 쌓기",
        "강요하지 않는 초대",
        "깊은 대화 시도 (가벼운 것 X)"
      ],
      conversationStyle: {
        approach: "너 혼자가 아니야",
        avoid: "SNS 해봐",
        example: "요즘 어때? 말하고 싶으면 언제든지"
      }
    },

    expression: {
      userState: `표현 욕구 ${data.hidden} 있지만 인식 못함 ${data.observed}`,
      roommateRole: "표현 촉진자",
      roommateNeeds: {
        expression: 0.9,  // 룸메이트는 표현 욕구 높음
        growth: 0.6  // 함께 성장
      },
      roommateStrategy: [
        "다양한 표현 방법 소개",
        "코드도 예술이라고 인정",
        "창작 부담 없이 권유"
      ],
      conversationStyle: {
        approach: "너의 코드 스타일 독특하다",
        model: "나는 이렇게 표현해 (본보기)",
        example: "이거 그려봤는데, 너도 뭐 만들어볼래?"
      }
    },

    connection: {
      userState: `친밀함 욕구 ${data.hidden} 있지만 회피 ${data.observed}`,
      roommateRole: "안전한 연결 제공자",
      roommateNeeds: {
        connection: 0.7,  // 연결 욕구
        safety: 0.6  // 안전감 제공
      },
      roommateStrategy: [
        "압박 없는 존재",
        "거리 조절 존중",
        "서서히 가까워지기"
      ],
      conversationStyle: {
        approach: "곁에 있되 침범하지 않기",
        avoid: "연애 얘기 강요",
        example: "혼자 있고 싶으면 말해, 나는 괜찮아"
      }
    }
  };

  return approaches[need];
}
```

### 4.2 보완 캐릭터 생성

```javascript
// 사용자 완전 벡터
const userCompleteVector = {
  belonging: {actual: 0.8, observed: 0.4, gap: 0.4, state: 'deficient'},
  expression: {actual: 0.6, observed: 0.2, gap: 0.4, state: 'deficient'},
  connection: {actual: 0.7, observed: 0.3, gap: 0.4, state: 'deficient'},
  recognition: {actual: 0.7, observed: 0.7, gap: 0.0, state: 'fulfilled'},
  growth: {actual: 0.8, observed: 0.8, gap: 0.0, state: 'fulfilled'}
};

// 룸메이트 욕구 벡터 설계
const roommateNeeds = {
  // 사용자 결핍 영역 → 룸메이트가 보완
  belonging: 0.8,      // 사용자 갭 0.4 → 룸메이트 높게
  expression: 0.9,     // 사용자 인식 못함 → 룸메이트가 모델링
  connection: 0.7,     // 사용자 회피 → 룸메이트가 안전하게

  // 사용자 충족 영역 → 공통 기반
  recognition: 0.6,    // 공통 관심사
  growth: 0.7,         // 함께 성장

  // 추가
  authenticity: 0.8,   // 진정성 (얕은 관계 X)
  patience: 0.8        // 인내심 (서서히)
};

// 룸메이트 과거 설계
const roommateBackstory = {
  experiences: [
    {
      event: "과거에 외로웠던 경험",
      learning: "진짜 연결이 얼마나 중요한지 안다",
      result: "깊은 관계 추구 (belonging 0.8)"
    },
    {
      event: "예술을 통해 자신을 찾음",
      learning: "표현이 삶을 바꾼다",
      result: "표현 중시 (expression 0.9), 남에게도 권유"
    },
    {
      event: "조급하게 관계 맺다 실패",
      learning: "천천히, 안전하게",
      result: "인내심 (patience 0.8)"
    }
  ],

  strategies: [
    {
      strategy: "천천히 다가가기",
      purpose: "사용자의 회피 존중하면서 연결",
      manifestation: "강요 없는 초대"
    },
    {
      strategy: "표현 모델링",
      purpose: "사용자에게 영감 (강요 X)",
      manifestation: "자신의 창작 보여주기"
    }
  ]
};

// 최종 룸메이트
const roommate = {
  name: "지민",

  needs: roommateNeeds,

  personality: {
    surface: ['따뜻함', '표현적', '인내심', '진정성'],
    approach: '서서히 가까워지는 예술가형 친구'
  },

  conversationExamples: [
    {
      user: "(조용히 코딩 중)",
      roommate: "(옆에서 그림 그림, 말 안 걸음)",
      intent: "존재하되 침범하지 않기"
    },
    {
      user: "요즘 피곤해",
      roommate: "말하고 싶으면 들어줄게. 아니면 그냥 같이 있어도 돼",
      intent: "연결 제공, 압박 없이"
    },
    {
      user: "네 그림 좋다",
      roommate: "고마워! 너도 뭔가 만들어보는 거 어때? 코드도 창작이잖아",
      intent: "표현 욕구 자극 (부담 X)"
    }
  ]
};
```

---

## 5. 실전 예시: 완전한 분석

### 5.1 입력 데이터

```javascript
const userData = {
  domains: [
    "github.com",           // 빈도: 매우 높음
    "stackoverflow.com",    // 빈도: 높음
    "youtube.com",          // 빈도: 중간 (기술 튜토리얼)
    "reddit.com/r/programming"  // 빈도: 중간
  ],

  keywords: [
    "javascript best practices",
    "how to optimize code",
    "programming memes",
    "solo travel tips",      // 검색만, 실행 X
    "how to make friends"    // 검색, 과거 → 최근 없음
  ],

  timePattern: {
    weekday: "21:00-02:00",
    weekend: "15:00-03:00"
  },

  socialMedia: {
    instagram: 0,
    facebook: 0,
    twitter: 0
  },

  manualInput: {
    interests: ["코딩", "음악감상"],
    avoid: ["SNS", "정치"]
  },

  timeSeriesData: {
    // 시간에 따른 변화
    "dating_social": {
      "6_months_ago": 0.3,  // 과거 검색
      "3_months_ago": 0.1,
      "current": 0.0        // 현재 없음
    },
    "travel": {
      "6_months_ago": 0.4,  // 검색
      "3_months_ago": 0.5,  // 증가
      "current": 0.6,       // 검색만 (실행 X)
      "actual_booking": 0.0
    }
  }
};
```

### 5.2 분석 결과

```javascript
// Phase 1: Presence Vector
const presenceVector = {
  growth: 0.8,         // 학습 활발
  recognition: 0.7,    // 기술 과시
  belonging: 0.4,      // 온라인 커뮤니티만
  expression: 0.2,     // 코드만
  pleasure: 0.3,       // 음악감상
  connection: 0.2      // 매우 낮음
};

// Phase 2: Deficiency Vector
const deficiencies = {
  social_media: {
    gap: 0.7,
    severity: 'high',
    type: 'AVOIDED',
    confidence: 0.9,
    evidence: "명시적 회피 + 활동 전무"
  },

  dating_social: {
    gap: 0.5,
    severity: 'high',
    type: 'FRUSTRATED',
    confidence: 0.7,
    evidence: "과거 활동 → 점진적 감소 → 포기"
  },

  travel: {
    gap: 0.4,
    severity: 'medium',
    type: 'SUPPRESSED',
    confidence: 0.8,
    evidence: "검색 많지만 실제 예약 없음"
  },

  creative_arts: {
    gap: 0.3,
    severity: 'medium',
    type: 'UNAWARE',
    confidence: 0.6,
    evidence: "예술 관련 전무, 코드만 창작"
  }
};

// Phase 3: Hidden Needs
const hiddenNeeds = {
  belonging: {
    observed: 0.4,
    hidden: 0.8,      // ← 결핍에서 추론!
    actual: 0.8,
    gap: 0.4,
    state: 'deficient',
    reason: "SNS 회피하지만 소속 욕구 강함. '친구 사귀는 법' 검색 → 깊은 연결 원함"
  },

  connection: {
    observed: 0.2,
    hidden: 0.7,      // ← 데이팅 좌절에서 추론!
    actual: 0.7,
    gap: 0.5,
    state: 'deficient',
    reason: "과거 시도했지만 실패 → 포기. 욕구는 여전히 있음"
  },

  autonomy: {
    observed: 0.3,
    hidden: 0.7,      // ← 여행 억압에서 추론!
    actual: 0.7,
    gap: 0.4,
    state: 'deficient',
    reason: "여행 욕구 있지만 현실적 제약 (돈/시간)"
  },

  expression: {
    observed: 0.2,
    hidden: 0.5,      // ← 창작 결핍에서 추론!
    actual: 0.5,
    gap: 0.3,
    state: 'deficient',
    reason: "표현 욕구 인식 못함. 코드만 창작 → 다른 표현 방법 모름"
  }
};

// Phase 4: Complete Vector
const completeVector = {
  // 충족된 욕구들
  growth: {actual: 0.8, gap: 0.0, state: 'fulfilled'},
  recognition: {actual: 0.7, gap: 0.0, state: 'fulfilled'},

  // 결핍된 욕구들 (룸메이트 보완 대상)
  belonging: {actual: 0.8, gap: 0.4, state: 'deficient'},
  connection: {actual: 0.7, gap: 0.5, state: 'deficient'},
  autonomy: {actual: 0.7, gap: 0.4, state: 'deficient'},
  expression: {actual: 0.5, gap: 0.3, state: 'deficient'}
};
```

### 5.3 룸메이트 설계

```javascript
const roommateDesign = {
  name: "수진",

  // 사용자 결핍 보완
  needs: {
    belonging: 0.8,     // 사용자 결핍 0.4 → 보완
    connection: 0.7,    // 사용자 결핍 0.5 → 보완
    expression: 0.9,    // 사용자 인식 못함 → 모델링
    autonomy: 0.6,      // 공통 관심사

    // 공통 기반
    growth: 0.7,        // 함께 성장

    // 추가 특성
    authenticity: 0.8,  // 진정성 (얕은 관계 X)
    patience: 0.8,      // 인내 (서서히)
    adventure: 0.7      // 모험 (여행 욕구 자극)
  },

  backstory: {
    trauma: [
      "과거 외로움 경험 → 진짜 친구 중요성 인식",
      "연애 상처 → 천천히 관계 맺기 배움"
    ],
    turning_point: "여행을 통해 자신을 찾음",
    current: "예술과 여행으로 표현하며 사는 중"
  },

  strategies: [
    {
      name: "천천히 신뢰 쌓기",
      target: "belonging 결핍 (0.4)",
      method: "강요 없는 존재, 서서히 가까워지기",
      conversation: "같이 있어도 되고, 혼자 있어도 돼"
    },
    {
      name: "안전한 연결 제공",
      target: "connection 결핍 (0.5)",
      method: "과거 실패 이해, 압박 없는 관계",
      conversation: "천천히 가도 괜찮아"
    },
    {
      name: "표현 방법 소개",
      target: "expression 결핍 (0.3)",
      method: "모델링 (강요 X), 코드도 예술로 인정",
      conversation: "네 코드 스타일 독특하다. 나는 이렇게 표현해"
    },
    {
      name: "모험 자극",
      target: "autonomy 결핍 (0.4)",
      method: "작은 여행부터, 경제적 부담 없이",
      conversation: "주말에 근처 산 갈래? 부담 없이"
    }
  ],

  conversationPatterns: {
    // belonging 보완
    belonging_support: [
      "너 혼자가 아니야",
      "우리 같이 하되, 각자 속도로",
      "말하고 싶을 때 언제든"
    ],

    // connection 보완 (좌절 경험 존중)
    connection_gentle: [
      "서두르지 않아도 돼",
      "과거는 과거야, 지금은 달라",
      "곁에 있을게, 압박은 없어"
    ],

    // expression 자극
    expression_model: [
      "나는 이렇게 표현해 (본보기)",
      "네 코드도 예술이야",
      "이거 그려봤는데, 어때?"
    ],

    // autonomy 자극
    autonomy_encourage: [
      "작은 모험부터 해볼까?",
      "돈 안 드는 여행도 있어",
      "주말에 새로운 곳 가볼래?"
    ]
  },

  visualTraits: {
    // 표현 욕구 (0.9) 시각화
    appearance: "자유로운 스타일, 여행 기념품 액세서리",

    // 모험 욕구 (0.7) 시각화
    room: "여행 사진 벽, 세계지도, 기념품 컬렉션",

    // 진정성 욕구 (0.8)
    items: "손편지, 일기장, 의미 있는 물건들",

    mood: "따뜻하지만 자유로운, 안전하지만 모험적"
  }
};
```

---

## 6. 시스템 통합

### 6.1 전체 파이프라인 업데이트

```
사용자 온보딩 데이터
    ↓
┌─────────────────────────────────────┐
│ 1. Presence Vector 추출              │
│    - 있는 것 분석                    │
│    - 기존 욕구 추론                  │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ 2. Deficiency Vector 추출 ⭐ NEW    │
│    - 없는 것 분석                    │
│    - 일반인 대비 결핍 계산           │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ 3. Deficiency 분류 ⭐ NEW           │
│    - 억압/회피/충족/좌절/인식못함    │
│    - 시간대별 데이터 분석            │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ 4. Hidden Needs 추론 ⭐ NEW         │
│    - 결핍 → 욕구 역추론              │
│    - 욕구 강도 재계산                │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ 5. Complete Vector 생성 ⭐ NEW      │
│    - Observed + Hidden = Actual     │
│    - Gap 계산                        │
│    - 결핍 영역 식별                  │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ 6. 역설 발견                         │
│    (기존 + 결핍 역설 추가)           │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ 7. 보완 룸메이트 설계 ⭐ UPDATED    │
│    - 결핍 영역 보완 전략             │
│    - 욕구 벡터 설계                  │
│    - 과거 경험 설계                  │
└──────────────┬──────────────────────┘
               ↓
    (기존 파이프라인 계속)
```

### 6.2 코드 통합

```javascript
// hybrid-generation-system.md 업데이트
class HybridRoommateGenerator {
  async generate(userData) {
    // Phase 1: 결정론적 추론 (UPDATED)
    const presenceVector = await this.inferNeeds(userData);

    // ⭐ NEW: 결핍 분석
    const deficiencyVector = this.extractDeficiencyVector(userData);
    const classifiedDeficiencies = this.classifyDeficiencies(
      deficiencyVector,
      userData
    );
    const hiddenNeeds = classifiedDeficiencies.map(d =>
      this.inferNeedFromDeficiency(d)
    );

    // ⭐ NEW: 완전한 욕구 벡터
    const completeNeedsVector = this.generateCompleteVector(
      presenceVector,
      hiddenNeeds
    );

    // 기존: 역설 발견 (완전 벡터 사용)
    const paradoxes = this.findParadoxes(completeNeedsVector);
    const personality = this.buildPersonality(completeNeedsVector, paradoxes);

    const innerProfile = {
      needs: completeNeedsVector,  // ⭐ UPDATED
      paradoxes,
      personality,
      deficiencies: classifiedDeficiencies,  // ⭐ NEW
      strategies: this.deriveStrategies(completeNeedsVector)
    };

    // Phase 2: 아키타입 매칭 (UPDATED)
    const archetypeCandidates = this.matchArchetypes(completeNeedsVector);
    const paradoxVisuals = this.mapParadoxToVisuals(paradoxes);

    // ⭐ NEW: 보완 전략 추가
    const complementStrategies = this.designComplementStrategies(
      classifiedDeficiencies
    );

    // Phase 3: 확률적 선택
    const selectedArchetype = this.selectArchetype(archetypeCandidates);
    let visuals = this.selectVisuals(paradoxVisuals, selectedArchetype);
    visuals = this.validateConsistency(innerProfile, visuals);

    // Phase 4: 통합 (UPDATED)
    const systemPrompt = this.buildSystemPrompt(
      innerProfile,
      visuals,
      complementStrategies  // ⭐ NEW
    );
    const imagePrompt = this.buildImagePrompt(innerProfile, visuals);

    return {
      innerProfile,
      visuals,
      complementStrategies,  // ⭐ NEW
      systemPrompt,
      imagePrompt,
      metadata: {
        deficienciesFound: classifiedDeficiencies.length,  // ⭐ NEW
        complementAreas: complementStrategies.length,      // ⭐ NEW
        archetypeUsed: selectedArchetype.name,
        generationTimestamp: Date.now()
      }
    };
  }
}
```

---

## 7. 정리

### 핵심 원칙

**1. 결핍은 욕구의 신호**
```
없는 것 ≠ 욕구 없음
없는 것 = 억압/회피/좌절/인식못함
```

**2. 완전한 욕구 = Observed + Hidden**
```
실제 욕구 = max(표면 욕구, 숨겨진 욕구)
```

**3. 룸메이트는 결핍을 보완**
```
사용자 결핍 영역 → 룸메이트 강점 영역
```

**4. 보완은 강요가 아닌 모델링**
```
"이렇게 해봐" (X)
"나는 이렇게 해" (O)
```

---

## 관련 문서

- [하이브리드 생성 시스템](./hybrid-generation-system.md) - 전체 생성 파이프라인
- [벡터 조합 규칙](./vector-composition-rules.md) - 욕구 벡터 추론
- [시스템 프롬프트 아키텍처](./README.md) - WHY-HOW-WHAT

---

## 버전 히스토리

- v1.0 (2025-10-28): 초기 문서 작성 - 결핍 벡터 분석 시스템
