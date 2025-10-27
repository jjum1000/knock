import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

// Type definitions
export interface User {
  id: string
  name: string
  age: number
  createdAt: Date
}

export interface Roommate {
  id: string
  name: string
  age: number
  bio: string
  personality: string
  avatar: string
  interests: string[]
  userId: string
  isFirstMate: boolean
  createdAt: Date
}

export interface Message {
  id: string
  userId: string
  roommateId: string
  sender: 'user' | 'roommate'
  content: string
  createdAt: Date
}

export interface Knock {
  id: string
  userId: string
  knockedAt: Date
  roomRevealed: number
}

// User Service
export const userService = {
  async create(data: Omit<User, 'id' | 'createdAt'>) {
    const docRef = await addDoc(collection(db, 'users'), {
      ...data,
      createdAt: serverTimestamp(),
    })
    return { id: docRef.id, ...data, createdAt: new Date() }
  },

  async get(id: string): Promise<User | null> {
    const docRef = doc(db, 'users', id)
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as User
    }
    return null
  },

  async findByName(name: string): Promise<User | null> {
    const q = query(collection(db, 'users'), where('name', '==', name), limit(1))
    const querySnapshot = await getDocs(q)
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0]
      return { id: doc.id, ...doc.data() } as User
    }
    return null
  },
}

// Roommate Service
export const roommateService = {
  async create(data: Omit<Roommate, 'id' | 'createdAt'>) {
    const docRef = await addDoc(collection(db, 'roommates'), {
      ...data,
      createdAt: serverTimestamp(),
    })
    return { id: docRef.id, ...data, createdAt: new Date() }
  },

  async getByUserId(userId: string): Promise<Roommate[]> {
    const q = query(collection(db, 'roommates'), where('userId', '==', userId))
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Roommate[]
  },

  async get(id: string): Promise<Roommate | null> {
    const docRef = doc(db, 'roommates', id)
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Roommate
    }
    return null
  },

  // Real-time listener for user's roommates
  onRoommatesChange(userId: string, callback: (roommates: Roommate[]) => void): Unsubscribe {
    const q = query(collection(db, 'roommates'), where('userId', '==', userId))

    return onSnapshot(q, (snapshot) => {
      const roommates = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as Roommate[]
      callback(roommates)
    })
  },
}

// Message Service
export const messageService = {
  async create(data: Omit<Message, 'id' | 'createdAt'>) {
    const docRef = await addDoc(collection(db, 'messages'), {
      ...data,
      createdAt: serverTimestamp(),
    })
    return { id: docRef.id, ...data, createdAt: new Date() }
  },

  async getConversation(userId: string, roommateId: string): Promise<Message[]> {
    const q = query(
      collection(db, 'messages'),
      where('userId', '==', userId),
      where('roommateId', '==', roommateId),
      orderBy('createdAt', 'asc')
    )
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Message[]
  },

  // Real-time listener for conversation
  onConversationChange(
    userId: string,
    roommateId: string,
    callback: (messages: Message[]) => void
  ): Unsubscribe {
    const q = query(
      collection(db, 'messages'),
      where('userId', '==', userId),
      where('roommateId', '==', roommateId),
      orderBy('createdAt', 'asc')
    )

    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as Message[]
      callback(messages)
    })
  },
}

// Knock Service
export const knockService = {
  async create(data: Omit<Knock, 'id' | 'knockedAt'>) {
    const docRef = await addDoc(collection(db, 'knocks'), {
      ...data,
      knockedAt: serverTimestamp(),
    })
    return { id: docRef.id, ...data, knockedAt: new Date() }
  },

  async getTodayKnocks(userId: string): Promise<number> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const q = query(
      collection(db, 'knocks'),
      where('userId', '==', userId),
      where('knockedAt', '>=', Timestamp.fromDate(today))
    )
    const querySnapshot = await getDocs(q)
    return querySnapshot.size
  },

  async getKnocksRemaining(userId: string): Promise<number> {
    const todayKnocks = await this.getTodayKnocks(userId)
    return Math.max(0, 1 - todayKnocks) // 1 knock per day
  },
}
