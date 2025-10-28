# Knock - 설정 가이드

프로젝트를 시작하는 데 필요한 Firebase와 Gemini API 설정을 안내합니다.

---

## 🚀 빠른 시작 (2분)

이미 Firebase 프로젝트가 있고 빠르게 시작하고 싶다면:

### Step 1: Authentication 활성화 (30초)

[Firebase Console - Authentication](https://console.firebase.google.com/project/knock-33238/authentication/providers)

1. **"Anonymous"** 찾기
2. 클릭 후 토글 스위치 **켜기**
3. **"저장"** 클릭

### Step 2: Firestore Database 생성 (30초)

[Firebase Console - Firestore](https://console.firebase.google.com/project/knock-33238/firestore)

1. **"데이터베이스 만들기"** 클릭
2. **"테스트 모드에서 시작"** 선택
3. 위치: **"asia-northeast3 (Seoul)"** 선택
4. **"사용 설정"** 클릭

### Step 3: 테스트 실행

```bash
npm run test:firebase
```

모든 테스트가 통과하면 설정 완료! 🎉

---

## 📋 상세 설정 가이드

처음 Firebase를 설정하거나 단계별 안내가 필요한 경우:

### 준비물

- Google 계정
- 인터넷 연결
- 5-10분의 시간

---

## 🔥 Step 1: Firebase 프로젝트 생성

### 1.1 Firebase Console 접속

1. https://console.firebase.google.com/ 접속
2. Google 계정으로 로그인

### 1.2 새 프로젝트 생성

1. "프로젝트 추가" 또는 "Add project" 클릭
2. 프로젝트 이름 입력: `knock` (또는 원하는 이름)
3. "계속" 클릭
4. Google Analytics 사용 여부 선택 (선택 사항, 끄기 추천)
5. "프로젝트 만들기" 클릭
6. 프로젝트 생성 완료까지 대기 (약 30초)
7. "계속" 클릭하여 프로젝트 대시보드로 이동

---

## 🔐 Step 2: Authentication 설정

### 2.1 Authentication 활성화

1. 왼쪽 메뉴에서 "Authentication" 클릭
2. "시작하기" 또는 "Get started" 클릭

### 2.2 익명 로그인 활성화

1. 상단 탭에서 "Sign-in method" 클릭
2. "익명" 또는 "Anonymous" 찾기
3. "익명" 행 클릭
4. 오른쪽 토글 스위치를 **켜기** (Enable)
5. "저장" 클릭

✅ **확인**: "익명"이 "사용 설정됨"으로 표시되어야 합니다.

---

## 💾 Step 3: Firestore Database 생성

### 3.1 Firestore 생성

1. 왼쪽 메뉴에서 "Firestore Database" 클릭
2. "데이터베이스 만들기" 또는 "Create database" 클릭

### 3.2 보안 규칙 선택

1. **"테스트 모드에서 시작"** 선택
   - ⚠️ 주의: 프로덕션 배포 전에 반드시 보안 규칙을 업데이트해야 합니다
2. "다음" 클릭

### 3.3 위치 선택

1. Firestore 위치 선택 (예: `asia-northeast3 (Seoul)`)
2. "사용 설정" 클릭
3. 데이터베이스 생성 완료까지 대기 (약 1-2분)

### 3.4 보안 규칙 업데이트 (중요!)

1. 상단 탭에서 "규칙" 또는 "Rules" 클릭
2. 기존 규칙을 다음으로 교체:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 인증된 사용자만 읽기/쓰기 가능
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

3. "게시" 또는 "Publish" 클릭

✅ **확인**: Firestore Database 페이지에서 빈 컬렉션 목록이 보여야 합니다.

---

## 🌐 Step 4: Web App 추가 및 Config 가져오기

### 4.1 Web App 추가

1. 프로젝트 개요 옆 ⚙️ (톱니바퀴) 클릭
2. "프로젝트 설정" 선택
3. 아래로 스크롤하여 "내 앱" 섹션 찾기
4. 웹 아이콘 `</>` 클릭
5. 앱 닉네임 입력: `knock-web`
6. "Firebase Hosting도 설정" 체크박스는 **선택하지 않음**
7. "앱 등록" 클릭

### 4.2 Firebase Config 복사

다음과 같은 코드 블록이 나타납니다:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456",
  measurementId: "G-XXXXXXXXXX"
};
```

**중요**: 이 값들을 복사해두세요! (다음 단계에서 사용)

8. "콘솔로 이동" 클릭

---

## 🤖 Step 5: Gemini API 키 발급

### 5.1 Google AI Studio 접속

1. https://aistudio.google.com/ 접속
2. 같은 Google 계정으로 로그인

### 5.2 API 키 생성

1. 왼쪽 메뉴에서 "Get API key" 클릭
2. "Create API key" 버튼 클릭
3. 기존 Google Cloud 프로젝트 선택 또는 새 프로젝트 생성
4. "Create API key in existing project" 클릭
5. API 키가 생성됩니다

**중요**: API 키를 복사하여 안전한 곳에 저장하세요!

✅ **확인**: API 키가 `AIzaSy`로 시작해야 합니다.

---

## 📝 Step 6: .env.local 파일 업데이트

### 6.1 .env.local 파일 열기

프로젝트 루트의 `.env.local` 파일을 텍스트 에디터로 엽니다.

### 6.2 Firebase Config 값 입력

Step 4.2에서 복사한 Firebase Config 값으로 플레이스홀더를 교체합니다:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# Google Gemini API
NEXT_PUBLIC_GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

### 6.3 파일 저장

변경사항을 저장합니다 (Ctrl+S 또는 Cmd+S).

⚠️ **보안 주의사항**:
- `.env.local` 파일은 절대 Git에 커밋하지 마세요
- 이미 `.gitignore`에 포함되어 있으므로 안전합니다

---

## ✅ Step 7: 연결 테스트

### 7.1 개발 서버 재시작

```bash
# 현재 서버 종료 (Ctrl+C)
# 서버 재시작
npm run dev
```

### 7.2 브라우저에서 확인

1. http://localhost:3002 접속
2. 온보딩 플로우 진행
3. "Enter the Building" 클릭

### 7.3 Firebase Console에서 확인

#### Authentication 확인
1. Firebase Console → Authentication → Users 탭
2. 익명 사용자가 생성되었는지 확인

#### Firestore 확인
1. Firebase Console → Firestore Database → 데이터 탭
2. `users`, `roommates` 컬렉션 확인

#### Gemini API 확인
1. 앱에서 룸메이트와 대화 시도
2. AI 응답이 오는지 확인

---

## 🐛 문제 해결

### "Firebase: Error (auth/...)"

**원인**: Firebase Config가 잘못 입력됨

**해결**:
1. `.env.local` 파일의 값 재확인
2. 공백이나 따옴표 없이 정확히 복사
3. 서버 재시작

### "Failed to register user"

**원인**: Authentication이 활성화되지 않음

**해결**:
1. Firebase Console → Authentication
2. 익명 로그인이 "사용 설정됨"인지 확인

### "Missing or insufficient permissions"

**원인**: Firestore 보안 규칙 문제

**해결**:
1. Firebase Console → Firestore Database → 규칙
2. Step 3.4의 규칙으로 업데이트
3. "게시" 클릭

### Gemini API 응답 없음

**원인**: API 키가 잘못되었거나 할당량 초과

**해결**:
1. `.env.local`에서 `NEXT_PUBLIC_GEMINI_API_KEY` 확인
2. Google AI Studio에서 API 키 재확인
3. 할당량 확인: https://aistudio.google.com/app/apikey

### 포트 이미 사용 중

**해결**:
```bash
# Windows
netstat -ano | findstr :3002
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:3002 | xargs kill -9
```

---

## 📊 설정 완료 체크리스트

- [ ] Firebase 프로젝트 생성
- [ ] Authentication (익명 로그인) 활성화
- [ ] Firestore Database 생성
- [ ] Firestore 보안 규칙 설정
- [ ] Web App 추가 및 Config 복사
- [ ] Gemini API 키 발급
- [ ] `.env.local` 파일 업데이트
- [ ] 개발 서버 재시작
- [ ] Firebase Console에서 사용자 확인
- [ ] Firestore에 데이터 생성 확인
- [ ] Gemini AI 대화 응답 확인

모든 항목이 완료되면 설정이 끝났습니다! 🎉

---

## 🔗 유용한 링크

- [Firebase 공식 문서](https://firebase.google.com/docs)
- [Firestore 시작 가이드](https://firebase.google.com/docs/firestore/quickstart)
- [Firebase Authentication 가이드](https://firebase.google.com/docs/auth)
- [Google Gemini API 문서](https://ai.google.dev/docs)
- [Firebase Console](https://console.firebase.google.com/)
- [Google AI Studio](https://aistudio.google.com/)

---

**마지막 업데이트**: 2025-10-28
