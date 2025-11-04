# Knock Backend API Test Guide

Complete testing guide for the agent-based roommate generation system.

## Base URL

```
http://localhost:3003/api/v1
```

## Testing Flow

### 1. Health Check

```bash
curl http://localhost:3003/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-28T...",
  "service": "knock-backend",
  "version": "1.0.0"
}
```

---

## Authentication Flow

### 2. Register New User

```bash
curl -X POST http://localhost:3003/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123",
    "name": "Test User"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "test@example.com",
      "name": "Test User",
      "role": "user",
      "subscriptionTier": "free",
      "createdAt": "..."
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Save the token** for subsequent requests!

### 3. Login (Alternative to Register)

```bash
curl -X POST http://localhost:3003/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123"
  }'
```

### 4. Get Current User Info

```bash
curl http://localhost:3003/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Onboarding Flow

### 5. Save Onboarding Progress (Step 1-4)

**Step 1: Domains**
```bash
curl -X POST http://localhost:3003/api/v1/onboarding/save \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "step": 1,
    "data": {
      "domains": ["개발", "게임", "음악"]
    }
  }'
```

**Step 2: Keywords**
```bash
curl -X POST http://localhost:3003/api/v1/onboarding/save \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "step": 2,
    "data": {
      "keywords": ["혼자있는시간", "자유", "성장", "독립"]
    }
  }'
```

**Step 3: Response Style**
```bash
curl -X POST http://localhost:3003/api/v1/onboarding/save \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "step": 3,
    "data": {
      "responseStyle": "casual"
    }
  }'
```

**Step 4: Interests**
```bash
curl -X POST http://localhost:3003/api/v1/onboarding/save \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "step": 4,
    "data": {
      "interests": "프로그래밍하면서 커피 마시기, 심야 코딩, 인디 게임 개발"
    }
  }'
```

### 6. Analyze Browsing History (Optional - Chrome Extension)

```bash
curl -X POST http://localhost:3003/api/v1/agent/analyze-browsing-history \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "browsingData": {
      "domains": [
        {"domain": "github.com", "count": 45},
        {"domain": "stackoverflow.com", "count": 32},
        {"domain": "youtube.com", "count": 28}
      ],
      "keywords": ["react", "typescript", "debugging", "tutorial"],
      "categories": [
        {"category": "Development", "count": 77},
        {"category": "Entertainment", "count": 28},
        {"category": "Learning", "count": 15}
      ],
      "totalVisits": 120
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Need Vector analysis complete",
    "needVectorGenerated": true,
    "needs": [
      {
        "need": "growth",
        "intensity": 0.85,
        "state": "deficient",
        "gap": 0.2
      },
      {
        "need": "recognition",
        "intensity": 0.72,
        "state": "deficient",
        "gap": 0.15
      }
    ],
    "stats": {
      "domainsAnalyzed": 3,
      "keywordsExtracted": 4,
      "categoriesDetected": 3
    },
    "analysis": {
      "topNeeds": ["growth", "recognition", "belonging"],
      "paradoxes": 1
    }
  }
}
```

**Important Notes:**
- This endpoint processes browsing history **in memory only**
- Original history is **never stored** in the database
- Only the resulting Need Vector analysis is saved
- Implements the Frequency-Deficiency Principle: high browsing frequency = need deficiency
- GDPR compliant: privacy-first architecture

### 7. Check Onboarding Status

```bash
curl http://localhost:3003/api/v1/onboarding/status \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 8. Check Agent Analysis Status

```bash
curl http://localhost:3003/api/v1/agent/status \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "hasAnalyzedHistory": true,
    "lastAnalyzedAt": "2025-10-29T06:30:00Z",
    "currentStep": 1
  }
}
```

### 9. Complete Onboarding (Trigger Agent Pipeline!)

```bash
curl -X POST http://localhost:3003/api/v1/onboarding/complete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{}'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "jobId": "job-1730105094000-abc123",
    "personaId": "...",
    "message": "Roommate character generated successfully!"
  }
}
```

**This triggers the 5-agent pipeline:**
1. Agent 1: Need Vector Analysis
2. Agent 2: Character Profile Generation
3. Agent 3: System Prompt Assembly
4. Agent 4: Image Prompt Generation
5. Agent 5: Image Generation with Fallback

### 8. Check Job Status

```bash
curl http://localhost:3003/api/v1/onboarding/job/JOB_ID_HERE \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Response includes:**
- Job status (pending/running/completed/failed)
- Agent logs for each step
- Final results with persona details

---

## Roommate Management

### 9. Get My Roommate

```bash
curl http://localhost:3003/api/v1/roommate/my \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "name": "지우",
    "archetype": "minimalist_achiever",
    "keywords": ["자율성", "성장", "독립적"],
    "imageUrl": "/presets/minimalist-zen.png",
    "imageGenerationMethod": "preset_fallback",
    "quality": 0.85,
    "needVectors": [...],
    "traumaAndLearning": "...",
    "survivalStrategies": "...",
    "personalityTraits": "...",
    "conversationPatterns": "...",
    "isActive": true,
    "createdAt": "..."
  }
}
```

### 10. Get Specific Persona by ID

```bash
curl http://localhost:3003/api/v1/roommate/PERSONA_ID_HERE \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 11. Get System Prompt (Owner/Admin Only)

```bash
curl http://localhost:3003/api/v1/roommate/PERSONA_ID_HERE/prompt \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 12. Get Available Image Presets

```bash
curl http://localhost:3003/api/v1/roommate/presets/list
```

**Response includes 10 preset rooms:**
- cozy-developer
- creative-sanctuary
- minimalist-zen
- gamer-den
- bookworm-library
- plant-parent
- social-butterfly
- achiever-office
- artist-studio
- night-owl

---

## Chat System

### 13. Send Message to Roommate

```bash
curl -X POST http://localhost:3003/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "personaId": "PERSONA_ID_HERE",
    "content": "오늘 날씨 좋네! 뭐하고 있어?"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "userMessage": {
      "id": "...",
      "role": "user",
      "content": "오늘 날씨 좋네! 뭐하고 있어?",
      "createdAt": "..."
    },
    "assistantMessage": {
      "id": "...",
      "role": "assistant",
      "content": "응! 날씨 진짜 좋네 😊 나는 지금 코딩하면서 커피 마시고 있어. 너는?",
      "createdAt": "..."
    }
  }
}
```

### 14. Get Chat History

```bash
curl "http://localhost:3003/api/v1/chat/history?personaId=PERSONA_ID_HERE&limit=50" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Query Parameters:**
- `personaId` (required): Persona ID
- `limit` (optional): Number of messages (default: 50, max: 100)
- `before` (optional): Message ID for pagination

### 15. Get Visit Statistics (방문 기록)

```bash
curl http://localhost:3003/api/v1/chat/statistics/PERSONA_ID_HERE \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "persona": {
      "id": "...",
      "name": "지우"
    },
    "statistics": {
      "totalInteractions": 42,
      "totalMessages": 84,
      "userMessages": 42,
      "assistantMessages": 42,
      "lastInteractionAt": "2025-10-28T09:30:00Z",
      "firstInteractionAt": "2025-10-20T10:00:00Z",
      "daysSinceFirstInteraction": 8,
      "averageMessagesPerDay": "10.50",
      "messagesByDay": {
        "2025-10-28": 12,
        "2025-10-27": 8,
        "2025-10-26": 15,
        "2025-10-25": 10,
        "2025-10-24": 6,
        "2025-10-23": 9,
        "2025-10-22": 11
      }
    }
  }
}
```

**Statistics Included:**
- `totalInteractions`: Total number of conversations (incremented on each message sent)
- `totalMessages`: Total message count (user + assistant)
- `userMessages`: Messages sent by user
- `assistantMessages`: Messages sent by AI
- `lastInteractionAt`: Timestamp of last interaction
- `firstInteractionAt`: Timestamp of first interaction
- `daysSinceFirstInteraction`: Days since first chat
- `averageMessagesPerDay`: Average messages per day
- `messagesByDay`: Message count for last 7 days

### 16. Clear Chat History

```bash
curl -X DELETE http://localhost:3003/api/v1/chat/history/PERSONA_ID_HERE \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Admin Endpoints (Future)

```bash
# Get all users (admin only)
curl http://localhost:3003/api/v1/admin/users \
  -H "Authorization: Bearer ADMIN_TOKEN_HERE"

# Get all agent jobs (admin only)
curl http://localhost:3003/api/v1/admin/jobs \
  -H "Authorization: Bearer ADMIN_TOKEN_HERE"

# Manage templates (admin only)
curl http://localhost:3003/api/v1/admin/templates \
  -H "Authorization: Bearer ADMIN_TOKEN_HERE"
```

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": { /* Optional additional details */ }
}
```

**Common Error Codes:**
- `VALIDATION_ERROR` (400): Invalid request data
- `UNAUTHORIZED` (401): No or invalid token
- `FORBIDDEN` (403): Insufficient permissions
- `NOT_FOUND` (404): Resource not found
- `EMAIL_EXISTS` (409): Email already registered
- `RATE_LIMIT_EXCEEDED` (429): Too many requests
- `INTERNAL_SERVER_ERROR` (500): Server error

---

## Rate Limits

- API endpoints: 100 requests/hour
- Chat messages: 60 messages/hour
- Onboarding completion: 1 completion/day
- Admin endpoints: 100 requests/hour

---

## Complete Test Script

Save as `test-api.sh`:

```bash
#!/bin/bash

BASE_URL="http://localhost:3003/api/v1"

echo "=== 1. Health Check ==="
curl -s http://localhost:3003/health | jq

echo -e "\n=== 2. Register User ==="
REGISTER_RESPONSE=$(curl -s -X POST $BASE_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123",
    "name": "Test User"
  }')
echo $REGISTER_RESPONSE | jq

TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.data.token')
echo "Token: $TOKEN"

echo -e "\n=== 3. Get User Info ==="
curl -s $BASE_URL/auth/me \
  -H "Authorization: Bearer $TOKEN" | jq

echo -e "\n=== 4. Save Onboarding Data ==="
curl -s -X POST $BASE_URL/onboarding/save \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "step": 1,
    "data": {
      "domains": ["개발", "게임", "음악"],
      "keywords": ["혼자있는시간", "자유", "성장"],
      "responseStyle": "casual",
      "interests": "코딩하면서 커피 마시기"
    }
  }' | jq

echo -e "\n=== 5. Complete Onboarding (Generate Roommate!) ==="
COMPLETE_RESPONSE=$(curl -s -X POST $BASE_URL/onboarding/complete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{}')
echo $COMPLETE_RESPONSE | jq

PERSONA_ID=$(echo $COMPLETE_RESPONSE | jq -r '.data.personaId')
echo "Persona ID: $PERSONA_ID"

echo -e "\n=== 6. Get My Roommate ==="
curl -s $BASE_URL/roommate/my \
  -H "Authorization: Bearer $TOKEN" | jq

echo -e "\n=== 7. Chat with Roommate ==="
curl -s -X POST $BASE_URL/chat/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"personaId\": \"$PERSONA_ID\",
    \"content\": \"안녕! 오늘 날씨 좋네\"
  }" | jq

echo -e "\n=== 8. Get Chat History ==="
curl -s "$BASE_URL/chat/history?personaId=$PERSONA_ID&limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq

echo -e "\n=== Test Complete! ==="
```

Make executable:
```bash
chmod +x test-api.sh
./test-api.sh
```

---

## Database Inspection

```bash
# Connect to SQLite database
sqlite3 backend/prisma/dev.db

# Useful queries:
.tables
SELECT * FROM users;
SELECT * FROM personas;
SELECT * FROM agent_jobs;
SELECT * FROM chat_messages;
```

---

## Next Steps

1. **Test the complete flow** using the test script above
2. **Monitor agent logs** in `backend/logs/combined.log`
3. **Check database** to verify persona creation
4. **Test chat functionality** with different messages
5. **Review system prompts** to understand character generation

The 5-agent pipeline is fully implemented and ready to generate unique roommate characters based on user onboarding data!
