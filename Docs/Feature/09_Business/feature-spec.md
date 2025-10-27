# 비즈니스 모델 - 기능 명세서

## 1. 플랜 구조

### 1.1 무료 플랜 (Free)

#### 1.1.1 제공 기능
| 기능 | 제한 사항 |
|------|-----------|
| 이웃 노크 | 1일 1회 (매일 00시 UTC 초기화) |
| LLM 모델 | Gemini 1.5 Flash (기본) |
| 대화 메모리 | 최근 5개 대화 요약 저장 |
| 관계 시스템 | 자동 관계 변화 (수동 수정 불가) |
| 방 이미지 | 프리셋 템플릿 (5종) |
| 최대 이웃 수 | 무제한 (노크 속도 제한만 적용) |

#### 1.1.2 제한 표시
**노크 제한 도달 시**:
- 노크 버튼 비활성화
- 툴팁: "오늘의 무료 노크를 모두 사용했어요. 내일 00시에 다시 노크할 수 있어요."
- CTA: "Knock Plus로 지금 바로 노크하기" 버튼 (업그레이드 유도)

**메모리 제한**:
- 6번째 대화부터 가장 오래된 메모리 자동 삭제 (FIFO)
- 설정 화면에 "5/5 메모리 사용 중" 표시

---

### 1.2 유료 플랜 (Knock Plus)

#### 1.2.1 가격 정책
| 플랜 | 가격 (USD) | 가격 (KRW) | 할인율 |
|------|-----------|-----------|--------|
| Knock Plus Monthly | $9.99/월 | ₩12,900/월 | - |
| Knock Plus Yearly | $95.88/년 | ₩129,000/년 | 20% |

**가격 전략 근거**:
- 경쟁사 분석: ChatGPT Plus ($20), Claude Pro ($20), Character.AI Plus ($9.99)
- 타겟: 캐주얼 사용자 + AI 대화 애호가
- 포지셔닝: 프리미엄 경험, 저렴한 가격

#### 1.2.2 제공 기능

**1. 훅 가속 (Knock Acceleration)**
- **즉시 노크**: 1일 1회 제한 해제
  - 무제한 노크 (공정 사용 정책: 1일 최대 10회 권장)
  - 쿨다운 없음
- **추가 이용권**: 노크 이용권 소비 없이 즉시 실행
- **우선 생성**: 이웃 생성 시 LLM 우선 처리 (대기 시간 단축)

**2. 딥 다이브 대화 (Deep Dive)**
- **긴 메모리**: 최근 50개 대화 요약 저장 (10배 증가)
- **고급 LLM**: Gemini 1.5 Pro 모델 사용
  - 더 풍부한 응답
  - 복잡한 맥락 이해
  - 장문 대화 지원 (최대 4000 토큰)
- **깊은 대화 모드**: 활성화 시 응답 길이 2배 (4-8문장)

**3. 관계 관리 (Relationship Control)**
- **프롬프트 편집**: 이웃의 관심사 키워드 3개 추가/삭제
  - 예: "게임" 키워드 추가 → 게임 관련 대화 증가
- **말투 조정**: 3가지 프리셋 선택
  - 친근한 반말
  - 정중한 존댓말
  - 캐주얼 혼용 (기본)
- **관계 초기화**: 특정 이웃과의 관계 레벨 리셋 (처음부터 다시 시작)

**4. 프리미엄 비주얼**
- **AI 생성 방 이미지**: Stable Diffusion 기반 개인화 이미지
- **이미지 재생성**: 마음에 들지 않으면 1회 재생성 가능

#### 1.2.3 데이터베이스 스키마
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,

  -- 플랜 정보
  plan_type VARCHAR(50) NOT NULL, -- 'free', 'plus_monthly', 'plus_yearly'
  status VARCHAR(50) NOT NULL, -- 'active', 'canceled', 'past_due', 'expired'

  -- 결제 정보
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  payment_method VARCHAR(50), -- 'stripe', 'toss'

  -- 구독 기간
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  trial_end TIMESTAMP, -- 무료 체험 종료일 (선택)

  -- 상태 관리
  canceled_at TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,

  -- 메타데이터
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
```

```sql
CREATE TABLE usage_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,

  -- 노크 사용량
  daily_knocks_used INT DEFAULT 0,
  daily_knocks_limit INT DEFAULT 1,
  last_knock_reset TIMESTAMP DEFAULT NOW(),

  -- 메모리 사용량
  memory_count INT DEFAULT 0,
  memory_limit INT DEFAULT 5,

  -- 관계 관리 사용량 (유료 전용)
  relationship_edits_used INT DEFAULT 0,
  relationship_edits_limit INT DEFAULT 10, -- 월 10회 제한

  -- 메타데이터
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_usage_quotas_user_id ON usage_quotas(user_id);
```

---

## 2. 구독 관리

### 2.1 구독 시작

#### 2.1.1 플랜 선택 화면
**위치**: 설정 > 구독 관리 또는 제한 도달 시 모달

**화면 구성**:
```
┌────────────────────────────────────────┐
│       Knock Plus로 업그레이드         │
├────────────────────────────────────────┤
│                                        │
│  [무료 플랜]          [Knock Plus]     │
│  ✓ 1일 1회 노크       ✓ 무제한 노크    │
│  ✓ 기본 LLM          ✓ 고급 LLM Pro    │
│  ✓ 5개 메모리        ✓ 50개 메모리     │
│  ✗ 관계 관리         ✓ 관계 커스터마이징│
│                                        │
│  현재 플랜           $9.99/월          │
│                     [구독 시작하기]     │
└────────────────────────────────────────┘
```

#### 2.1.2 결제 프로세스
**단계**:
1. 플랜 선택 (월간/연간)
2. 결제 수단 입력 (Stripe Checkout)
3. 결제 확인
4. 구독 활성화
5. 완료 화면 (혜택 안내)

**API 명세**:
```typescript
POST /api/v1/subscriptions/create
Headers:
{
  "Authorization": "Bearer {token}"
}

Request:
{
  "planType": "plus_monthly" | "plus_yearly",
  "paymentMethod": "stripe",
  "successUrl": "https://knock.com/subscription/success",
  "cancelUrl": "https://knock.com/subscription/cancel"
}

Response:
{
  "success": true,
  "checkoutUrl": "https://checkout.stripe.com/c/pay/cs_test_...",
  "sessionId": "cs_test_..."
}
```

### 2.2 구독 활성화 (Webhook 처리)

#### 2.2.1 Stripe Webhook 이벤트
```typescript
POST /api/v1/webhooks/stripe
Headers:
{
  "stripe-signature": "..."
}

Body:
{
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "cs_test_...",
      "customer": "cus_...",
      "subscription": "sub_...",
      "metadata": {
        "userId": "550e8400-..."
      }
    }
  }
}
```

#### 2.2.2 구독 활성화 로직
```typescript
async function handleSubscriptionActivated(
  userId: string,
  stripeCustomerId: string,
  stripeSubscriptionId: string,
  planType: string
) {
  // 1. 구독 레코드 생성/업데이트
  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      planType,
      status: 'active',
      stripeCustomerId,
      stripeSubscriptionId,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30일 후
    },
    update: {
      planType,
      status: 'active',
      stripeCustomerId,
      stripeSubscriptionId
    }
  });

  // 2. 사용량 제한 업데이트
  await prisma.usageQuota.update({
    where: { userId },
    data: {
      dailyKnocksLimit: 999, // 무제한 (사실상)
      memoryLimit: 50,
      relationshipEditsLimit: 10
    }
  });

  // 3. 환영 알림
  await sendWelcomeNotification(userId);

  // 4. 분석 이벤트
  await trackEvent('subscription_activated', userId, { planType });
}
```

### 2.3 구독 갱신

#### 2.3.1 자동 갱신
- Stripe가 자동으로 결제 시도
- 성공 시: `invoice.payment_succeeded` 웹훅 수신
- 실패 시: `invoice.payment_failed` 웹훅 수신

#### 2.3.2 갱신 실패 처리
```typescript
async function handlePaymentFailed(userId: string) {
  // 1. 상태 변경
  await prisma.subscription.update({
    where: { userId },
    data: { status: 'past_due' }
  });

  // 2. 유예 기간 부여 (7일)
  const gracePeriodEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // 3. 알림 발송
  await sendPaymentFailedEmail(userId, gracePeriodEnd);

  // 4. 7일 후에도 실패 시 구독 만료
  setTimeout(async () => {
    const sub = await getSubscription(userId);
    if (sub.status === 'past_due') {
      await expireSubscription(userId);
    }
  }, 7 * 24 * 60 * 60 * 1000);
}
```

### 2.4 구독 취소

#### 2.4.1 즉시 취소 vs 기간 종료 시 취소
**옵션 제공**:
- **즉시 취소**: 바로 무료 플랜으로 전환, 환불 없음 (일할 계산 선택)
- **기간 종료 시 취소**: 현재 구독 기간까지 사용 후 자동 종료

**API 명세**:
```typescript
POST /api/v1/subscriptions/cancel
Headers:
{
  "Authorization": "Bearer {token}"
}

Request:
{
  "immediately": boolean,  // true: 즉시, false: 기간 종료 시
  "reason": "too_expensive" | "not_using" | "other",
  "feedback": "string (optional)"
}

Response:
{
  "success": true,
  "message": "구독이 2025-11-27에 종료됩니다.",
  "effectiveDate": "2025-11-27T23:59:59Z"
}
```

#### 2.4.2 취소 유지 (Retention) 전략
**화면 구성**:
```
┌────────────────────────────────────────┐
│       정말 떠나시나요? 😢              │
├────────────────────────────────────────┤
│                                        │
│  아직 이런 기능이 남아있어요:          │
│  ✓ 무제한 노크로 더 많은 이웃 발견     │
│  ✓ 50개 메모리로 깊은 대화 이어가기    │
│                                        │
│  [특별 할인 제안]                      │
│  다음 3개월 30% 할인 ($6.99/월)        │
│                                        │
│  [할인 받고 계속하기]  [취소 진행]     │
└────────────────────────────────────────┘
```

---

## 3. 사용량 추적 및 제한

### 3.1 노크 사용량 추적

#### 3.1.1 일일 노크 카운팅
```typescript
async function checkKnockAvailability(userId: string): Promise<{
  available: boolean;
  remaining: number;
  resetAt: Date;
}> {
  const quota = await prisma.usageQuota.findUnique({ where: { userId } });
  const subscription = await prisma.subscription.findUnique({ where: { userId } });

  // 무료 사용자: 1일 1회 제한
  if (subscription.planType === 'free') {
    const now = new Date();
    const lastReset = new Date(quota.lastKnockReset);
    const nextReset = new Date(lastReset);
    nextReset.setUTCHours(0, 0, 0, 0);
    nextReset.setDate(nextReset.getDate() + 1);

    // 자정 지났으면 리셋
    if (now >= nextReset) {
      await prisma.usageQuota.update({
        where: { userId },
        data: {
          dailyKnocksUsed: 0,
          lastKnockReset: now
        }
      });
      return { available: true, remaining: 1, resetAt: nextReset };
    }

    const remaining = quota.dailyKnocksLimit - quota.dailyKnocksUsed;
    return {
      available: remaining > 0,
      remaining,
      resetAt: nextReset
    };
  }

  // 유료 사용자: 무제한 (공정 사용 정책 체크)
  return { available: true, remaining: 999, resetAt: new Date() };
}

async function consumeKnock(userId: string): Promise<void> {
  await prisma.usageQuota.update({
    where: { userId },
    data: {
      dailyKnocksUsed: { increment: 1 }
    }
  });
}
```

### 3.2 메모리 사용량 추적

```typescript
async function checkMemoryAvailability(userId: string): Promise<boolean> {
  const quota = await prisma.usageQuota.findUnique({ where: { userId } });
  return quota.memoryCount < quota.memoryLimit;
}

async function addMemory(userId: string, memory: Memory): Promise<void> {
  const quota = await prisma.usageQuota.findUnique({ where: { userId } });

  // 제한 초과 시 가장 오래된 메모리 삭제 (FIFO)
  if (quota.memoryCount >= quota.memoryLimit) {
    const oldestMemory = await prisma.memory.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' }
    });

    if (oldestMemory) {
      await prisma.memory.delete({ where: { id: oldestMemory.id } });
    }
  }

  // 새 메모리 추가
  await prisma.memory.create({ data: memory });

  // 카운트 업데이트
  await prisma.usageQuota.update({
    where: { userId },
    data: { memoryCount: { increment: 1 } }
  });
}
```

### 3.3 공정 사용 정책 (Fair Use Policy)

#### 3.3.1 유료 사용자 제한
**목적**: 악용 방지 (API 남용, 봇 트래픽 등)

**제한 사항**:
- 노크: 1일 최대 50회 (소프트 리밋, 초과 시 경고)
- 대화: 1일 최대 500개 메시지
- LLM API 호출: 1분당 60회

**초과 시 처리**:
```typescript
async function checkFairUsePolicy(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  const usage = await getRecentUsage(userId, 24); // 최근 24시간

  if (usage.knocks > 50) {
    await sendWarningEmail(userId, 'excessive_knocks');
    return {
      allowed: false,
      reason: '공정 사용 정책 위반: 노크 횟수 초과'
    };
  }

  if (usage.messages > 500) {
    return {
      allowed: false,
      reason: '공정 사용 정책 위반: 메시지 수 초과'
    };
  }

  return { allowed: true };
}
```

---

## 4. 업그레이드/다운그레이드

### 4.1 무료 → 유료 업그레이드

#### 4.1.1 업그레이드 트리거
**지점**:
1. 노크 제한 도달 시 모달
2. 메모리 제한 도달 시 배너
3. 설정 > 구독 관리 페이지
4. 대화 중 "더 깊은 대화" 제안

#### 4.1.2 즉시 효과
- 구독 활성화 즉시 제한 해제
- 기존 데이터 유지
- 추가 메모리 슬롯 활성화

### 4.2 유료 → 무료 다운그레이드

#### 4.2.1 다운그레이드 시점
- 구독 취소 후 현재 기간 종료 시
- 결제 실패 후 유예 기간 종료 시

#### 4.2.2 데이터 처리
```typescript
async function handleDowngrade(userId: string) {
  // 1. 구독 상태 변경
  await prisma.subscription.update({
    where: { userId },
    data: {
      planType: 'free',
      status: 'active'
    }
  });

  // 2. 사용량 제한 복원
  await prisma.usageQuota.update({
    where: { userId },
    data: {
      dailyKnocksLimit: 1,
      memoryLimit: 5,
      relationshipEditsLimit: 0
    }
  });

  // 3. 초과 메모리 처리
  const memoryCount = await prisma.memory.count({ where: { userId } });
  if (memoryCount > 5) {
    // 최신 5개만 남기고 삭제
    const memories = await prisma.memory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: 5
    });

    await prisma.memory.deleteMany({
      where: { id: { in: memories.map(m => m.id) } }
    });
  }

  // 4. 관계 커스터마이징 비활성화 (데이터는 유지)
  // (프롬프트는 그대로, 수정 기능만 비활성화)

  // 5. 알림
  await sendDowngradeNotification(userId);
}
```

---

## 5. 가격 전략

### 5.1 경쟁 분석
| 서비스 | 가격 | 주요 혜택 |
|--------|------|-----------|
| ChatGPT Plus | $20/월 | GPT-4 접근, 우선 처리 |
| Claude Pro | $20/월 | Claude 3 Opus, 5배 사용량 |
| Character.AI Plus | $9.99/월 | 우선 접근, 빠른 응답 |
| Replika Pro | $19.99/월 | 음성 통화, 관계 커스터마이징 |
| **Knock Plus** | **$9.99/월** | 무제한 노크, Pro LLM, 50개 메모리 |

### 5.2 가격 테스트 전략
**A/B 테스트**:
- Group A: $9.99/월
- Group B: $7.99/월 (저가 전략)
- Group C: $12.99/월 (고가 전략)

**측정 지표**:
- 전환율 (Conversion Rate)
- MRR (Monthly Recurring Revenue)
- LTV (Lifetime Value)

### 5.3 프로모션 전략

#### 5.3.1 무료 체험
- 신규 가입 시 7일 무료 체험
- 체험 종료 3일 전 알림

#### 5.3.2 할인 쿠폰
```typescript
CREATE TABLE promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  discount_percent INT, -- 10, 20, 30...
  discount_amount_cents INT, -- 고정 금액 할인 (센트)
  valid_from TIMESTAMP DEFAULT NOW(),
  valid_until TIMESTAMP,
  max_uses INT,
  current_uses INT DEFAULT 0,
  applicable_plans TEXT[], -- ['plus_monthly', 'plus_yearly']
  created_at TIMESTAMP DEFAULT NOW()
);

-- 예시: 신규 가입 30% 할인
INSERT INTO promo_codes (code, discount_percent, valid_until, applicable_plans)
VALUES ('WELCOME30', 30, '2025-12-31', ARRAY['plus_monthly', 'plus_yearly']);
```

#### 5.3.3 연간 플랜 할인
- 20% 할인 ($9.99 x 12 = $119.88 → $95.88)
- 절감액 강조: "연간 플랜으로 $24 절약!"

---

## 6. 예외 처리

### 6.1 결제 실패
- 자동 재시도 (3일, 5일, 7일)
- 이메일/앱 알림
- 유예 기간 제공 (7일)

### 6.2 환불 요청
- 결제 후 14일 이내 전액 환불 가능
- 환불 처리 후 즉시 무료 플랜 전환

### 6.3 이중 구독 방지
- 사용자당 1개 구독만 허용
- 기존 구독 있으면 업그레이드/다운그레이드 로직 실행

---

## 7. 비기능적 요구사항

### 7.1 보안
- PCI-DSS 준수 (Stripe 사용으로 자동 충족)
- 웹훅 서명 검증 (Stripe Signature)
- HTTPS 통신 필수

### 7.2 성능
- 구독 상태 조회: Redis 캐싱 (1분 TTL)
- 사용량 체크: 메모리 캐시 (10초 TTL)

### 7.3 가용성
- 결제 시스템 장애 시 재시도 큐
- 웹훅 이벤트 손실 방지 (DB 로그)

---

## 8. 테스트 시나리오

### 8.1 정상 플로우
1. 무료 사용자 → 노크 제한 도달
2. 업그레이드 모달 표시
3. 플랜 선택 → Stripe Checkout
4. 결제 완료 → 웹훅 수신
5. 구독 활성화 → 제한 해제 확인

### 8.2 예외 플로우
1. 결제 실패 → 재시도 로직
2. 웹훅 지연 → 수동 동기화
3. 구독 취소 → 데이터 다운그레이드

---

## 9. 개발 우선순위

**Phase 1 (MVP)**:
- 무료/유료 플랜 구분
- Stripe 결제 통합
- 노크 사용량 추적
- 기본 구독 관리 (생성, 취소)

**Phase 2 (Enhancement)**:
- 메모리 제한 적용
- 관계 커스터마이징 기능
- 프로모션 코드 시스템
- 무료 체험

**Phase 3 (Optimization)**:
- 취소 유지 전략
- 동적 가격 최적화
- 사용량 분석 대시보드
