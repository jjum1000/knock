# 작업 지시서 모음
**작성일**: 2025-10-28
**목적**: 룸메이트 시스템 구현을 위한 완전한 작업 지시서

---

## 📋 개요

이 폴더는 [COMPLETE_GUIDE.md](../01_Feature/02_Roommate/SystemPromptArchitecture/COMPLETE_GUIDE.md)를 기반으로 **에이전트 기반 자동화 시스템**의 실제 구현 가능한 작업 지시서를 포함합니다.

**핵심 철학**:
- 관리자는 **템플릿, 데이터 풀, Agent 설정**만 관리
- 실제 캐릭터/이미지 생성은 **5개 자동 Agent**가 수행
- 모든 생성 과정은 **agent_jobs 테이블로 추적 가능**

---

## 📚 문서 목록

### 1. [관리자 페이지 상세 설계](./01_ADMIN_PAGE_SPEC.md) ⭐ Agent-Based
**내용**: Agent 시스템 관리를 위한 관리자 대시보드

**주요 섹션**:
- **템플릿 관리** (Agent 3이 사용)
  - 시스템 프롬프트 템플릿 CRUD
  - Handlebars 변수 정의
  - 미리보기 기능
- **데이터 풀 관리** (Agent 2, 4가 사용)
  - 경험 데이터 풀 (과거 경험)
  - 아키타입 데이터 풀 (캐릭터 유형)
  - 시각적 요소 데이터 풀 (이미지 요소)
- **Agent 모니터링**
  - 실행 현황 대시보드
  - 품질 점수 분석
  - 실패 로그 확인
- **수동 Agent 실행** (테스트용)

**기술 스택**:
- Frontend: Next.js 14 + shadcn/ui
- Form: React Hook Form + Zod
- State: Zustand

---

### 2. [캐릭터 생성 플로우](./02_CHARACTER_GENERATOR_FLOW.md) ⭐ Agent-Based
**내용**: 5개 자동 Agent 파이프라인 (10-15초 내 완료)

**Agent 구성**:
1. **Agent 1: Need Vector Analysis** (Gemini LLM)
   - 온보딩 데이터 → 6가지 욕구 벡터 추출
   - Presence/Deficiency/Paradox 분석

2. **Agent 2: Character Profile Generation** (LLM + 데이터 풀)
   - 욕구 벡터 → 아키타입 선택
   - 데이터 풀에서 경험 선택
   - 캐릭터 프로파일 생성

3. **Agent 3: System Prompt Assembly** (Handlebars)
   - 템플릿 + 변수 → 시스템 프롬프트 조립
   - WHY-HOW-WHAT 구조 완성

4. **Agent 4: Image Prompt Generation** (규칙 기반)
   - 욕구 벡터 → 시각적 언어 매핑
   - 데이터 풀에서 시각 요소 선택

5. **Agent 5: Image Generation** (Gemini Imagen)
   - 이미지 프롬프트 → 픽셀아트 생성

**핵심 기능**:
- 완전 자동화 (관리자 개입 불필요)
- 품질 검증 시스템
- Fallback 전략 (각 Agent별)

---

### 3. [이미지 생성 시스템](./03_IMAGE_GENERATION_SYSTEM.md)
**내용**: 욕구 벡터 기반 룸 이미지 자동 생성

**파이프라인**:
1. 욕구 → 시각적 언어 매핑 (색상, 공간, 분위기)
2. 트라우마 → 방어 요소 (보호 아이템)
3. 아키타입 기반 오브젝트 선택 (확률적)
4. 이미지 프롬프트 조립
5. AI 이미지 생성 (Gemini Imagen)

**기술**:
- Gemini Imagen API
- 품질 검증 로직
- Fallback 프리셋 시스템

**비용**:
- 무료: 100회/월
- 유료: $0.020/image

---

### 4. [최초방 구현 가이드](./04_INITIAL_ROOM_IMPLEMENTATION.md)
**내용**: 온보딩 완료 후 자동 생성되는 룸메이트 방

**구현 플로우**:
1. 온보딩 데이터 수집 완료
2. 자동 캐릭터 생성
3. 룸메이트 방 이미지 생성
4. DB 저장
5. 첫 인사말 생성
6. 메인 화면 렌더링

**컴포넌트**:
- RoomGrid (방 그리드)
- FirstMessageModal (첫 인사말 모달)
- 픽셀아트 스타일 CSS

**최적화**:
- 이미지 프리로딩
- 백그라운드 생성
- 2초 이내 화면 표시 목표

---

### 5. [API 명세서](./05_API_SPECIFICATIONS.md) ⭐ Agent-Based
**내용**: 전체 시스템 REST API 엔드포인트

**API 그룹**:
1. **온보딩 API**
   - `POST /onboarding/save`
   - `POST /onboarding/complete` (Agent Pipeline 트리거)

2. **관리자 - Agent 실행** (신규)
   - `POST /admin/agent/execute` (수동 Agent 실행)
   - `GET /admin/agent/jobs/:jobId` (작업 상태 조회)
   - `GET /admin/agent/jobs` (작업 목록)
   - `POST /admin/agent/jobs/:jobId/retry` (재시도)

3. **관리자 - 템플릿 관리** (신규)
   - `GET /admin/templates` (템플릿 목록)
   - `GET /admin/templates/:id` (템플릿 상세)
   - `POST /admin/templates` (템플릿 생성)
   - `PATCH /admin/templates/:id` (템플릿 수정)
   - `DELETE /admin/templates/:id` (템플릿 삭제)
   - `POST /admin/templates/:id/preview` (미리보기)

4. **관리자 - 데이터 풀 관리** (신규)
   - `GET/POST /admin/data-pool/experiences`
   - `GET/POST /admin/data-pool/archetypes`
   - `GET/POST /admin/data-pool/visuals`

5. **관리자 - 모니터링** (신규)
   - `GET /admin/monitoring/dashboard` (대시보드 통계)
   - `GET /admin/monitoring/quality` (품질 분석)

6. **사용자 - 룸메이트**
   - `GET /roommate` (내 룸메이트 + generation_job_id)
   - `GET /roommate/profile` (상세)
   - `PATCH /roommate/preferences` (선호도)
   - `PATCH /roommate/keywords` (키워드 - 유료)

7. **사용자 - 방 관리**
   - `GET /rooms/my-rooms`
   - `GET /rooms/:roomId`

8. **대화 시스템**
   - `GET /chat/first-message/:personaId`
   - `POST /chat/message`
   - `GET /chat/history/:personaId`

**보안**:
- JWT 인증
- Rate Limiting
- Zod 검증

---

### 6. [데이터베이스 스키마](./06_DATABASE_SCHEMA.md) ⭐ Agent-Based
**내용**: PostgreSQL + Prisma ORM 기반 스키마 (11개 테이블)

**핵심 테이블**:
1. `users` - 사용자
2. `onboarding_data` - 온보딩 데이터
3. `personas` - **Agent가 생성한** 룸메이트/이웃
4. `rooms` - **Agent가 생성한** 방 이미지
5. `chat_messages` - 대화 메시지

**Agent 시스템 테이블** (신규):
6. `prompt_templates` - **관리자가 관리하는** 템플릿
7. `data_pool_experiences` - **Agent 2가 사용할** 경험 데이터
8. `data_pool_archetypes` - **Agent 2가 사용할** 아키타입
9. `data_pool_visuals` - **Agent 4가 사용할** 시각 요소
10. `agent_jobs` - **Agent 실행 추적**
11. `agent_job_logs` - **Agent 실행 로그 상세**

**특징**:
- JSONB 활용 (욕구 벡터, 캐릭터 프로파일)
- GIN 인덱스 (배열/JSONB 검색)
- generation_job_id (모든 생성물 추적 가능)
- Vector 임베딩 (pgvector - 향후 메모리 시스템)

**무결성**:
- 사용자당 룸메이트 1개 제약
- Agent 작업 추적 외래키
- 위치 중복 방지

---

## 🔄 구현 순서 (Agent-Based)

### Phase 1: 기반 구축 (1-2주)
1. ✅ 문서 작성 완료 (Agent 기반 아키텍처)
2. [ ] **데이터베이스 스키마 마이그레이션** (11개 테이블)
   - Prisma schema.prisma 작성
   - 초기 마이그레이션 실행
3. [ ] **시드 데이터 생성**
   - 기본 프롬프트 템플릿 1개
   - 경험 데이터 풀 50개
   - 아키타입 데이터 풀 10개
   - 시각적 요소 데이터 풀 100개
4. [ ] 기본 API 엔드포인트 구현

### Phase 2: Agent 시스템 구현 (3-4주) ⭐ 핵심
1. [ ] **Agent 1: Need Vector Analysis**
   - Gemini 1.5 Pro 통합
   - 욕구 벡터 추출 로직
   - Presence/Deficiency 분석
2. [ ] **Agent 2: Character Profile Generation**
   - 데이터 풀 선택 로직
   - 아키타입 매칭 알고리즘
   - 캐릭터 프로파일 생성
3. [ ] **Agent 3: System Prompt Assembly**
   - Handlebars 템플릿 엔진
   - 변수 채우기 로직
4. [ ] **Agent 4: Image Prompt Generation**
   - 욕구 → 시각적 언어 매핑
   - 데이터 풀 시각 요소 선택
5. [ ] **Agent 5: Image Generation**
   - Gemini Imagen 3.0 통합
   - 품질 검증 시스템
   - Fallback 프리셋 이미지

### Phase 3: Agent 파이프라인 통합 (1-2주)
1. [ ] 5개 Agent 순차 실행 오케스트레이션
2. [ ] agent_jobs 테이블 로깅
3. [ ] 품질 점수 계산 로직
4. [ ] 에러 핸들링 & Retry 로직
5. [ ] 온보딩 완료 → Agent Pipeline 트리거

### Phase 4: 관리자 페이지 (2-3주)
1. [ ] **템플릿 관리 UI**
   - 템플릿 CRUD
   - Handlebars 에디터
   - 미리보기 기능
2. [ ] **데이터 풀 관리 UI**
   - 경험/아키타입/시각 요소 CRUD
   - 가중치 조정
3. [ ] **Agent 모니터링 대시보드**
   - 실행 현황 차트
   - 품질 점수 분석
   - 실패 로그 뷰어
4. [ ] 수동 Agent 실행 기능 (테스트용)

### Phase 5: 최초방 & 메인 화면 (1주)
1. [ ] 방 그리드 렌더링 (Agent 생성 이미지)
2. [ ] 첫 인사말 모달 (generation_job_id 표시)
3. [ ] 픽셀아트 스타일 적용
4. [ ] 성능 최적화 (10-15초 목표)

### Phase 6: 테스트 & 배포 (1-2주)
1. [ ] Agent 단위 테스트
2. [ ] Agent 파이프라인 통합 테스트
3. [ ] 품질 검증 테스트 (100회 생성)
4. [ ] 성능 테스트 (동시 실행)
5. [ ] 프로덕션 배포

**총 예상 기간**: 9-14주 (Agent 시스템 복잡도 반영)

---

## 📊 예상 리소스 (Agent-Based)

### 인력
- **백엔드 개발자**: 1-2명 (Node.js, TypeScript, Prisma)
  - Agent 시스템 개발
  - 파이프라인 오케스트레이션
  - API 엔드포인트 구현
- **프론트엔드 개발자**: 1명 (Next.js, React, shadcn/ui)
  - 관리자 대시보드 (템플릿, 데이터 풀, 모니터링)
  - 사용자 화면
- **AI/ML 엔지니어**: 1명 (LLM 프롬프트 엔지니어링) ⭐ 핵심
  - Agent 프롬프트 최적화
  - 품질 검증 로직 설계
  - 데이터 풀 초기 구축
- **디자이너**: 0.5명 (픽셀아트 프리셋 제작)

### 비용
- **Gemini 1.5 Pro** (Agent 1, 2):
  - Input: $0.00125/1K tokens
  - Output: $0.005/1K tokens
  - 예상: ~$3/사용자 생성 → $300/월 (100명)
- **Gemini Imagen 3.0** (Agent 5):
  - $0.020/image → $20/월 (100명, 캐싱 활용)
- **서버**: AWS/GCP → ~$150/월 (Agent 실행 부하)
- **데이터베이스**: PostgreSQL (Managed) → ~$80/월 (로그 저장)

**총 예상 비용**: ~$550/월 (초기, 100명 기준)
**확장 후**: ~$3,000/월 (1,000명 기준)

---

## ✅ 체크리스트

### 구현 전
- [ ] COMPLETE_GUIDE.md 숙지
- [ ] 모든 작업 지시서 리뷰
- [ ] 기술 스택 선정 확정
- [ ] 개발 환경 설정

### 개발 중
- [ ] 각 Phase별 목표 달성 확인
- [ ] 코드 리뷰 프로세스
- [ ] 문서화 지속 업데이트
- [ ] 주간 진행 상황 체크

### 배포 전
- [ ] 모든 테스트 통과
- [ ] 성능 벤치마크 달성
- [ ] 보안 검토 완료
- [ ] 사용자 문서 작성

---

## 🔗 관련 문서

- [COMPLETE_GUIDE.md](../01_Feature/02_Roommate/SystemPromptArchitecture/COMPLETE_GUIDE.md) - 핵심 철학 및 이론
- [feature-spec.md](../01_Feature/02_Roommate/feature-spec.md) - 기능 명세
- [tech-spec.md](../01_Feature/02_Roommate/tech-spec.md) - 기술 명세
- [대화 방법론](../01_Feature/02_Roommate/conversation-methodologies/) - 대화 패턴 참고

---

## 📞 문의

구현 중 질문이나 문제가 있으면:
1. 먼저 해당 작업 지시서 재확인
2. COMPLETE_GUIDE.md 참조
3. 기술 스택 공식 문서 확인
4. 팀원과 논의

---

**마지막 업데이트**: 2025-10-28
**버전**: 1.0
