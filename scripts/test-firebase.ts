/**
 * Firebase 연결 테스트 스크립트
 *
 * 실행 방법:
 * npm run test:firebase
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { initializeApp, getApps } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore'

// .env.local 파일 로드
config({ path: resolve(process.cwd(), '.env.local') })

// 환경 변수 로드
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

async function testFirebaseConnection() {
  console.log('\n🔥 Firebase 연결 테스트 시작...\n')

  // Step 1: Config 확인
  console.log('✅ Step 1: Firebase Config 확인')
  const missingKeys = Object.entries(firebaseConfig)
    .filter(([_, value]) => !value || value.includes('your-') || value.includes('placeholder'))
    .map(([key]) => key)

  if (missingKeys.length > 0) {
    console.error('❌ 다음 환경 변수가 설정되지 않았습니다:')
    missingKeys.forEach(key => console.error(`   - ${key}`))
    console.log('\n📝 .env.local 파일을 확인하고 SETUP_GUIDE.md를 참조하세요.\n')
    process.exit(1)
  }
  console.log('   ✓ 모든 Firebase Config 값이 설정되었습니다.\n')

  // Step 2: Firebase 초기화
  console.log('✅ Step 2: Firebase 앱 초기화')
  try {
    let app
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig)
    } else {
      app = getApps()[0]
    }
    console.log(`   ✓ Firebase 앱 초기화 성공 (Project: ${firebaseConfig.projectId})\n`)
  } catch (error: any) {
    console.error('❌ Firebase 초기화 실패:', error.message)
    process.exit(1)
  }

  // Step 3: Authentication 테스트
  console.log('✅ Step 3: Firebase Authentication 테스트')
  try {
    const auth = getAuth()
    const userCredential = await signInAnonymously(auth)
    console.log(`   ✓ 익명 로그인 성공 (UID: ${userCredential.user.uid})`)
    console.log('   ℹ Firebase Console → Authentication → Users에서 확인 가능\n')
  } catch (error: any) {
    console.error('❌ Authentication 실패:', error.message)
    console.log('   → Firebase Console에서 익명 로그인이 활성화되어 있는지 확인하세요.')
    process.exit(1)
  }

  // Step 4: Firestore 테스트
  console.log('✅ Step 4: Firestore Database 테스트')
  try {
    const db = getFirestore()

    // 테스트 문서 생성
    const testData = {
      test: true,
      message: 'Firebase connection test',
      timestamp: new Date().toISOString(),
    }
    const docRef = await addDoc(collection(db, '_test_connection'), testData)
    console.log(`   ✓ Firestore 쓰기 성공 (Doc ID: ${docRef.id})`)

    // 테스트 문서 읽기
    const querySnapshot = await getDocs(collection(db, '_test_connection'))
    console.log(`   ✓ Firestore 읽기 성공 (${querySnapshot.size}개 문서)`)

    // 테스트 문서 삭제
    await deleteDoc(doc(db, '_test_connection', docRef.id))
    console.log('   ✓ Firestore 삭제 성공')
    console.log('   ℹ Firebase Console → Firestore Database에서 데이터 확인 가능\n')
  } catch (error: any) {
    console.error('❌ Firestore 실패:', error.message)
    if (error.code === 'permission-denied') {
      console.log('   → Firestore 보안 규칙을 확인하세요. (SETUP_GUIDE.md Step 3.4)')
    }
    process.exit(1)
  }

  // Step 5: Gemini API 테스트
  console.log('✅ Step 5: Google Gemini API 테스트')
  const geminiApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY

  if (!geminiApiKey || geminiApiKey.includes('your-') || geminiApiKey.includes('placeholder')) {
    console.warn('⚠️  Gemini API 키가 설정되지 않았습니다.')
    console.log('   → SETUP_GUIDE.md Step 5를 참조하여 API 키를 발급받으세요.')
    console.log('   → 앱은 작동하지만 AI 응답은 Mock 데이터를 사용합니다.\n')
  } else {
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai')
      const genAI = new GoogleGenerativeAI(geminiApiKey)
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

      const result = await model.generateContent('Say hello in one word')
      const response = await result.response
      const text = response.text()

      console.log(`   ✓ Gemini API 연결 성공`)
      console.log(`   ℹ 테스트 응답: "${text}"\n`)
    } catch (error: any) {
      console.error('❌ Gemini API 실패:', error.message)
      console.log('   → API 키가 올바른지 확인하세요.')
      console.log('   → Google AI Studio에서 할당량을 확인하세요.')
      console.log('   → 앱은 작동하지만 AI 응답은 Mock 데이터를 사용합니다.\n')
    }
  }

  // 완료
  console.log('🎉 Firebase 연결 테스트 완료!\n')
  console.log('✨ 다음 단계:')
  console.log('   1. 개발 서버 실행: npm run dev')
  console.log('   2. http://localhost:3002 접속')
  console.log('   3. 온보딩 플로우 완료')
  console.log('   4. Firebase Console에서 데이터 확인\n')

  process.exit(0)
}

// 실행
testFirebaseConnection().catch((error) => {
  console.error('\n💥 예상치 못한 오류 발생:', error)
  process.exit(1)
})
