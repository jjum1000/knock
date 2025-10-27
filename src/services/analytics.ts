/**
 * 사용자 활동 추적 및 컨텍스트 수집 서비스
 *
 * 이 서비스는 사용자의 행동을 추적하고 Firestore에 저장합니다:
 * - 접속 기록 (로그인/로그아웃, 세션 시간)
 * - 페이지 방문 기록
 * - 노크 활동
 * - 대화 패턴
 * - 룸메이트 상호작용
 *
 * 수집된 데이터는 개인화된 경험 제공에 사용됩니다.
 */

import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

// ========================================
// Types
// ========================================

export enum EventType {
  // 세션 관련
  SESSION_START = 'session_start',
  SESSION_END = 'session_end',

  // 온보딩
  ONBOARDING_START = 'onboarding_start',
  ONBOARDING_STEP = 'onboarding_step',
  ONBOARDING_COMPLETE = 'onboarding_complete',

  // 노크
  KNOCK_ATTEMPT = 'knock_attempt',
  KNOCK_SUCCESS = 'knock_success',
  KNOCK_FAILED = 'knock_failed',

  // 대화
  CHAT_START = 'chat_start',
  CHAT_MESSAGE_SENT = 'chat_message_sent',
  CHAT_MESSAGE_RECEIVED = 'chat_message_received',
  CHAT_END = 'chat_end',

  // 룸메이트 상호작용
  ROOMMATE_VIEW = 'roommate_view',
  ROOMMATE_SELECT = 'roommate_select',

  // 기타
  ERROR_OCCURRED = 'error_occurred',
}

export interface AnalyticsEvent {
  id?: string
  userId: string
  eventType: EventType
  timestamp: Date
  metadata?: Record<string, any>
  sessionId?: string
  deviceInfo?: DeviceInfo
}

export interface DeviceInfo {
  userAgent: string
  platform: string
  screenWidth: number
  screenHeight: number
  language: string
}

export interface UserSession {
  id?: string
  userId: string
  sessionId: string
  startTime: Date
  endTime?: Date
  duration?: number // seconds
  events: number
  lastActivity: Date
}

export interface UserContext {
  userId: string
  totalSessions: number
  totalEvents: number
  lastSeen: Date
  onboardingCompleted: boolean
  knocksTotal: number
  messagesTotal: number
  favoriteRoommates: string[]
  averageSessionDuration: number // seconds
  preferredChatTimes: string[] // ['morning', 'afternoon', 'evening', 'night']
}

// ========================================
// Analytics Service
// ========================================

export const analyticsService = {
  /**
   * 이벤트 기록
   */
  async trackEvent(event: Omit<AnalyticsEvent, 'id' | 'timestamp'>): Promise<void> {
    try {
      await addDoc(collection(db, 'analytics_events'), {
        ...event,
        timestamp: serverTimestamp(),
        deviceInfo: event.deviceInfo || getDeviceInfo(),
      })
    } catch (error) {
      console.error('Failed to track event:', error)
      // Analytics 실패는 사용자 경험에 영향을 주지 않도록 조용히 실패
    }
  },

  /**
   * 세션 시작
   */
  async startSession(userId: string, sessionId: string): Promise<void> {
    await this.trackEvent({
      userId,
      eventType: EventType.SESSION_START,
      sessionId,
      metadata: {
        deviceInfo: getDeviceInfo(),
      },
    })

    // 세션 문서 생성
    await addDoc(collection(db, 'user_sessions'), {
      userId,
      sessionId,
      startTime: serverTimestamp(),
      events: 0,
      lastActivity: serverTimestamp(),
    })
  },

  /**
   * 세션 종료
   */
  async endSession(userId: string, sessionId: string): Promise<void> {
    await this.trackEvent({
      userId,
      eventType: EventType.SESSION_END,
      sessionId,
    })
  },

  /**
   * 사용자 컨텍스트 가져오기
   */
  async getUserContext(userId: string): Promise<UserContext | null> {
    try {
      // 최근 세션 가져오기
      const sessionsQuery = query(
        collection(db, 'user_sessions'),
        where('userId', '==', userId),
        orderBy('startTime', 'desc'),
        limit(30)
      )
      const sessionsSnapshot = await getDocs(sessionsQuery)
      const sessions = sessionsSnapshot.docs.map(doc => doc.data() as UserSession)

      // 최근 이벤트 가져오기
      const eventsQuery = query(
        collection(db, 'analytics_events'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(100)
      )
      const eventsSnapshot = await getDocs(eventsQuery)
      const events = eventsSnapshot.docs.map(doc => doc.data() as AnalyticsEvent)

      // 컨텍스트 분석
      const context: UserContext = {
        userId,
        totalSessions: sessions.length,
        totalEvents: events.length,
        lastSeen: sessions[0]?.lastActivity || new Date(),
        onboardingCompleted: events.some(e => e.eventType === EventType.ONBOARDING_COMPLETE),
        knocksTotal: events.filter(e => e.eventType === EventType.KNOCK_SUCCESS).length,
        messagesTotal: events.filter(e => e.eventType === EventType.CHAT_MESSAGE_SENT).length,
        favoriteRoommates: analyzeFavoriteRoommates(events),
        averageSessionDuration: calculateAverageSessionDuration(sessions),
        preferredChatTimes: analyzePreferredChatTimes(events),
      }

      return context
    } catch (error) {
      console.error('Failed to get user context:', error)
      return null
    }
  },

  /**
   * 최근 활동 가져오기
   */
  async getRecentActivity(userId: string, limitCount: number = 10): Promise<AnalyticsEvent[]> {
    try {
      const q = query(
        collection(db, 'analytics_events'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      )
      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AnalyticsEvent))
    } catch (error) {
      console.error('Failed to get recent activity:', error)
      return []
    }
  },
}

// ========================================
// Helper Functions
// ========================================

function getDeviceInfo(): DeviceInfo {
  if (typeof window === 'undefined') {
    return {
      userAgent: 'server',
      platform: 'server',
      screenWidth: 0,
      screenHeight: 0,
      language: 'en',
    }
  }

  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    language: navigator.language,
  }
}

function analyzeFavoriteRoommates(events: AnalyticsEvent[]): string[] {
  const roommateInteractions: Record<string, number> = {}

  events.forEach(event => {
    if (event.eventType === EventType.ROOMMATE_SELECT && event.metadata?.roommateId) {
      const roommateId = event.metadata.roommateId as string
      roommateInteractions[roommateId] = (roommateInteractions[roommateId] || 0) + 1
    }
  })

  return Object.entries(roommateInteractions)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([roommateId]) => roommateId)
}

function calculateAverageSessionDuration(sessions: UserSession[]): number {
  if (sessions.length === 0) return 0

  const totalDuration = sessions.reduce((sum, session) => sum + (session.duration || 0), 0)
  return Math.round(totalDuration / sessions.length)
}

function analyzePreferredChatTimes(events: AnalyticsEvent[]): string[] {
  const chatEvents = events.filter(e => e.eventType === EventType.CHAT_MESSAGE_SENT)

  const timeSlots = { morning: 0, afternoon: 0, evening: 0, night: 0 }

  chatEvents.forEach(event => {
    const hour = new Date(event.timestamp).getHours()

    if (hour >= 6 && hour < 12) timeSlots.morning++
    else if (hour >= 12 && hour < 18) timeSlots.afternoon++
    else if (hour >= 18 && hour < 22) timeSlots.evening++
    else timeSlots.night++
  })

  return Object.entries(timeSlots)
    .sort(([, a], [, b]) => b - a)
    .filter(([, count]) => count > 0)
    .map(([time]) => time)
}

// ========================================
// Session ID Generator
// ========================================

export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}
