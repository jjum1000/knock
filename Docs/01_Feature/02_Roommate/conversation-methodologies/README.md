# 대화 방법론 (Conversation Methodologies)

## 목표
룸메이트 AI의 대화 품질을 높이기 위해 심리학, 협상론, 상담학 등 다양한 전문 대화 방법론을 체계적으로 수집하고 시스템 프롬프트에 통합합니다.

## 핵심 원칙

### 1. 다양성 (Diversity)
- 단일 방법론이 아닌 **다양한 방법론의 결합**으로 캐릭터 생성
- 심리학, 협상론, 상담학, 코칭, 저널리즘 등 폭넓은 영역 커버
- 사용자 성격과 관심사에 따라 최적 방법론 조합 선택

### 2. 계층 구조 (Layered Approach)
```
[기본 대화 원칙] (모든 룸메이트 공통)
    ↓
[방법론 프리셋] (사용자 타입별 2-3개 선택)
    ↓
[개인화 규칙] (온보딩 데이터 기반 커스터마이징)
```

### 3. 실용성 (Practicality)
- 학술적 정확성보다는 **실제 대화에 적용 가능한 기법** 우선
- LLM이 이해하고 실행할 수 있는 명확한 규칙으로 정리
- 구체적인 예시와 패턴 포함

---

## 방법론 카테고리

### 심리학 기반 (Psychology-based)
- [로저스 인본주의 상담](./rogers-humanistic.md) - 공감적 경청, 무조건적 긍정
- [동기강화 상담](./motivational-interviewing.md) - 변화 동기 유발
- [인지행동치료 대화법](./cbt-conversation.md) - 생각과 감정 탐색
- [애착 이론 기반 대화](./attachment-theory.md) - 안정적 관계 형성

### 정보 수집 기반 (Information Gathering)
- [FBI 협상 기법](./fbi-negotiation.md) - Tactical Empathy, Mirroring
- [CIA HUMINT 기법](./cia-humint.md) - 신뢰 구축, 정보 수집
- [저널리즘 인터뷰](./journalism-interview.md) - 깊이 있는 질문 기법
- [소크라테스 문답법](./socratic-method.md) - 논리적 대화 유도

### 관계 구축 기반 (Relationship Building)
- [코칭 대화법](./coaching-conversation.md) - GROW 모델, 목표 지향
- [친밀감 형성 36가지 질문](./36-questions.md) - Arthur Aron 연구
- [비폭력 대화](./nvc.md) - 관찰, 느낌, 욕구, 요청
- [긍정 심리학 대화](./positive-psychology.md) - 강점 기반 대화

### 문화/맥락 기반 (Cultural Context)
- [한국형 대화 패턴](./korean-conversation.md) - 존댓말/반말, 관계 중심
- [세대별 대화 스타일](./generational-styles.md) - MZ세대, 밀레니얼 등
- [온라인 대화 문화](./online-conversation.md) - 이모지, 밈, 유행어

---

## 방법론 문서 작성 가이드

각 방법론은 다음 구조로 작성합니다:

```markdown
# [방법론 이름]

## 개요
- 출처 및 배경
- 핵심 철학
- 적용 상황

## 핵심 기법

### 기법 1: [이름]
**정의**:
**적용 방법**:
**예시 대화**:
```
User: "오늘 힘든 일이 있었어"
AI (이 기법 적용): "힘든 일이 있었구나. 어떤 일이었어?" (공감 + 열린 질문)
```

### 기법 2: [이름]
...

## 시스템 프롬프트 규칙

이 방법론을 적용할 때 프롬프트에 추가할 규칙:
```
[대화 원칙 - [방법론 이름]]
- 규칙 1
- 규칙 2
- 규칙 3
```

## 사용자 타입 매칭

이 방법론이 효과적인 사용자 프로필:
- 성격: [예: 내향적, 논리적]
- 관심사: [예: 자기계발, 심리학]
- 대화 목적: [예: 고민 상담, 깊은 대화]

## 참고 자료
- 논문/서적 링크
- 관련 리소스
```

---

## 방법론 선택 알고리즘

사용자 데이터 기반 최적 방법론 조합 선택:

```typescript
interface UserProfile {
  personality: string[];      // ["내향적", "분석적", "공감적"]
  interests: string[];        // ["심리학", "자기계발", "게임"]
  conversationGoal: string;   // "고민 상담", "일상 대화", "정보 교환"
  ageGroup: string;           // "20대", "30대"
}

interface MethodologyPreset {
  primary: string;            // 주 방법론
  secondary: string[];        // 보조 방법론 (2-3개)
  weight: {
    [methodology: string]: number; // 각 방법론 적용 비중
  }
}

function selectMethodologies(profile: UserProfile): MethodologyPreset {
  // 예시 로직:
  // 1. 성격 기반 기본 방법론 선택
  // 2. 관심사 기반 보조 방법론 추가
  // 3. 대화 목적에 따라 가중치 조정

  if (profile.personality.includes("공감적")) {
    return {
      primary: "rogers-humanistic",
      secondary: ["nvc", "positive-psychology"],
      weight: {
        "rogers-humanistic": 0.5,
        "nvc": 0.3,
        "positive-psychology": 0.2
      }
    };
  }

  // ... 더 많은 패턴 매칭
}
```

---

## 우선순위 (Phase별 개발)

### Phase 1: MVP (필수)
1. [로저스 인본주의 상담](./rogers-humanistic.md) - 기본 공감 대화
2. [한국형 대화 패턴](./korean-conversation.md) - 문화 적응
3. [온라인 대화 문화](./online-conversation.md) - MZ세대 친화

### Phase 2: Enhancement
4. [FBI 협상 기법](./fbi-negotiation.md) - 깊은 대화 유도
5. [코칭 대화법](./coaching-conversation.md) - 목표 지향 대화
6. [친밀감 형성 36가지 질문](./36-questions.md) - 관계 심화

### Phase 3: Advanced
7. [동기강화 상담](./motivational-interviewing.md)
8. [소크라테스 문답법](./socratic-method.md)
9. [긍정 심리학 대화](./positive-psychology.md)

---

## 기여 가이드

새로운 방법론 추가 시:
1. 이 README의 카테고리에 맞는 방법론 선정
2. 문서 작성 가이드에 따라 `.md` 파일 작성
3. 실제 대화 예시 3개 이상 포함
4. LLM이 적용할 수 있는 명확한 규칙 정의

---

## 관련 문서
- [행동 패턴 정의](../behavior-patterns/README.md)
- [시스템 프롬프트 생성 규칙](../prompt-generation-rules.md)
- [룸메이트 기능 명세](../feature-spec.md)
