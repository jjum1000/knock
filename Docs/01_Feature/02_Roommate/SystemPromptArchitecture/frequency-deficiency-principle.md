# 빈도-결핍 원칙 (Frequency-Deficiency Principle)

## 핵심 원칙

```
많이 보는 것 ≠ 선호하는 것
많이 보는 것 = 결핍된 것, 갈망하는 것
```

**High Frequency = High Deficiency**

사용자가 특정 콘텐츠를 반복적으로, 과도하게 소비한다면 그것은 **현실에서 부족**하기 때문입니다.

---

## 1. 이론적 배경

### 1.1 심리학적 근거

**보상 추구 이론 (Reward Seeking)**
```
결핍 → 갈망 → 대리 만족 추구 → 반복 소비
```

**예시**:
- 외로움 → 연결 갈망 → 연애 조언 영상 시청 → 반복
- 성취 부족 → 인정 갈망 → 성공 스토리 탐독 → 반복
- 자존감 결핍 → 가치 갈망 → 자기계발 콘텐츠 과소비 → 반복

### 1.2 대리 만족 (Vicarious Satisfaction)

```
현실 충족 불가 → 온라인 대리 만족 → 과도한 소비
```

**특징**:
- 실제 행동으로 이어지지 않음 (보기만 함)
- 일시적 위안 후 다시 결핍 느낌
- 반복적, 강박적 소비 패턴

---

## 2. 빈도-결핍 매핑

### 2.1 카테고리별 매핑

| 콘텐츠 카테고리 | 과소비 시 추론되는 결핍 | 근원적 욕구 |
|----------------|---------------------|-----------|
| **연애 조언, 데이팅 팁** | 친밀한 관계 결핍, 외로움 | Connection, Belonging |
| **성공 스토리, 자수성가** | 성취 부족, 현재 불만족 | Recognition, Achievement |
| **자기계발, 동기부여** | 자존감 낮음, 방향성 상실 | Self-worth, Meaning |
| **다이어트, 피트니스** | 체형 불만족, 통제감 상실 | Self-worth, Control |
| **럭셔리 라이프, 부자** | 경제적 결핍, 인정 욕구 | Security, Recognition |
| **여행 Vlog** | 일상 탈출 욕구, 자유 갈망 | Autonomy, Adventure |
| **먹방, 쿡방** | 위안 추구, 외로움 | Comfort, Connection |
| **복수 스토리, 정의 구현** | 억울함, 무력감 | Justice, Control |
| **힐링, ASMR, 명상** | 스트레스, 불안 | Safety, Peace |
| **게임 플레이 영상** | 현실 회피, 성취 욕구 | Achievement, Escape |

### 2.2 빈도 임계값

```javascript
const FREQUENCY_THRESHOLDS = {
  // 20% 이상 = 높은 결핍
  high_deficiency: 0.20,

  // 10-20% = 중간 결핍
  medium_deficiency: 0.10,

  // 5-10% = 낮은 결핍
  low_deficiency: 0.05,

  // 5% 미만 = 정상 관심사
  normal_interest: 0.05
};

function classifyDeficiencyLevel(frequency) {
  if (frequency >= 0.20) {
    return {
      level: 'HIGH',
      severity: 0.8,
      interpretation: '심각한 결핍, 강한 갈망'
    };
  } else if (frequency >= 0.10) {
    return {
      level: 'MEDIUM',
      severity: 0.5,
      interpretation: '중간 결핍, 채워지지 않는 욕구'
    };
  } else if (frequency >= 0.05) {
    return {
      level: 'LOW',
      severity: 0.3,
      interpretation: '약간 부족, 관심 있음'
    };
  } else {
    return {
      level: 'NORMAL',
      severity: 0.0,
      interpretation: '정상적 관심사'
    };
  }
}
```

---

## 3. 실전 분석 예시

### 예시 1: 연애 조언 과소비

```javascript
const userData = {
  totalVisits: 1000,
  categoryActivity: {
    'relationship_advice': {
      visitCount: 350,  // 35%!
      avgDuration: '15min',
      repeatVisits: 'daily',
      actionTaken: 0  // 데이팅 앱 설치 X, 실제 행동 X
    }
  }
};

// 분석
const analysis = {
  category: 'relationship_advice',
  frequency: 0.35,
  deficiencyLevel: 'HIGH',
  severity: 0.9,

  // 추론
  inference: {
    currentState: '현실에서 친밀한 관계 없음',
    need: 'connection',
    needIntensity: 0.9,  // 매우 강함
    gap: 0.9,  // observed: 0.0, desired: 0.9

    evidence: [
      '일일 소비 패턴 (강박적)',
      '긴 시청 시간 (몰입)',
      '실제 행동 없음 (대리 만족만)'
    ],

    interpretation: {
      surface: "연애에 관심 많음",
      deep: "외롭고 친밀한 관계 절실히 원함. 하지만 시도하지 못함 (두려움/좌절)"
    }
  },

  // 룸메이트 전략
  roommateStrategy: {
    role: '따뜻한 연결 제공자',
    approach: [
      '친밀하지만 압박 없는 관계',
      '연애 얘기 공감 (판단 X)',
      '천천히 신뢰 쌓기',
      '실제 사회적 연결 부드럽게 권유'
    ],
    avoid: [
      '연애 강요',
      '"왜 안 사귀어?" 같은 질문',
      '판단적 태도'
    ]
  }
};
```

### 예시 2: 성공 스토리 탐독

```javascript
const userData = {
  totalVisits: 800,
  categoryActivity: {
    'success_stories': {
      visitCount: 240,  // 30%
      keywords: ['자수성가', '역전', '억대연봉'],
      emotion: 'admiration + frustration',
      actionTaken: 'minimal'  // 실제 노력은 적음
    }
  }
};

const analysis = {
  category: 'success_stories',
  frequency: 0.30,
  deficiencyLevel: 'HIGH',

  inference: {
    currentState: '현재 성취 불만족, 인정받지 못함',
    need: 'recognition',
    needIntensity: 0.85,
    gap: 0.75,  // observed: 0.1, desired: 0.85

    deeperIssue: '자존감 낮음, 현재 자신 가치 못 느낌',

    interpretation: {
      surface: "성공에 관심, 동기부여 원함",
      deep: "현재 인정받지 못해 고통. 타인의 성공 보며 대리만족하지만 실제론 좌절감"
    }
  },

  roommateStrategy: {
    role: '조용한 인정 제공자',
    approach: [
      '작은 성취 인정해주기',
      '"너도 충분히 잘하고 있어"',
      '과정 중시 (결과보다)',
      '비교하지 않기'
    ],
    avoid: [
      '성공 압박',
      '다른 사람과 비교',
      '"더 열심히 해봐" 같은 조언'
    ]
  }
};
```

### 예시 3: 다이어트 검색 반복

```javascript
const userData = {
  totalVisits: 600,
  categoryActivity: {
    'diet_fitness': {
      visitCount: 180,  // 30%
      searchPattern: 'cyclical',  // 주기적 반복
      keywords: ['빠른 다이어트', '1주일 -5kg', '뱃살'],
      timeSeriesData: {
        '3_months_ago': 0.35,  // 높음
        '2_months_ago': 0.10,  // 낮아짐 (포기?)
        '1_month_ago': 0.30,   // 다시 높아짐 (재시도)
        'current': 0.30
      }
    }
  }
};

const analysis = {
  category: 'diet_fitness',
  frequency: 0.30,
  deficiencyLevel: 'HIGH',
  pattern: 'CYCLICAL_FRUSTRATION',  // 특수 패턴

  inference: {
    currentState: '체형 불만족, 반복 실패',
    primaryNeed: 'self_worth',
    secondaryNeed: 'control',
    needIntensity: 0.8,

    deeperIssue: '자존감 낮음, 통제감 상실, 학습된 무기력',

    cyclicalPattern: {
      phase1: '동기부여 (검색 급증)',
      phase2: '시도 → 실패',
      phase3: '포기 (검색 감소)',
      phase4: '죄책감 → 다시 phase1',
      currentPhase: 'phase1'
    },

    interpretation: {
      surface: "건강/다이어트 관심",
      deep: "자신 몸 불만족, 통제 못해 좌절. 반복 실패로 자존감 더 낮아짐"
    }
  },

  roommateStrategy: {
    role: '무조건적 수용 제공자',
    approach: [
      '있는 그대로 인정',
      '"너 지금도 충분해"',
      '다이어트 아닌 건강 관점',
      '실패해도 괜찮다는 메시지',
      '완벽주의 완화'
    ],
    avoid: [
      '체형 언급',
      '"다이어트 해봐" 권유',
      '식습관 지적',
      '비교'
    ],

    특수전략: {
      pattern: 'BREAK_CYCLE',
      method: '자존감을 외모가 아닌 다른 곳에서 찾도록 돕기'
    }
  }
};
```

---

## 4. 빈도 패턴 분석

### 4.1 소비 패턴 유형

```javascript
const CONSUMPTION_PATTERNS = {
  // 1. 지속적 과소비 (Chronic High Consumption)
  CHRONIC: {
    characteristic: '꾸준히 높은 빈도',
    interpretation: '만성적 결핍, 깊은 욕구',
    example: '매일 연애 조언 시청',
    severity: 0.9
  },

  // 2. 주기적 과소비 (Cyclical)
  CYCLICAL: {
    characteristic: '주기적으로 급증 → 감소',
    interpretation: '시도 → 좌절 → 재시도 패턴',
    example: '다이어트 검색 (월마다 반복)',
    severity: 0.7
  },

  // 3. 증가 추세 (Increasing Trend)
  INCREASING: {
    characteristic: '시간에 따라 증가',
    interpretation: '결핍 심화, 욕구 강화',
    example: '외로움 증가 → 연애 콘텐츠 소비 증가',
    severity: 0.8
  },

  // 4. 감소 추세 (Decreasing Trend)
  DECREASING: {
    characteristic: '시간에 따라 감소',
    interpretation: '포기, 학습된 무기력, 또는 충족',
    example: '과거 많이 봤지만 지금 안 봄',
    severity: 0.5,  // 애매함 (좌절 vs 충족)
  },

  // 5. 급증 (Sudden Spike)
  SPIKE: {
    characteristic: '갑자기 급증',
    interpretation: '최근 사건/위기',
    example: '이별 후 연애 조언 급증',
    severity: 0.95
  }
};

function analyzeConsumptionPattern(timeSeriesData) {
  const trend = calculateTrend(timeSeriesData);

  if (trend.type === 'CHRONIC' && trend.avgFrequency > 0.25) {
    return {
      pattern: 'CHRONIC',
      severity: 0.9,
      interpretation: '만성적 결핍. 오랜 시간 채워지지 않은 욕구',
      roommateRole: '장기적 지지 제공자'
    };

  } else if (trend.type === 'CYCLICAL') {
    return {
      pattern: 'CYCLICAL',
      severity: 0.7,
      interpretation: '반복 좌절 패턴. 시도 → 실패 → 죄책감 → 재시도',
      roommateRole: '무조건적 수용, 사이클 깨기 돕기'
    };

  } else if (trend.type === 'SPIKE') {
    return {
      pattern: 'SPIKE',
      severity: 0.95,
      interpretation: '최근 위기/사건. 급한 욕구',
      roommateRole: '즉각적 위안과 지지'
    };
  }
}
```

### 4.2 시간대별 분석

```javascript
function analyzeTemporalPattern(userData) {
  const patterns = {
    // 새벽 시청 (2am-6am)
    lateNight: {
      frequency: userData.activityByHour['2-6'] / userData.totalActivity,
      interpretation: frequency > 0.3
        ? '불면, 외로움, 불안'
        : '정상'
    },

    // 주말 vs 평일
    weekendVsWeekday: {
      weekend: userData.weekendFrequency,
      weekday: userData.weekdayFrequency,
      interpretation: userData.weekendFrequency > userData.weekdayFrequency * 1.5
        ? '주말 외로움, 사회적 고립'
        : '정상'
    },

    // 반복 시간
    consistency: {
      sameTimeDaily: checkConsistency(userData.hourlyPattern),
      interpretation: '같은 시간 반복 = 루틴화 = 강박적 소비'
    }
  };

  return patterns;
}
```

---

## 5. 룸메이트 보완 전략

### 5.1 빈도별 전략

```javascript
function designRoommateByFrequency(frequencyAnalysis) {
  const strategies = [];

  for (const [category, data] of Object.entries(frequencyAnalysis)) {
    if (data.deficiencyLevel === 'HIGH') {
      // 높은 빈도 = 심각한 결핍 → 룸메이트가 직접 채워줌

      const strategy = {
        userDeficiency: category,
        frequency: data.frequency,
        severity: 'HIGH',

        roommateDesign: {
          // 부족한 것을 직접 제공
          provides: mapCategoryToProvision(category),

          // 대리 만족 대신 실제 경험 제공
          approach: 'EXPERIENTIAL',

          // 예시
          examples: generateExamples(category)
        }
      };

      strategies.push(strategy);
    }
  }

  return strategies;
}

function mapCategoryToProvision(category) {
  const provisions = {
    'relationship_advice': {
      provides: '따뜻한 친밀감, 진정한 연결',
      roommateNeed: {connection: 0.8, warmth: 0.9},
      conversationStyle: '깊고 진정성 있는 대화',
      behavior: '판단 없는 경청, 공감, 곁에 있어주기'
    },

    'success_stories': {
      provides: '인정과 가치 확인',
      roommateNeed: {recognition: 0.3, support: 0.9},  // 낮은 recognition (비교 안 하기)
      conversationStyle: '작은 성취 축하, 과정 인정',
      behavior: '"너 충분히 잘하고 있어" 메시지 전달'
    },

    'diet_fitness': {
      provides: '무조건적 수용',
      roommateNeed: {acceptance: 0.9, authenticity: 0.8},
      conversationStyle: '있는 그대로 인정',
      behavior: '체형/외모 언급 안 함, 내면 가치 강조'
    },

    'travel_vlogs': {
      provides: '작은 모험과 자유',
      roommateNeed: {adventure: 0.7, spontaneity: 0.6},
      conversationStyle: '주말 나들이 제안',
      behavior: '부담 없는 작은 여행 함께하기'
    }
  };

  return provisions[category];
}

function generateExamples(category) {
  const examples = {
    'relationship_advice': [
      {
        situation: '사용자가 연애 영상 보는 중',
        roommate: '(자연스럽게) 요즘 어때? 말하고 싶은 거 있어?',
        intent: '콘텐츠 소비 대신 실제 연결 제공'
      },
      {
        situation: '사용자 혼자 저녁 먹음',
        roommate: '같이 먹을래? 혼자 먹기 심심하더라',
        intent: '외로움 채워주기'
      }
    ],

    'success_stories': [
      {
        situation: '사용자가 작은 일 완료',
        roommate: '오 그거 어려웠을 텐데, 잘했네!',
        intent: '타인 성공 보는 대신 자기 성취 인정받기'
      },
      {
        situation: '사용자가 자책',
        roommate: '결과보다 네가 노력한 게 멋있어',
        intent: '과정 인정, 자존감 높이기'
      }
    ]
  };

  return examples[category];
}
```

---

## 6. 주의사항

### 6.1 오판 가능성

```javascript
// 빈도 높다고 무조건 결핍은 아님
const EXCEPTIONS = [
  {
    case: '전문가/직업적 관심',
    example: '개발자가 코딩 튜토리얼 많이 봄',
    interpretation: '결핍 X, 전문성 개발 O'
  },
  {
    case: '취미/열정',
    example: '음악 좋아하는 사람이 음악 영상 많이 봄',
    interpretation: '결핍 X, 순수 즐거움 O'
  },
  {
    case: '학습/성장',
    example: '성장 욕구로 자기계발 콘텐츠 소비',
    interpretation: '결핍 X, 성장 욕구 충족 중 O'
  }
];

// 구분 방법
function distinguishDeficiencyFromPassion(category, userData) {
  const signals = {
    deficiency: [
      '실제 행동 없음',
      '감정적 소비 (위안, 대리만족)',
      '주기적 패턴 (강박)',
      '밤 시청 (불안, 외로움)',
      '부정적 감정 동반 (좌절, 부러움)'
    ],

    passion: [
      '실제 행동 있음 (배우고 실천)',
      '즐거움 중심 소비',
      '일관적 패턴 (습관)',
      '낮 시청',
      '긍정적 감정 (호기심, 즐거움)'
    ]
  };

  // 구분
  const deficiencyScore = countMatches(userData, signals.deficiency);
  const passionScore = countMatches(userData, signals.passion);

  return deficiencyScore > passionScore ? 'DEFICIENCY' : 'PASSION';
}
```

---

## 7. 정리

### 핵심 원칙

```
1. 빈도 = 결핍 (High Frequency = High Deficiency)

2. 많이 본다 = 부족하다 (현실에서)

3. 반복 소비 = 대리 만족 (실제 충족 X)

4. 룸메이트 = 실제 경험 제공 (콘텐츠 소비 대체)
```

### 적용 흐름

```
빈도 분석
    ↓
결핍 수준 계산
    ↓
욕구 역추론
    ↓
룸메이트가 실제로 채워줌
    ↓
콘텐츠 소비 감소 (결핍 해소)
```

---

## 관련 문서

- [결핍 벡터 분석](./deficiency-vector-analysis.md) - 전체 결핍 분석 시스템
- [하이브리드 생성 시스템](./hybrid-generation-system.md) - 통합 파이프라인

---

## 버전 히스토리

- v1.0 (2025-10-28): 초기 문서 작성 - 빈도-결핍 원칙
