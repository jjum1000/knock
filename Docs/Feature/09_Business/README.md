# 비즈니스 모델 (Business Model)

## 개요
Knock 서비스의 수익화 전략 및 유료 플랜 관리 시스템으로, 무료 사용자와 유료 구독자에게 차별화된 가치를 제공하여 지속 가능한 비즈니스를 구축합니다.

## 핵심 가치
- **프리미엄 경험 제공**: 무료 사용자도 핵심 기능 이용 가능, 유료 플랜은 깊이와 속도 강화
- **명확한 가치 차별화**: 노크 제한 해제, 고급 LLM, 긴 메모리, 관계 커스터마이징
- **투명한 가격 정책**: 명확한 플랜 구분 및 혜택 안내

## 주요 기능

### 1. 무료 플랜 (Free)
- 1일 1회 이웃 노크
- 기본 LLM 모델 (Gemini 1.5 Flash)
- 대화 메모리 5개 저장
- 기본 관계 시스템

### 2. 유료 플랜 (Knock Plus)
- **훅 가속**: 즉시 이웃 노크 (일 1회 제한 해제/추가 이용권)
- **딥 다이브 대화**: 긴 메모리 (50개), 고급 LLM (Gemini 1.5 Pro), 깊은 대화
- **관계 관리**: 시스템 프롬프트 일부 직접 수정 (키워드 추가/삭제)

### 3. 결제 시스템
- 월간 구독 (Knock Plus Monthly)
- 연간 구독 (Knock Plus Yearly, 20% 할인)
- 안전한 결제 처리 (Stripe/Toss Payments)
- 구독 관리 (업그레이드, 다운그레이드, 취소)

## 문서 구성

- [기능 명세서](./feature-spec.md) - 플랜별 상세 기능, 가격 전략
- [사용자 플로우](./user-flow.md) - 구독 전환 플로우, 결제 프로세스
- [기술 스펙](./tech-spec.md) - 결제 API, 구독 관리, 사용량 추적

## 의존성

### 선행 요구사항
- [노크 시스템](../03_Knock/README.md) - 무료/유료 노크 차별화
- [채팅 시스템](../04_Chat/README.md) - LLM 모델 차별화
- [메모리 시스템](../05_Memory/README.md) - 메모리 용량 차별화

### 연관 시스템
- 결제 시스템 (Stripe/Toss Payments)
- 구독 관리 시스템
- 사용량 추적 시스템

## 성공 지표 (KPI)
- 무료 → 유료 전환율 (Conversion Rate)
- 월간 반복 수익 (MRR - Monthly Recurring Revenue)
- 고객 생애 가치 (LTV - Lifetime Value)
- 이탈률 (Churn Rate)
- 구독 갱신율 (Renewal Rate)
- ARPU (Average Revenue Per User)
