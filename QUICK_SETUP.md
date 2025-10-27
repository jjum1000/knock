# ⚡ 1분 빠른 설정

## 🎯 목표
Firebase Authentication과 Firestore를 활성화하여 앱을 완전히 작동시키기

---

## 📍 Step 1: Authentication 활성화 (30초)

### 이 링크를 클릭하세요:
👉 https://console.firebase.google.com/project/knock-33238/authentication/providers

### 화면에서:
1. **"Anonymous"** 찾기 (목록 맨 위에 있음)
2. 해당 행 **클릭**
3. 토글 스위치를 **켜기** (오른쪽으로)
4. **"저장"** 버튼 클릭

✅ 완료! "익명 - 사용 설정됨" 표시 확인

---

## 📍 Step 2: Firestore Database 생성 (30초)

### 이 링크를 클릭하세요:
👉 https://console.firebase.google.com/project/knock-33238/firestore

### 화면에서:
1. **"데이터베이스 만들기"** 버튼 클릭
2. **"테스트 모드에서 시작"** 선택 ← 이거 선택!
3. **"다음"** 클릭
4. 위치: **"asia-northeast3 (Seoul)"** 선택 (또는 가까운 지역)
5. **"사용 설정"** 클릭
6. 생성 완료까지 1분 대기 ⏰

✅ 완료! 빈 데이터베이스 화면이 보임

---

## 📍 Step 3: 보안 규칙 설정 (Optional, 나중에도 가능)

Firestore가 생성되면:
1. 상단 **"규칙"** 탭 클릭
2. 아래 코드를 **복사**하여 **전체 교체**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

3. **"게시"** 버튼 클릭

---

## ✅ 완료 확인

터미널로 돌아가서 실행:

```bash
npm run test:firebase
```

**모든 테스트가 통과하면 설정 완료!** 🎉

---

## 🚀 다음 단계

설정이 완료되면 앱을 테스트하세요:

```bash
# 브라우저에서 열기
http://localhost:3002
```

1. 온보딩 진행 (이름, 나이 입력)
2. "Enter the Building" 클릭
3. Firebase Console에서 확인:
   - [Users 확인](https://console.firebase.google.com/project/knock-33238/authentication/users)
   - [Firestore 데이터 확인](https://console.firebase.google.com/project/knock-33238/firestore/databases/-default-/data)

---

**총 소요 시간: 약 2분**

문제가 있으면 `npm run test:firebase` 실행 후 오류 메시지를 확인하세요!
