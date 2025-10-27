# 🌐 인터넷 접속 기록 활용 전략

## ⚠️ 중요: 사용자 동의 필수

이 기능은 **사용자의 명시적 동의**를 받은 후에만 활성화됩니다.

---

## 📋 목표

사용자의 인터넷 브라우징 히스토리를 분석하여 관심사, 성격, 취향을 파악하고 초개인화된 룸메이트 및 대화 경험 제공

---

## 🎯 핵심 가치

### 1. 진짜 관심사 파악
- **소셜 미디어**: Twitter, Instagram → 트렌드 관심도
- **유튜브/영상**: 시청한 콘텐츠 → 취미, 선호 장르
- **쇼핑 사이트**: 검색/구매 이력 → 라이프스타일
- **뉴스/블로그**: 읽은 기사 → 관심 주제, 가치관
- **커뮤니티**: Reddit, 디시인사이드 → 소속감, 관심 분야

### 2. 성격 추론
- **방문 사이트 종류**:
  - 학술 사이트 많음 → 지적 호기심
  - 게임 커뮤니티 → 경쟁적/협력적 성향
  - 예술/디자인 → 창의적 성향
  - 금융/투자 → 계획적/분석적 성향

- **브라우징 패턴**:
  - 깊이 있게 읽기 vs 빠르게 훑기
  - 저장/북마크 빈도 → 조직적 성향
  - 탭 관리 방식 → 멀티태스킹 능력

### 3. 시간대별 활동
- 새벽 2시에 철학 글 읽음 → 사색적
- 출퇴근 시간에 유튜브 → 루틴형
- 주말에 레시피 검색 → 가정적

---

## 📊 수집할 데이터

### A. 브라우징 히스토리 데이터

```typescript
interface BrowsingHistory {
  userId: string
  timestamp: Timestamp
  url: string                 // 방문한 URL
  title: string               // 페이지 제목
  domain: string              // 도메인 (youtube.com, twitter.com 등)
  category: string            // 자동 분류된 카테고리
  duration: number            // 머문 시간 (초)
  referrer?: string           // 이전 페이지
  scrollDepth?: number        // 스크롤 깊이 (%)
}
```

**수집 방법**:
- Chrome Extension (선택적 설치)
- Web API (History API - 제한적)
- Manual Import (사용자가 직접 내보내기)

### B. 분석된 관심사 데이터

```typescript
interface UserInterests {
  userId: string
  categories: {
    [category: string]: {
      score: number           // 관심도 점수 (0-100)
      keywords: string[]      // 주요 키워드
      recentVisits: number    // 최근 방문 횟수
      totalTime: number       // 총 소비 시간 (분)
    }
  }
  personality: {
    intellectual: number      // 지적 호기심 (0-100)
    creative: number          // 창의성 (0-100)
    social: number            // 사교성 (0-100)
    adventurous: number       // 모험심 (0-100)
    organized: number         // 조직력 (0-100)
  }
  lifestyleInsights: {
    sleepSchedule: string     // 'night_owl' | 'early_bird'
    workingHours: string[]    // ['09:00-18:00']
    hobbies: string[]         // 추론된 취미
    values: string[]          // 추론된 가치관
  }
  updatedAt: Timestamp
}
```

### C. 카테고리 분류

자동으로 URL을 다음 카테고리로 분류:

```typescript
enum InterestCategory {
  // 엔터테인먼트
  MUSIC = 'music',
  MOVIES_TV = 'movies_tv',
  GAMES = 'games',
  BOOKS = 'books',
  ARTS = 'arts',

  // 라이프스타일
  FOOD_COOKING = 'food_cooking',
  FASHION = 'fashion',
  FITNESS = 'fitness',
  TRAVEL = 'travel',
  HOME_GARDEN = 'home_garden',

  // 학습/커리어
  EDUCATION = 'education',
  TECHNOLOGY = 'technology',
  BUSINESS = 'business',
  SCIENCE = 'science',

  // 소셜/커뮤니티
  SOCIAL_MEDIA = 'social_media',
  NEWS = 'news',
  FORUMS = 'forums',

  // 기타
  SHOPPING = 'shopping',
  FINANCE = 'finance',
  SPORTS = 'sports',
  POLITICS = 'politics',
  RELIGION = 'religion',
}
```

---

## 🚀 활용 전략

### 1. 룸메이트 생성에 활용

#### A. 관심사 기반 매칭
```
사용자 히스토리: 많은 요리 레시피, 푸드 블로그 방문
     ↓
룸메이트 생성: "Emma - 셰프이자 푸드 블로거"
     ↓
대화 시작: "오늘 새로운 파스타 레시피 시도해봤어!"
```

#### B. 성격 기반 매칭
```
사용자 히스토리: 철학 블로그, 심야 시간 사색적 글
     ↓
룸메이트 생성: "사색가 타입, 깊은 대화 선호"
     ↓
대화 스타일: 질문 중심, 생각할 거리 제공
```

### 2. 대화 개인화

#### A. 맞춤형 대화 주제
```python
# OpenAI GPT 시스템 프롬프트에 포함
system_prompt = f"""
You are {roommate_name}, {roommate_personality}.

User Context (from browsing history):
- Interests: {', '.join(user_interests.top_categories)}
- Recent topics: {', '.join(user_interests.recent_keywords)}
- Conversation style preference: {user_personality.communication_style}

Engage naturally based on these interests, but don't be obvious about it.
"""
```

**예시**:
- 사용자가 최근 게임 공략 많이 봄 → 룸메이트가 자연스럽게 게임 이야기 꺼냄
- 사용자가 여행 블로그 자주 방문 → 룸메이트가 여행 경험 공유

#### B. 공감 능력 향상
```
사용자: "오늘 하루 어땠어?"

# Without browsing data:
룸메이트: "나는 좋았어! 너는?"

# With browsing data (사용자가 오늘 취업 사이트 많이 방문):
룸메이트: "나도 괜찮았어. 근데 너 요즘 뭔가 고민 있는 것 같던데...
          혹시 일 관련해서 생각하는 게 있어?"
```

### 3. 컨텐츠 추천

#### A. 노크할 방 추천
```
사용자 히스토리: 음악 스트리밍 사이트 자주 방문
     ↓
추천: "🎸 4층에 뮤지션 룸메이트가 있어요! 노크해보세요"
```

#### B. 대화 시작 제안
```
사용자가 방금 요리 레시피 검색
     ↓
앱 알림: "Emma가 새로운 레시피를 공유하고 싶어 해요!"
```

### 4. 타이밍 최적화

#### A. 알림 시간 최적화
```
브라우징 패턴 분석:
- 평일 저녁 8-10시에 가장 활발
- 주말 오후 2-4시에 여유롭게 브라우징
     ↓
알림/이벤트 발생 시간: 이 시간대에 집중
```

#### B. 룸메이트 반응 타이밍
```
사용자가 스트레스 많은 컨텐츠 소비 중
(예: 뉴스, 업무 관련 검색)
     ↓
룸메이트: 너무 자주 연락하지 않음, 여유 생길 때까지 대기
```

---

## 🔧 기술 구현

### Phase 1: 데이터 수집 (Chrome Extension)

```javascript
// Chrome Extension manifest.json
{
  "manifest_version": 3,
  "name": "Knock Context Collector",
  "permissions": [
    "history",
    "tabs",
    "storage"
  ],
  "background": {
    "service_worker": "background.js"
  }
}

// background.js
chrome.history.onVisited.addListener(async (historyItem) => {
  // URL 필터링 (민감한 사이트 제외)
  if (shouldCollect(historyItem.url)) {
    const data = {
      url: historyItem.url,
      title: historyItem.title,
      timestamp: historyItem.lastVisitTime,
      userId: await getUserId()
    };

    // Firebase로 전송
    await sendToFirebase(data);
  }
});
```

### Phase 2: 자동 분류 및 분석

```typescript
// src/services/browsingAnalysis.ts
export const browsingAnalysisService = {
  /**
   * URL을 카테고리로 분류
   */
  categorizeUrl(url: string, title: string): InterestCategory {
    // 도메인 기반 분류
    const domain = new URL(url).hostname;

    // 키워드 기반 분류
    const keywords = extractKeywords(title);

    // ML 모델 또는 규칙 기반 분류
    return classifyByRules(domain, keywords);
  },

  /**
   * 관심사 점수 계산
   */
  async calculateInterestScores(userId: string): Promise<UserInterests> {
    // 최근 30일 히스토리 가져오기
    const history = await getRecentHistory(userId, 30);

    // 카테고리별 집계
    const categoryStats = aggregateByCategory(history);

    // 점수 계산 (방문 빈도 + 체류 시간)
    const scores = calculateScores(categoryStats);

    // 성격 추론
    const personality = inferPersonality(categoryStats);

    return {
      userId,
      categories: scores,
      personality,
      lifestyleInsights: inferLifestyle(history),
      updatedAt: new Date()
    };
  },

  /**
   * 성격 추론
   */
  inferPersonality(stats: CategoryStats): PersonalityProfile {
    return {
      intellectual: calculateIntellectualScore(stats),
      creative: calculateCreativeScore(stats),
      social: calculateSocialScore(stats),
      adventurous: calculateAdventurousScore(stats),
      organized: calculateOrganizedScore(stats)
    };
  }
}
```

### Phase 3: OpenAI 프롬프트 통합

```typescript
// src/services/chat.ts 수정
export const chatService = {
  async chat(
    messages: ChatMessage[],
    roommatePersonality: string,
    userId: string  // 추가
  ): Promise<string> {
    // 사용자 컨텍스트 로드
    const userInterests = await browsingAnalysisService
      .getUserInterests(userId);

    // 관심사를 프롬프트에 포함
    const enhancedPrompt = buildEnhancedPrompt(
      roommatePersonality,
      userInterests
    );

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: enhancedPrompt },
        ...messages,
      ]
    });

    return completion.choices[0]?.message?.content || '';
  }
}

function buildEnhancedPrompt(
  personality: string,
  interests: UserInterests
): string {
  const topInterests = Object.entries(interests.categories)
    .sort(([, a], [, b]) => b.score - a.score)
    .slice(0, 3)
    .map(([cat]) => cat);

  return `You are ${personality}.

USER CONTEXT (use naturally, don't mention explicitly):
- Main interests: ${topInterests.join(', ')}
- Personality traits: intellectual=${interests.personality.intellectual}, creative=${interests.personality.creative}
- Lifestyle: ${interests.lifestyleInsights.hobbies.join(', ')}

Engage in natural conversation. Use this context to:
1. Choose relevant topics
2. Show empathy based on their interests
3. Share related experiences
4. Ask thoughtful questions

Keep responses 2-3 sentences, conversational and warm.`;
}
```

---

## 🔒 개인정보 보호 및 보안

### 1. 명시적 동의 (Opt-in)

```typescript
// 온보딩 중 동의 화면
<ConsentScreen>
  <h2>더 나은 경험을 위한 선택적 기능</h2>

  <p>브라우징 히스토리를 분석하여 다음을 제공합니다:</p>
  <ul>
    <li>✨ 관심사에 맞는 룸메이트 추천</li>
    <li>💬 더 공감되는 대화</li>
    <li>🎯 맞춤형 컨텐츠</li>
  </ul>

  <Checkbox checked={consent} onChange={setConsent}>
    브라우징 히스토리 수집 및 분석에 동의합니다
  </Checkbox>

  <Button disabled={!consent}>계속</Button>
  <Button variant="ghost" onClick={skipConsent}>
    건너뛰기 (기본 기능만 사용)
  </Button>
</ConsentScreen>
```

### 2. 민감한 사이트 필터링

```typescript
// 절대 수집하지 않는 카테고리
const BLACKLIST_DOMAINS = [
  // 금융
  '*bank*', '*paypal*', '*stripe*',

  // 의료
  '*hospital*', '*clinic*', '*health*',

  // 성인
  // (자동 필터링)

  // 개인정보
  '*admin*', '*login*', '*account*',
];

function shouldCollect(url: string): boolean {
  // 민감한 도메인 체크
  if (isBlacklisted(url)) return false;

  // HTTPS만 수집
  if (!url.startsWith('https://')) return false;

  // Private browsing 모드 체크
  if (isPrivateMode()) return false;

  return true;
}
```

### 3. 데이터 최소화

```typescript
// URL 저장 시 쿼리 파라미터 제거
function sanitizeUrl(url: string): string {
  const parsed = new URL(url);

  // 쿼리 파라미터 제거 (추적 ID 등)
  parsed.search = '';

  // 도메인 + 경로만 저장
  return `${parsed.hostname}${parsed.pathname}`;
}

// 저장 예시:
// Before: https://youtube.com/watch?v=abc123&t=50s
// After:  youtube.com/watch
```

### 4. 사용자 제어

```typescript
// 설정 페이지
<PrivacySettings>
  <h3>브라우징 히스토리 설정</h3>

  <Toggle checked={enabled} onChange={toggleTracking}>
    히스토리 수집 활성화
  </Toggle>

  <Button onClick={viewHistory}>
    내 수집된 데이터 보기
  </Button>

  <Button onClick={deleteHistory} variant="danger">
    모든 히스토리 데이터 삭제
  </Button>

  <Button onClick={exportHistory}>
    내 데이터 내보내기 (JSON)
  </Button>
</PrivacySettings>
```

### 5. 데이터 보관 기간

```typescript
// 자동 삭제 정책
const DATA_RETENTION = {
  raw_history: 30,      // 원본 히스토리: 30일 후 삭제
  aggregated: 90,       // 집계 데이터: 90일 후 삭제
  insights: 365,        // 인사이트: 1년 후 삭제
};

// 매일 자동 실행 (Cloud Function)
async function cleanupOldData() {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - DATA_RETENTION.raw_history);

  await db.collection('browsing_history')
    .where('timestamp', '<', cutoffDate)
    .get()
    .then(snapshot => {
      snapshot.forEach(doc => doc.ref.delete());
    });
}
```

---

## 💰 비용 영향

### Firebase Firestore
- **추가 쓰기**: 사용자당 10-50회/일 (브라우징 히스토리)
- **추가 읽기**: 세션당 1-2회 (관심사 로드)

**예상 비용**:
- DAU 100명: +$2-3/월
- DAU 1,000명: +$20-30/월
- DAU 10,000명: +$200-300/월

### OpenAI API
- **토큰 증가**: 프롬프트에 컨텍스트 추가 (+50-100 토큰)
- **비용 영향**: 10-20% 증가

**예상 비용**:
- 1000 대화/일: +$1-2/월
- 10,000 대화/일: +$10-20/월

---

## 📈 예상 효과

### 정량적 효과
- **재방문율**: +30-40%
- **세션 시간**: +50-60%
- **대화 만족도**: +40-50%
- **프리미엄 전환율**: +20-30%

### 정성적 효과
- 사용자가 "나를 이해해준다" 느낌
- 대화가 더 자연스럽고 의미있음
- 추천이 정확해서 놀라움
- 앱 사용이 습관화됨

---

## 🚀 구현 로드맵

### Phase 1: 기본 수집 (1-2주)
- [ ] Chrome Extension 개발
- [ ] 기본 카테고리 분류
- [ ] Firestore 저장
- [ ] 사용자 동의 UI

### Phase 2: 분석 (1주)
- [ ] 관심사 점수 계산
- [ ] 성격 추론 알고리즘
- [ ] 라이프스타일 인사이트

### Phase 3: 활용 (1주)
- [ ] OpenAI 프롬프트 강화
- [ ] 룸메이트 생성에 반영
- [ ] 추천 시스템 구축

### Phase 4: 고도화 (추후)
- [ ] ML 모델로 분류 정확도 향상
- [ ] 실시간 컨텍스트 업데이트
- [ ] A/B 테스트로 효과 검증

---

## ✅ 다음 단계

1. **지금 바로 시작**:
   - Chrome Extension 기본 구조 생성
   - 동의 UI 추가
   - 기본 수집 로직 구현

2. **동시 진행**:
   - 앱 내 활동 추적 (이전 제안서)
   - 브라우징 히스토리 수집

3. **통합**:
   - 두 데이터 소스를 결합하여 완전한 사용자 프로필 생성

---

**시작할까요?**
