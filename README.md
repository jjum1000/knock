# Knock - Meet Your AI Neighbors

A Next.js application where you can meet AI neighbors, build connections, one knock at a time.

## Project Structure

```
Knock/
├── src/                    # Frontend (Next.js 14)
│   ├── app/               # Next.js App Router
│   │   ├── layout.tsx     # Root layout
│   │   ├── page.tsx       # Main page
│   │   └── globals.css    # Global styles
│   ├── components/        # React components
│   │   └── ui/           # UI components (Button, Card, Input)
│   ├── stores/           # Zustand state management
│   │   └── useAppStore.ts
│   └── types/            # TypeScript types
│
├── backend/              # Backend (Express.js)
│   ├── src/
│   │   ├── routes/       # API routes
│   │   │   ├── auth.ts
│   │   │   ├── chat.ts
│   │   │   ├── knock.ts
│   │   │   └── roommate.ts
│   │   ├── services/     # Business logic
│   │   │   └── geminiService.ts
│   │   ├── middleware/   # Express middleware
│   │   │   ├── auth.ts
│   │   │   └── errorHandler.ts
│   │   ├── types/        # TypeScript types
│   │   └── server.ts     # Main server file
│   └── package.json
│
└── Docs/                 # Documentation
    └── Feature/          # Feature specifications

```

## Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript 5.3
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **Font**: Press Start 2P (Pixel Art style)

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Language**: TypeScript
- **Authentication**: JWT
- **AI**: Google Gemini 1.5 Pro

## Getting Started

### Prerequisites
- Node.js 20 LTS or higher
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd Knock
```

2. Install frontend dependencies
```bash
npm install
```

3. Install backend dependencies
```bash
cd backend
npm install
cd ..
```

4. Configure environment variables

Frontend (`.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:3003
NEXT_PUBLIC_GEMINI_API_KEY=your-api-key-here
```

Backend (`backend/.env`):
```env
PORT=3003
NODE_ENV=development
JWT_SECRET=your-jwt-secret
GEMINI_API_KEY=your-api-key-here
FRONTEND_URL=http://localhost:3002
```

### Running the Application

1. Start the backend server (Terminal 1):
```bash
cd backend
npm run dev
```
Backend will run on **http://localhost:3003**

2. Start the frontend server (Terminal 2):
```bash
npm run dev
```
Frontend will run on **http://localhost:3002**

3. Open **http://localhost:3002** in your browser

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user

### Roommates
- `GET /api/v1/roommate` - Get all roommates
- `GET /api/v1/roommate/:id` - Get roommate by ID
- `POST /api/v1/roommate/generate` - Generate random roommate

### Knock System
- `POST /api/v1/knock/execute` - Execute daily knock
- `GET /api/v1/knock/status` - Get knock status

### Chat
- `POST /api/v1/chat/message` - Send message to roommate
- `GET /api/v1/chat/history/:roommateId` - Get conversation history

## Features

### MVP Features (Completed)
- ✅ Onboarding system (4-step flow)
- ✅ User registration and authentication
- ✅ Room/building visualization
- ✅ Daily knock system (1 knock per day)
- ✅ AI-powered chat with roommates
- ✅ Persistent state management (Zustand)
- ✅ Pixel art UI design

### Upcoming Features
- 🔄 Database integration (PostgreSQL + Prisma)
- 🔄 Memory system (conversation context)
- 🔄 Relationship dynamics (intimacy levels)
- 🔄 Async knock system (AI initiates conversation)
- 🔄 Canvas-based spatial visualization
- 🔄 Business model (freemium)

## Development

### Frontend Development
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Backend Development
```bash
cd backend
npm run dev      # Start development server (with auto-reload)
npm run build    # Build TypeScript to JavaScript
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Project Status

**Phase 1: Basic Infrastructure** ✅ Completed
- Frontend: Next.js 14 setup with Zustand
- Backend: Express.js API with JWT auth
- AI: Google Gemini integration (mock responses ready)

**Next Steps:**
- Phase 2: Database integration (PostgreSQL + Prisma)
- Phase 3: Enhanced features (Memory, Relationship dynamics)
- Phase 4: Canvas visualization and animations

## Contributing

This is a personal project. For feature requests or bug reports, please create an issue.

## License

Private project - All rights reserved
