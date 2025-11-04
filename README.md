# Knock - Meet Your AI Neighbors

> 🔄 **Migration Status**: Transitioning from Express.js + PostgreSQL to Firebase (Firestore + Cloud Functions)

A Next.js application where you can meet AI neighbors, build connections, one knock at a time.

## Project Structure

```
Knock/
├── src/                    # Frontend (Next.js 14)
│   ├── app/               # Next.js App Router
│   │   ├── admin/         # Admin Dashboard (Phase 1-5 Complete)
│   │   ├── layout.tsx     # Root layout
│   │   ├── page.tsx       # Main page
│   │   └── globals.css    # Global styles
│   ├── components/        # React components
│   │   └── ui/           # shadcn/ui components
│   ├── stores/           # Zustand state management
│   │   ├── useAppStore.ts
│   │   ├── useAuthStore.ts
│   │   ├── useChatStore.ts
│   │   └── useAdminStore.ts
│   ├── lib/              # Utilities
│   │   └── firebase.ts   # Firebase SDK config
│   └── types/            # TypeScript types
│
├── ~~backend/~~          # ⚠️ DEPRECATED (Express.js - being removed)
│   └── ...               # Archived - migrating to Firebase Functions
│
├── functions/            # 🆕 Firebase Cloud Functions (in progress)
│   ├── src/
│   │   ├── index.ts      # Function exports
│   │   ├── admin/        # Admin Functions
│   │   ├── agent/        # Agent pipeline Functions
│   │   └── triggers/     # Firestore triggers
│   └── package.json
│
├── firestore.rules       # 🆕 Firestore Security Rules (to be created)
├── firestore.indexes.json # 🆕 Firestore Composite Indexes (to be created)
├── firebase.json         # Firebase config
│
└── Docs/                 # Documentation
    ├── 00_Architecture/  # System architecture
    ├── 01_Feature/       # Feature specifications
    ├── 02_Agent/         # Agent system design
    └── 03_ToDO/          # Implementation tasks & specs

```

## Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript 5.3 (Strict mode)
- **UI Library**: shadcn/ui + Radix UI
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **Charts**: Recharts (Admin Dashboard)
- **Code Editor**: Monaco Editor (Template Management)
- **Font**: Inter (UI), JetBrains Mono (Code)

### ~~Backend~~ (DEPRECATED)
- ~~**Runtime**: Node.js 20+~~
- ~~**Framework**: Express.js~~
- ~~**Language**: TypeScript~~
- ~~**Authentication**: JWT~~
- ~~**Database**: PostgreSQL + Prisma ORM~~

### Backend (New - Firebase)
- **Platform**: Firebase (Google Cloud Platform)
- **Database**: Firestore (NoSQL, Real-time)
- **Functions**: Cloud Functions for Firebase (v2)
- **Authentication**: Firebase Authentication (Custom Claims for admin)
- **Storage**: Firebase Storage (image uploads)
- **Hosting**: Firebase Hosting
- **Orchestration**: Cloud Tasks + Pub/Sub (Agent pipeline)
- **AI**: Google Gemini 1.5 Pro (via Vertex AI)

### Cost Estimate (Firebase Blaze Plan)

| Service | Usage (MVP) | Estimated Cost/month |
|---------|------------|---------------------|
| **Firestore** | 100k reads, 50k writes, 1GB storage | ~$1.50 |
| **Cloud Functions** | 1M invocations, 400k GB-s | ~$3.00 |
| **Firebase Storage** | 5GB storage, 10GB egress | ~$2.00 |
| **Gemini API** | 10k requests (~1M tokens) | ~$7.00 |
| **Firebase Hosting** | 10GB transfer | Free |
| **Firebase Auth** | 10k MAU | Free |
| **Total** | - | **~$13.50/month** |

**Note**: 100x cheaper than PostgreSQL server hosting ($150/month for dedicated instance)

## Getting Started

### Prerequisites
- Node.js 20 LTS or higher
- npm or yarn
- Firebase CLI (`npm install -g firebase-tools`)
- Firebase project (create at https://console.firebase.google.com)

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd Knock
```

2. Install dependencies
```bash
npm install
```

3. ~~Install backend dependencies~~ (DEPRECATED)
~~```bash
cd backend
npm install
cd ..
```~~

4. Configure environment variables

Frontend (`.env.local`):
```env
# ~~NEXT_PUBLIC_API_URL=http://localhost:3003~~ (DEPRECATED)
# ~~NEXT_PUBLIC_GEMINI_API_KEY=your-api-key-here~~ (DEPRECATED)

# Firebase Configuration
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_MEASUREMENT_ID=your-measurement-id
```

~~Backend (`backend/.env`):~~ (DEPRECATED)
~~```env
PORT=3003
NODE_ENV=development
JWT_SECRET=your-jwt-secret
GEMINI_API_KEY=your-api-key-here
FRONTEND_URL=http://localhost:3002
```~~

Firebase Functions (`functions/.env`): (To be created)
```env
GEMINI_API_KEY=your-gemini-api-key
```

### Running the Application

#### Development (with Firebase Emulators)

1. Start Firebase Emulators (Terminal 1):
```bash
firebase emulators:start
```
Emulators will run on:
- Firestore: http://localhost:8080
- Functions: http://localhost:5001
- UI: http://localhost:4000

2. Start the frontend (Terminal 2):
```bash
npm run dev
```
Frontend will run on **http://localhost:3002**

3. Open **http://localhost:3002** in your browser

#### ~~Legacy (Express Backend)~~ (DEPRECATED)

~~1. Start the backend server (Terminal 1):~~
~~```bash
cd backend
npm run dev
```~~
~~Backend will run on **http://localhost:3003**~~

~~2. Start the frontend server (Terminal 2):~~
~~```bash
npm run dev
```~~
~~Frontend will run on **http://localhost:3002**~~

~~3. Open **http://localhost:3002** in your browser~~

## ~~API Endpoints~~ → Firebase Functions

> See [Docs/03_ToDO/05_API_SPECIFICATIONS.md](./Docs/03_ToDO/05_API_SPECIFICATIONS.md) for full API specification

### ~~REST API~~ (Express - DEPRECATED)
~~### Authentication~~
~~- `POST /api/v1/auth/register` - Register new user~~
~~- `POST /api/v1/auth/login` - Login user~~

~~### Roommates~~
~~- `GET /api/v1/roommate` - Get all roommates~~
~~- `GET /api/v1/roommate/:id` - Get roommate by ID~~
~~- `POST /api/v1/roommate/generate` - Generate random roommate~~

~~### Knock System~~
~~- `POST /api/v1/knock/execute` - Execute daily knock~~
~~- `GET /api/v1/knock/status` - Get knock status~~

~~### Chat~~
~~- `POST /api/v1/chat/message` - Send message to roommate~~
~~- `GET /api/v1/chat/history/:roommateId` - Get conversation history~~

### Firebase Functions (New)

**Authentication**: Firebase Authentication (automatic)
- Sign up with email/password
- Sign in with Google (optional)
- Custom Claims for admin users

**User APIs** (Callable Functions):
- `saveOnboarding(data)` - Save onboarding data
- `completeOnboarding(data)` - Complete onboarding & trigger Agent pipeline
- `generateRoommate()` - Generate new roommate (knock system)
- `sendChatMessage(personaId, message)` - Send message to roommate

**Admin APIs** (Callable Functions - Admin only):
- Template Management: `getTemplates()`, `createTemplate()`, `updateTemplate()`, `deleteTemplate()`, `testTemplate()`
- Data Pool Management: 18 functions for CRUD operations on experiences, archetypes, visuals
- Agent Execution: `executeAgentManual()`, `retryAgentJob()`, `cancelAgentJob()`
- Monitoring: Dashboard stats (real-time Firestore queries)

**Firestore Direct Queries** (Client SDK):
- `personas/` - Get user's roommates
- `rooms/` - Get user's rooms
- `chats/{chatId}/messages/` - Get conversation history (real-time listener)
- `agent_jobs/` - Get agent execution history

## Features

### User Features (MVP - Phase 1)
- ✅ Onboarding system (4-step flow)
- ✅ User registration and authentication (Firebase Auth)
- ✅ Room/building visualization
- ✅ Daily knock system (1 knock per day)
- ✅ AI-powered chat with roommates (Gemini)
- ✅ Persistent state management (Zustand)
- ✅ Modern UI design (shadcn/ui)

### Admin Features (Phase 1-5 Complete - 9,220 lines)
- ✅ **Phase 1**: Backend Admin API (~~38 Express endpoints~~ → Firebase Functions)
- ✅ **Phase 2**: Admin Dashboard Foundation (2,210 lines)
- ✅ **Phase 3**: Template Management UI with Monaco Editor (1,510 lines)
- ✅ **Phase 4**: Monitoring Dashboard with Recharts (1,149 lines)
- ✅ **Phase 5**: Data Pool Management UI (2,511 lines)

### Agent System (5 Agents - Designed)
- **Agent 1**: Need Vector Analysis (Gemini API)
- **Agent 2**: Character Profile Generation (Gemini API)
- **Agent 3**: System Prompt Assembly (Template Engine)
- **Agent 4**: Image Prompt Generation (Gemini API)
- **Agent 5**: Image Generation (Gemini Imagen)

### Upcoming Features
- 🔄 **Database Migration**: ~~PostgreSQL + Prisma~~ → Firebase Firestore (in progress)
- 🔄 **Backend Migration**: ~~Express REST API~~ → Firebase Cloud Functions (in progress)
- 🔄 Agent Pipeline Implementation (Cloud Tasks orchestration)
- 🔄 Memory system (conversation context via Firestore)
- 🔄 Relationship dynamics (intimacy levels)
- 🔄 Async knock system (AI initiates conversation)
- 🔄 Canvas-based spatial visualization
- 🔄 Business model (freemium)

## Development

### Frontend Development
```bash
npm run dev      # Start development server (http://localhost:3002)
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

### ~~Backend Development~~ (DEPRECATED)
~~```bash
cd backend
npm run dev      # Start development server (with auto-reload)
npm run build    # Build TypeScript to JavaScript
npm run start    # Start production server
npm run lint     # Run ESLint
```~~

### Firebase Functions Development (New)
```bash
cd functions
npm install      # Install dependencies
npm run build    # Build TypeScript
npm run serve    # Start emulator
npm run deploy   # Deploy to Firebase
npm run logs     # View function logs
```

### Firebase Emulators
```bash
firebase emulators:start  # Start all emulators
firebase emulators:exec   # Run tests against emulators
```

## Project Status

### ~~Phase 1: Basic Infrastructure~~ ✅ Completed (Legacy)
~~- Frontend: Next.js 14 setup with Zustand~~
~~- Backend: Express.js API with JWT auth~~
~~- AI: Google Gemini integration (mock responses ready)~~

### Phase 1-5: Admin System ✅ Completed (9,220 lines)
- ✅ Phase 1: Backend Admin API (1,840 lines) - **Migrating to Firebase**
- ✅ Phase 2: Frontend Foundation (2,210 lines)
- ✅ Phase 3: Template Management UI (1,510 lines)
- ✅ Phase 4: Monitoring Dashboard (1,149 lines)
- ✅ Phase 5: Data Pool Management UI (2,511 lines)

### 🔄 Current: Firebase Migration (In Progress)

**Phase 1: Documentation** (4/8 complete)
- ✅ Update 01_ADMIN_PAGE_SPEC.md (Express→Firebase)
- ✅ Update 05_API_SPECIFICATIONS.md (58 REST APIs→Firebase)
- ✅ Update 06_DATABASE_SCHEMA.md (SQL→Firestore)
- ✅ Update README.md (tech stack, costs)
- ⏳ Update 02-04, 07 docs (Agent execution)
- ⏳ Create FIREBASE_MIGRATION.md guide
- ⏳ Create firestore.rules
- ⏳ Create firestore.indexes.json

**Phase 2: Delete Legacy Code** (0/4)
- ⏳ Archive Express backend with Git commit
- ⏳ Delete backend/ folder completely
- ⏳ Delete Prisma files
- ⏳ Update PHASE1-5_COMPLETE.md (mark as archived)

**Phase 3: Firebase Setup** (0/2)
- ⏳ Expand firebase.json (Functions, Storage, Emulators)
- ⏳ Create Firebase Functions project structure

**Phase 4: Frontend Rewrite** (0/2)
- ⏳ Rewrite src/services/adminApi.ts for Firebase
- ⏳ Update Zustand stores with Firebase listeners

**Phase 5: Testing** (0/1)
- ⏳ Test with Firebase Emulators

**Phase 6: Deployment** (0/1)
- ⏳ Deploy to Firebase and final cleanup

**Next Steps After Migration:**
- Agent Pipeline Implementation (Cloud Tasks + Pub/Sub)
- Memory system (Firestore-based conversation history)
- Relationship dynamics implementation
- Canvas visualization with spatial UI

## Contributing

This is a personal project. For feature requests or bug reports, please create an issue.

## License

Private project - All rights reserved
