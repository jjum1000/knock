# 비즈니스 모델 - 기술 명세서

## 1. 시스템 아키텍처

```
[클라이언트]
    ↓
[API Gateway]
    ↓
[구독 서비스]
    ↓
    ├─ [구독 관리 모듈]
    ├─ [사용량 추적 모듈]
    ├─ [결제 처리 모듈] ← Stripe API
    └─ [웹훅 핸들러]
    ↓
[데이터베이스]
    ├─ subscriptions (구독 정보)
    ├─ usage_quotas (사용량 제한)
    ├─ payment_events (결제 이벤트)
    └─ promo_codes (프로모션 코드)
```

---

## 2. 기술 스택

### 2.1 프론트엔드
- **프레임워크**: React 18 / Next.js 14
- **결제 UI**: Stripe Checkout (호스팅) 또는 Stripe Elements (커스텀)
- **상태 관리**: Zustand
- **HTTP 클라이언트**: Axios

### 2.2 백엔드
- **언어**: TypeScript
- **프레임워크**: Express.js / Next.js API Routes
- **결제 처리**: Stripe Node.js SDK
- **웹훅 처리**: Express Middleware
- **큐 시스템**: Bull (Redis 기반)

### 2.3 데이터베이스
- **메인 DB**: PostgreSQL 15
- **캐시**: Redis 7 (구독 상태 캐싱)
- **ORM**: Prisma 5

### 2.4 외부 서비스
- **결제**: Stripe (주요), Toss Payments (한국 시장)
- **이메일**: SendGrid / AWS SES
- **분석**: Mixpanel / Amplitude

---

## 3. 데이터베이스 스키마

### 3.1 subscriptions 테이블
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- 플랜 정보
  plan_type VARCHAR(50) NOT NULL, -- 'free', 'plus_monthly', 'plus_yearly'
  status VARCHAR(50) NOT NULL, -- 'active', 'canceled', 'past_due', 'expired', 'trialing'

  -- Stripe 연동
  stripe_customer_id VARCHAR(255) UNIQUE,
  stripe_subscription_id VARCHAR(255) UNIQUE,
  stripe_price_id VARCHAR(255), -- 가격 ID (동적 가격 관리)

  -- 구독 기간
  current_period_start TIMESTAMP NOT NULL,
  current_period_end TIMESTAMP NOT NULL,
  trial_start TIMESTAMP,
  trial_end TIMESTAMP,

  -- 취소 관리
  canceled_at TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  cancellation_reason VARCHAR(100), -- 'too_expensive', 'not_using', 'other'
  cancellation_feedback TEXT,

  -- 메타데이터
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_period_end ON subscriptions(current_period_end);
```

### 3.2 usage_quotas 테이블
```sql
CREATE TABLE usage_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- 노크 사용량
  daily_knocks_used INT DEFAULT 0,
  daily_knocks_limit INT DEFAULT 1,
  last_knock_reset TIMESTAMP DEFAULT NOW(),

  -- 메모리 사용량
  memory_count INT DEFAULT 0,
  memory_limit INT DEFAULT 5,

  -- 관계 관리 사용량 (유료 전용)
  monthly_relationship_edits_used INT DEFAULT 0,
  monthly_relationship_edits_limit INT DEFAULT 10,
  last_relationship_reset TIMESTAMP DEFAULT NOW(),

  -- LLM 모델
  llm_model VARCHAR(50) DEFAULT 'gemini-1.5-flash', -- 'gemini-1.5-flash', 'gemini-1.5-pro'

  -- 메타데이터
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_usage_quotas_user_id ON usage_quotas(user_id);
```

### 3.3 payment_events 테이블
```sql
CREATE TABLE payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,

  -- 이벤트 정보
  event_type VARCHAR(100) NOT NULL, -- 'payment_succeeded', 'payment_failed', 'refund', etc.
  stripe_event_id VARCHAR(255) UNIQUE,

  -- 결제 정보
  amount_cents INT NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  payment_method VARCHAR(50), -- 'card', 'google_pay', 'apple_pay'

  -- 상태
  status VARCHAR(50) NOT NULL, -- 'succeeded', 'failed', 'pending', 'refunded'
  failure_reason TEXT,

  -- 메타데이터
  raw_event JSONB, -- Stripe 원본 이벤트 저장
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payment_events_user_id ON payment_events(user_id);
CREATE INDEX idx_payment_events_subscription_id ON payment_events(subscription_id);
CREATE INDEX idx_payment_events_created_at ON payment_events(created_at);
```

### 3.4 promo_codes 테이블
```sql
CREATE TABLE promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,

  -- 할인 정보
  discount_type VARCHAR(20) NOT NULL, -- 'percent', 'amount'
  discount_value INT NOT NULL, -- 퍼센트 (1-100) 또는 센트 단위 금액

  -- 유효 기간
  valid_from TIMESTAMP DEFAULT NOW(),
  valid_until TIMESTAMP,

  -- 사용 제한
  max_uses INT,
  current_uses INT DEFAULT 0,
  max_uses_per_user INT DEFAULT 1,

  -- 적용 대상
  applicable_plans TEXT[], -- ['plus_monthly', 'plus_yearly']
  first_payment_only BOOLEAN DEFAULT FALSE,

  -- 메타데이터
  description TEXT,
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_promo_codes_code ON promo_codes(code);
CREATE INDEX idx_promo_codes_valid_until ON promo_codes(valid_until);
```

### 3.5 promo_code_uses 테이블
```sql
CREATE TABLE promo_code_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id UUID NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,

  -- 사용 정보
  discount_amount_cents INT NOT NULL,
  applied_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(promo_code_id, user_id)
);

CREATE INDEX idx_promo_code_uses_user_id ON promo_code_uses(user_id);
```

---

## 4. API 명세

### 4.1 구독 생성
```typescript
POST /api/v1/subscriptions/create
Headers:
{
  "Authorization": "Bearer {token}"
}

Request:
{
  "planType": "plus_monthly" | "plus_yearly",
  "paymentMethod": "stripe" | "toss",
  "promoCode"?: string,
  "successUrl": string,
  "cancelUrl": string
}

Response:
{
  "success": true,
  "checkoutUrl": "https://checkout.stripe.com/c/pay/cs_test_...",
  "sessionId": "cs_test_..."
}

Error:
{
  "success": false,
  "error": "INVALID_PROMO_CODE" | "ALREADY_SUBSCRIBED" | "STRIPE_ERROR",
  "message": "상세 오류 메시지"
}
```

### 4.2 구독 상태 조회
```typescript
GET /api/v1/subscriptions/status
Headers:
{
  "Authorization": "Bearer {token}"
}

Response:
{
  "success": true,
  "subscription": {
    "planType": "plus_yearly",
    "status": "active",
    "currentPeriodEnd": "2026-10-27T23:59:59Z",
    "cancelAtPeriodEnd": false,
    "trialEnd": null
  },
  "usage": {
    "dailyKnocks": {
      "used": 3,
      "limit": 999,
      "resetAt": "2025-10-28T00:00:00Z"
    },
    "memory": {
      "used": 12,
      "limit": 50
    }
  }
}
```

### 4.3 구독 취소
```typescript
POST /api/v1/subscriptions/cancel
Headers:
{
  "Authorization": "Bearer {token}"
}

Request:
{
  "immediately": boolean,
  "reason"?: "too_expensive" | "not_using" | "missing_features" | "technical_issues" | "other",
  "feedback"?: string
}

Response:
{
  "success": true,
  "message": "구독이 2026-10-27에 종료됩니다.",
  "effectiveDate": "2026-10-27T23:59:59Z"
}
```

### 4.4 결제 수단 변경
```typescript
POST /api/v1/subscriptions/update-payment-method
Headers:
{
  "Authorization": "Bearer {token}"
}

Response:
{
  "success": true,
  "setupUrl": "https://billing.stripe.com/p/session/test_..."
}
```

### 4.5 프로모션 코드 검증
```typescript
POST /api/v1/promo-codes/validate
Headers:
{
  "Authorization": "Bearer {token}"
}

Request:
{
  "code": "WELCOME30",
  "planType": "plus_monthly"
}

Response:
{
  "success": true,
  "valid": true,
  "promoCode": {
    "code": "WELCOME30",
    "discountType": "percent",
    "discountValue": 30,
    "description": "신규 가입 30% 할인",
    "validUntil": "2025-12-31T23:59:59Z"
  },
  "finalPrice": {
    "originalCents": 999,
    "discountCents": 300,
    "finalCents": 699,
    "currency": "USD"
  }
}

Error:
{
  "success": false,
  "valid": false,
  "reason": "EXPIRED" | "MAX_USES_REACHED" | "INVALID_PLAN" | "ALREADY_USED"
}
```

### 4.6 사용량 확인
```typescript
GET /api/v1/usage/check
Headers:
{
  "Authorization": "Bearer {token}"
}

Query Parameters:
{
  "feature": "knock" | "memory" | "relationship_edit"
}

Response:
{
  "success": true,
  "available": true,
  "usage": {
    "used": 0,
    "limit": 1,
    "remaining": 1
  },
  "resetAt": "2025-10-28T00:00:00Z"
}
```

---

## 5. Stripe 통합

### 5.1 Stripe 초기화
```typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
  typescript: true
});
```

### 5.2 Checkout Session 생성
```typescript
async function createCheckoutSession(
  userId: string,
  planType: 'plus_monthly' | 'plus_yearly',
  promoCode?: string
): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  // 1. 고객 생성 또는 조회
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId }
    });
    customerId = customer.id;

    await prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId: customerId }
    });
  }

  // 2. 가격 ID 결정
  const priceId = planType === 'plus_monthly'
    ? process.env.STRIPE_PRICE_ID_MONTHLY!
    : process.env.STRIPE_PRICE_ID_YEARLY!;

  // 3. Checkout Session 생성
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1
      }
    ],
    success_url: `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL}/subscription/cancel`,
    metadata: { userId },
    subscription_data: {
      metadata: { userId }
    }
  };

  // 프로모션 코드 적용
  if (promoCode) {
    const promo = await validatePromoCode(promoCode, planType);
    if (promo.valid) {
      sessionParams.discounts = [
        { coupon: promo.stripeCouponId }
      ];
    }
  }

  const session = await stripe.checkout.sessions.create(sessionParams);

  return session.url!;
}
```

### 5.3 웹훅 핸들러
```typescript
import { buffer } from 'micro';

export const config = {
  api: {
    bodyParser: false
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature']!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // 이벤트 처리
  try {
    await handleStripeEvent(event);
    res.json({ received: true });
  } catch (err) {
    console.error('Webhook handler failed:', err);
    res.status(500).send('Webhook handler failed');
  }
}

async function handleStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;

    case 'invoice.payment_succeeded':
      await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
      break;

    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object as Stripe.Invoice);
      break;

    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;

    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  // 모든 이벤트 로깅
  await prisma.paymentEvent.create({
    data: {
      userId: getUserIdFromEvent(event),
      eventType: event.type,
      stripeEventId: event.id,
      rawEvent: event as any,
      createdAt: new Date(event.created * 1000)
    }
  });
}
```

### 5.4 웹훅 이벤트 핸들러

#### checkout.session.completed
```typescript
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata!.userId;
  const subscriptionId = session.subscription as string;

  // Stripe Subscription 조회
  const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);

  // 플랜 타입 결정
  const priceId = stripeSubscription.items.data[0].price.id;
  const planType = priceId === process.env.STRIPE_PRICE_ID_MONTHLY
    ? 'plus_monthly'
    : 'plus_yearly';

  // 구독 레코드 생성
  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      planType,
      status: 'active',
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: subscriptionId,
      stripePriceId: priceId,
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000)
    },
    update: {
      planType,
      status: 'active',
      stripeSubscriptionId: subscriptionId,
      stripePriceId: priceId,
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000)
    }
  });

  // 사용량 제한 업데이트
  await updateUsageQuota(userId, planType);

  // 환영 이메일
  await sendWelcomeEmail(userId);

  // 분석 이벤트
  await trackEvent('subscription_activated', userId, { planType });
}
```

#### invoice.payment_succeeded
```typescript
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;
  const userId = await getUserIdByStripeSubscriptionId(subscriptionId);

  // 결제 이벤트 기록
  await prisma.paymentEvent.create({
    data: {
      userId,
      eventType: 'payment_succeeded',
      amountCents: invoice.amount_paid,
      currency: invoice.currency.toUpperCase(),
      status: 'succeeded',
      rawEvent: invoice as any
    }
  });

  // 구독 갱신 (기간 업데이트)
  const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);

  await prisma.subscription.update({
    where: { userId },
    data: {
      status: 'active',
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000)
    }
  });

  // 캐시 무효화
  await invalidateSubscriptionCache(userId);
}
```

#### invoice.payment_failed
```typescript
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;
  const userId = await getUserIdByStripeSubscriptionId(subscriptionId);

  // 결제 이벤트 기록
  await prisma.paymentEvent.create({
    data: {
      userId,
      eventType: 'payment_failed',
      amountCents: invoice.amount_due,
      currency: invoice.currency.toUpperCase(),
      status: 'failed',
      failureReason: invoice.last_finalization_error?.message,
      rawEvent: invoice as any
    }
  });

  // 구독 상태 변경
  await prisma.subscription.update({
    where: { userId },
    data: { status: 'past_due' }
  });

  // 알림 발송
  await sendPaymentFailedEmail(userId, invoice.hosted_invoice_url!);

  // 7일 유예 기간 후 만료 처리 스케줄
  await scheduleSubscriptionExpiration(userId, 7);
}
```

---

## 6. 사용량 추적 시스템

### 6.1 노크 사용량 체크
```typescript
async function checkKnockAvailability(userId: string): Promise<{
  available: boolean;
  remaining: number;
  resetAt: Date;
  requiresUpgrade: boolean;
}> {
  // Redis 캐시 확인
  const cacheKey = `knock_quota:${userId}`;
  let quota = await redis.get(cacheKey);

  if (!quota) {
    // DB에서 조회
    const dbQuota = await prisma.usageQuota.findUnique({
      where: { userId },
      include: { user: { include: { subscription: true } } }
    });

    quota = JSON.stringify(dbQuota);
    await redis.setex(cacheKey, 60, quota); // 1분 TTL
  }

  const parsedQuota = JSON.parse(quota);
  const subscription = parsedQuota.user.subscription;

  // 유료 사용자: 무제한 (공정 사용 정책만 체크)
  if (subscription.planType !== 'free') {
    const fairUse = await checkFairUsePolicy(userId, 'knock');
    return {
      available: fairUse.allowed,
      remaining: 999,
      resetAt: new Date(),
      requiresUpgrade: false
    };
  }

  // 무료 사용자: 1일 1회 제한
  const now = new Date();
  const lastReset = new Date(parsedQuota.lastKnockReset);
  const nextReset = new Date(lastReset);
  nextReset.setUTCHours(0, 0, 0, 0);
  nextReset.setDate(nextReset.getDate() + 1);

  // 자정 지났으면 리셋
  if (now >= nextReset) {
    await resetDailyKnocks(userId);
    return {
      available: true,
      remaining: 1,
      resetAt: nextReset,
      requiresUpgrade: false
    };
  }

  const remaining = parsedQuota.dailyKnocksLimit - parsedQuota.dailyKnocksUsed;

  return {
    available: remaining > 0,
    remaining,
    resetAt: nextReset,
    requiresUpgrade: remaining <= 0
  };
}

async function consumeKnock(userId: string): Promise<void> {
  await prisma.usageQuota.update({
    where: { userId },
    data: { dailyKnocksUsed: { increment: 1 } }
  });

  // 캐시 무효화
  await redis.del(`knock_quota:${userId}`);
}

async function resetDailyKnocks(userId: string): Promise<void> {
  await prisma.usageQuota.update({
    where: { userId },
    data: {
      dailyKnocksUsed: 0,
      lastKnockReset: new Date()
    }
  });

  await redis.del(`knock_quota:${userId}`);
}
```

### 6.2 공정 사용 정책 체크
```typescript
interface FairUseLimits {
  knock: { daily: number; warning: number };
  message: { daily: number; warning: number };
  api: { perMinute: number };
}

const FAIR_USE_LIMITS: FairUseLimits = {
  knock: { daily: 50, warning: 40 },
  message: { daily: 500, warning: 400 },
  api: { perMinute: 60 }
};

async function checkFairUsePolicy(
  userId: string,
  feature: 'knock' | 'message' | 'api'
): Promise<{ allowed: boolean; warning: boolean; reason?: string }> {
  const usageKey = `fair_use:${feature}:${userId}:${getDateKey()}`;
  const usage = parseInt(await redis.get(usageKey) || '0');

  const limit = FAIR_USE_LIMITS[feature];

  if (usage >= limit.daily) {
    return {
      allowed: false,
      warning: false,
      reason: `공정 사용 정책 위반: ${feature} 일일 한도 초과`
    };
  }

  if (usage >= limit.warning) {
    // 경고 이메일 발송 (1일 1회)
    const warningKey = `fair_use_warning:${feature}:${userId}:${getDateKey()}`;
    const warned = await redis.get(warningKey);

    if (!warned) {
      await sendFairUseWarningEmail(userId, feature, usage, limit.daily);
      await redis.setex(warningKey, 86400, '1'); // 24시간
    }

    return { allowed: true, warning: true };
  }

  return { allowed: true, warning: false };
}

async function incrementUsage(
  userId: string,
  feature: 'knock' | 'message' | 'api'
): Promise<void> {
  const usageKey = `fair_use:${feature}:${userId}:${getDateKey()}`;
  await redis.incr(usageKey);
  await redis.expire(usageKey, 86400); // 24시간 TTL
}

function getDateKey(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}-${now.getUTCDate()}`;
}
```

### 6.3 구독 상태 캐싱
```typescript
async function getSubscription(userId: string): Promise<Subscription> {
  const cacheKey = `subscription:${userId}`;
  let subscription = await redis.get(cacheKey);

  if (!subscription) {
    const dbSubscription = await prisma.subscription.findUnique({
      where: { userId }
    });

    subscription = JSON.stringify(dbSubscription);
    await redis.setex(cacheKey, 300, subscription); // 5분 TTL
  }

  return JSON.parse(subscription);
}

async function invalidateSubscriptionCache(userId: string): Promise<void> {
  await redis.del(`subscription:${userId}`);
  await redis.del(`knock_quota:${userId}`);
}
```

---

## 7. 구독 다운그레이드 처리

```typescript
async function handleSubscriptionExpiration(userId: string) {
  // 1. 구독 상태 변경
  await prisma.subscription.update({
    where: { userId },
    data: {
      planType: 'free',
      status: 'expired'
    }
  });

  // 2. 사용량 제한 복원
  await prisma.usageQuota.update({
    where: { userId },
    data: {
      dailyKnocksLimit: 1,
      dailyKnocksUsed: 0,
      memoryLimit: 5,
      monthlyRelationshipEditsLimit: 0,
      llmModel: 'gemini-1.5-flash'
    }
  });

  // 3. 초과 메모리 처리
  const memoryCount = await prisma.memory.count({ where: { userId } });

  if (memoryCount > 5) {
    // 최신 5개만 남기고 삭제
    const oldMemories = await prisma.memory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: 5
    });

    await prisma.memory.deleteMany({
      where: { id: { in: oldMemories.map(m => m.id) } }
    });

    console.log(`Deleted ${oldMemories.length} excess memories for user ${userId}`);
  }

  // 4. 캐시 무효화
  await invalidateSubscriptionCache(userId);

  // 5. 알림 발송
  await sendDowngradeNotification(userId);

  // 6. 분석 이벤트
  await trackEvent('subscription_expired', userId, {
    previousPlan: 'plus',
    memoryDeleted: memoryCount - 5
  });
}
```

---

## 8. 프로모션 코드 시스템

### 8.1 코드 검증
```typescript
async function validatePromoCode(
  code: string,
  planType: string,
  userId?: string
): Promise<{
  valid: boolean;
  promoCode?: PromoCode;
  reason?: string;
  stripeCouponId?: string;
}> {
  const promoCode = await prisma.promoCode.findUnique({
    where: { code: code.toUpperCase() }
  });

  if (!promoCode) {
    return { valid: false, reason: 'INVALID_CODE' };
  }

  // 유효 기간 확인
  const now = new Date();
  if (promoCode.validUntil && now > promoCode.validUntil) {
    return { valid: false, reason: 'EXPIRED' };
  }

  // 최대 사용 횟수 확인
  if (promoCode.maxUses && promoCode.currentUses >= promoCode.maxUses) {
    return { valid: false, reason: 'MAX_USES_REACHED' };
  }

  // 플랜 적용 대상 확인
  if (!promoCode.applicablePlans.includes(planType)) {
    return { valid: false, reason: 'INVALID_PLAN' };
  }

  // 사용자별 사용 횟수 확인
  if (userId) {
    const userUseCount = await prisma.promoCodeUse.count({
      where: { promoCodeId: promoCode.id, userId }
    });

    if (userUseCount >= promoCode.maxUsesPerUser) {
      return { valid: false, reason: 'ALREADY_USED' };
    }
  }

  // Stripe Coupon 생성 (한 번만)
  let stripeCouponId = promoCode.stripeCouponId;
  if (!stripeCouponId) {
    const coupon = await stripe.coupons.create({
      name: promoCode.code,
      percent_off: promoCode.discountType === 'percent' ? promoCode.discountValue : undefined,
      amount_off: promoCode.discountType === 'amount' ? promoCode.discountValue : undefined,
      currency: 'usd',
      duration: promoCode.firstPaymentOnly ? 'once' : 'repeating',
      duration_in_months: promoCode.firstPaymentOnly ? undefined : 3
    });

    stripeCouponId = coupon.id;

    await prisma.promoCode.update({
      where: { id: promoCode.id },
      data: { stripeCouponId }
    });
  }

  return {
    valid: true,
    promoCode,
    stripeCouponId
  };
}
```

### 8.2 코드 사용 기록
```typescript
async function recordPromoCodeUse(
  promoCodeId: string,
  userId: string,
  subscriptionId: string,
  discountAmountCents: number
): Promise<void> {
  await prisma.$transaction([
    // 사용 기록 생성
    prisma.promoCodeUse.create({
      data: {
        promoCodeId,
        userId,
        subscriptionId,
        discountAmountCents
      }
    }),

    // 사용 카운트 증가
    prisma.promoCode.update({
      where: { id: promoCodeId },
      data: { currentUses: { increment: 1 } }
    })
  ]);
}
```

---

## 9. 보안

### 9.1 웹훅 서명 검증
```typescript
function verifyStripeSignature(
  payload: Buffer,
  signature: string,
  secret: string
): Stripe.Event {
  try {
    return stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (err) {
    throw new Error('Webhook signature verification failed');
  }
}
```

### 9.2 API 인증 미들웨어
```typescript
async function requireSubscription(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const userId = req.userId; // JWT 미들웨어에서 추출

  const subscription = await getSubscription(userId);

  if (subscription.planType === 'free') {
    return res.status(403).json({
      error: 'SUBSCRIPTION_REQUIRED',
      message: 'This feature requires Knock Plus subscription'
    });
  }

  if (subscription.status !== 'active') {
    return res.status(403).json({
      error: 'SUBSCRIPTION_INACTIVE',
      message: 'Your subscription is not active'
    });
  }

  req.subscription = subscription;
  next();
}
```

---

## 10. 모니터링 및 분석

### 10.1 비즈니스 메트릭 추적
```typescript
interface BusinessMetrics {
  mrr: number; // Monthly Recurring Revenue
  arr: number; // Annual Recurring Revenue
  activeSubscriptions: number;
  newSubscriptions: number;
  canceledSubscriptions: number;
  churnRate: number;
  arpu: number; // Average Revenue Per User
}

async function calculateBusinessMetrics(
  startDate: Date,
  endDate: Date
): Promise<BusinessMetrics> {
  const [activeMonthly, activeYearly, newSubs, canceledSubs, totalUsers] = await Promise.all([
    prisma.subscription.count({
      where: {
        planType: 'plus_monthly',
        status: 'active'
      }
    }),

    prisma.subscription.count({
      where: {
        planType: 'plus_yearly',
        status: 'active'
      }
    }),

    prisma.subscription.count({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        planType: { not: 'free' }
      }
    }),

    prisma.subscription.count({
      where: {
        canceledAt: { gte: startDate, lte: endDate }
      }
    }),

    prisma.user.count()
  ]);

  const mrr = (activeMonthly * 9.99) + (activeYearly * 7.99);
  const arr = mrr * 12;
  const churnRate = canceledSubs / (activeMonthly + activeYearly);
  const arpu = mrr / totalUsers;

  return {
    mrr,
    arr,
    activeSubscriptions: activeMonthly + activeYearly,
    newSubscriptions: newSubs,
    canceledSubscriptions: canceledSubs,
    churnRate,
    arpu
  };
}
```

### 10.2 전환율 추적
```typescript
async function trackConversionFunnel(userId: string, stage: string) {
  await redis.hincrby('conversion_funnel', stage, 1);

  await trackEvent('conversion_funnel', userId, { stage });
}

// 사용 예시
trackConversionFunnel(userId, 'paywall_shown');
trackConversionFunnel(userId, 'plan_comparison_viewed');
trackConversionFunnel(userId, 'checkout_started');
trackConversionFunnel(userId, 'checkout_completed');
```

---

## 11. 테스트 전략

### 11.1 단위 테스트
```typescript
describe('checkKnockAvailability', () => {
  it('should allow unlimited knocks for plus users', async () => {
    const result = await checkKnockAvailability(plusUserId);

    expect(result.available).toBe(true);
    expect(result.remaining).toBe(999);
    expect(result.requiresUpgrade).toBe(false);
  });

  it('should limit free users to 1 knock per day', async () => {
    await consumeKnock(freeUserId);

    const result = await checkKnockAvailability(freeUserId);

    expect(result.available).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.requiresUpgrade).toBe(true);
  });
});
```

### 11.2 웹훅 테스트
```typescript
describe('Stripe Webhook', () => {
  it('should activate subscription on checkout.session.completed', async () => {
    const event = createMockStripeEvent('checkout.session.completed', {
      customer: 'cus_test',
      subscription: 'sub_test',
      metadata: { userId: testUserId }
    });

    await handleStripeEvent(event);

    const subscription = await prisma.subscription.findUnique({
      where: { userId: testUserId }
    });

    expect(subscription.status).toBe('active');
    expect(subscription.planType).toBe('plus_monthly');
  });
});
```

---

## 12. 배포 환경 변수

```env
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_MONTHLY=price_...
STRIPE_PRICE_ID_YEARLY=price_...

# 프론트엔드
FRONTEND_URL=https://knock.com

# 데이터베이스
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# 이메일
SENDGRID_API_KEY=SG...

# 분석
MIXPANEL_TOKEN=...
```
