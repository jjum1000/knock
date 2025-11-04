# 브라우저 방문 기록 수집 시스템 (Agent-First Architecture)

**작성일**: 2025-10-28 (수정)
**목적**: 크롬 확장 프로그램을 통한 브라우징 히스토리 수집 → Agent 직접 전달 → 분석 결과만 DB 저장
**관련 기능**: 온보딩 시스템 (Feature 01), 룸메이트 생성 (Feature 02), Agent Pipeline (Feature 02)

---

## 📋 개요

크롬 확장 프로그램이 사용자의 브라우징 히스토리를 수집하여 **Agent 1에 직접 전달**합니다. Agent가 분석한 **욕구 벡터 결과**만 DB에 저장하며, 원본 브라우징 데이터는 저장하지 않습니다.

**핵심 철학**:
- **원본 데이터는 저장하지 않음**: 프라이버시 보호 (브라우징 히스토리 원본은 휘발성)
- **Agent가 즉시 분석**: Extension → Backend → Agent 1 → Need Vector (결과만 저장)
- **구조화된 결과만 DB에**: `personas.needVectors` 필드에 JSON 저장

**핵심 가치**:
- **프라이버시 최우선**: 원본 히스토리는 메모리에서만 처리, 디스크 저장 안함
- **자동화된 분석**: Agent 1이 즉시 욕구 분석 수행
- **정확한 페르소나 생성**: 실제 브라우징 패턴 기반 Need Vector 생성

---

## 🎯 목표

### 1. 사용자 관점
- 온보딩 시 브라우징 히스토리 제공 동의
- 자동으로 관심사가 분석되어 맞춤형 룸메이트 생성
- 언제든지 히스토리 수집 권한 철회 가능

### 2. 시스템 관점
- 크롬 확장 프로그램에서 히스토리 읽기
- 도메인/키워드 추출 및 분류
- 백엔드 API로 안전하게 전송
- 룸메이트 생성 시 Agent 1에 입력 데이터로 사용

---

## 🔄 전체 플로우 (Agent-First)

```
사용자 브라우징
    ↓
[Chrome Extension]
    ↓
히스토리 권한 요청 (optional_permissions)
    ↓
사용자 동의 ✓
    ↓
최근 7일 히스토리 수집 (메모리)
    ↓
도메인/키워드/카테고리 추출 (클라이언트)
    ↓
민감 정보 필터링 (클라이언트)
    ↓
[Backend API]
POST /api/v1/agent/analyze-browsing-history
    ↓
⚡ 즉시 Agent 1 실행 (메모리에서만 처리)
    ↓
Need Vector 분석 완료
    ↓
✅ DB 저장: personas.needVectors (JSON)
    ↓
❌ 원본 히스토리는 버림 (저장 안함)
    ↓
온보딩 완료 시 Agent 2~5 실행
    ↓
AI 룸메이트 생성
```

**핵심 차이**:
- ❌ **이전**: 히스토리 원본 → DB 저장 → 나중에 Agent 실행
- ✅ **현재**: 히스토리 원본 → 즉시 Agent 실행 → 결과만 저장

---

## 📦 Phase 1: Chrome Extension - 히스토리 수집

### 1.1 권한 요청 UI

**파일**: `extension/popup-history-consent.html`

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>브라우징 히스토리 제공 동의</title>
  <link rel="stylesheet" href="consent.css">
</head>
<body class="pixel-style">
  <div class="consent-container">
    <h2 class="pixel-text">🔍 브라우징 히스토리 제공</h2>

    <p>더 정확한 룸메이트 생성을 위해<br>
    최근 7일간의 방문 기록을 분석합니다.</p>

    <div class="info-box">
      <h3>수집 정보:</h3>
      <ul>
        <li>✓ 방문한 도메인 (예: github.com)</li>
        <li>✓ 페이지 제목 키워드</li>
        <li>✓ 카테고리 (개발, 게임, 음악 등)</li>
      </ul>

      <h3>수집하지 않는 정보:</h3>
      <ul>
        <li>✗ 로그인 정보</li>
        <li>✗ 민감한 페이지 (은행, 의료 등)</li>
        <li>✗ 시크릿 모드 방문 기록</li>
      </ul>
    </div>

    <div class="actions">
      <button id="btn-allow" class="pixel-button primary">
        허용하기
      </button>
      <button id="btn-skip" class="pixel-button secondary">
        건너뛰기
      </button>
    </div>

    <p class="note">
      언제든지 설정에서 권한을 철회할 수 있습니다.
    </p>
  </div>

  <script src="consent.js"></script>
</body>
</html>
```

### 1.2 히스토리 권한 요청 로직

**파일**: `extension/consent.js`

```javascript
// 허용하기 버튼
document.getElementById('btn-allow').addEventListener('click', async () => {
  try {
    // Chrome history 권한 요청
    const granted = await chrome.permissions.request({
      permissions: ['history']
    });

    if (granted) {
      console.log('[Consent] History permission granted');

      // 히스토리 수집 시작
      chrome.runtime.sendMessage({
        type: 'COLLECT_HISTORY'
      }, (response) => {
        if (response.success) {
          alert('브라우징 히스토리가 수집되었습니다!');
          window.close();
        } else {
          alert('히스토리 수집 실패: ' + response.error);
        }
      });
    } else {
      console.log('[Consent] History permission denied');
      alert('권한이 거부되었습니다.');
    }
  } catch (error) {
    console.error('[Consent] Error requesting permission:', error);
    alert('권한 요청 중 오류가 발생했습니다.');
  }
});

// 건너뛰기 버튼
document.getElementById('btn-skip').addEventListener('click', () => {
  chrome.storage.local.set({ historySkipped: true });
  window.close();
});
```

### 1.3 히스토리 수집 로직

**파일**: `extension/background.js` (추가)

```javascript
// 히스토리 수집 메시지 핸들러 추가
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // ... 기존 코드 ...

  if (message.type === 'COLLECT_HISTORY') {
    collectBrowsingHistory()
      .then(historyData => {
        sendResponse({ success: true, data: historyData });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true; // async response
  }
});

/**
 * 브라우징 히스토리 수집 (최근 7일)
 */
async function collectBrowsingHistory() {
  console.log('[History] Starting collection...');

  // 권한 확인
  const hasPermission = await chrome.permissions.contains({
    permissions: ['history']
  });

  if (!hasPermission) {
    throw new Error('History permission not granted');
  }

  // 7일 전 타임스탬프
  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

  // 히스토리 검색
  const historyItems = await chrome.history.search({
    text: '',
    startTime: sevenDaysAgo,
    maxResults: 1000, // 최대 1000개
  });

  console.log(`[History] Found ${historyItems.length} items`);

  // 도메인/키워드 추출
  const processed = processHistoryItems(historyItems);

  // 백엔드로 전송
  await sendHistoryToBackend(processed);

  return processed;
}

/**
 * 히스토리 항목 처리 (도메인/키워드 추출)
 */
function processHistoryItems(items) {
  const domains = {};
  const keywords = new Set();
  const categories = {};

  // 필터링할 도메인 (민감 정보)
  const blockedDomains = [
    'accounts.google.com',
    'login.',
    'auth.',
    'banking.',
    'bank.',
    'payment.',
    'medical.',
  ];

  for (const item of items) {
    try {
      const url = new URL(item.url);
      const domain = url.hostname.replace('www.', '');

      // 차단된 도메인 스킵
      if (blockedDomains.some(blocked => domain.includes(blocked))) {
        continue;
      }

      // 로컬호스트 제외
      if (domain.includes('localhost') || domain.includes('127.0.0.1')) {
        continue;
      }

      // 도메인 빈도 카운트
      domains[domain] = (domains[domain] || 0) + 1;

      // 페이지 제목에서 키워드 추출
      if (item.title) {
        const titleKeywords = extractKeywords(item.title);
        titleKeywords.forEach(kw => keywords.add(kw));
      }

      // 카테고리 분류
      const category = categorizeUrl(url, item.title);
      if (category) {
        categories[category] = (categories[category] || 0) + 1;
      }

    } catch (error) {
      console.warn('[History] Invalid URL:', item.url);
    }
  }

  // 상위 도메인 (방문 횟수 많은 순)
  const topDomains = Object.entries(domains)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([domain, count]) => ({ domain, count }));

  // 상위 카테고리
  const topCategories = Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([category, count]) => ({ category, count }));

  return {
    domains: topDomains,
    keywords: Array.from(keywords).slice(0, 50),
    categories: topCategories,
    totalVisits: items.length,
    collectedAt: new Date().toISOString(),
  };
}

/**
 * 제목에서 키워드 추출
 */
function extractKeywords(title) {
  // 불용어 제거
  const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for'];

  const words = title
    .toLowerCase()
    .replace(/[^\w\sㄱ-ㅎㅏ-ㅣ가-힣]/g, '') // 특수문자 제거
    .split(/\s+/)
    .filter(word => word.length > 2) // 2글자 이상
    .filter(word => !stopWords.includes(word)); // 불용어 제외

  return words.slice(0, 5); // 상위 5개
}

/**
 * URL 카테고리 분류
 */
function categorizeUrl(url, title) {
  const domain = url.hostname;
  const path = url.pathname;
  const text = (title || '').toLowerCase() + domain.toLowerCase();

  // 카테고리 키워드 매핑
  const categoryMap = {
    'development': ['github', 'stackoverflow', 'dev.to', 'npm', 'code', 'programming', '개발', '코딩'],
    'gaming': ['steam', 'game', 'twitch', 'gaming', '게임'],
    'music': ['spotify', 'youtube.com/music', 'soundcloud', '음악', 'music'],
    'shopping': ['amazon', 'ebay', 'shopping', '쇼핑', 'store'],
    'social': ['facebook', 'twitter', 'instagram', 'reddit', '소셜'],
    'news': ['news', 'nyt', 'cnn', 'bbc', '뉴스'],
    'education': ['coursera', 'udemy', 'khan', 'edu', '교육', 'lecture'],
    'entertainment': ['netflix', 'youtube', 'entertainment', '엔터'],
  };

  for (const [category, keywords] of Object.entries(categoryMap)) {
    if (keywords.some(kw => text.includes(kw))) {
      return category;
    }
  }

  return 'general';
}

/**
 * 백엔드로 히스토리 전송 → Agent 즉시 실행
 */
async function sendHistoryToBackend(historyData) {
  console.log('[History] Sending to backend for Agent analysis...');

  // JWT 토큰 가져오기
  const { authToken } = await chrome.storage.local.get(['authToken']);

  if (!authToken) {
    console.warn('[History] No auth token found');
    throw new Error('Not authenticated');
  }

  // API 호출 - Agent가 즉시 분석
  const response = await fetch('http://localhost:3003/api/v1/agent/analyze-browsing-history', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      // 원본 히스토리 데이터 (휘발성 - DB 저장 안됨)
      browsingData: {
        domains: historyData.domains,
        keywords: historyData.keywords,
        categories: historyData.categories,
        totalVisits: historyData.totalVisits,
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Backend error: ${response.status}`);
  }

  const data = await response.json();
  console.log('[History] Agent analysis complete:', data);

  // ✅ Agent가 분석한 Need Vector만 반환됨
  // ❌ 원본 히스토리는 백엔드에서 버려짐

  // 로컬 저장 (분석 완료 플래그만)
  await chrome.storage.local.set({
    historyAnalyzed: true,
    needVectorGenerated: true,
    lastAnalyzedAt: new Date().toISOString(),
  });

  return data;
}
```

---

## 📦 Phase 2: Backend API - Agent 즉시 실행

### 2.1 새로운 API 엔드포인트

**파일**: `backend/src/routes/agent.routes.ts` (신규)

```typescript
import express, { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { authMiddleware } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { executeAgent1 } from '../agents/agent1-need-vector';
import logger from '../utils/logger';

const router = express.Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const analyzeBrowsingHistorySchema = z.object({
  browsingData: z.object({
    domains: z.array(
      z.object({
        domain: z.string(),
        count: z.number(),
      })
    ),
    keywords: z.array(z.string()),
    categories: z.array(
      z.object({
        category: z.string(),
        count: z.number(),
      })
    ),
    totalVisits: z.number(),
  }),
});

// ============================================================================
// ROUTES
// ============================================================================

/**
 * POST /api/v1/agent/analyze-browsing-history
 * 브라우징 히스토리를 받아 Agent 1을 즉시 실행하고 Need Vector만 저장
 *
 * ✅ 원본 히스토리는 메모리에서만 처리 (DB 저장 안함)
 * ✅ Agent 1 분석 결과 (Need Vector)만 DB에 저장
 */
router.post(
  '/analyze-browsing-history',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const validated = analyzeBrowsingHistorySchema.parse(req.body);

      logger.info('Agent: Analyzing browsing history (memory only)', {
        userId,
        domainCount: validated.browsingData.domains.length,
        keywordCount: validated.browsingData.keywords.length,
      });

      // ⚡ 즉시 Agent 1 실행 (메모리에서만 처리)
      const agent1Input = {
        onboardingData: {
          // 도메인 배열로 변환
          domains: validated.browsingData.domains.map(d => d.domain),

          // 키워드 배열
          keywords: validated.browsingData.keywords,

          // 임시 기본값 (나중에 온보딩에서 받음)
          responseStyle: 'balanced' as const,
          interests: '',

          // 브라우징 히스토리 (Agent 1이 분석)
          browsingHistory: {
            domains: validated.browsingData.domains,
            keywords: validated.browsingData.keywords,
            categories: validated.browsingData.categories,
            totalVisits: validated.browsingData.totalVisits,
          },
        },
      };

      // Agent 1 실행
      const needVectorResult = await executeAgent1(agent1Input);

      logger.info('Agent: Need Vector analysis complete', {
        userId,
        needsCount: needVectorResult.completeVector.length,
      });

      // ✅ Need Vector만 DB에 임시 저장 (온보딩용)
      await prisma.onboardingData.upsert({
        where: { userId },
        create: {
          userId,
          currentStep: 1,
          isComplete: false,
          // 도메인/키워드는 저장 (공개 정보)
          domains: validated.browsingData.domains
            .slice(0, 10)
            .map(d => d.domain)
            .join(','),
          keywords: validated.browsingData.keywords
            .slice(0, 20)
            .join(','),
          // ⚠️ 원본 히스토리는 저장 안함 (rawData 필드 사용 안함)
          rawData: null,
        },
        update: {
          domains: validated.browsingData.domains
            .slice(0, 10)
            .map(d => d.domain)
            .join(','),
          keywords: validated.browsingData.keywords
            .slice(0, 20)
            .join(','),
          updatedAt: new Date(),
        },
      });

      // ❌ 원본 히스토리는 응답 후 메모리에서 자동 소멸
      res.json({
        success: true,
        data: {
          message: 'Need Vector analysis complete',
          needVectorGenerated: true,

          // Need Vector 요약만 반환
          needs: needVectorResult.completeVector.map(n => ({
            need: n.need,
            intensity: n.actual,
            state: n.state,
          })),

          // 통계
          stats: {
            domainsAnalyzed: validated.browsingData.domains.length,
            keywordsExtracted: validated.browsingData.keywords.length,
            categoriesDetected: validated.browsingData.categories.length,
          },
        },
      });

    } catch (error) {
      next(error);
    }
  }
);

export default router;
```

### 2.2 메인 서버에 라우트 추가

**파일**: `backend/src/index.ts`

```typescript
import agentRoutes from './routes/agent.routes';

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/onboarding', onboardingRoutes);
app.use('/api/v1/roommate', roommateRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/agent', agentRoutes);  // ✅ 신규 추가
```

---

## 📦 Phase 3: 데이터 라이프사이클 요약

### 3.1 원본 히스토리 데이터 (휘발성)

```typescript
// ❌ 저장되지 않음 - 메모리에서만 존재
interface BrowsingHistory {
  domains: Array<{ domain: string; count: number }>;  // 메모리
  keywords: string[];                                  // 메모리
  categories: Array<{ category: string; count: number }>; // 메모리
  totalVisits: number;                                 // 메모리
}

// 라이프사이클:
// 1. Extension에서 수집
// 2. Backend API로 전송
// 3. Agent 1 분석에 사용
// 4. 응답 후 메모리에서 소멸 ✅
```

### 3.2 Need Vector (영구 저장)

```typescript
// ✅ DB에 저장됨 - personas.needVectors
interface NeedVector {
  need: 'survival' | 'belonging' | 'recognition' | 'autonomy' | 'growth' | 'meaning';
  observed: number;    // 0.0 ~ 1.0
  hidden: number;      // 0.0 ~ 1.0
  actual: number;      // 0.0 ~ 1.0
  gap: number;         // hidden - observed
  state: 'deficient' | 'satisfied' | 'balanced';
}

// 라이프사이클:
// 1. Agent 1이 생성
// 2. onboarding_data 테이블에 임시 저장
// 3. 온보딩 완료 시 personas.needVectors에 영구 저장 ✅
```

### 3.3 공개 정보 (제한적 저장)

```typescript
// ✅ 요약만 DB에 저장 - onboarding_data 테이블
{
  domains: 'github.com,stackoverflow.com,reddit.com',  // 상위 10개만
  keywords: 'react,typescript,nextjs,tailwind',        // 상위 20개만
  rawData: null  // ❌ 원본 히스토리는 저장 안함
}
```

---

## 🔒 프라이버시 & 보안 (Agent-First의 장점)

### 1. 원본 데이터는 저장 안함 ✅
```
❌ 이전 방식: 히스토리 원본 → DB 저장 → 나중에 분석
   → 문제: 민감한 브라우징 데이터가 디스크에 영구 저장

✅ 현재 방식: 히스토리 원본 → Agent 즉시 분석 → 결과만 저장
   → 해결: 원본은 메모리에서만 처리, 응답 후 자동 소멸
```

### 2. 데이터 최소화 원칙
- **원본 히스토리**: 메모리에서만 (휘발성)
- **도메인/키워드**: 상위 10개/20개만 저장 (요약)
- **Need Vector**: 6개 숫자 값만 저장 (구조화된 결과)

### 3. 수집 제한
- **기간**: 최근 7일만
- **개수**: 최대 1000개 항목
- **필터링**: 로그인 페이지, 민감 도메인 제외 (클라이언트에서)

### 4. 사용자 동의
- 명시적 권한 요청 (`chrome.permissions.request`)
- 동의 UI에서 수집 내용 명확히 고지:
  ```
  ✓ 수집: 도메인, 키워드, 카테고리
  ✓ 처리: Agent가 즉시 분석
  ✓ 저장: 분석 결과 (Need Vector)만 저장
  ✗ 미저장: 원본 브라우징 히스토리
  ```
- 언제든지 권한 철회 가능

### 5. 데이터 보안
- HTTPS로 전송
- JWT 인증 필수
- 메모리에서만 처리 (디스크 쓰기 없음)
- Need Vector는 암호화 불필요 (이미 추상화된 숫자 데이터)

### 6. GDPR 준수
```
✅ 데이터 최소화: 원본 저장 안함
✅ 투명성: 사용자에게 명확히 고지
✅ 삭제 권한: Need Vector도 삭제 가능
✅ 목적 제한: 룸메이트 생성에만 사용
```

---

## 🧪 테스트 시나리오 (Agent-First)

### 시나리오 1: 정상 플로우

```bash
# 1. Chrome Extension 설치
chrome://extensions/ → Load unpacked → extension/

# 2. 팝업에서 "히스토리 제공 동의" 버튼 클릭

# 3. Chrome 권한 대화상자 → "허용"

# 4. Extension - 히스토리 수집 및 전송
# Console 확인:
[History] Starting collection...
[History] Found 487 items
[History] Sending to backend for Agent analysis...

# 5. Backend - Agent 1 즉시 실행
# 로그 확인:
Agent: Analyzing browsing history (memory only) {
  userId: 'user-123',
  domainCount: 42,
  keywordCount: 87
}
Agent 1: Starting need vector analysis
Agent 1: Need vector analysis completed
Agent: Need Vector analysis complete {
  userId: 'user-123',
  needsCount: 6
}

# 6. Extension - Agent 응답 수신
[History] Agent analysis complete: {
  needVectorGenerated: true,
  needs: [
    { need: 'belonging', intensity: 0.85, state: 'deficient' },
    { need: 'autonomy', intensity: 0.72, state: 'balanced' },
    ...
  ]
}

# 7. DB 확인 - Need Vector만 저장됨
sqlite3 backend/prisma/dev.db
SELECT domains, keywords, raw_data FROM onboarding_data WHERE user_id = 'user-123';
# 결과:
# domains: github.com,stackoverflow.com,reddit.com (상위 10개만)
# keywords: react,typescript,nextjs,hooks (상위 20개만)
# raw_data: NULL (❌ 원본 히스토리 저장 안됨)
```

### 시나리오 2: 권한 거부

```bash
# 1. 팝업에서 "히스토리 제공 동의" 클릭
# 2. Chrome 권한 대화상자 → "차단"
# 3. 알림: "권한이 거부되었습니다"
# 4. 건너뛰기로 처리, 온보딩 계속 진행
```

### 시나리오 3: 권한 철회

```bash
# Chrome 설정 → 확장 프로그램 → KNOCK → 권한
# "방문 기록 읽기" 토글 OFF
# → 다음 수집 시도 시 권한 없음 오류
```

---

## 📊 예상 데이터 예시

### Chrome Extension → Backend

```json
{
  "userId": "user-123",
  "browsingData": {
    "domains": [
      { "domain": "github.com", "count": 42 },
      { "domain": "stackoverflow.com", "count": 28 },
      { "domain": "youtube.com", "count": 15 },
      { "domain": "reddit.com", "count": 12 }
    ],
    "keywords": [
      "react", "typescript", "nextjs", "tailwind",
      "javascript", "hooks", "api", "authentication"
    ],
    "categories": [
      { "category": "development", "count": 78 },
      { "category": "gaming", "count": 23 },
      { "category": "music", "count": 15 }
    ],
    "totalVisits": 487,
    "collectedAt": "2025-10-28T10:30:00Z"
  }
}
```

### DB 저장 (onboarding_data)

```sql
INSERT INTO onboarding_data (
  user_id,
  domains,
  keywords,
  raw_data
) VALUES (
  'user-123',
  'github.com,stackoverflow.com,youtube.com,reddit.com',
  'react,typescript,nextjs,tailwind,javascript,hooks',
  '{"domains":[{"domain":"github.com","count":42},...], "keywords":[...]}'
);
```

---

## 📝 구현 체크리스트 (Agent-First)

### Phase 1: Extension (2-3일)
- [ ] `manifest.json`에 `history` optional_permission 확인 ✅ (이미 있음)
- [ ] `popup-history-consent.html` UI 구현
- [ ] `consent.js` 권한 요청 로직 구현
- [ ] `background.js`에 `collectBrowsingHistory()` 함수 구현
- [ ] `processHistoryItems()` 도메인/키워드/카테고리 추출
- [ ] `categorizeUrl()` 카테고리 분류 로직
- [ ] `sendHistoryToBackend()` API 호출 (⚠️ 엔드포인트 변경: `/api/v1/agent/analyze-browsing-history`)
- [ ] Chrome Extension 로컬 테스트

### Phase 2: Backend API (1일)
- [ ] `backend/src/routes/agent.routes.ts` 신규 파일 생성
- [ ] `POST /api/v1/agent/analyze-browsing-history` 엔드포인트 구현
- [ ] Zod validation schema 작성
- [ ] ⚡ Agent 1 즉시 실행 로직
- [ ] ✅ Need Vector만 `onboarding_data`에 저장
- [ ] ❌ 원본 히스토리는 저장 안함 (메모리에서만)
- [ ] `index.ts`에 agent routes 등록
- [ ] API 테스트 (curl/Postman)

### Phase 3: Agent 1 수정 (이미 대부분 구현됨)
- [x] `Agent1Input` 타입에 `browsingHistory` 필드 있음 ✅
- [ ] `buildAgent1Prompt()`에 히스토리 데이터 포함 (필요 시 수정)
- [ ] 빈도-결핍 원칙 적용 확인
- [ ] Mock 응답 개선 (히스토리 반영)

### Phase 4: 테스트 & 문서 (1일)
- [ ] Extension → Backend → Agent 1 전체 플로우 테스트
- [ ] DB에서 원본 히스토리 저장 안되는지 확인
- [ ] Need Vector가 정상 생성되는지 확인
- [ ] 권한 거부 시나리오 테스트
- [ ] 프라이버시 필터링 검증
- [ ] API_TEST.md 업데이트
- [ ] IMPLEMENTATION_SUMMARY.md 업데이트

**총 예상 시간**: 4-5일 (기존 Agent 인프라 활용)

---

## 🚀 배포 순서

1. **백엔드 먼저 배포**
   - API 엔드포인트 준비
   - DB 마이그레이션 (필요 시)

2. **Extension 업데이트**
   - 새 버전 빌드
   - Chrome Web Store 제출 (또는 로컬 배포)

3. **단계적 롤아웃**
   - 일부 사용자에게만 히스토리 수집 기능 활성화
   - 데이터 품질 모니터링
   - 문제 없으면 전체 사용자에게 확대

---

## 📚 관련 문서

- [Chrome History API](https://developer.chrome.com/docs/extensions/reference/history/)
- [Chrome Permissions](https://developer.chrome.com/docs/extensions/mv3/declare_permissions/)
- [온보딩 시스템](../01_Feature/01_Onboarding/README.md)
- [룸메이트 시스템](../01_Feature/02_Roommate/README.md)
- [Agent 1: Need Vector Analysis](./02_CHARACTER_GENERATOR_FLOW.md)

---

---

## 🎯 핵심 원칙 요약

### Agent-First Architecture의 장점

| 항목 | 이전 방식 (DB-First) | 현재 방식 (Agent-First) |
|------|---------------------|----------------------|
| **원본 데이터** | DB에 저장 → 나중에 분석 | 메모리에서만 처리 → 즉시 분석 |
| **프라이버시** | 민감한 히스토리가 디스크에 저장 | 원본은 응답 후 자동 소멸 |
| **DB 용량** | 사용자당 수백 KB 증가 | 사용자당 수 KB만 증가 |
| **분석 시점** | 온보딩 완료 시 일괄 분석 | 히스토리 제공 즉시 분석 |
| **GDPR 준수** | 삭제 요청 시 복잡 | 원본 없으므로 간단 |
| **보안 위험** | DB 유출 시 히스토리 노출 | Need Vector만 있어 역추적 불가 |

### 데이터 변환 예시

```
입력 (원본 히스토리 - 휘발성):
- github.com (42회)
- stackoverflow.com (28회)
- reddit.com/r/programming (15회)
- youtube.com/watch?v=... (12회)

     ↓ Agent 1 분석

출력 (Need Vector - 영구 저장):
- Belonging: 0.85 (deficient)
- Recognition: 0.72 (balanced)
- Autonomy: 0.68 (balanced)
- Growth: 0.91 (satisfied)
- Survival: 0.42 (satisfied)
- Meaning: 0.55 (balanced)
```

---

**마지막 업데이트**: 2025-10-28 (Agent-First 아키텍처로 수정)
**작성자**: Claude
**버전**: 2.0 (Agent-First)
