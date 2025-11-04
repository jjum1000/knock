-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "username" TEXT,
    "display_name" TEXT,
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "is_premium" BOOLEAN NOT NULL DEFAULT false,
    "premium_expires_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "last_login_at" DATETIME,
    "onboarding_completed" BOOLEAN NOT NULL DEFAULT false,
    "onboarding_completed_at" DATETIME
);

-- CreateTable
CREATE TABLE "onboarding_data" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "domains" TEXT NOT NULL DEFAULT '',
    "keywords" TEXT NOT NULL DEFAULT '',
    "categories" TEXT NOT NULL DEFAULT '',
    "interests" TEXT NOT NULL DEFAULT '',
    "avoid_topics" TEXT NOT NULL DEFAULT '',
    "conversation_style" TEXT,
    "response_length" TEXT,
    "raw_data" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "onboarding_data_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "personas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "persona_type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "age" INTEGER,
    "archetype" TEXT,
    "system_prompt" TEXT NOT NULL,
    "template_id" TEXT,
    "need_vectors" TEXT NOT NULL,
    "character_profile" TEXT NOT NULL,
    "generation_job_id" TEXT,
    "generation_method" TEXT,
    "custom_keywords" TEXT NOT NULL DEFAULT '',
    "focus_topics" TEXT NOT NULL DEFAULT '',
    "avoid_topics" TEXT NOT NULL DEFAULT '',
    "interaction_count" INTEGER NOT NULL DEFAULT 0,
    "last_interaction_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "personas_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "personas_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "prompt_templates" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "personas_generation_job_id_fkey" FOREIGN KEY ("generation_job_id") REFERENCES "agent_jobs" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "persona_id" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "image_job_id" TEXT,
    "image_prompt" TEXT,
    "position_x" INTEGER NOT NULL DEFAULT 0,
    "position_y" INTEGER NOT NULL DEFAULT 0,
    "is_unlocked" BOOLEAN NOT NULL DEFAULT true,
    "unlock_method" TEXT,
    "last_knock_at" DATETIME,
    "next_knock_available_at" DATETIME,
    "knock_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "rooms_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "rooms_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "personas" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "rooms_image_job_id_fkey" FOREIGN KEY ("image_job_id") REFERENCES "agent_jobs" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "persona_id" TEXT NOT NULL,
    "sender_type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chat_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "chat_messages_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "personas" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "prompt_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "description" TEXT,
    "sections" TEXT NOT NULL,
    "variables" TEXT NOT NULL,
    "agent_instructions" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "created_by" TEXT,
    CONSTRAINT "prompt_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "data_pool_experiences" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "need_type" TEXT NOT NULL,
    "intensity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "age_range" TEXT NOT NULL,
    "learnings" TEXT NOT NULL DEFAULT '',
    "tags" TEXT NOT NULL DEFAULT '',
    "archetypes" TEXT NOT NULL DEFAULT '',
    "triggers" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 100,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "created_by" TEXT,
    CONSTRAINT "data_pool_experiences_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "data_pool_archetypes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "need_profile" TEXT NOT NULL,
    "behaviors" TEXT NOT NULL,
    "conversation_style" TEXT,
    "visual_elements" TEXT,
    "keywords" TEXT NOT NULL DEFAULT '',
    "matching_needs" TEXT NOT NULL DEFAULT '',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "created_by" TEXT,
    CONSTRAINT "data_pool_archetypes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "data_pool_visuals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "need_type" TEXT NOT NULL,
    "intensity" TEXT NOT NULL,
    "element_type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "prompt_fragment" TEXT,
    "weight" INTEGER NOT NULL DEFAULT 100,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "created_by" TEXT,
    CONSTRAINT "data_pool_visuals_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "agent_jobs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "job_type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "input" TEXT NOT NULL,
    "output" TEXT,
    "config" TEXT,
    "quality_score" REAL,
    "started_at" DATETIME,
    "completed_at" DATETIME,
    "execution_time_ms" INTEGER,
    "error_message" TEXT,
    "error_stack" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    CONSTRAINT "agent_jobs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "agent_job_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "job_id" TEXT NOT NULL,
    "agent_name" TEXT NOT NULL,
    "step" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "input" TEXT,
    "output" TEXT,
    "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" DATETIME,
    "duration_ms" INTEGER,
    "error_message" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "agent_job_logs_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "agent_jobs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_data_user_id_key" ON "onboarding_data"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "personas_user_id_persona_type_key" ON "personas"("user_id", "persona_type");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_user_id_position_x_position_y_key" ON "rooms"("user_id", "position_x", "position_y");

-- CreateIndex
CREATE UNIQUE INDEX "data_pool_archetypes_name_key" ON "data_pool_archetypes"("name");
