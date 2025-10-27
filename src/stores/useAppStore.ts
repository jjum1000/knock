import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { Room, Message } from '@/types'

// Mock data
export const ROOMMATE_POOL = [
  { id: 1, name: "Luna", age: 24, bio: "Artist who loves coffee", personality: "Creative and introspective", avatar: "🎨" },
  { id: 2, name: "Max", age: 28, bio: "Game developer", personality: "Playful and passionate", avatar: "🎮" },
  { id: 3, name: "Sofia", age: 26, bio: "Book lover and writer", personality: "Thoughtful and curious", avatar: "📚" },
  { id: 4, name: "Kai", age: 25, bio: "Musician and night owl", personality: "Chill and creative", avatar: "🎸" },
  { id: 5, name: "Emma", age: 27, bio: "Chef and foodie", personality: "Warm and nurturing", avatar: "👩‍🍳" },
  { id: 6, name: "Leo", age: 29, bio: "Photographer", personality: "Adventurous and observant", avatar: "📷" },
  { id: 7, name: "Mia", age: 23, bio: "Yoga instructor", personality: "Calm and positive", avatar: "🧘‍♀️" },
  { id: 8, name: "Noah", age: 30, bio: "Architect", personality: "Precise and imaginative", avatar: "🏛️" },
]

export const ROOM_THEMES = [
  { theme: "Coffee Shop", bgColor: "bg-amber-700" },
  { theme: "Game Den", bgColor: "bg-purple-800" },
  { theme: "Library", bgColor: "bg-blue-900" },
  { theme: "Music Studio", bgColor: "bg-red-900" },
  { theme: "Kitchen", bgColor: "bg-orange-700" },
  { theme: "Photo Studio", bgColor: "bg-gray-700" },
  { theme: "Yoga Room", bgColor: "bg-green-700" },
  { theme: "Office", bgColor: "bg-slate-700" },
]

const initialRooms: Room[] = [
  { id: 1, floor: 5, isBlackedOut: true, roommate: null, theme: "", bgColor: "bg-gray-900" },
  { id: 2, floor: 4, isBlackedOut: true, roommate: null, theme: "", bgColor: "bg-gray-900" },
  { id: 3, floor: 3, isBlackedOut: false, roommate: ROOMMATE_POOL[0], theme: "Coffee Shop", bgColor: "bg-amber-700" },
  { id: 4, floor: 2, isBlackedOut: true, roommate: null, theme: "", bgColor: "bg-gray-900" },
  { id: 5, floor: 1, isBlackedOut: false, roommate: { id: 0, name: "You", age: 25, bio: "Your roommate", personality: "Friendly", avatar: "🏠" }, theme: "My Room", bgColor: "bg-blue-800" },
]

interface AppState {
  // Onboarding
  currentScreen: 'onboarding' | 'main'
  onboardingStep: number
  userName: string
  userAge: string

  // Main app
  rooms: Room[]
  knocksRemaining: number
  selectedRoom: Room | null
  chatMessages: Message[]
  chatInput: string

  // Actions
  setOnboardingStep: (step: number) => void
  setUserName: (name: string) => void
  setUserAge: (age: string) => void
  completeOnboarding: () => void
  knock: () => void
  selectRoom: (room: Room | null) => void
  setChatInput: (input: string) => void
  sendMessage: () => void
  receiveMessage: (text: string) => void
  resetApp: () => void
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        currentScreen: 'onboarding',
        onboardingStep: 0,
        userName: '',
        userAge: '',
        rooms: initialRooms,
        knocksRemaining: 1,
        selectedRoom: null,
        chatMessages: [],
        chatInput: '',

        // Actions
        setOnboardingStep: (step) => set({ onboardingStep: step }),

        setUserName: (name) => set({ userName: name }),

        setUserAge: (age) => set({ userAge: age }),

        completeOnboarding: () => set({ currentScreen: 'main', onboardingStep: 4 }),

        knock: () => {
          const { knocksRemaining, rooms } = get()
          if (knocksRemaining <= 0) return

          const blackedOutRooms = rooms.filter(r => r.isBlackedOut)
          if (blackedOutRooms.length === 0) return

          const roomToReveal = blackedOutRooms[0]
          const randomRoommate = ROOMMATE_POOL[Math.floor(Math.random() * ROOMMATE_POOL.length)]
          const randomTheme = ROOM_THEMES[Math.floor(Math.random() * ROOM_THEMES.length)]

          const updatedRooms = rooms.map(room =>
            room.id === roomToReveal.id
              ? { ...room, isBlackedOut: false, roommate: randomRoommate, theme: randomTheme.theme, bgColor: randomTheme.bgColor }
              : room
          )

          set({ rooms: updatedRooms, knocksRemaining: knocksRemaining - 1 })
        },

        selectRoom: (room) => set({ selectedRoom: room, chatMessages: [] }),

        setChatInput: (input) => set({ chatInput: input }),

        sendMessage: () => {
          const { chatInput, chatMessages } = get()
          if (!chatInput.trim()) return

          const newMessage: Message = {
            id: chatMessages.length + 1,
            sender: 'user',
            text: chatInput,
            timestamp: new Date()
          }

          set({ chatMessages: [...chatMessages, newMessage], chatInput: '' })
        },

        receiveMessage: (text) => {
          const { chatMessages } = get()
          const newMessage: Message = {
            id: chatMessages.length + 1,
            sender: 'roommate',
            text,
            timestamp: new Date()
          }

          set({ chatMessages: [...chatMessages, newMessage] })
        },

        resetApp: () => set({
          currentScreen: 'onboarding',
          onboardingStep: 0,
          userName: '',
          userAge: '',
          rooms: initialRooms,
          knocksRemaining: 1,
          selectedRoom: null,
          chatMessages: [],
          chatInput: '',
        }),
      }),
      { name: 'knock-app-store' }
    )
  )
)
