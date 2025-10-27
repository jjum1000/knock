# KNOCK Chrome Extension MVP

🏠 AI 룸메이트와 채팅하는 Chrome Extension - 픽셀 아트 스타일

## 📦 현재 구현 상태

### ✅ 완료된 기능

1. **Popup UI (360x600px)**
   - 픽셀 아트 스타일 (Press Start 2P 폰트)
   - 룸메이트 목록 화면
   - 채팅 화면
   - 샘플 데이터로 동작하는 프로토타입

2. **Project Structure**
   ```
   extension/
   ├── manifest.json          # Chrome Extension Manifest V3
   ├── popup.html             # Bundled popup UI (288KB)
   ├── background.js          # Service Worker
   ├── content.js             # Content Script (placeholder)
   ├── content.css            # Content Script styles
   ├── package.json           # Dependencies
   ├── icons/                 # Extension icons (need to add)
   └── src/                   # Source code (TypeScript)
       ├── background/
       ├── popup/
       ├── content/
       └── shared/
   ```

3. **Background Service Worker**
   - Extension 설치 핸들러
   - 메시지 리스너
   - 알림 시스템 준비
   - Keep-alive 메커니즘

### ⬜ 아직 구현 안된 기능

- Firebase 통합
- OpenAI API 통합
- 실제 데이터 동기화
- Content Script (인라인 채팅)
- 아이콘 이미지

## 🚀 Chrome에서 테스트하기

### 1. Extension 로드

1. Chrome 브라우저 열기
2. 주소창에 `chrome://extensions/` 입력
3. 오른쪽 상단 "개발자 모드" 활성화
4. "압축해제된 확장 프로그램 로드" 클릭
5. `E:\Claude\Knock\extension` 폴더 선택

### 2. Extension 실행

- Chrome 툴바의 Extension 아이콘 클릭
- Popup이 열리면 룸메이트 목록 표시
- 룸메이트 클릭하면 채팅 화면으로 전환
- 메시지 입력하고 전송 테스트

### 3. 예상 동작

**룸메이트 목록 화면**:
- 3명의 샘플 룸메이트 (Alex 🎮, Emma 📚, James ☕)
- Alex는 읽지 않은 메시지 1개 배지
- "🏠 건물 보기", "🚪 노크하기" 버튼

**채팅 화면**:
- 이전 메시지 히스토리 표시
- 메시지 입력창
- Enter 키 또는 전송 버튼으로 메시지 전송
- 뒤로가기 버튼으로 목록으로 복귀

## 🎨 디자인 스타일

### 픽셀 아트 특징

- **폰트**: Press Start 2P (Google Fonts)
- **테두리**: 4px solid black
- **색상 팔레트**:
  - Background: slate-900, purple-900
  - Primary: cyan-400 (#22d3ee)
  - Secondary: purple-600
  - Text: white, gray-400
- **효과**:
  - Hover: translate(-2px, -2px) + box-shadow
  - Active: translate(0, 0)
  - 8-bit style pixelated rendering

### CSS 클래스

```css
.pixel-text        /* Press Start 2P font */
.pixel-button      /* 4px border, hover effects */
.pixel-container   /* Card with black border */
.pixel-input       /* Input with pixel styling */
.pixel-badge       /* Small badge with border */
```

## 📝 다음 단계

### Phase 1: Firebase 통합 (1-2일)
- [ ] Firebase SDK 추가
- [ ] Authentication 연결
- [ ] Firestore 실시간 리스너
- [ ] Web App과 데이터 동기화

### Phase 2: AI 통합 (1일)
- [ ] OpenAI API 연결
- [ ] 채팅 응답 생성
- [ ] 컨텍스트 기반 대화

### Phase 3: Content Script (2-3일)
- [ ] 플로팅 버튼 UI
- [ ] 인라인 채팅 패널
- [ ] 페이지 컨텍스트 수집
- [ ] 브라우징 히스토리 분석 (선택적)

### Phase 4: 알림 시스템 (1일)
- [ ] 새 메시지 알림
- [ ] Badge 카운트
- [ ] 알림 클릭 핸들러

### Phase 5: 최적화 & 배포 (2-3일)
- [ ] 성능 최적화
- [ ] 에러 핸들링
- [ ] 아이콘 디자인
- [ ] Chrome 웹 스토어 준비

## 🔧 개발 명령어

```bash
# Extension 폴더 이동
cd extension

# 의존성 설치 (향후 TypeScript 컴파일용)
npm install

# TypeScript 컴파일 (향후)
npm run build

# 현재는 popup.html이 이미 번들링되어 있으므로
# Chrome에 바로 로드 가능
```

## 📚 참고 문서

- [Docs/Feature/10_Extension/](../Docs/Feature/10_Extension/) - 전체 Extension 설계 문서
- [Manifest V3 Guide](https://developer.chrome.com/docs/extensions/mv3/)
- [Chrome Extension API](https://developer.chrome.com/docs/extensions/reference/)

## 🐛 알려진 이슈

1. **아이콘 없음**: `icons/` 폴더에 PNG 파일 추가 필요
2. **샘플 데이터**: 현재는 하드코딩된 데이터 사용
3. **Firebase 미연결**: 실제 DB와 연결 필요
4. **AI 미연결**: OpenAI API 통합 필요

## 📖 사용 가이드

### 사용자 관점

1. Extension 설치
2. 아이콘 클릭하여 Popup 열기
3. 룸메이트 선택하여 채팅
4. (향후) 웹서핑 중 플로팅 버튼으로 빠른 채팅

### 개발자 관점

1. `extension/` 폴더가 메인 Extension
2. `knock-extension-popup/` 폴더는 artifact 소스 (수정 후 재번들링)
3. Popup 수정 시:
   - `knock-extension-popup/src/App.tsx` 수정
   - `bash scripts/bundle-artifact.sh` 실행
   - `bundle.html` 을 `extension/popup.html` 로 복사

## 🎯 목표

**최종 목표**: 사용자가 브라우저에서 항상 AI 룸메이트와 대화할 수 있는 메신저형 Extension

**현재 진행**: MVP 단계 - 기본 UI와 구조 완성
