# 데이터베이스 스키마 (Agent-Based)
**작성일**: 2025-10-28 (최종 수정: 2025-11-04)
**목적**: 에이전트 기반 룸메이트 시스템 데이터베이스 설계
**상태**: 🔄 PostgreSQL → Firestore 전환 중

> ⚠️ **아키텍처 전환**: ~~PostgreSQL + Prisma ORM~~ → **Firebase Firestore (NoSQL)**
>
> **전환 가이드**: [FIREBASE_MIGRATION.md](./FIREBASE_MIGRATION.md) 참고

---

## 📋 개요

**Firebase Firestore** 기반 NoSQL 데이터베이스 스키마를 정의합니다.

**핵심 철학**:
- 관리자는 **템플릿, I/O 스키마, 데이터 풀**만 관리
- 실제 캐릭터 생성은 **5개 자동 에이전트**가 수행
- 모든 생성 과정은 **로그로 추적 가능**

**Firestore vs PostgreSQL 주요 차이**:
- ~~SQL 테이블~~ → **Firestore 컬렉션 (Collections)**
- ~~외래 키 (Foreign Keys)~~ → **문서 참조 (Document References)**
- ~~JOIN~~ → **비정규화 (Denormalization)** 또는 **클라이언트 측 조인**
- ~~트랜잭션 (ACID)~~ → **Firestore 트랜잭션 (제한적)**
- ~~인덱스~~ → **Composite Indexes (firestore.indexes.json)**

---

## 🗄️ Firestore 컬렉션 구조

```
Root Collections:

├─ users/                           (Firebase Auth 사용자)
│  └─ {userId}/                      ← Firebase Auth UID
│     ├─ email: string
│     ├─ displayName: string
│     ├─ isAdmin: boolean           ← Custom Claims로도 관리
│     ├─ isPremium: boolean
│     ├─ premiumExpiresAt: Timestamp
│     ├─ onboardingCompleted: boolean
│     └─ createdAt: Timestamp
│
├─ onboarding_data/                 (온보딩 데이터)
│  └─ {userId}/                      ← 사용자 UID를 문서 ID로 사용
│     ├─ domains: string[]
│     ├─ keywords: string[]
│     ├─ interests: string[]
│     ├─ conversationStyle: string
│     └─ updatedAt: Timestamp
│
├─ personas/                        (룸메이트/이웃 - Agent 생성)
│  └─ {personaId}/
│     ├─ userId: string              ← 참조 (users/{userId})
│     ├─ personaType: 'roommate' | 'neighbor'
│     ├─ name: string
│     ├─ archetype: string
│     ├─ systemPrompt: string
│     ├─ templateId: string          ← 참조 (prompt_templates/{id})
│     ├─ needVectors: map
│     ├─ characterProfile: map
│     ├─ generationJobId: string     ← 참조 (agent_jobs/{id})
│     ├─ interactionCount: number
│     └─ createdAt: Timestamp
│
├─ rooms/                           (방)
│  └─ {roomId}/
│     ├─ userId: string              ← 참조
│     ├─ personaId: string           ← 참조
│     ├─ imageUrl: string            (Firebase Storage URL)
│     ├─ imageJobId: string          ← 참조 (agent_jobs/{id})
│     ├─ imagePrompt: string
│     ├─ position: { x: number, y: number }
│     ├─ isUnlocked: boolean
│     ├─ knockCount: number
│     └─ createdAt: Timestamp
│
├─ chats/                           (대화)
│  └─ {chatId}/                      ← userId_personaId 조합
│     ├─ userId: string
│     ├─ personaId: string
│     ├─ lastMessageAt: Timestamp
│     └─ messages/ (Subcollection)   ← 메시지들
│        └─ {messageId}/
│           ├─ senderType: 'user' | 'persona'
│           ├─ content: string
│           └─ createdAt: Timestamp
│
├─ prompt_templates/                (관리자 관리 - 템플릿)
│  └─ {templateId}/
│     ├─ name: string
│     ├─ version: string
│     ├─ description: string
│     ├─ sections: map               ← WHY/HOW/WHAT
│     ├─ variables: array<map>
│     ├─ agentInstructions: string
│     ├─ isActive: boolean
│     ├─ isDefault: boolean
│     └─ createdAt: Timestamp
│
├─ data_pools/                      (관리자 관리 - 데이터 풀)
│  ├─ experiences/ (Subcollection)
│  │  └─ items/ (Subcollection)
│  │     └─ {itemId}/
│  │        ├─ needType: string
│  │        ├─ intensity: string
│  │        ├─ title: string
│  │        ├─ description: string
│  │        ├─ tags: string[]
│  │        ├─ archetypes: string[]
│  │        ├─ weight: number
│  │        └─ isActive: boolean
│  │
│  ├─ archetypes/ (Subcollection)
│  │  └─ items/ (Subcollection)
│  │     └─ {itemId}/
│  │        ├─ name: string (unique)
│  │        ├─ displayName: string
│  │        ├─ needProfile: map
│  │        ├─ behaviors: array
│  │        ├─ conversationStyle: map
│  │        ├─ keywords: string[]
│  │        └─ isActive: boolean
│  │
│  └─ visuals/ (Subcollection)
│     └─ items/ (Subcollection)
│        └─ {itemId}/
│           ├─ needType: string
│           ├─ intensity: string
│           ├─ elementType: string  ← 'color', 'object', 'mood'
│           ├─ value: string
│           ├─ description: string
│           ├─ weight: number
│           └─ isActive: boolean
│
└─ agent_jobs/                      (에이전트 실행 기록)
   └─ {jobId}/
      ├─ jobType: string
      ├─ status: string
      ├─ input: map
      ├─ output: map
      ├─ config: map
      ├─ qualityScore: number
      ├─ startedAt: Timestamp
      ├─ completedAt: Timestamp
      ├─ executionTimeMs: number
      ├─ errorMessage: string
      ├─ createdBy: string            ← userId
      └─ logs/ (Subcollection)        ← Agent 단계별 로그
         └─ {logId}/
            ├─ agentName: string
            ├─ step: number
            ├─ status: string
            ├─ input: map
            ├─ output: map
            ├─ startedAt: Timestamp
            ├─ completedAt: Timestamp
            ├─ durationMs: number
            └─ errorMessage: string

**Firestore 특징**:
- Root Collections: 9개 (users, onboarding_data, personas, rooms, chats, prompt_templates, data_pools, agent_jobs)
- Subcollections: 5개 (messages, experiences/items, archetypes/items, visuals/items, logs)
- 문서 참조는 문자열 ID로 저장 (Firestore는 JOIN 없음)
- 실시간 리스너 (`onSnapshot`) 지원
```

---

## 📊 Firestore 컬렉션 정의

> **Note**: 아래 정의는 TypeScript 인터페이스로 작성되었습니다.
> Firestore는 스키마가 없지만, Firebase SDK와 타입 안전성을 위해 인터페이스를 사용합니다.

### PostgreSQL → Firestore 전환 요약

| SQL 개념 | Firestore 개념 | 변경 사항 |
|---------|--------------|----------|
| `CREATE TABLE users` | `users/` 컬렉션 | Root 컬렉션으로 변환 |
| `UUID PRIMARY KEY` | 문서 ID (자동 생성 또는 커스텀) | Firestore 자동 ID 또는 Firebase Auth UID |
| `FOREIGN KEY REFERENCES` | 문서 ID 문자열 참조 | JOIN 불가, 클라이언트 측 조회 필요 |
| `JSONB` 타입 | `map` (객체) | 네이티브 지원 |
| `TEXT[]` 배열 | `array` | 네이티브 지원 |
| `TIMESTAMP` | `Timestamp` | Firestore Timestamp 객체 |
| `CREATE INDEX` | `firestore.indexes.json` | Composite Index 파일로 관리 |
| `UNIQUE` 제약 | Firestore Rules로 검증 | 애플리케이션 레벨 검증 필요 |
| `CHECK` 제약 | Firestore Rules로 검증 | 서버 검증 (Functions 또는 Rules) |
| `CASCADE DELETE` | Firestore 자동 삭제 (Subcollection은 수동) | Subcollection은 Cloud Functions로 처리 |

### 1. users/ (사용자)

> **Firebase Authentication 통합**: 사용자 인증은 Firebase Authentication이 처리하며,
> 이 컬렉션은 추가 프로필 정보만 저장합니다.

~~```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 인증
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,

  -- 프로필
  username VARCHAR(100),
  display_name VARCHAR(100),

  -- 권한
  is_admin BOOLEAN DEFAULT FALSE,
  is_premium BOOLEAN DEFAULT FALSE,
  premium_expires_at TIMESTAMP,

  -- 메타데이터
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login_at TIMESTAMP,

  -- 온보딩
  onboarding_completed BOOLEAN DEFAULT FALSE,
  onboarding_completed_at TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_premium ON users(is_premium, premium_expires_at);
```

**Prisma Schema**:
```prisma
model User {
  id                      String    @id @default(uuid())
  email                   String    @unique
  passwordHash            String    @map("password_hash")
  username                String?   @db.VarChar(100)
  displayName             String?   @map("display_name") @db.VarChar(100)

  isAdmin                 Boolean   @default(false) @map("is_admin")
  isPremium               Boolean   @default(false) @map("is_premium")
  premiumExpiresAt        DateTime? @map("premium_expires_at")

  createdAt               DateTime  @default(now()) @map("created_at")
  updatedAt               DateTime  @updatedAt @map("updated_at")
  lastLoginAt             DateTime? @map("last_login_at")

  onboardingCompleted     Boolean   @default(false) @map("onboarding_completed")
  onboardingCompletedAt   DateTime? @map("onboarding_completed_at")

  // Relations
  personas                Persona[]
  rooms                   Room[]
  chatMessages            ChatMessage[]
  onboardingData          OnboardingData?

  // Admin Relations
  promptTemplates         PromptTemplate[]
  dataPoolExperiences     DataPoolExperience[]
  dataPoolArchetypes      DataPoolArchetype[]
  dataPoolVisuals         DataPoolVisual[]
  agentJobs               AgentJob[]

  @@index([email])
  @@index([isPremium, premiumExpiresAt])
  @@map("users")
}
```

---

### 2. onboarding_data (온보딩 데이터)

```sql
CREATE TABLE onboarding_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- 자동 수집 데이터
  domains TEXT[] NOT NULL DEFAULT '{}',
  keywords TEXT[] NOT NULL DEFAULT '{}',
  categories TEXT[] NOT NULL DEFAULT '{}',

  -- 수동 입력 데이터
  interests TEXT[] NOT NULL DEFAULT '{}',
  avoid_topics TEXT[] NOT NULL DEFAULT '{}',

  -- 선호도
  conversation_style VARCHAR(20),  -- 'casual', 'formal', 'mixed'
  response_length VARCHAR(20),     -- 'short', 'medium', 'long'

  -- Raw 데이터 (JSONB)
  raw_data JSONB,

  -- 메타데이터
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_onboarding_user ON onboarding_data(user_id);
```

**Prisma Schema**:
```prisma
model OnboardingData {
  id                  String   @id @default(uuid())
  userId              String   @unique @map("user_id")
  user                User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  domains             String[]
  keywords            String[]
  categories          String[]

  interests           String[]
  avoidTopics         String[] @map("avoid_topics")

  conversationStyle   String?  @map("conversation_style") @db.VarChar(20)
  responseLength      String?  @map("response_length") @db.VarChar(20)

  rawData             Json?    @map("raw_data")

  createdAt           DateTime @default(now()) @map("created_at")
  updatedAt           DateTime @updatedAt @map("updated_at")

  @@index([userId])
  @@map("onboarding_data")
}
```

---

### 3. personas (룸메이트/이웃 캐릭터 - Agent Generated)

**핵심**: 이 테이블의 거의 모든 데이터는 **Agent Pipeline**에 의해 자동 생성됩니다.

```sql
CREATE TABLE personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- 캐릭터 타입
  persona_type VARCHAR(50) NOT NULL CHECK (persona_type IN ('roommate', 'neighbor')),

  -- 기본 정보 (Agent 2가 생성)
  name VARCHAR(100) NOT NULL,
  age INT,
  archetype VARCHAR(100),  -- 'developer_gamer', 'minimalist_achiever'

  -- 시스템 프롬프트 (Agent 3가 조립)
  system_prompt TEXT NOT NULL,
  template_id UUID REFERENCES prompt_templates(id),  -- 사용된 템플릿

  -- 욕구 벡터 (Agent 1이 분석)
  need_vectors JSONB NOT NULL,
  /*
  {
    "survival": 0.8,
    "belonging": 0.3,
    "recognition": 0.9,
    ...
  }
  */

  -- 캐릭터 프로파일 (Agent 2가 생성)
  character_profile JSONB NOT NULL,
  /*
  {
    "fundamentalNeeds": [...],
    "pastExperiences": [...],
    "trauma": {...},
    "behaviors": [...],
    "personality": {...}
  }
  */

  -- 생성 메타데이터
  generation_job_id UUID REFERENCES agent_jobs(id),  -- 어떤 작업으로 생성되었는지
  generation_method VARCHAR(50),  -- 'onboarding', 'knock', 'admin'

  -- 사용자 커스터마이징 (유료 기능)
  custom_keywords TEXT[],         -- 사용자 추가 키워드
  focus_topics TEXT[],            -- 사용자 지정 관심 주제
  avoid_topics TEXT[],            -- 사용자 지정 금기 주제

  -- 통계
  interaction_count INT DEFAULT 0,
  last_interaction_at TIMESTAMP,

  -- 메타데이터
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- 제약: 사용자당 룸메이트 1개만
  CONSTRAINT one_roommate_per_user UNIQUE (user_id, persona_type)
);

CREATE INDEX idx_personas_user_id ON personas(user_id);
CREATE INDEX idx_personas_type ON personas(persona_type);
CREATE INDEX idx_personas_generation_job ON personas(generation_job_id);
CREATE INDEX idx_personas_archetype ON personas(archetype);
```

**Prisma Schema**:
```prisma
enum PersonaType {
  roommate
  neighbor
}

model Persona {
  id                  String       @id @default(uuid())
  userId              String       @map("user_id")
  user                User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  personaType         PersonaType  @map("persona_type")
  name                String       @db.VarChar(100)
  age                 Int?
  archetype           String?      @db.VarChar(100)

  systemPrompt        String       @map("system_prompt")
  templateId          String?      @map("template_id")
  template            PromptTemplate? @relation(fields: [templateId], references: [id])

  needVectors         Json         @map("need_vectors")
  characterProfile    Json         @map("character_profile")

  generationJobId     String?      @map("generation_job_id")
  generationJob       AgentJob?    @relation(fields: [generationJobId], references: [id])
  generationMethod    String?      @map("generation_method") @db.VarChar(50)

  customKeywords      String[]     @map("custom_keywords")
  focusTopics         String[]     @map("focus_topics")
  avoidTopics         String[]     @map("avoid_topics")

  interactionCount    Int          @default(0) @map("interaction_count")
  lastInteractionAt   DateTime?    @map("last_interaction_at")

  createdAt           DateTime     @default(now()) @map("created_at")
  updatedAt           DateTime     @updatedAt @map("updated_at")

  // Relations
  rooms               Room[]
  chatMessages        ChatMessage[]

  @@unique([userId, personaType])
  @@index([userId])
  @@index([personaType])
  @@index([generationJobId])
  @@index([archetype])
  @@map("personas")
}
```

---

### 4. rooms (방)

```sql
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  persona_id UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,

  -- 비주얼 (Agent 5가 생성)
  image_url VARCHAR(500) NOT NULL,
  image_job_id UUID REFERENCES agent_jobs(id),  -- 이미지 생성 작업 ID
  image_prompt TEXT,  -- Agent 4가 생성한 프롬프트

  -- 위치 (그리드 좌표)
  position_x INT NOT NULL DEFAULT 0,
  position_y INT NOT NULL DEFAULT 0,

  -- 상태
  is_unlocked BOOLEAN DEFAULT TRUE,
  unlock_method VARCHAR(50),  -- 'onboarding', 'knock', 'purchase'

  -- 노크 시스템
  last_knock_at TIMESTAMP,
  next_knock_available_at TIMESTAMP,
  knock_count INT DEFAULT 0,

  -- 메타데이터
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- 제약: 사용자별로 같은 위치에 2개 방 불가
  CONSTRAINT unique_position_per_user UNIQUE (user_id, position_x, position_y)
);

CREATE INDEX idx_rooms_user_id ON rooms(user_id);
CREATE INDEX idx_rooms_persona_id ON rooms(persona_id);
CREATE INDEX idx_rooms_image_job ON rooms(image_job_id);
CREATE INDEX idx_rooms_position ON rooms(user_id, position_x, position_y);
```

**Prisma Schema**:
```prisma
model Room {
  id                    String    @id @default(uuid())
  userId                String    @map("user_id")
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  personaId             String    @map("persona_id")
  persona               Persona   @relation(fields: [personaId], references: [id], onDelete: Cascade)

  imageUrl              String    @map("image_url") @db.VarChar(500)
  imageJobId            String?   @map("image_job_id")
  imageJob              AgentJob? @relation(fields: [imageJobId], references: [id])
  imagePrompt           String?   @map("image_prompt")

  positionX             Int       @default(0) @map("position_x")
  positionY             Int       @default(0) @map("position_y")

  isUnlocked            Boolean   @default(true) @map("is_unlocked")
  unlockMethod          String?   @map("unlock_method") @db.VarChar(50)

  lastKnockAt           DateTime? @map("last_knock_at")
  nextKnockAvailableAt  DateTime? @map("next_knock_available_at")
  knockCount            Int       @default(0) @map("knock_count")

  createdAt             DateTime  @default(now()) @map("created_at")
  updatedAt             DateTime  @updatedAt @map("updated_at")

  @@unique([userId, positionX, positionY])
  @@index([userId])
  @@index([personaId])
  @@index([imageJobId])
  @@index([userId, positionX, positionY])
  @@map("rooms")
}
```

---

### 5. chat_messages (대화 메시지)

```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  persona_id UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,

  -- 메시지 내용
  sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('user', 'persona')),
  content TEXT NOT NULL,

  -- 메타데이터
  created_at TIMESTAMP DEFAULT NOW(),

  -- 임베딩 (향후 메모리 시스템)
  embedding VECTOR(1536)  -- OpenAI embedding dimension
);

CREATE INDEX idx_chat_user_persona ON chat_messages(user_id, persona_id, created_at DESC);
CREATE INDEX idx_chat_created_at ON chat_messages(created_at DESC);

-- Vector similarity search 인덱스 (pgvector extension)
CREATE INDEX idx_chat_embedding ON chat_messages USING ivfflat (embedding vector_cosine_ops);
```

**Prisma Schema**:
```prisma
enum SenderType {
  user
  persona
}

model ChatMessage {
  id          String     @id @default(uuid())
  userId      String     @map("user_id")
  user        User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  personaId   String     @map("persona_id")
  persona     Persona    @relation(fields: [personaId], references: [id], onDelete: Cascade)

  senderType  SenderType @map("sender_type")
  content     String

  // Vector embedding (unsupported 타입이지만 raw SQL로 처리)
  // embedding   Unsupported("vector(1536)")?

  createdAt   DateTime   @default(now()) @map("created_at")

  @@index([userId, personaId, createdAt(sort: Desc)])
  @@index([createdAt(sort: Desc)])
  @@map("chat_messages")
}
```

---

### 6. prompt_templates (시스템 프롬프트 템플릿 - Admin Managed)

**핵심**: 관리자가 이 템플릿을 관리하면, Agent 3이 자동으로 변수를 채워서 시스템 프롬프트를 조립합니다.

```sql
CREATE TABLE prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 메타데이터
  name VARCHAR(255) NOT NULL,
  version VARCHAR(20) NOT NULL DEFAULT '1.0',
  description TEXT,

  -- 템플릿 섹션 (Handlebars 형식)
  sections JSONB NOT NULL,
  /*
  {
    "why": "## WHY - 나의 근원적 욕구\n나는 **{{characterName}}**이다...",
    "past": "## PAST - 나를 만든 경험\n{{#each experiences}}...",
    "trauma": "## TRAUMA - 나를 방어하게 만든 사건\n...",
    "how": "## HOW - 나의 생존 전략\n...",
    "personality": "## PERSONALITY - 나의 성격\n...",
    "what": "## WHAT - 나의 대화 패턴\n...",
    "relationship": "## RELATIONSHIP - 나와 {{userName}}\n..."
  }
  */

  -- 변수 정의 (Agent가 채워야 할 변수)
  variables JSONB NOT NULL,
  /*
  [
    { "name": "characterName", "type": "string", "required": true },
    { "name": "userName", "type": "string", "required": true },
    { "name": "needs", "type": "array", "required": true },
    { "name": "experiences", "type": "array", "required": true }
  ]
  */

  -- Agent에게 전달할 지시사항
  agent_instructions TEXT,

  -- 활성 여부
  is_active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,

  -- 메타데이터
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_templates_active ON prompt_templates(is_active, is_default);
CREATE INDEX idx_templates_version ON prompt_templates(name, version);
```

**Prisma Schema**:
```prisma
model PromptTemplate {
  id                  String    @id @default(uuid())

  name                String    @db.VarChar(255)
  version             String    @default("1.0") @db.VarChar(20)
  description         String?

  sections            Json
  variables           Json
  agentInstructions   String?   @map("agent_instructions")

  isActive            Boolean   @default(true) @map("is_active")
  isDefault           Boolean   @default(false) @map("is_default")

  createdAt           DateTime  @default(now()) @map("created_at")
  updatedAt           DateTime  @updatedAt @map("updated_at")
  createdById         String?   @map("created_by")
  createdBy           User?     @relation(fields: [createdById], references: [id])

  // Relations
  personas            Persona[]

  @@index([isActive, isDefault])
  @@index([name, version])
  @@map("prompt_templates")
}
```

---

### 7. data_pool_experiences (과거 경험 데이터 풀 - Admin Managed)

**핵심**: Agent 2가 이 풀에서 사용자의 욕구에 맞는 경험을 선택합니다.

```sql
CREATE TABLE data_pool_experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 연관된 욕구
  need_type VARCHAR(50) NOT NULL,  -- 'survival', 'belonging', 'recognition', etc.
  intensity VARCHAR(20) NOT NULL,  -- 'low', 'medium', 'high'

  -- 경험 내용
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,

  -- 태그
  tags TEXT[],  -- ['childhood', 'school', 'trauma']

  -- 아키타입 연관성
  archetypes TEXT[],  -- ['developer_gamer', 'minimalist']

  -- 가중치 (선택 확률)
  weight INT DEFAULT 100,

  -- 메타데이터
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_exp_need_type ON data_pool_experiences(need_type, intensity);
CREATE INDEX idx_exp_archetypes ON data_pool_experiences USING GIN(archetypes);
CREATE INDEX idx_exp_active ON data_pool_experiences(is_active);
```

**Prisma Schema**:
```prisma
model DataPoolExperience {
  id          String   @id @default(uuid())

  needType    String   @map("need_type") @db.VarChar(50)
  intensity   String   @db.VarChar(20)

  title       String   @db.VarChar(255)
  description String

  tags        String[]
  archetypes  String[]

  weight      Int      @default(100)

  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  createdById String?  @map("created_by")
  createdBy   User?    @relation(fields: [createdById], references: [id])

  @@index([needType, intensity])
  @@index([isActive])
  @@map("data_pool_experiences")
}
```

---

### 8. data_pool_archetypes (아키타입 데이터 풀 - Admin Managed)

**핵심**: Agent 2가 욕구 벡터에 맞는 아키타입을 선택합니다.

```sql
CREATE TABLE data_pool_archetypes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 아키타입 정보
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,

  -- 욕구 프로파일 (이 아키타입의 전형적 욕구 분포)
  need_profile JSONB NOT NULL,
  /*
  {
    "survival": 0.7,
    "belonging": 0.3,
    "recognition": 0.9,
    ...
  }
  */

  -- 행동 패턴
  behaviors JSONB NOT NULL,
  /*
  [
    "코딩을 통해 인정받고 싶어함",
    "게임으로 스트레스 해소",
    "혼자 있는 시간 필요"
  ]
  */

  -- 대화 스타일
  conversation_style JSONB,
  /*
  {
    "tone": "casual",
    "humor": "sarcastic",
    "formality": "low"
  }
  */

  -- 키워드
  keywords TEXT[],

  -- 메타데이터
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_arch_name ON data_pool_archetypes(name);
CREATE INDEX idx_arch_active ON data_pool_archetypes(is_active);
```

**Prisma Schema**:
```prisma
model DataPoolArchetype {
  id                String   @id @default(uuid())

  name              String   @unique @db.VarChar(100)
  displayName       String   @map("display_name") @db.VarChar(100)
  description       String

  needProfile       Json     @map("need_profile")
  behaviors         Json
  conversationStyle Json?    @map("conversation_style")

  keywords          String[]

  isActive          Boolean  @default(true) @map("is_active")
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")
  createdById       String?  @map("created_by")
  createdBy         User?    @relation(fields: [createdById], references: [id])

  @@index([name])
  @@index([isActive])
  @@map("data_pool_archetypes")
}
```

---

### 9. data_pool_visuals (시각적 요소 데이터 풀 - Admin Managed)

**핵심**: Agent 4가 욕구 벡터를 시각적 언어로 변환할 때 사용합니다.

```sql
CREATE TABLE data_pool_visuals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 연관된 욕구
  need_type VARCHAR(50) NOT NULL,
  intensity VARCHAR(20) NOT NULL,

  -- 시각적 요소 타입
  element_type VARCHAR(50) NOT NULL,  -- 'color', 'object', 'mood', 'lighting', 'layout'

  -- 값
  value VARCHAR(255) NOT NULL,  -- '#FF5722', 'potted_plant', 'cozy', 'warm'

  -- 설명
  description TEXT,

  -- 가중치
  weight INT DEFAULT 100,

  -- 메타데이터
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_vis_need_element ON data_pool_visuals(need_type, element_type);
CREATE INDEX idx_vis_active ON data_pool_visuals(is_active);
```

**Prisma Schema**:
```prisma
model DataPoolVisual {
  id          String   @id @default(uuid())

  needType    String   @map("need_type") @db.VarChar(50)
  intensity   String   @db.VarChar(20)
  elementType String   @map("element_type") @db.VarChar(50)

  value       String   @db.VarChar(255)
  description String?

  weight      Int      @default(100)

  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  createdById String?  @map("created_by")
  createdBy   User?    @relation(fields: [createdById], references: [id])

  @@index([needType, elementType])
  @@index([isActive])
  @@map("data_pool_visuals")
}
```

---

### 10. agent_jobs (에이전트 실행 기록)

**핵심**: 모든 에이전트 실행을 추적하여 디버깅과 품질 관리를 가능하게 합니다.

```sql
CREATE TABLE agent_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 작업 타입
  job_type VARCHAR(50) NOT NULL,  -- 'character_generation', 'image_generation'

  -- 상태
  status VARCHAR(50) NOT NULL,  -- 'pending', 'running', 'completed', 'failed'

  -- 입력/출력
  input JSONB NOT NULL,
  output JSONB,

  -- 설정
  config JSONB,  -- { templateId, skipCache, dryRun }

  -- 품질 점수
  quality_score DECIMAL(3, 2),  -- 0.00 ~ 1.00

  -- 실행 정보
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  execution_time_ms INT,

  -- 에러
  error_message TEXT,
  error_stack TEXT,

  -- 메타데이터
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_jobs_status ON agent_jobs(status, created_at DESC);
CREATE INDEX idx_jobs_type ON agent_jobs(job_type);
CREATE INDEX idx_jobs_user ON agent_jobs(created_by, created_at DESC);
```

**Prisma Schema**:
```prisma
model AgentJob {
  id              String    @id @default(uuid())

  jobType         String    @map("job_type") @db.VarChar(50)
  status          String    @db.VarChar(50)

  input           Json
  output          Json?

  config          Json?

  qualityScore    Decimal?  @map("quality_score") @db.Decimal(3, 2)

  startedAt       DateTime? @map("started_at")
  completedAt     DateTime? @map("completed_at")
  executionTimeMs Int?      @map("execution_time_ms")

  errorMessage    String?   @map("error_message")
  errorStack      String?   @map("error_stack")

  createdAt       DateTime  @default(now()) @map("created_at")
  createdById     String?   @map("created_by")
  createdBy       User?     @relation(fields: [createdById], references: [id])

  // Relations
  personas        Persona[]
  rooms           Room[]
  logs            AgentJobLog[]

  @@index([status, createdAt(sort: Desc)])
  @@index([jobType])
  @@index([createdById, createdAt(sort: Desc)])
  @@map("agent_jobs")
}
```

---

### 11. agent_job_logs (에이전트 실행 로그 상세)

**핵심**: 각 에이전트의 단계별 실행 로그를 상세히 저장합니다.

```sql
CREATE TABLE agent_job_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES agent_jobs(id) ON DELETE CASCADE,

  -- Agent 정보
  agent_name VARCHAR(100) NOT NULL,  -- 'Agent 1: Need Vector Analysis'
  step INT NOT NULL,  -- 1, 2, 3, 4, 5

  -- 상태
  status VARCHAR(50) NOT NULL,  -- 'running', 'completed', 'failed'

  -- 입력/출력
  input JSONB,
  output JSONB,

  -- 실행 정보
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,
  duration_ms INT,

  -- 에러
  error_message TEXT,

  -- 메타데이터
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_logs_job ON agent_job_logs(job_id, step);
CREATE INDEX idx_logs_agent ON agent_job_logs(agent_name, created_at DESC);
```

**Prisma Schema**:
```prisma
model AgentJobLog {
  id           String    @id @default(uuid())
  jobId        String    @map("job_id")
  job          AgentJob  @relation(fields: [jobId], references: [id], onDelete: Cascade)

  agentName    String    @map("agent_name") @db.VarChar(100)
  step         Int

  status       String    @db.VarChar(50)

  input        Json?
  output       Json?

  startedAt    DateTime  @default(now()) @map("started_at")
  completedAt  DateTime? @map("completed_at")
  durationMs   Int?      @map("duration_ms")

  errorMessage String?   @map("error_message")

  createdAt    DateTime  @default(now()) @map("created_at")

  @@index([jobId, step])
  @@index([agentName, createdAt(sort: Desc)])
  @@map("agent_job_logs")
}
```

---

## 🔧 ~~Prisma 마이그레이션~~ → Firebase 설정

> ⚠️ **폐기됨**: Prisma는 더 이상 사용하지 않습니다. Firebase로 전환했습니다.

### ~~초기 설정~~ (폐기됨)

~~```bash
# Prisma 초기화
npx prisma init

# .env 파일 설정
DATABASE_URL="postgresql://user:password@localhost:5432/knock"
```~~

### Firebase 초기 설정 (신규)

```bash
# Firebase CLI 설치
npm install -g firebase-tools

# Firebase 로그인
firebase login

# Firebase 프로젝트 초기화
firebase init

# 선택 항목:
# - Firestore
# - Functions
# - Storage
# - Emulators

# .env 파일 설정
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
# ... (기타 Firebase 설정)
```

### ~~schema.prisma 전체~~ (폐기됨)

~~```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// (위에 정의된 모든 모델들 포함)
```~~

### Firebase Firestore 설정 (신규)

**firestore.rules**: [07_FIRESTORE_SECURITY_RULES.md](./07_FIRESTORE_SECURITY_RULES.md) 참고

**firestore.indexes.json**: Composite Index 정의 (자동 생성됨)

### ~~마이그레이션 실행~~ (폐기됨)

~~```bash
# 마이그레이션 생성
npx prisma migrate dev --name init

# 프로덕션 마이그레이션
npx prisma migrate deploy

# Prisma Client 생성
npx prisma generate
```~~

### Firebase 배포 (신규)

```bash
# Firestore Rules 배포
firebase deploy --only firestore:rules

# Firestore Indexes 배포
firebase deploy --only firestore:indexes

# Functions 배포
firebase deploy --only functions

# 전체 배포
firebase deploy
```

---

## 📊 ~~인덱스 전략~~ → Firestore Composite Indexes

> ⚠️ **변경됨**: PostgreSQL 인덱스 → Firestore Composite Indexes

### ~~성능 최적화 인덱스~~ (SQL - 폐기됨)

~~```sql
-- 1. 사용자별 빠른 조회
CREATE INDEX idx_personas_user_type ON personas(user_id, persona_type);
CREATE INDEX idx_rooms_user_unlock ON rooms(user_id, is_unlocked);

-- 2. 대화 기록 페이지네이션
CREATE INDEX idx_chat_pagination ON chat_messages(
  user_id, persona_id, created_at DESC
) INCLUDE (sender_type, content);

-- 3. 관리자 캐릭터 검색
CREATE INDEX idx_admin_char_search ON admin_characters
  USING GIN(to_tsvector('english', name || ' ' || array_to_string(keywords, ' ')));
```~~

### Firestore Composite Indexes (신규)

**firestore.indexes.json**:

```json
{
  "indexes": [
    {
      "collectionGroup": "personas",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "personaType", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "rooms",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "isUnlocked", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "messages",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "agent_jobs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "prompt_templates",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "isActive", "order": "ASCENDING" },
        { "fieldPath": "isDefault", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "items",
      "queryScope": "COLLECTION_GROUP",
      "fields": [
        { "fieldPath": "needType", "order": "ASCENDING" },
        { "fieldPath": "intensity", "order": "ASCENDING" },
        { "fieldPath": "isActive", "order": "ASCENDING" }
      ]
    }
  ]
}
```

**참고**:
- Firestore는 단일 필드 인덱스를 자동 생성
- Composite Index는 2개 이상 필드를 조합한 쿼리에만 필요
- Firebase Console에서 자동으로 제안됨 (개발 중 누락 시)

---

## 🔒 ~~데이터 무결성~~ → Firestore Security Rules

> ⚠️ **변경됨**: PostgreSQL 제약 조건 → Firestore Security Rules + Cloud Functions

### ~~제약 조건~~ (SQL - 폐기됨)

~~```sql
-- 1. 룸메이트 중복 방지
ALTER TABLE personas
  ADD CONSTRAINT one_roommate_per_user
  UNIQUE (user_id, persona_type);

-- 2. 위치 중복 방지
ALTER TABLE rooms
  ADD CONSTRAINT unique_position_per_user
  UNIQUE (user_id, position_x, position_y);

-- 3. 키워드 개수 제한 (체크 제약)
ALTER TABLE personas
  ADD CONSTRAINT check_keywords_count
  CHECK (array_length(keywords, 1) <= 10);
```~~

### Firestore Security Rules (신규)

**firestore.rules** 예시:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // 1. 룸메이트 중복 방지 (애플리케이션 레벨에서 검증)
    match /personas/{personaId} {
      allow read: if request.auth != null
        && resource.data.userId == request.auth.uid;

      allow create: if request.auth != null
        && request.resource.data.userId == request.auth.uid
        && request.resource.data.personaType in ['roommate', 'neighbor'];
      // 중복 방지는 Cloud Functions에서 트랜잭션으로 처리
    }

    // 2. 위치 중복 방지 (Functions에서 검증)
    match /rooms/{roomId} {
      allow read: if request.auth != null
        && resource.data.userId == request.auth.uid;

      allow create: if request.auth != null
        && request.resource.data.userId == request.auth.uid;
      // 위치 중복은 Cloud Functions에서 검증
    }

    // 3. 배열 크기 제한
    match /personas/{personaId} {
      allow update: if request.auth != null
        && request.resource.data.customKeywords.size() <= 10;
    }
  }
}
```

**참고**: UNIQUE 제약은 Firestore에 없으므로 Cloud Functions에서 트랜잭션으로 검증 필요

### ~~트리거 (자동 업데이트)~~ → Cloud Functions Triggers (신규)

~~```sql
-- 1. updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_personas_updated_at
  BEFORE UPDATE ON personas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```~~

**Firestore에서 updatedAt은 클라이언트에서 명시적으로 설정**:

```typescript
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

await updateDoc(doc(db, 'personas', personaId), {
  name: 'New Name',
  updatedAt: serverTimestamp()  // 서버 타임스탬프
});
```

~~```sql
-- 2. interaction_count 자동 증가
CREATE OR REPLACE FUNCTION increment_persona_interaction()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE personas
  SET
    interaction_count = interaction_count + 1,
    last_interaction_at = NOW()
  WHERE id = NEW.persona_id;

  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER increment_interaction_on_message
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION increment_persona_interaction();
```~~

**Cloud Functions Trigger** (신규):

```typescript
// functions/src/index.ts
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// messages 생성 시 persona의 interactionCount 증가
export const incrementInteractionCount = onDocumentCreated(
  'chats/{chatId}/messages/{messageId}',
  async (event) => {
    const message = event.data?.data();
    if (!message) return;

    const personaId = message.personaId;
    const db = getFirestore();

    await db.doc(`personas/${personaId}`).update({
      interactionCount: FieldValue.increment(1),
      lastInteractionAt: FieldValue.serverTimestamp()
    });
  }
);
```

---

## 📈 ~~쿼리 최적화 예시~~ → Firestore 쿼리 패턴

> ⚠️ **변경됨**: Prisma JOIN → Firestore 클라이언트 측 조인 또는 비정규화

### ~~N+1 문제 방지~~ (Prisma - 폐기됨)

~~```typescript
// ❌ 나쁜 예: N+1 쿼리
const rooms = await prisma.room.findMany({ where: { userId } });

for (const room of rooms) {
  const persona = await prisma.persona.findUnique({
    where: { id: room.personaId }
  });
  // N번 쿼리 발생
}

// ✅ 좋은 예: JOIN으로 한 번에
const rooms = await prisma.room.findMany({
  where: { userId },
  include: {
    persona: {
      select: {
        id: true,
        name: true,
        keywords: true
      }
    }
  }
});
```~~

### Firestore 쿼리 패턴 (신규)

```typescript
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

// ❌ 나쁜 예: N+1 쿼리 (Firestore도 동일한 문제)
const roomsSnap = await getDocs(
  query(collection(db, 'rooms'), where('userId', '==', userId))
);

const rooms = [];
for (const roomDoc of roomsSnap.docs) {
  const roomData = roomDoc.data();
  const personaDoc = await getDoc(doc(db, 'personas', roomData.personaId));
  rooms.push({ ...roomData, persona: personaDoc.data() });
  // N번 쿼리 발생
}

// ✅ 좋은 예 1: 비정규화 (Firestore 권장)
// rooms 문서에 persona 정보를 일부 포함
const roomsSnap = await getDocs(
  query(collection(db, 'rooms'), where('userId', '==', userId))
);

const rooms = roomsSnap.docs.map(doc => ({
  ...doc.data(),
  // persona 정보가 이미 포함되어 있음 (denormalized)
  personaName: doc.data().personaName,
  personaArchetype: doc.data().personaArchetype
}));

// ✅ 좋은 예 2: 병렬 조회
const roomsSnap = await getDocs(
  query(collection(db, 'rooms'), where('userId', '==', userId))
);

const personaIds = [...new Set(roomsSnap.docs.map(d => d.data().personaId))];
const personasPromises = personaIds.map(id => getDoc(doc(db, 'personas', id)));
const personaDocs = await Promise.all(personasPromises);

const personasMap = Object.fromEntries(
  personaDocs.map(d => [d.id, d.data()])
);

const rooms = roomsSnap.docs.map(roomDoc => ({
  ...roomDoc.data(),
  persona: personasMap[roomDoc.data().personaId]
}));
```

### ~~복잡한 분석 쿼리~~ → Firestore 집계 (신규)

~~```typescript
// 사용자별 상호작용 통계
const stats = await prisma.$queryRaw`
  SELECT
    p.id,
    p.name,
    COUNT(cm.id) AS message_count,
    MAX(cm.created_at) AS last_message_at
  FROM personas p
  LEFT JOIN chat_messages cm ON p.id = cm.persona_id
  WHERE p.user_id = ${userId}
  GROUP BY p.id, p.name
  ORDER BY message_count DESC
`;
```~~

```typescript
import { collection, query, where, getDocs, getCountFromServer } from 'firebase/firestore';

// Firestore 집계 (Count Aggregation)
const personasSnap = await getDocs(
  query(collection(db, 'personas'), where('userId', '==', userId))
);

const stats = await Promise.all(
  personasSnap.docs.map(async (personaDoc) => {
    const personaData = personaDoc.data();

    // 메시지 수 집계
    const messagesQuery = query(
      collection(db, `chats/${userId}_${personaDoc.id}/messages`)
    );
    const messageCountSnap = await getCountFromServer(messagesQuery);

    return {
      id: personaDoc.id,
      name: personaData.name,
      messageCount: messageCountSnap.data().count,
      lastInteractionAt: personaData.lastInteractionAt
    };
  })
);

// 정렬
stats.sort((a, b) => b.messageCount - a.messageCount);
```

**참고**: 복잡한 집계는 Cloud Functions로 처리하고 결과를 캐싱하는 것이 효율적

---

## 🗂️ ~~백업 전략~~ → Firebase 백업

> ⚠️ **변경됨**: PostgreSQL 백업 → Firestore 자동 백업

### ~~자동 백업~~ (PostgreSQL - 폐기됨)

~~```bash
# PostgreSQL 백업 스크립트
#!/bin/bash

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/knock"
DATABASE="knock"

# 전체 백업
pg_dump $DATABASE | gzip > $BACKUP_DIR/knock_$DATE.sql.gz

# 7일 이상 된 백업 삭제
find $BACKUP_DIR -name "knock_*.sql.gz" -mtime +7 -delete
```~~

### Firebase 자동 백업 (신규)

**Firestore 백업 (gcloud CLI)**:

```bash
# Cloud Firestore 자동 백업 설정 (Firebase Blaze 플랜 필요)
gcloud firestore export gs://your-bucket-name/firestore-backups/$(date +%Y%m%d)

# Cloud Scheduler로 자동화 (매일 새벽 2시)
gcloud scheduler jobs create app-engine nightly-firestore-backup \
  --schedule="0 2 * * *" \
  --http-method=POST \
  --uri="https://<region>-<project>.cloudfunctions.net/firestoreBackup"
```

**Cloud Functions로 백업 자동화**:

```typescript
// functions/src/backup.ts
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore } from 'firebase-admin/firestore';

export const scheduledFirestoreBackup = onSchedule('every day 02:00', async () => {
  const projectId = process.env.GCLOUD_PROJECT;
  const bucket = `gs://${projectId}-firestore-backups`;

  const client = getFirestore();
  const timestamp = new Date().toISOString().split('T')[0];

  await client.backup(`${bucket}/${timestamp}`);
  console.log(`Firestore backup completed: ${timestamp}`);
});
```

### ~~복구~~ (PostgreSQL - 폐기됨)

~~```bash
# 복구
gunzip -c knock_20251028.sql.gz | psql knock
```~~

### Firebase 복구 (신규)

```bash
# Firestore 복구
gcloud firestore import gs://your-bucket-name/firestore-backups/2025-11-04

# 특정 컬렉션만 복구
gcloud firestore import gs://your-bucket-name/firestore-backups/2025-11-04 \
  --collection-ids=personas,rooms
```

**참고**: Firebase는 자동으로 지역 복제 및 Point-in-Time Recovery 제공 (Blaze 플랜)

---

## 📝 요약

### Agent-Based Architecture + Firebase

**~~11개 SQL 테이블~~ → 9개 Firestore Root Collections + 5개 Subcollections**:

#### Root Collections:
1. `users/` - Firebase Auth 사용자 (추가 프로필 정보)
2. `onboarding_data/` - 온보딩 데이터
3. `personas/` - Agent가 생성한 룸메이트/이웃
4. `rooms/` - Agent가 생성한 방 이미지
5. `chats/` - 대화 메타데이터
6. `prompt_templates/` - 관리자가 관리하는 템플릿
7. `data_pools/` - Agent가 사용할 데이터 풀 (Root)
8. `agent_jobs/` - Agent 실행 기록

#### Subcollections:
- `chats/{chatId}/messages/` - 대화 메시지들
- `data_pools/experiences/items/` - 경험 데이터 풀
- `data_pools/archetypes/items/` - 아키타입 데이터 풀
- `data_pools/visuals/items/` - 시각적 요소 데이터 풀
- `agent_jobs/{jobId}/logs/` - Agent 실행 로그 상세

### 관리자의 역할 (변경 없음)

✅ **관리하는 것**:
- 시스템 프롬프트 템플릿 (`prompt_templates/`)
- 데이터 풀 (experiences, archetypes, visuals)
- Agent 설정 및 모니터링

❌ **관리하지 않는 것**:
- 개별 캐릭터 생성 (Agent가 자동 생성)
- 이미지 생성 (Agent가 자동 생성)
- 욕구 분석 (Agent가 자동 분석)

### Agent 추적 가능성 (변경 없음)

모든 Agent 실행은 `agent_jobs/`와 `agent_jobs/{id}/logs/` 서브컬렉션에 기록되어:
- 디버깅 가능
- 품질 모니터링 가능
- 실패 원인 추적 가능
- 성능 분석 가능

### PostgreSQL vs Firestore 주요 차이점

| 항목 | PostgreSQL | Firestore |
|------|-----------|-----------|
| **구조** | 11개 테이블 (관계형) | 9개 Root Collections + 5개 Subcollections |
| **관계** | Foreign Key (강제) | 문서 참조 (문자열 ID, 약한 참조) |
| **쿼리** | SQL JOIN | 클라이언트 측 조인 또는 비정규화 |
| **트랜잭션** | ACID 보장 | 제한적 트랜잭션 (단일 문서 또는 배치) |
| **인덱스** | CREATE INDEX | firestore.indexes.json |
| **스키마** | 엄격한 스키마 | 스키마 없음 (유연) |
| **실시간** | 폴링 필요 | 네이티브 리스너 (`onSnapshot`) |
| **비용** | 서버 유지비 | 읽기/쓰기/저장 단위 과금 |
| **확장성** | 수직 확장 | 자동 수평 확장 |

---

## 📝 다음 단계 (Firebase 기준)

### ~~Phase 1: 데이터베이스 구축~~ (폐기됨)
~~1. ✅ Agent 기반 스키마 설계 완료~~
~~2. [ ] Prisma schema.prisma 파일 작성~~
~~3. [ ] 초기 마이그레이션 실행~~
~~4. [ ] pgvector extension 설치 (향후 메모리 시스템)~~

### Phase 1: Firebase 설정 (신규)
1. ✅ Firestore 컬렉션 구조 설계 완료
2. 🔄 firestore.rules 파일 작성 (진행 중)
3. 🔄 firestore.indexes.json 파일 작성 (진행 중)
4. [ ] Firebase Functions 프로젝트 구조 생성
5. [ ] Firebase Emulators 설정

### Phase 2: 시드 데이터 생성 (변경 없음)
1. [ ] 기본 프롬프트 템플릿 1개
2. [ ] 경험 데이터 풀 50개 (욕구별 10개)
3. [ ] 아키타입 데이터 풀 10개
4. [ ] 시각적 요소 데이터 풀 100개 (욕구별 20개)

### Phase 3: 모니터링 & 배포
1. [ ] Agent 실행 대시보드 구현 (Firebase Realtime)
2. [ ] 품질 점수 임계값 설정
3. [ ] Cloud Functions로 실패 알림 시스템
4. [ ] Firebase 자동 백업 설정 (Blaze 플랜)

---

**참조 문서**:
- [01_ADMIN_PAGE_SPEC.md](./01_ADMIN_PAGE_SPEC.md) - 관리자 페이지 (Firebase 기반)
- [02_CHARACTER_GENERATOR_FLOW.md](./02_CHARACTER_GENERATOR_FLOW.md) - 5개 Agent 파이프라인
- [05_API_SPECIFICATIONS.md](./05_API_SPECIFICATIONS.md) - Firebase Functions API
- [FIREBASE_MIGRATION.md](./FIREBASE_MIGRATION.md) - PostgreSQL → Firebase 전환 가이드
- ~~[Prisma 공식 문서](https://www.prisma.io/docs)~~ (폐기됨)
- [Firebase 공식 문서](https://firebase.google.com/docs)
