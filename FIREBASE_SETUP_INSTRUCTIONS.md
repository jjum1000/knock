# ⚡ Firebase 빠른 설정 가이드

## 현재 상태
✅ Firebase 프로젝트 연결 성공 (knock-33238)
✅ API 키 설정 완료
❌ Authentication 활성화 필요
❌ Firestore Database 생성 필요

---

## 🔐 Step 1: Authentication 활성화 (필수)

### 1.1 Firebase Console 열기
1. 브라우저에서 다음 URL 접속:
   ```
   https://console.firebase.google.com/project/knock-33238/authentication/providers
   ```

2. 로그인 (Google 계정)

### 1.2 익명 로그인 활성화
1. "Sign-in method" 탭에 있어야 함
2. 목록에서 "익명" 또는 "Anonymous" 찾기
3. 해당 행 클릭
4. 오른쪽 토글 스위치를 **켜기** (Enable)
5. "저장" 버튼 클릭

✅ **확인**: 목록에서 "익명"이 "사용 설정됨" 상태가 되어야 함

---

## 💾 Step 2: Firestore Database 생성 (필수)

### 2.1 Firestore 페이지 열기
1. 브라우저에서 다음 URL 접속:
   ```
   https://console.firebase.google.com/project/knock-33238/firestore
   ```

### 2.2 데이터베이스 생성
1. "데이터베이스 만들기" 버튼 클릭
2. **"테스트 모드에서 시작"** 선택
3. "다음" 클릭
4. 위치 선택: **asia-northeast3 (Seoul)** 권장
5. "사용 설정" 클릭
6. 약 1-2분 대기

### 2.3 보안 규칙 설정
1. 데이터베이스 생성 완료 후
2. 상단 탭에서 "규칙" 클릭
3. 다음 규칙으로 교체:

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

4. "게시" 버튼 클릭

---

## ✅ Step 3: 설정 확인

### 3.1 터미널에서 테스트 실행
```bash
npm run test:firebase
```

### 3.2 예상 결과
```
🔥 Firebase 연결 테스트 시작...

✅ Step 1: Firebase Config 확인
   ✓ 모든 Firebase Config 값이 설정되었습니다.

✅ Step 2: Firebase 앱 초기화
   ✓ Firebase 앱 초기화 성공

✅ Step 3: Firebase Authentication 테스트
   ✓ 익명 로그인 성공 (UID: xxxxx...)

✅ Step 4: Firestore Database 테스트
   ✓ Firestore 쓰기 성공
   ✓ Firestore 읽기 성공
   ✓ Firestore 삭제 성공

✅ Step 5: Google Gemini API 테스트
   ✓ Gemini API 연결 성공
   ℹ 테스트 응답: "Hello"

🎉 Firebase 연결 테스트 완료!
```

---

## 🚀 다음 단계

설정이 완료되면:

1. 개발 서버 재시작:
   ```bash
   # 현재 서버 종료 (Ctrl+C)
   npm run dev
   ```

2. 브라우저에서 앱 테스트:
   ```
   http://localhost:3002
   ```

3. 온보딩 플로우 진행 후 Firebase Console 확인:
   - Authentication → Users: 익명 사용자 생성 확인
   - Firestore → 데이터: users, roommates 컬렉션 확인

---

## 📊 체크리스트

완료한 항목에 체크하세요:

- [ ] Firebase Console 접속
- [ ] Authentication → 익명 로그인 활성화
- [ ] Firestore Database 생성
- [ ] Firestore 보안 규칙 설정
- [ ] `npm run test:firebase` 실행하여 모든 테스트 통과
- [ ] 개발 서버 재시작
- [ ] 앱에서 온보딩 완료 테스트

모든 항목이 완료되면 Firebase 설정이 끝났습니다! 🎉

---

## 🔗 빠른 링크

- [Authentication 설정](https://console.firebase.google.com/project/knock-33238/authentication/providers)
- [Firestore 데이터베이스](https://console.firebase.google.com/project/knock-33238/firestore)
- [프로젝트 설정](https://console.firebase.google.com/project/knock-33238/settings/general)
- [사용량 모니터링](https://console.firebase.google.com/project/knock-33238/usage)

---

**작성일**: 2025-10-27
**프로젝트**: knock-33238
