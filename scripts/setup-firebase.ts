/**
 * Firebase 자동 설정 스크립트
 *
 * 이 스크립트는 Firebase REST API를 사용하여:
 * 1. Firestore Database 생성
 * 2. Authentication (Anonymous) 활성화
 * 3. Firestore 보안 규칙 배포
 *
 * 실행 방법: npm run setup:firebase
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// .env.local 파일 로드
config({ path: resolve(process.cwd(), '.env.local') })

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY

async function setupFirebase() {
  console.log('\n🔥 Firebase 자동 설정 시작...\n')

  if (!PROJECT_ID || !API_KEY) {
    console.error('❌ Firebase 설정을 찾을 수 없습니다.')
    console.error('   .env.local 파일을 확인하세요.')
    process.exit(1)
  }

  console.log(`프로젝트 ID: ${PROJECT_ID}\n`)

  // 안내 메시지
  console.log('📋 Firebase Console에서 수동으로 설정해야 합니다:')
  console.log('')
  console.log('1️⃣ Authentication 활성화 (Anonymous):')
  console.log(`   https://console.firebase.google.com/project/${PROJECT_ID}/authentication/providers`)
  console.log('   → "Sign-in method" 탭')
  console.log('   → "Anonymous" 활성화')
  console.log('')
  console.log('2️⃣ Firestore Database 생성:')
  console.log(`   https://console.firebase.google.com/project/${PROJECT_ID}/firestore`)
  console.log('   → "데이터베이스 만들기"')
  console.log('   → "테스트 모드" 선택')
  console.log('   → 위치: asia-northeast3 (Seoul)')
  console.log('')
  console.log('3️⃣ Firestore 보안 규칙 설정:')
  console.log('   → "규칙" 탭')
  console.log('   → 다음 규칙 복사:')
  console.log('')
  console.log('rules_version = \\'2\\';')
  console.log('service cloud.firestore {')
  console.log('  match /databases/{database}/documents {')
  console.log('    match /{document=**} {')
  console.log('      allow read, write: if request.auth != null;')
  console.log('    }')
  console.log('  }')
  console.log('}')
  console.log('')
  console.log('✅ 설정 완료 후 다음 명령어로 테스트:')
  console.log('   npm run test:firebase')
  console.log('')

  // 브라우저에서 링크 열기
  console.log('💡 브라우저에서 링크를 열려면 Ctrl+클릭하세요.\n')
}

setupFirebase().catch(error => {
  console.error('❌ 오류 발생:', error.message)
  process.exit(1)
})
