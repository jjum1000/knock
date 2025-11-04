# API 명세서 (Agent-Based)
**작성일**: 2025-10-28
**목적**: 에이전트 기반 룸메이트 시스템 전체 API 엔드포인트 정의

---

## 📋 개요

**핵심 철학**:
- 관리자는 **템플릿, 데이터 풀, Agent 설정**만 관리
- 실제 캐릭터/이미지 생성은 **5개 자동 Agent**가 수행
- 모든 생성 과정은 **agent_jobs**로 추적 가능

**Base URL**: `http://localhost:3003/api/v1`
**Production**: `https://api.knock.com/api/v1`

---

## 🔐 인증

### 헤더

```http
Authorization: Bearer <JWT_TOKEN>
```

### 관리자 권한

관리자 전용 엔드포인트는 `/admin/` 경로를 사용하며, 관리자 토큰이 필요합니다.

```typescript
// 관리자 인증 미들웨어
function requireAdmin(req, res, next) {
  const user = req.user; // JWT에서 추출

  if (!user.isAdmin) {
    return res.status(403).json({
      success: false,
      error: 'ADMIN_REQUIRED',
      message: '관리자 권한이 필요합니다'
    });
  }

  next();
}
```

---

## 📑 목차

1. [온보딩 API](#1-온보딩-api)
2. [관리자 - Agent 실행](#2-관리자---agent-실행)
3. [관리자 - 템플릿 관리](#3-관리자---템플릿-관리)
4. [관리자 - 데이터 풀 관리](#4-관리자---데이터-풀-관리)
5. [관리자 - 모니터링](#5-관리자---모니터링)
6. [사용자 - 룸메이트](#6-사용자---룸메이트)
7. [사용자 - 방 관리](#7-사용자---방-관리)
8. [대화 시스템](#8-대화-시스템)

---

## 1. 온보딩 API

### 1.1 온보딩 데이터 저장

```http
POST /onboarding/save
```

**Request**:
```json
{
  "userId": "uuid",
  "step": "browsing" | "manual" | "preferences",
  "data": {
    // step에 따라 다른 구조
  }
}
```

**Response**:
```json
{
  "success": true,
  "onboarding": {
    "id": "uuid",
    "userId": "uuid",
    "completedSteps": ["browsing", "manual"],
    "nextStep": "preferences"
  }
}
```

---

### 1.2 온보딩 완료 (Agent Pipeline 트리거)

```http
POST /onboarding/complete
```

**핵심**: 이 엔드포인트는 5개 Agent 파이프라인을 자동 실행하여 룸메이트와 방을 생성합니다.

**Request**:
```json
{
  "userId": "uuid",
  "browsing": {
    "domains": ["github.com", "stackoverflow.com"],
    "keywords": ["react", "typescript"],
    "categories": ["development", "gaming"]
  },
  "manual": {
    "interests": ["개발", "게임"],
    "avoidTopics": ["정치"]
  },
  "preferences": {
    "conversationStyle": "casual",
    "responseLength": "medium"
  }
}
```

**Response** (10-15초 내):
```json
{
  "success": true,
  "agentJobId": "job_uuid",  // Agent 실행 추적 ID
  "roommate": {
    "id": "uuid",
    "name": "김민수",
    "archetype": "developer_gamer",
    "needVectors": {
      "belonging": 0.8,
      "recognition": 0.6,
      "growth": 0.7
    },
    "firstMessage": "어, 왔어? 오늘 하루 어땠어? 나 방금 새로운 게임 발견했는데 진짜 재밌더라!"
  },
  "room": {
    "id": "uuid",
    "imageUrl": "https://cdn.knock.com/rooms/abc123.png",
    "position": { "x": 0, "y": 0 }
  },
  "generation": {
    "qualityScore": 0.85,
    "executionTime": 12340,  // ms
    "agents": {
      "agent1": "completed",
      "agent2": "completed",
      "agent3": "completed",
      "agent4": "completed",
      "agent5": "completed"
    }
  }
}
```

**Errors**:
```json
{
  "success": false,
  "error": "ROOMMATE_ALREADY_EXISTS" | "ONBOARDING_INCOMPLETE" | "AGENT_PIPELINE_FAILED",
  "agentJobId": "job_uuid",  // 실패한 작업 ID (디버깅용)
  "failedAgent": "Agent 1: Need Vector Analysis",
  "details": "Gemini API timeout after 5000ms"
}
```

**내부 프로세스**:
1. 온보딩 데이터 검증
2. Agent Pipeline 실행 (자세한 내용: [02_CHARACTER_GENERATOR_FLOW.md](./02_CHARACTER_GENERATOR_FLOW.md))
   - Agent 1: 욕구 벡터 분석
   - Agent 2: 캐릭터 프로파일 생성
   - Agent 3: 시스템 프롬프트 조립
   - Agent 4: 이미지 프롬프트 생성
   - Agent 5: 이미지 생성
3. DB 저장 (personas, rooms, agent_jobs)
4. 첫 인사말 생성 (Gemini API)

---

## 2. 관리자 - Agent 실행

**핵심**: 관리자는 Agent를 수동으로 실행하여 테스트하거나, 실패한 생성을 재시도할 수 있습니다.

### 2.1 Agent Pipeline 수동 실행

```http
POST /admin/agent/execute
```

**Request**:
```json
{
  "input": {
    "userData": {
      "domains": ["github.com", "stackoverflow.com"],
      "keywords": ["react", "typescript"],
      "categories": ["development", "gaming"],
      "interests": ["개발", "게임"],
      "avoidTopics": ["정치"]
    },
    "meta": {
      "userId": "uuid",
      "userName": "사용자A"
    }
  },
  "config": {
    "templateId": "default_template_uuid",  // 선택
    "skipCache": false,  // 캐시 무시 여부
    "dryRun": false  // 실제 DB 저장 안함 (테스트용)
  }
}
```

**Response**:
```json
{
  "success": true,
  "jobId": "job_uuid",
  "status": "completed",
  "output": {
    "persona": {
      "id": "uuid",
      "name": "김민수",
      "archetype": "developer_gamer",
      "needVectors": {
        "survival": 0.3,
        "belonging": 0.8,
        "recognition": 0.6,
        "autonomy": 0.5,
        "growth": 0.7,
        "meaning": 0.4
      },
      "characterProfile": {
        "fundamentalNeeds": [...],
        "pastExperiences": [...],
        "trauma": {...},
        "behaviors": [...],
        "personality": {...}
      },
      "systemPrompt": "# 시스템 프롬프트: 김민수\n\n## WHY - 나의 근원적 욕구...",
      "generationJobId": "job_uuid"
    },
    "room": {
      "id": "uuid",
      "imageUrl": "https://cdn.knock.com/rooms/abc123.png",
      "imagePrompt": "Create a pixel art room...",
      "imageJobId": "job_uuid"
    }
  },
  "logs": [
    {
      "step": 1,
      "agent": "Agent 1: Need Vector Analysis",
      "status": "completed",
      "durationMs": 2340
    },
    {
      "step": 2,
      "agent": "Agent 2: Character Profile Generation",
      "status": "completed",
      "durationMs": 3120
    },
    {
      "step": 3,
      "agent": "Agent 3: System Prompt Assembly",
      "status": "completed",
      "durationMs": 450
    },
    {
      "step": 4,
      "agent": "Agent 4: Image Prompt Generation",
      "status": "completed",
      "durationMs": 890
    },
    {
      "step": 5,
      "agent": "Agent 5: Image Generation",
      "status": "completed",
      "durationMs": 5540
    }
  ],
  "qualityScore": 0.85,
  "executionTime": 12340
}
```

**Errors**:
```json
{
  "success": false,
  "jobId": "job_uuid",
  "status": "failed",
  "failedAgent": "Agent 1: Need Vector Analysis",
  "error": "GEMINI_API_TIMEOUT",
  "details": "Request timed out after 5000ms",
  "logs": [...]
}
```

---

### 2.2 Agent Job 상태 조회

```http
GET /admin/agent/jobs/:jobId
```

**Response**:
```json
{
  "success": true,
  "job": {
    "id": "job_uuid",
    "jobType": "character_generation",
    "status": "completed",
    "input": {...},
    "output": {...},
    "qualityScore": 0.85,
    "startedAt": "2025-10-28T10:00:00Z",
    "completedAt": "2025-10-28T10:00:12Z",
    "executionTimeMs": 12340,
    "createdBy": "admin_uuid"
  },
  "logs": [
    {
      "step": 1,
      "agentName": "Agent 1: Need Vector Analysis",
      "status": "completed",
      "input": {...},
      "output": {...},
      "durationMs": 2340
    }
  ]
}
```

---

### 2.3 Agent Job 목록 조회

```http
GET /admin/agent/jobs
```

**Query Parameters**:
- `page`: 페이지 번호 (default: 1)
- `limit`: 페이지당 개수 (default: 20)
- `status`: 상태 필터 (선택: 'pending', 'running', 'completed', 'failed')
- `jobType`: 작업 타입 필터 (선택: 'character_generation', 'image_generation')

**Response**:
```json
{
  "success": true,
  "jobs": [
    {
      "id": "job_uuid",
      "jobType": "character_generation",
      "status": "completed",
      "qualityScore": 0.85,
      "executionTimeMs": 12340,
      "createdAt": "2025-10-28T10:00:00Z",
      "createdBy": "admin_uuid"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  },
  "stats": {
    "completed": 140,
    "failed": 10,
    "avgQualityScore": 0.82,
    "avgExecutionTime": 11250
  }
}
```

---

### 2.4 실패한 Agent Job 재시도

```http
POST /admin/agent/jobs/:jobId/retry
```

**Request**:
```json
{
  "config": {
    "skipCache": true  // 이전 캐시 무시
  }
}
```

**Response**:
```json
{
  "success": true,
  "newJobId": "new_job_uuid",
  "status": "running"
}
```

---

## 3. 관리자 - 템플릿 관리

**핵심**: Agent 3이 시스템 프롬프트를 조립할 때 사용하는 템플릿을 관리합니다.

### 3.1 템플릿 목록 조회

```http
GET /admin/templates
```

**Response**:
```json
{
  "success": true,
  "templates": [
    {
      "id": "uuid",
      "name": "Default Roommate Template",
      "version": "1.0",
      "isActive": true,
      "isDefault": true,
      "createdAt": "2025-10-28T10:00:00Z"
    }
  ]
}
```

---

### 3.2 템플릿 상세 조회

```http
GET /admin/templates/:id
```

**Response**:
```json
{
  "success": true,
  "template": {
    "id": "uuid",
    "name": "Default Roommate Template",
    "version": "1.0",
    "description": "기본 룸메이트 시스템 프롬프트 템플릿",
    "sections": {
      "why": "## WHY - 나의 근원적 욕구\n\n나는 **{{characterName}}**이다.\n{{userName}}의 룸메이트다.\n\n### 나의 욕구\n{{#each needs}}\n- **{{this.name}}** ({{this.intensity}}): {{this.description}}\n{{/each}}",
      "past": "## PAST - 나를 만든 경험\n\n{{#each experiences}}\n### {{this.title}}\n{{this.description}}\n{{/each}}",
      "trauma": "## TRAUMA - 나를 방어하게 만든 사건\n\n{{trauma.description}}",
      "how": "## HOW - 나의 생존 전략\n\n{{#each strategies}}\n- {{this}}\n{{/each}}",
      "personality": "## PERSONALITY - 나의 성격\n\n{{personality.description}}",
      "what": "## WHAT - 나의 대화 패턴\n\n{{conversationPattern.description}}",
      "relationship": "## RELATIONSHIP - 나와 {{userName}}\n\n{{relationship.description}}"
    },
    "variables": [
      { "name": "characterName", "type": "string", "required": true },
      { "name": "userName", "type": "string", "required": true },
      { "name": "needs", "type": "array", "required": true },
      { "name": "experiences", "type": "array", "required": true },
      { "name": "trauma", "type": "object", "required": true },
      { "name": "strategies", "type": "array", "required": true },
      { "name": "personality", "type": "object", "required": true },
      { "name": "conversationPattern", "type": "object", "required": true },
      { "name": "relationship", "type": "object", "required": true }
    ],
    "agentInstructions": "Agent 3은 이 템플릿을 사용하여 시스템 프롬프트를 조립합니다. Handlebars 문법을 사용하여 변수를 채웁니다."
  }
}
```

---

### 3.3 템플릿 생성

```http
POST /admin/templates
```

**Request**:
```json
{
  "name": "New Template",
  "version": "1.0",
  "description": "새로운 템플릿",
  "sections": {
    "why": "...",
    "past": "...",
    // ... 나머지 섹션
  },
  "variables": [
    { "name": "characterName", "type": "string", "required": true }
  ],
  "agentInstructions": "..."
}
```

**Response**:
```json
{
  "success": true,
  "template": {
    "id": "uuid",
    "name": "New Template",
    "version": "1.0"
  }
}
```

---

### 3.4 템플릿 수정

```http
PATCH /admin/templates/:id
```

---

### 3.5 템플릿 삭제

```http
DELETE /admin/templates/:id
```

---

### 3.6 템플릿 미리보기

```http
POST /admin/templates/:id/preview
```

**Request** (샘플 변수):
```json
{
  "variables": {
    "characterName": "김민수",
    "userName": "사용자A",
    "needs": [
      { "name": "소속", "intensity": "강함", "description": "커뮤니티에 속하고 싶음" }
    ],
    // ... 나머지 변수
  }
}
```

**Response** (렌더링된 프롬프트):
```json
{
  "success": true,
  "renderedPrompt": "# 시스템 프롬프트: 김민수\n\n## WHY - 나의 근원적 욕구\n\n나는 **김민수**이다.\n사용자A의 룸메이트다.\n\n### 나의 욕구\n- **소속** (강함): 커뮤니티에 속하고 싶음\n..."
}
```

---

## 4. 관리자 - 데이터 풀 관리

**핵심**: Agent 2가 캐릭터를 생성할 때 사용하는 데이터 풀을 관리합니다.

### 4.1 경험 데이터 풀
    "keywords": ["게임매니아", "코딩덕후", "새벽형인간"],

    // 욕구 정의
    "fundamentalNeeds": {
      "belonging": { "selected": true, "intensity": "strong" },
      "recognition": { "selected": true, "intensity": "medium" },
      "survival": { "selected": true, "intensity": "weak" }
    },

    // 과거 경험
    "pastExperiences": [
      {
        "id": "exp1",
        "title": "왕따 경험",
        "event": "중학교 2학년 때 3개월간 학교에서 왕따를 당함",
        "age": 14,
        "ageContext": "중학교 2학년",
        "learnings": [
          "나는 어디에도 속하지 못한다",
          "소속되는 것이 생존이다"
        ]
      }
    ],

    // 트라우마
    "traumaAndLearning": {
      "learnedBeliefs": {
        "aboutWorld": ["세상은 외로운 곳이다"],
        "aboutPeople": ["사람들은 나를 이해하지 못한다"],
        "aboutSelf": ["나는 커뮤니티에 소속되어야 안전하다"]
      },
      "trauma": {
        "deepestFear": "또다시 거부당하는 것",
        "neverAgain": "혼자가 되는 것",
        "avoidances": ["대면 갈등", "직접적 거절"],
        "triggers": "커뮤니티에서 배제되는 느낌"
      }
    },

    // ... 나머지 데이터

    // 생성된 결과물
    "systemPrompt": "# 시스템 프롬프트: 김민수...",
    "imagePrompt": "Create a pixel art room...",
    "imageUrl": "https://cdn.knock.com/rooms/abc123.png",

    "createdAt": "2025-10-28T10:00:00Z",
    "updatedAt": "2025-10-28T10:30:00Z"
  }
}
```

---

### 2.3 캐릭터 생성 (수동)

```http
POST /admin/characters
```

**Request**:
```json
{
  "name": "김민수",
  "fundamentalNeeds": {
    "belonging": { "selected": true, "intensity": "strong" },
    "recognition": { "selected": true, "intensity": "medium" }
  },
  "pastExperiences": [
    {
      "title": "왕따 경험",
      "event": "중학교 2학년 때...",
      "age": 14,
      "ageContext": "중학교 2학년",
      "learnings": ["...", "..."]
    }
  ],
  "traumaAndLearning": { /* ... */ },
  "manifestedDesires": [ /* ... */ ],
  "survivalStrategies": [ /* ... */ ],
  "personalityTraits": { /* ... */ },
  "conversationPatterns": { /* ... */ }
}
```

**Response**:
```json
{
  "success": true,
  "character": {
    "id": "uuid",
    "name": "김민수",
    "systemPrompt": "...",
    "keywords": ["게임매니아", "코딩덕후"]
  }
}
```

---

### 2.4 캐릭터 자동 생성

```http
POST /admin/characters/auto-generate
```

**Request**:
```json
{
  "onboardingData": {
    "domains": ["github.com", "stackoverflow.com"],
    "keywords": ["react", "typescript"],
    "interests": ["개발", "게임"],
    "avoidTopics": ["정치"]
  },
  "characterName": "김민수"
}
```

**Response**:
```json
{
  "success": true,
  "character": {
    "id": "uuid",
    "name": "김민수",
    "systemPrompt": "...",
    "imagePrompt": "...",
    "analysis": {
      "presenceVector": [ /* ... */ ],
      "deficiencyVector": [ /* ... */ ],
      "completeVector": [ /* ... */ ],
      "paradoxes": [ /* ... */ ],
      "complementaryStrategy": [ /* ... */ ]
    }
  }
}
```

---

### 2.5 캐릭터 수정

```http
PATCH /admin/characters/:id
```

**Request** (부분 업데이트):
```json
{
  "name": "김민수",
  "keywords": ["게임매니아", "코딩덕후", "운동매니아"],
  "fundamentalNeeds": {
    // 변경할 필드만
  }
}
```

**Response**:
```json
{
  "success": true,
  "character": {
    "id": "uuid",
    "name": "김민수",
    "updatedAt": "2025-10-28T11:00:00Z"
  }
}
```

---

### 2.6 캐릭터 삭제

```http
DELETE /admin/characters/:id
```

**Response**:
```json
{
  "success": true,
  "message": "캐릭터가 삭제되었습니다"
}
```

---

### 2.7 시스템 프롬프트 재생성

```http
POST /admin/characters/:id/regenerate-prompt
```

**Response**:
```json
{
  "success": true,
  "systemPrompt": "# 시스템 프롬프트: 김민수..."
}
```

---

## 3. 관리자 - 이미지 생성

### 3.1 이미지 생성

```http
POST /admin/characters/:id/generate-image
```

**Request**:
```json
{
  "regenerate": false  // true면 기존 이미지 무시
}
```

**Response**:
```json
{
  "success": true,
  "image": {
    "url": "https://cdn.knock.com/rooms/abc123.png",
    "validated": true,
    "prompt": "Create a pixel art room...",
    "metadata": {
      "visualLanguage": {
        "colors": {
          "primary": "warm orange tones",
          "secondary": "soft yellow",
          "accent": "gentle pink"
        }
      },
      "defensiveElements": [
        {
          "object": "oversized hoodie on chair",
          "placement": "easily accessible near desk",
          "symbolism": "protective layer"
        }
      ],
      "archetype": "developer_gamer",
      "objects": [
        "dual monitors with code editor UI",
        "RGB mechanical keyboard"
      ]
    }
  }
}
```

**Errors**:
```json
{
  "success": false,
  "error": "IMAGE_GENERATION_FAILED",
  "message": "이미지 생성 실패. Fallback 프리셋 사용.",
  "fallbackUrl": "https://cdn.knock.com/rooms/preset-1.png"
}
```

---

### 3.2 이미지 프롬프트 미리보기

```http
POST /admin/characters/:id/preview-image-prompt
```

**Response**:
```json
{
  "success": true,
  "prompt": "Create a pixel art room (256x512px)...",
  "metadata": {
    "visualLanguage": { /* ... */ },
    "defensiveElements": [ /* ... */ ],
    "archetype": "developer_gamer"
  }
}
```

---

## 4. 관리자 - 템플릿 관리

### 4.1 템플릿 목록 조회

```http
GET /admin/templates
```

**Query Parameters**:
- `type`: `prompt` | `image` | `experience`

**Response**:
```json
{
  "success": true,
  "templates": [
    {
      "id": "uuid",
      "type": "prompt",
      "name": "WHY 섹션 템플릿",
      "content": "## WHY - 나의 근원적 욕구...",
      "createdAt": "2025-10-28T10:00:00Z"
    }
  ]
}
```

---

### 4.2 템플릿 생성

```http
POST /admin/templates
```

**Request**:
```json
{
  "type": "prompt" | "image" | "experience",
  "name": "WHY 섹션 템플릿",
  "content": "## WHY - 나의 근원적 욕구..."
}
```

---

### 4.3 템플릿 수정

```http
PATCH /admin/templates/:id
```

---

### 4.4 템플릿 삭제

```http
DELETE /admin/templates/:id
```

---

## 5. 사용자 - 룸메이트

### 5.1 내 룸메이트 조회

```http
GET /roommate
```

**Headers**: `Authorization: Bearer <token>`

**Response**:
```json
{
  "success": true,
  "roommate": {
    "id": "uuid",
    "name": "김민수",
    "keywords": ["게임매니아", "코딩덕후"],
    "personalityTraits": ["호기심 많음", "유머러스"],
    "interests": ["게임", "영화", "코딩"],
    "conversationStyle": "친근하고 캐주얼",
    "createdAt": "2025-10-27T12:00:00Z",
    "lastInteractionAt": "2025-10-27T15:30:00Z",
    "interactionCount": 24
  },
  "room": {
    "id": "uuid",
    "imageUrl": "https://cdn.knock.com/rooms/abc123.png",
    "position": { "x": 0, "y": 0 }
  }
}
```

**Errors**:
```json
{
  "success": false,
  "error": "ROOMMATE_NOT_FOUND",
  "message": "룸메이트가 아직 생성되지 않았습니다. 온보딩을 완료하세요."
}
```

---

### 5.2 룸메이트 프로필 상세

```http
GET /roommate/profile
```

**Response**:
```json
{
  "success": true,
  "profile": {
    "id": "uuid",
    "name": "김민수",
    "keywords": ["게임매니아", "코딩덕후", "새벽형인간"],
    "personalityTraits": ["호기심 많음", "유머러스"],
    "interests": ["게임", "영화", "코딩"],
    "conversationStyle": "친근하고 캐주얼하며, 이모지를 적절히 사용합니다.",
    "focusTopics": ["게임", "영화"],
    "avoidTopics": ["정치"],
    "daysTogether": 7,
    "interactionCount": 24,
    "lastInteractionAt": "2025-10-27T15:30:00Z"
  }
}
```

---

### 5.3 룸메이트 선호도 업데이트

```http
PATCH /roommate/preferences
```

**Request**:
```json
{
  "focusTopics": ["게임", "영화", "운동"],
  "avoidTopics": ["정치", "종교"]
}
```

**Response**:
```json
{
  "success": true,
  "preferences": {
    "focusTopics": ["게임", "영화", "운동"],
    "avoidTopics": ["정치", "종교"]
  },
  "message": "선호도가 업데이트되었습니다"
}
```

---

### 5.4 룸메이트 키워드 업데이트 (유료)

```http
PATCH /roommate/keywords
```

**Request**:
```json
{
  "addKeywords": ["운동매니아"],
  "removeKeywords": ["게임매니아"]
}
```

**Response**:
```json
{
  "success": true,
  "keywords": ["코딩덕후", "새벽형인간", "운동매니아"],
  "message": "키워드가 업데이트되었습니다"
}
```

**Errors**:
```json
{
  "success": false,
  "error": "PREMIUM_REQUIRED",
  "message": "키워드 수정은 Knock Plus 전용 기능입니다",
  "upgradeUrl": "https://knock.com/pricing"
}
```

---

## 6. 사용자 - 방 관리

### 6.1 내 방 목록 조회

```http
GET /rooms/my-rooms
```

**Response**:
```json
{
  "success": true,
  "rooms": [
    {
      "id": "uuid",
      "position": { "x": 0, "y": 0 },
      "imageUrl": "https://cdn.knock.com/rooms/abc123.png",
      "isUnlocked": true,
      "persona": {
        "id": "uuid",
        "name": "김민수",
        "personaType": "roommate",
        "keywords": ["게임매니아", "코딩덕후"]
      }
    },
    {
      "id": "uuid",
      "position": { "x": 1, "y": 0 },
      "imageUrl": "https://cdn.knock.com/rooms/def456.png",
      "isUnlocked": false,
      "persona": {
        "id": "uuid",
        "name": "???",
        "personaType": "neighbor",
        "keywords": []
      }
    }
  ]
}
```

---

### 6.2 특정 방 조회

```http
GET /rooms/:roomId
```

**Response**:
```json
{
  "success": true,
  "room": {
    "id": "uuid",
    "position": { "x": 0, "y": 0 },
    "imageUrl": "https://cdn.knock.com/rooms/abc123.png",
    "isUnlocked": true,
    "persona": {
      "id": "uuid",
      "name": "김민수",
      "personaType": "roommate",
      "keywords": ["게임매니아"]
    },
    "lastKnockAt": null,
    "nextKnockAvailableAt": "2025-10-28T00:00:00Z"
  }
}
```

---

## 7. 대화 시스템

### 7.1 첫 인사말 조회

```http
GET /chat/first-message/:personaId
```

**Response**:
```json
{
  "success": true,
  "message": "어, 왔어? 오늘 하루 어땠어? 나 방금 새로운 게임 발견했는데 진짜 재밌더라!",
  "persona": {
    "id": "uuid",
    "name": "김민수"
  }
}
```

---

### 7.2 메시지 전송

```http
POST /chat/message
```

**Request**:
```json
{
  "personaId": "uuid",
  "message": "오늘 하루 진짜 힘들었어..."
}
```

**Response**:
```json
{
  "success": true,
  "reply": {
    "id": "uuid",
    "content": "아 그랬구나... 무슨 일 있었어? 이야기하고 싶으면 들어줄게.",
    "timestamp": "2025-10-28T16:30:00Z"
  }
}
```

---

### 7.3 대화 기록 조회

```http
GET /chat/history/:personaId
```

**Query Parameters**:
- `limit`: 최근 N개 (default: 50)
- `before`: 특정 시간 이전 메시지 (ISO-8601)

**Response**:
```json
{
  "success": true,
  "messages": [
    {
      "id": "uuid",
      "sender": "user",
      "content": "오늘 하루 진짜 힘들었어...",
      "timestamp": "2025-10-28T16:29:00Z"
    },
    {
      "id": "uuid",
      "sender": "persona",
      "content": "아 그랬구나... 무슨 일 있었어?",
      "timestamp": "2025-10-28T16:30:00Z"
    }
  ],
  "hasMore": false
}
```

---

## 🔒 보안

### Rate Limiting

```javascript
// 엔드포인트별 제한
const RATE_LIMITS = {
  '/chat/message': '60/hour',        // 시간당 60개 메시지
  '/admin/characters': '100/hour',   // 관리자는 더 관대
  '/onboarding/complete': '1/day'    // 하루 1회만
};
```

### 데이터 검증

```typescript
// Zod 스키마 예시

const OnboardingCompleteSchema = z.object({
  userId: z.string().uuid(),
  browsing: z.object({
    domains: z.array(z.string().url()).max(100),
    keywords: z.array(z.string()).max(100)
  }),
  manual: z.object({
    interests: z.array(z.string()).max(10),
    avoidTopics: z.array(z.string()).max(5)
  }),
  preferences: z.object({
    conversationStyle: z.enum(['casual', 'formal', 'mixed']),
    responseLength: z.enum(['short', 'medium', 'long'])
  })
});
```

---

## 📊 응답 코드

| 코드 | 의미 | 사용 예시 |
|------|------|----------|
| 200 | 성공 | 일반 조회/수정 |
| 201 | 생성 완료 | 캐릭터/방 생성 |
| 400 | 잘못된 요청 | 유효성 검증 실패 |
| 401 | 인증 실패 | 토큰 없음/만료 |
| 403 | 권한 없음 | 관리자 전용 엔드포인트 |
| 404 | 리소스 없음 | 캐릭터/방 조회 실패 |
| 409 | 충돌 | 중복 생성 시도 |
| 429 | 요청 제한 초과 | Rate limit |
| 500 | 서버 오류 | LLM 분석 실패 등 |

---

## 📝 다음 단계

1. ✅ 이 문서 완성
2. → [06_DATABASE_SCHEMA.md](./06_DATABASE_SCHEMA.md) 참조
3. Express.js 라우터 구현
4. Zod 스키마 정의
5. 에러 핸들러 구현
6. API 테스트 작성

---

**참조 문서**:
- [tech-spec.md](../01_Feature/02_Roommate/tech-spec.md)
- [01_ADMIN_PAGE_SPEC.md](./01_ADMIN_PAGE_SPEC.md)
- [02_CHARACTER_GENERATOR_FLOW.md](./02_CHARACTER_GENERATOR_FLOW.md)
- [04_INITIAL_ROOM_IMPLEMENTATION.md](./04_INITIAL_ROOM_IMPLEMENTATION.md)
