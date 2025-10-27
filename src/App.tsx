import { useReducer, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import './App.css'

// Types
type Room = {
  id: number
  floor: number
  isBlackedOut: boolean
  roommate: Roommate | null
  theme: string
  bgColor: string
}

type Roommate = {
  id: number
  name: string
  age: number
  bio: string
  personality: string
  avatar: string
}

type Message = {
  id: number
  sender: 'user' | 'roommate'
  text: string
  timestamp: Date
}

type AppState = {
  currentScreen: 'onboarding' | 'main'
  onboardingStep: number
  userName: string
  userAge: string
  rooms: Room[]
  knocksRemaining: number
  selectedRoom: Room | null
  chatMessages: Message[]
  chatInput: string
}

type Action =
  | { type: 'NEXT_ONBOARDING_STEP' }
  | { type: 'SET_USER_NAME'; payload: string }
  | { type: 'SET_USER_AGE'; payload: string }
  | { type: 'COMPLETE_ONBOARDING' }
  | { type: 'KNOCK' }
  | { type: 'SELECT_ROOM'; payload: Room | null }
  | { type: 'SET_CHAT_INPUT'; payload: string }
  | { type: 'SEND_MESSAGE' }
  | { type: 'RECEIVE_MESSAGE'; payload: string }

// Mock data
const ROOMMATE_POOL: Roommate[] = [
  { id: 1, name: "Luna", age: 24, bio: "Artist who loves coffee", personality: "Creative and introspective", avatar: "🎨" },
  { id: 2, name: "Max", age: 28, bio: "Game developer", personality: "Playful and passionate", avatar: "🎮" },
  { id: 3, name: "Sofia", age: 26, bio: "Book lover and writer", personality: "Thoughtful and curious", avatar: "📚" },
  { id: 4, name: "Kai", age: 25, bio: "Musician and night owl", personality: "Chill and creative", avatar: "🎸" },
  { id: 5, name: "Emma", age: 27, bio: "Chef and foodie", personality: "Warm and nurturing", avatar: "👩‍🍳" },
  { id: 6, name: "Leo", age: 29, bio: "Photographer", personality: "Adventurous and observant", avatar: "📷" },
  { id: 7, name: "Mia", age: 23, bio: "Yoga instructor", personality: "Calm and positive", avatar: "🧘‍♀️" },
  { id: 8, name: "Noah", age: 30, bio: "Architect", personality: "Precise and imaginative", avatar: "🏛️" },
]

const ROOM_THEMES = [
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

const AI_RESPONSES: Record<string, string[]> = {
  greeting: ["Hey! How's it going?", "Hi there! Nice to meet you!", "Hello! Welcome to my room!"],
  hobby: ["I love what I do! It's my passion.", "I spend most of my free time on this.", "Want to know more about it?"],
  question: ["That's an interesting question!", "Hmm, let me think about that...", "I'm curious what you think?"],
  default: ["That's cool!", "Tell me more!", "Interesting perspective!", "I see what you mean."],
}

// Reducer
function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'NEXT_ONBOARDING_STEP':
      return { ...state, onboardingStep: state.onboardingStep + 1 }

    case 'SET_USER_NAME':
      return { ...state, userName: action.payload }

    case 'SET_USER_AGE':
      return { ...state, userAge: action.payload }

    case 'COMPLETE_ONBOARDING':
      return { ...state, currentScreen: 'main', onboardingStep: 4 }

    case 'KNOCK': {
      if (state.knocksRemaining <= 0) return state

      const blackedOutRooms = state.rooms.filter(r => r.isBlackedOut)
      if (blackedOutRooms.length === 0) return state

      const roomToReveal = blackedOutRooms[0]
      const randomRoommate = ROOMMATE_POOL[Math.floor(Math.random() * ROOMMATE_POOL.length)]
      const randomTheme = ROOM_THEMES[Math.floor(Math.random() * ROOM_THEMES.length)]

      const updatedRooms = state.rooms.map(room =>
        room.id === roomToReveal.id
          ? { ...room, isBlackedOut: false, roommate: randomRoommate, theme: randomTheme.theme, bgColor: randomTheme.bgColor }
          : room
      )

      return { ...state, rooms: updatedRooms, knocksRemaining: state.knocksRemaining - 1 }
    }

    case 'SELECT_ROOM':
      return { ...state, selectedRoom: action.payload, chatMessages: [] }

    case 'SET_CHAT_INPUT':
      return { ...state, chatInput: action.payload }

    case 'SEND_MESSAGE': {
      if (!state.chatInput.trim()) return state

      const newMessage: Message = {
        id: state.chatMessages.length + 1,
        sender: 'user',
        text: state.chatInput,
        timestamp: new Date()
      }

      return { ...state, chatMessages: [...state.chatMessages, newMessage], chatInput: '' }
    }

    case 'RECEIVE_MESSAGE': {
      const newMessage: Message = {
        id: state.chatMessages.length + 1,
        sender: 'roommate',
        text: action.payload,
        timestamp: new Date()
      }

      return { ...state, chatMessages: [...state.chatMessages, newMessage] }
    }

    default:
      return state
  }
}

function App() {
  const [state, dispatch] = useReducer(appReducer, {
    currentScreen: 'onboarding',
    onboardingStep: 0,
    userName: '',
    userAge: '',
    rooms: initialRooms,
    knocksRemaining: 1,
    selectedRoom: null,
    chatMessages: [],
    chatInput: '',
  })

  // Auto-respond to user messages
  useEffect(() => {
    if (state.chatMessages.length > 0 && state.chatMessages[state.chatMessages.length - 1].sender === 'user') {
      const timer = setTimeout(() => {
        const lastMessage = state.chatMessages[state.chatMessages.length - 1].text.toLowerCase()
        let responseCategory = 'default'

        if (lastMessage.includes('hi') || lastMessage.includes('hello') || lastMessage.includes('hey')) {
          responseCategory = 'greeting'
        } else if (lastMessage.includes('do') || lastMessage.includes('hobby') || lastMessage.includes('like')) {
          responseCategory = 'hobby'
        } else if (lastMessage.includes('?')) {
          responseCategory = 'question'
        }

        const responses = AI_RESPONSES[responseCategory]
        const randomResponse = responses[Math.floor(Math.random() * responses.length)]
        dispatch({ type: 'RECEIVE_MESSAGE', payload: randomResponse })
      }, 1000)

      return () => clearTimeout(timer)
    }
  }, [state.chatMessages])

  // Onboarding screens
  const renderOnboarding = () => {
    const screens = [
      // Screen 0: Welcome
      <div className="pixel-container flex flex-col items-center justify-center gap-8 p-8 text-center">
        <div className="text-6xl mb-4">🏢</div>
        <h1 className="pixel-text text-4xl mb-4">Welcome to Knock</h1>
        <p className="pixel-text text-lg max-w-md">
          A place where loneliness fades away. Meet AI neighbors, build connections, one knock at a time.
        </p>
        <Button onClick={() => dispatch({ type: 'NEXT_ONBOARDING_STEP' })} className="pixel-button mt-8">
          Get Started
        </Button>
      </div>,

      // Screen 1: How it works
      <div className="pixel-container flex flex-col items-center justify-center gap-6 p-8 text-center">
        <h2 className="pixel-text text-3xl mb-4">How it works</h2>
        <div className="space-y-4 max-w-md">
          <div className="flex items-start gap-4">
            <span className="text-3xl">🚪</span>
            <div className="text-left">
              <h3 className="pixel-text text-xl">Knock Once Daily</h3>
              <p className="pixel-text text-sm">Discover a new neighbor each day</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <span className="text-3xl">💬</span>
            <div className="text-left">
              <h3 className="pixel-text text-xl">Have Real Conversations</h3>
              <p className="pixel-text text-sm">Chat with AI roommates anytime</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <span className="text-3xl">❤️</span>
            <div className="text-left">
              <h3 className="pixel-text text-xl">Build Relationships</h3>
              <p className="pixel-text text-sm">Your connections grow over time</p>
            </div>
          </div>
        </div>
        <Button onClick={() => dispatch({ type: 'NEXT_ONBOARDING_STEP' })} className="pixel-button mt-8">
          Continue
        </Button>
      </div>,

      // Screen 2: User info
      <div className="pixel-container flex flex-col items-center justify-center gap-6 p-8">
        <h2 className="pixel-text text-3xl mb-4">Tell us about yourself</h2>
        <div className="space-y-4 w-full max-w-sm">
          <div>
            <label className="pixel-text text-sm mb-2 block">Your Name</label>
            <Input
              value={state.userName}
              onChange={(e) => dispatch({ type: 'SET_USER_NAME', payload: e.target.value })}
              className="pixel-input"
              placeholder="Enter your name"
            />
          </div>
          <div>
            <label className="pixel-text text-sm mb-2 block">Your Age</label>
            <Input
              value={state.userAge}
              onChange={(e) => dispatch({ type: 'SET_USER_AGE', payload: e.target.value })}
              className="pixel-input"
              type="number"
              placeholder="Enter your age"
            />
          </div>
        </div>
        <Button
          onClick={() => dispatch({ type: 'NEXT_ONBOARDING_STEP' })}
          className="pixel-button mt-8"
          disabled={!state.userName || !state.userAge}
        >
          Next
        </Button>
      </div>,

      // Screen 3: Meet your first roommate
      <div className="pixel-container flex flex-col items-center justify-center gap-6 p-8 text-center">
        <h2 className="pixel-text text-3xl mb-4">Meet your first neighbor!</h2>
        <div className="text-6xl mb-4">{initialRooms[2].roommate?.avatar}</div>
        <div className="max-w-md">
          <h3 className="pixel-text text-2xl mb-2">{initialRooms[2].roommate?.name}</h3>
          <p className="pixel-text text-sm mb-4">{initialRooms[2].roommate?.bio}</p>
          <p className="pixel-text text-xs text-gray-400">{initialRooms[2].roommate?.personality}</p>
        </div>
        <Button onClick={() => dispatch({ type: 'COMPLETE_ONBOARDING' })} className="pixel-button mt-8">
          Enter the Building
        </Button>
      </div>,
    ]

    return (
      <div className="h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        {screens[state.onboardingStep]}
      </div>
    )
  }

  // Main building view
  const renderMainView = () => {
    return (
      <div className="h-screen w-full bg-sky-400 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-slate-800 border-b-4 border-slate-900 p-4 flex justify-between items-center z-10">
          <div className="flex items-center gap-2">
            <div className="text-2xl">👤</div>
            <div>
              <div className="pixel-text text-sm text-white">{state.userName || "Player"}</div>
              <div className="pixel-text text-xs text-gray-400">Floor 1</div>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-slate-700 px-4 py-2 rounded border-2 border-slate-600">
            <span className="text-xl">🚪</span>
            <span className="pixel-text text-white">{state.knocksRemaining} Knock{state.knocksRemaining !== 1 ? 's' : ''} Left</span>
          </div>
        </div>

        {/* Main Content: Two Column Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Building with Rooms */}
          <div className="flex-1 overflow-y-auto py-8">
            <div className="flex flex-col-reverse items-center gap-2 min-h-full">
              {state.rooms.map((room) => (
                <div key={room.id} className="flex items-center gap-2 w-full max-w-2xl px-4">
                  {/* Floor number */}
                  <div className="w-16 text-center flex-shrink-0">
                    <div className="bg-slate-800 border-2 border-slate-700 px-2 py-1 rounded">
                      <span className="pixel-text text-white text-sm">{room.floor}F</span>
                    </div>
                  </div>

                  {/* Room */}
                  <Card
                    className={`flex-1 h-32 ${room.bgColor} border-4 border-slate-800 cursor-pointer transition-transform hover:scale-105 ${room.isBlackedOut ? 'opacity-80' : ''} ${state.selectedRoom?.id === room.id ? 'ring-4 ring-yellow-400' : ''}`}
                    onClick={() => !room.isBlackedOut && room.roommate && dispatch({ type: 'SELECT_ROOM', payload: room })}
                  >
                    <div className="h-full flex items-center justify-between p-4 relative">
                      {room.isBlackedOut ? (
                        <div className="text-center w-full">
                          <div className="text-4xl mb-2">❓</div>
                          <div className="pixel-text text-white text-xs">Blacked Out</div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4 w-full">
                          <div className="text-5xl">{room.roommate?.avatar}</div>
                          <div className="flex-1">
                            <div className="pixel-text text-white text-lg">{room.roommate?.name}</div>
                            <div className="pixel-text text-white text-xs opacity-80">{room.theme}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              ))}
            </div>

            {/* Knock Button - Bottom of Left Column */}
            <div className="flex justify-center py-6">
              <Button
                onClick={() => dispatch({ type: 'KNOCK' })}
                disabled={state.knocksRemaining <= 0}
                className="pixel-button text-xl py-6 px-12"
                size="lg"
              >
                <span className="mr-2">🚪</span>
                {state.knocksRemaining > 0 ? 'Knock!' : 'No Knocks Left'}
              </Button>
            </div>
          </div>

          {/* Right: Chat Sidebar */}
          <div className="w-96 bg-slate-800 border-l-4 border-slate-900 flex flex-col">
            {/* Chat Header */}
            <div className="p-4 border-b-4 border-slate-900">
              {state.selectedRoom ? (
                <div className="flex items-center gap-3">
                  <div className="text-4xl">{state.selectedRoom.roommate?.avatar}</div>
                  <div>
                    <div className="pixel-text text-white text-lg">{state.selectedRoom.roommate?.name}</div>
                    <div className="pixel-text text-xs text-gray-400">{state.selectedRoom.theme}</div>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="pixel-text text-white text-sm">Select a room to chat</div>
                </div>
              )}
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {state.chatMessages.length === 0 ? (
                <div className="text-center py-8">
                  <p className="pixel-text text-sm text-gray-400">
                    {state.selectedRoom ? 'Say hello to start chatting!' : 'Click on a room to start a conversation'}
                  </p>
                </div>
              ) : (
                state.chatMessages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] px-4 py-3 border-4 border-black ${
                      msg.sender === 'user'
                        ? 'bg-cyan-400'
                        : 'bg-white'
                    }`}>
                      <p className="pixel-text text-xs">
                        <span className="font-bold">{msg.sender === 'user' ? 'You' : state.selectedRoom?.roommate?.name}:</span>
                        <br />
                        {msg.text}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t-4 border-slate-900">
              <div className="flex gap-2">
                <Input
                  value={state.chatInput}
                  onChange={(e) => dispatch({ type: 'SET_CHAT_INPUT', payload: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && dispatch({ type: 'SEND_MESSAGE' })}
                  className="pixel-input flex-1 bg-white"
                  placeholder={state.selectedRoom ? "Type your message..." : "Select a room first..."}
                  disabled={!state.selectedRoom}
                />
                <Button
                  onClick={() => dispatch({ type: 'SEND_MESSAGE' })}
                  className="bg-cyan-400 hover:bg-cyan-500 border-4 border-black text-black pixel-text px-6"
                  disabled={!state.selectedRoom}
                >
                  ▶
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return state.currentScreen === 'onboarding' ? renderOnboarding() : renderMainView()
}

export default App
