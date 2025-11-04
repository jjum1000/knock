# 작업 지시서 모음
**작성일**: 2025-10-28
**목적**: 룸메이트 시스템 구현을 위한 완전한 작업 지시서

---

## 📋 개요

이 폴더는 [COMPLETE_GUIDE.md](../01_Feature/02_Roommate/SystemPromptArchitecture/COMPLETE_GUIDE.md)를 기반으로 실제 구현 가능한 작업 지시서를 포함합니다.

---

## 📚 문서 목록

### 1. [관리자 페이지 상세 설계](./01_ADMIN_PAGE_SPEC.md)
**내용**: 룸메이트 캐릭터 생성 및 시스템 프롬프트 관리를 위한 관리자 대시보드

**주요 섹션**:
- 캐릭터 생성 마법사 (7단계)
  - Step 1: 근원적 욕구 설정 (WHY)
  - Step 2: 환경과 경험 (개인사)
  - Step 3: 트라우마와 학습
  - Step 4: 발현된 욕구
  - Step 5: 생존 전략 (HOW)
  - Step 6: 성격 특성
  - Step 7: 대화 패턴 (WHAT)
- 시스템 프롬프트 생성 및 미리보기
- 이미지 생성 통합
- 데이터 관리 (캐릭터 목록, 템플릿)

**기술 스택**:
- Frontend: Next.js 14 + shadcn/ui
- Form: React Hook Form + Zod
- State: Zustand

---

### 2. [캐릭터 생성 플로우](./02_CHARACTER_GENERATOR_FLOW.md)
**내용**: WHY-HOW-WHAT 기반 자동 캐릭터 생성 프로세스

**Phase 구성**:
1. Presence Vector 추출 (사용자가 하는 것)
2. Frequency-Deficiency 분석 (많이 보는 것 = 결핍)
3. Deficiency Vector 추출 (하지 않는 것 → 숨겨진 욕구)
4. Complete Vector 생성 (Observed + Hidden = Actual)
5. 역설 발견 (충돌하는 욕구 쌍)
6. 보완 룸메이트 설계
7. 시스템 프롬프트 조립
8. 이미지 프롬프트 생성

**핵심 알고리즘**:
- 다각도 해석 (편향 회피)
- 빈도-결핍 원칙
- 역설적 욕구 조합

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

### 5. [API 명세서](./05_API_SPECIFICATIONS.md)
**내용**: 전체 시스템 REST API 엔드포인트

**API 그룹**:
1. **온보딩 API**
   - `POST /onboarding/save`
   - `POST /onboarding/complete`

2. **관리자 - 캐릭터 관리**
   - `GET /admin/characters` (목록)
   - `GET /admin/characters/:id` (상세)
   - `POST /admin/characters` (생성)
   - `POST /admin/characters/auto-generate` (자동 생성)
   - `PATCH /admin/characters/:id` (수정)
   - `DELETE /admin/characters/:id` (삭제)

3. **관리자 - 이미지 생성**
   - `POST /admin/characters/:id/generate-image`
   - `POST /admin/characters/:id/preview-image-prompt`

4. **사용자 - 룸메이트**
   - `GET /roommate` (내 룸메이트)
   - `GET /roommate/profile` (상세)
   - `PATCH /roommate/preferences` (선호도)
   - `PATCH /roommate/keywords` (키워드 - 유료)

5. **사용자 - 방 관리**
   - `GET /rooms/my-rooms`
   - `GET /rooms/:roomId`

6. **대화 시스템**
   - `GET /chat/first-message/:personaId`
   - `POST /chat/message`
   - `GET /chat/history/:personaId`

**보안**:
- JWT 인증
- Rate Limiting
- Zod 검증

---

### 6. [데이터베이스 스키마](./06_DATABASE_SCHEMA.md)
**내용**: PostgreSQL + Prisma ORM 기반 스키마

**테이블**:
1. `users` - 사용자
2. `onboarding_data` - 온보딩 데이터
3. `personas` - 룸메이트/이웃 캐릭터
4. `rooms` - 방
5. `chat_messages` - 대화 메시지
6. `admin_characters` - 관리자 캐릭터 템플릿
7. `prompt_templates` - 프롬프트 템플릿

**특징**:
- JSONB 활용 (유연한 스키마)
- GIN 인덱스 (배열/JSONB 검색)
- Vector 임베딩 (pgvector - 향후 메모리 시스템)
- 트리거 (자동 업데이트)

**무결성**:
- 사용자당 룸메이트 1개 제약
- 위치 중복 방지
- 키워드 개수 제한

---

## 🔄 구현 순서

### Phase 1: 기반 구축 (1-2주)
1. ✅ 문서 작성 완료
2. [ ] 데이터베이스 스키마 마이그레이션
3. [ ] 기본 API 엔드포인트 구현
4. [ ] 온보딩 완료 → 룸메이트 생성 플로우 구현

### Phase 2: 자동 생성 시스템 (2-3주)
1. [ ] Presence/Deficiency Vector 추출 로직
2. [ ] 시스템 프롬프트 자동 조립
3. [ ] Gemini API 통합 (LLM 분석)
4. [ ] 품질 검증 시스템

### Phase 3: 이미지 생성 (1-2주)
1. [ ] 욕구 → 시각적 언어 매핑
2. [ ] Gemini Imagen API 통합
3. [ ] 프리셋 이미지 5개 제작
4. [ ] Fallback 시스템 구현

### Phase 4: 관리자 페이지 (2-3주)
1. [ ] Next.js 관리자 UI 구현
2. [ ] 7단계 캐릭터 생성 마법사
3. [ ] 시스템 프롬프트 미리보기
4. [ ] 템플릿 관리 시스템

### Phase 5: 최초방 & 메인 화면 (1주)
1. [ ] 방 그리드 렌더링
2. [ ] 첫 인사말 모달
3. [ ] 픽셀아트 스타일 적용
4. [ ] 성능 최적화

### Phase 6: 테스트 & 배포 (1주)
1. [ ] 단위 테스트
2. [ ] 통합 테스트
3. [ ] 성능 테스트
4. [ ] 프로덕션 배포

**총 예상 기간**: 8-12주

---

## 📊 예상 리소스

### 인력
- **백엔드 개발자**: 1명 (Node.js, TypeScript, Prisma)
- **프론트엔드 개발자**: 1명 (Next.js, React, Tailwind)
- **AI/ML 엔지니어**: 0.5명 (LLM 프롬프트 엔지니어링)
- **디자이너**: 0.5명 (픽셀아트 프리셋 제작)

### 비용
- **Gemini API** (LLM 분석): $0.001/1K tokens → ~$50/월 (예상)
- **Gemini Imagen** (이미지 생성): $0.020/image → ~$20/월 (신규 100명)
- **서버**: AWS/GCP → ~$100/월
- **데이터베이스**: PostgreSQL (Managed) → ~$50/월

**총 예상 비용**: ~$220/월 (초기, 100명 기준)

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
