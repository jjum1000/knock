# Firebase 마이그레이션 가이드

## 개요

Express.js + Prisma + SQLite 백엔드에서 **Firebase로 완전 전환**되었습니다.

## 변경 사항

### 제거된 항목
- ❌ Express.js 백엔드 (`backend/` 폴더 - 제거 대기 중)
- ❌ Prisma ORM
- ❌ SQLite 데이터베이스
- ❌ JWT 인증 시스템
- ❌ API 클라이언트 (`src/lib/api.ts`)

### 추가된 항목
- ✅ Firebase SDK
- ✅ Firebase Authentication (Anonymous Auth)
- ✅ Firestore Database
- ✅ Firebase Storage (준비됨)
- ✅ Firestore 서비스 레이어 (`src/services/firestore.ts`)
- ✅ Firebase Auth 서비스 (`src/services/auth.ts`)
- ✅ Firebase Auth Store (`src/stores/useFirebaseAuthStore.ts`)

## 새로운 구조

```
E:\Claude\Knock\
├── src/
│   ├── app/                    # Next.js 14 App Router
│   ├── components/             # UI 컴포넌트
│   ├── lib/
│   │   └── firebase.ts        # Firebase 초기화
│   ├── services/
│   │   ├── auth.ts            # Firebase Auth 서비스
│   │   └── firestore.ts       # Firestore 서비스 레이어
│   ├── stores/
│   │   ├── useAppStore.ts     # 기존 앱 스토어
│   │   └── useFirebaseAuthStore.ts  # Firebase Auth 스토어
│   └── types/
└── Docs/                       # 피쳐 문서
```

## Firebase 설정

### 1. Firebase Console 설정

1. [Firebase Console](https://console.firebase.google.com/)에서 프로젝트 생성
2. 프로젝트 설정 > 일반 > "웹 앱 추가"
3. Firebase 구성 정보 복사

### 2. 환경 변수 설정

`.env.local` 파일에 Firebase 구성 추가:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id
```

### 3. Firebase 콘솔에서 서비스 활성화

#### Authentication
1. Authentication > Sign-in method
2. "익명" 로그인 활성화

#### Firestore Database
1. Firestore Database > 데이터베이스 만들기
2. 테스트 모드로 시작 (또는 보안 규칙 설정)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Firestore 데이터 모델

### Collections

#### users
```typescript
{
  id: string
  name: string
  age: number
  createdAt: Timestamp
}
```

#### roommates
```typescript
{
  id: string
  name: string
  age: number
  bio: string
  personality: string
  avatar: string
  interests: string[]
  userId: string
  isFirstMate: boolean
  createdAt: Timestamp
}
```

#### messages
```typescript
{
  id: string
  userId: string
  roommateId: string
  sender: 'user' | 'roommate'
  content: string
  createdAt: Timestamp
}
```

#### knocks
```typescript
{
  id: string
  userId: string
  knockedAt: Timestamp
  roomRevealed: number
}
```

## 사용 방법

### 인증

```typescript
import { useFirebaseAuthStore } from '@/stores/useFirebaseAuthStore'

const { registerUser, loginUser, logout } = useFirebaseAuthStore()

// 회원가입
await registerUser('사용자명', 25)

// 로그인
await loginUser('사용자명')

// 로그아웃
await logout()
```

### Firestore 데이터 작업

```typescript
import { userService, roommateService, messageService, knockService } from '@/services/firestore'

// 사용자 생성
const user = await userService.create({ name: '철수', age: 25 })

// 룸메이트 조회
const roommates = await roommateService.getByUserId(userId)

// 메시지 전송
await messageService.create({
  userId,
  roommateId,
  sender: 'user',
  content: '안녕하세요!'
})

// 오늘 노크 횟수 확인
const remaining = await knockService.getKnocksRemaining(userId)
```

## 다음 단계

### 즉시 필요한 작업
1. Firebase Console에서 프로젝트 생성 및 구성 정보 복사
2. `.env.local`에 Firebase 구성 추가
3. Firebase Authentication 활성화
4. Firestore Database 생성
5. 백엔드 폴더 완전 제거

### 통합 작업
1. 온보딩 페이지를 Firebase Auth Store로 전환
2. 메인 페이지를 Firestore 서비스로 전환
3. 채팅 시스템을 Firebase로 통합
4. 노크 시스템을 Firestore로 통합

### 고급 기능
1. Firestore Security Rules 설정
2. Firebase Storage 통합 (이미지 업로드)
3. Firebase Cloud Messaging (푸시 알림)
4. Firebase Analytics 통합

## 마이그레이션 체크리스트

- [x] Firebase SDK 설치
- [x] Firebase 초기화 파일 생성
- [x] Firestore 서비스 레이어 구현
- [x] Firebase Auth 서비스 구현
- [x] Firebase Auth Store 구현
- [ ] Firebase Console 설정
- [ ] 환경 변수 설정
- [ ] 온보딩 페이지 통합
- [ ] 메인 페이지 통합
- [ ] 채팅 시스템 통합
- [ ] 노크 시스템 통합
- [ ] 백엔드 폴더 제거
- [ ] 테스트 및 검증

## 트러블슈팅

### Firebase 초기화 오류
- `.env.local` 파일의 환경 변수를 확인하세요
- Firebase Console에서 구성 정보가 정확한지 확인하세요

### Authentication 오류
- Firebase Console에서 익명 로그인이 활성화되어 있는지 확인하세요

### Firestore 권한 오류
- Firestore 보안 규칙에서 인증된 사용자의 읽기/쓰기가 허용되어 있는지 확인하세요

## 참고 자료

- [Firebase 문서](https://firebase.google.com/docs)
- [Firestore 시작하기](https://firebase.google.com/docs/firestore/quickstart)
- [Firebase Authentication](https://firebase.google.com/docs/auth)

---

**마지막 업데이트**: 2025-10-27
**버전**: 1.0.0 (Firebase Migration)
