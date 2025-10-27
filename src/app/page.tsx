'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/stores/useAppStore'
import { useFirebaseAuthStore } from '@/stores/useFirebaseAuthStore'
import { roommateService, messageService, knockService } from '@/services/firestore'
import { chatService } from '@/services/chat'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export default function Home() {
  const store = useAppStore()
  const authStore = useFirebaseAuthStore()
  const [isAITyping, setIsAITyping] = useState(false)

  // Initialize Firebase Auth
  useEffect(() => {
    authStore.initialize()
  }, [])

  // Real-time message listener for selected room
  useEffect(() => {
    if (!authStore.userId || !store.selectedRoom?.roommate?.id) {
      return
    }

    const unsubscribe = messageService.onConversationChange(
      authStore.userId,
      store.selectedRoom.roommate.id.toString(),
      (messages) => {
        // Sync Firestore messages to local store
        store.setChatMessages(messages.map(msg => ({
          id: msg.id,
          text: msg.content,
          sender: msg.sender === 'user' ? 'user' : 'roommate',
          timestamp: msg.createdAt,
        })))
      }
    )

    return () => unsubscribe()
  }, [authStore.userId, store.selectedRoom?.roommate?.id])

  // Load user's roommates from Firestore
  useEffect(() => {
    if (!authStore.userId || store.currentScreen !== 'main') {
      return
    }

    const loadRoommates = async () => {
      try {
        const roommates = await roommateService.getByUserId(authStore.userId!)
        console.log('Loaded roommates from Firestore:', roommates)
        // TODO: Sync roommates with local store rooms
      } catch (error) {
        console.error('Failed to load roommates:', error)
      }
    }

    loadRoommates()
  }, [authStore.userId, store.currentScreen])

  // Load user's knocks remaining on mount
  useEffect(() => {
    const loadKnocksRemaining = async () => {
      if (authStore.userId && store.currentScreen === 'main') {
        try {
          const remaining = await knockService.getKnocksRemaining(authStore.userId)
          store.setKnocksRemaining(remaining)
          console.log('Knocks remaining:', remaining)
        } catch (error) {
          console.error('Failed to load knocks:', error)
        }
      }
    }
    loadKnocksRemaining()
  }, [authStore.userId, store.currentScreen])

  // AI chat with OpenAI GPT
  useEffect(() => {
    const handleAIResponse = async () => {
      if (
        store.chatMessages.length > 0 &&
        store.chatMessages[store.chatMessages.length - 1].sender === 'user' &&
        !isAITyping &&
        store.selectedRoom?.roommate
      ) {
        setIsAITyping(true)

        try {
          // Convert chat messages to OpenAI format
          const chatMessages = store.chatMessages.map(msg => ({
            role: msg.sender === 'user' ? 'user' as const : 'assistant' as const,
            content: msg.text,
          }))

          const roommatePersonality = store.selectedRoom.roommate.personality || 'a friendly roommate'
          const response = await chatService.chat(chatMessages, roommatePersonality)

          // Save message to Firestore if authenticated
          if (authStore.userId && store.selectedRoom.roommate.id) {
            await messageService.create({
              userId: authStore.userId,
              roommateId: store.selectedRoom.roommate.id.toString(),
              sender: 'roommate',
              content: response,
            })
          }

          store.receiveMessage(response)
        } catch (error) {
          console.error('AI response failed:', error)
          store.receiveMessage("Sorry, I'm having trouble responding right now.")
        } finally {
          setIsAITyping(false)
        }
      }
    }

    const timer = setTimeout(handleAIResponse, 1000)
    return () => clearTimeout(timer)
  }, [store.chatMessages, store.selectedRoom, authStore.userId, isAITyping, store])

  // Onboarding screens
  const renderOnboarding = () => {
    const screens = [
      // Screen 0: Welcome
      <div key="welcome" className="pixel-container flex flex-col items-center justify-center gap-8 p-8 text-center">
        <div className="text-6xl mb-4">🏢</div>
        <h1 className="pixel-text text-4xl mb-4">Welcome to Knock</h1>
        <p className="pixel-text text-lg max-w-md">
          A place where loneliness fades away. Meet AI neighbors, build connections, one knock at a time.
        </p>
        <Button onClick={() => store.setOnboardingStep(1)} className="pixel-button mt-8">
          Get Started
        </Button>
      </div>,

      // Screen 1: How it works
      <div key="howto" className="pixel-container flex flex-col items-center justify-center gap-6 p-8 text-center">
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
        <Button onClick={() => store.setOnboardingStep(2)} className="pixel-button mt-8">
          Continue
        </Button>
      </div>,

      // Screen 2: User info
      <div key="userinfo" className="pixel-container flex flex-col items-center justify-center gap-6 p-8">
        <h2 className="pixel-text text-3xl mb-4">Tell us about yourself</h2>
        <div className="space-y-4 w-full max-w-sm">
          <div>
            <label className="pixel-text text-sm mb-2 block">Your Name</label>
            <Input
              value={store.userName}
              onChange={(e) => store.setUserName(e.target.value)}
              className="pixel-input"
              placeholder="Enter your name"
            />
          </div>
          <div>
            <label className="pixel-text text-sm mb-2 block">Your Age</label>
            <Input
              value={store.userAge}
              onChange={(e) => store.setUserAge(e.target.value)}
              className="pixel-input"
              type="number"
              placeholder="Enter your age"
            />
          </div>
        </div>
        <Button
          onClick={() => store.setOnboardingStep(3)}
          className="pixel-button mt-8"
          disabled={!store.userName || !store.userAge}
        >
          Next
        </Button>
      </div>,

      // Screen 3: Meet your first roommate
      <div key="firstroommate" className="pixel-container flex flex-col items-center justify-center gap-6 p-8 text-center">
        <h2 className="pixel-text text-3xl mb-4">Meet your first neighbor!</h2>
        <div className="text-6xl mb-4">{store.rooms[2].roommate?.avatar}</div>
        <div className="max-w-md">
          <h3 className="pixel-text text-2xl mb-2">{store.rooms[2].roommate?.name}</h3>
          <p className="pixel-text text-sm mb-4">{store.rooms[2].roommate?.bio}</p>
          <p className="pixel-text text-xs text-gray-400">{store.rooms[2].roommate?.personality}</p>
        </div>
        {authStore.error && (
          <div className="bg-red-500 text-white pixel-text text-xs px-4 py-2 rounded">
            {authStore.error}
          </div>
        )}
        <Button
          onClick={async () => {
            try {
              await authStore.registerUser(store.userName, parseInt(store.userAge))
              store.completeOnboarding()
            } catch (error) {
              console.error('Registration failed:', error)
            }
          }}
          className="pixel-button mt-8"
          disabled={authStore.isLoading}
        >
          {authStore.isLoading ? 'Creating Account...' : 'Enter the Building'}
        </Button>
      </div>,
    ]

    return (
      <div className="h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        {screens[store.onboardingStep]}
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
              <div className="pixel-text text-sm text-white">{authStore.userName || store.userName || "Player"}</div>
              <div className="pixel-text text-xs text-gray-400">Floor 1</div>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-slate-700 px-4 py-2 rounded border-2 border-slate-600">
            <span className="text-xl">🚪</span>
            <span className="pixel-text text-white">{store.knocksRemaining} Knock{store.knocksRemaining !== 1 ? 's' : ''} Left</span>
          </div>
        </div>

        {/* Main Content: Two Column Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Building with Rooms */}
          <div className="flex-1 overflow-y-auto py-8">
            <div className="flex flex-col-reverse items-center gap-2 min-h-full">
              {store.rooms.map((room) => (
                <div key={room.id} className="flex items-center gap-2 w-full max-w-2xl px-4">
                  {/* Floor number */}
                  <div className="w-16 text-center flex-shrink-0">
                    <div className="bg-slate-800 border-2 border-slate-700 px-2 py-1 rounded">
                      <span className="pixel-text text-white text-sm">{room.floor}F</span>
                    </div>
                  </div>

                  {/* Room */}
                  <Card
                    className={`flex-1 h-32 ${room.bgColor} border-4 border-slate-800 cursor-pointer transition-transform hover:scale-105 ${room.isBlackedOut ? 'opacity-80' : ''} ${store.selectedRoom?.id === room.id ? 'ring-4 ring-yellow-400' : ''}`}
                    onClick={() => !room.isBlackedOut && room.roommate && store.selectRoom(room)}
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
                onClick={async () => {
                  if (authStore.userId) {
                    try {
                      // Check knocks remaining
                      const remaining = await knockService.getKnocksRemaining(authStore.userId)
                      if (remaining <= 0) {
                        alert('No knocks left today! Come back tomorrow.')
                        return
                      }

                      // Perform knock
                      store.knock()

                      // Find the room number that was revealed
                      const revealedRoom = store.rooms.find(r => !r.isBlackedOut)?.floor || 1

                      // Save knock to Firestore
                      await knockService.create({
                        userId: authStore.userId,
                        roomRevealed: revealedRoom,
                      })

                      // Create roommate in Firestore
                      const roomWithRoommate = store.rooms.find(r => r.floor === revealedRoom)
                      if (roomWithRoommate?.roommate) {
                        await roommateService.create({
                          name: roomWithRoommate.roommate.name,
                          age: roomWithRoommate.roommate.age,
                          bio: roomWithRoommate.roommate.bio || '',
                          personality: roomWithRoommate.roommate.personality || '',
                          avatar: roomWithRoommate.roommate.avatar || '👤',
                          interests: [],
                          userId: authStore.userId,
                          isFirstMate: false,
                        })
                      }
                    } catch (error) {
                      console.error('Knock failed:', error)
                      alert('Failed to knock. Please try again.')
                    }
                  } else {
                    store.knock()
                  }
                }}
                disabled={store.knocksRemaining <= 0}
                className="pixel-button text-xl py-6 px-12"
                size="lg"
              >
                <span className="mr-2">🚪</span>
                {store.knocksRemaining > 0 ? 'Knock!' : 'No Knocks Left'}
              </Button>
            </div>
          </div>

          {/* Right: Chat Sidebar */}
          <div className="w-96 bg-slate-800 border-l-4 border-slate-900 flex flex-col">
            {/* Chat Header */}
            <div className="p-4 border-b-4 border-slate-900">
              {store.selectedRoom ? (
                <div className="flex items-center gap-3">
                  <div className="text-4xl">{store.selectedRoom.roommate?.avatar}</div>
                  <div>
                    <div className="pixel-text text-white text-lg">{store.selectedRoom.roommate?.name}</div>
                    <div className="pixel-text text-xs text-gray-400">{store.selectedRoom.theme}</div>
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
              {store.chatMessages.length === 0 ? (
                <div className="text-center py-8">
                  <p className="pixel-text text-sm text-gray-400">
                    {store.selectedRoom ? 'Say hello to start chatting!' : 'Click on a room to start a conversation'}
                  </p>
                </div>
              ) : (
                store.chatMessages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] px-4 py-3 border-4 border-black ${
                      msg.sender === 'user'
                        ? 'bg-cyan-400'
                        : 'bg-white'
                    }`}>
                      <p className="pixel-text text-xs">
                        <span className="font-bold">{msg.sender === 'user' ? 'You' : store.selectedRoom?.roommate?.name}:</span>
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
                  value={store.chatInput}
                  onChange={(e) => store.setChatInput(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter') {
                      const message = store.chatInput
                      store.sendMessage()
                      // Save to Firestore
                      if (authStore.userId && store.selectedRoom?.roommate?.id && message.trim()) {
                        try {
                          await messageService.create({
                            userId: authStore.userId,
                            roommateId: store.selectedRoom.roommate.id.toString(),
                            sender: 'user',
                            content: message,
                          })
                        } catch (error) {
                          console.error('Failed to save message:', error)
                        }
                      }
                    }
                  }}
                  className="pixel-input flex-1 bg-white"
                  placeholder={store.selectedRoom ? "Type your message..." : "Select a room first..."}
                  disabled={!store.selectedRoom || isAITyping}
                />
                <Button
                  onClick={async () => {
                    const message = store.chatInput
                    store.sendMessage()
                    // Save to Firestore
                    if (authStore.userId && store.selectedRoom?.roommate?.id && message.trim()) {
                      try {
                        await messageService.create({
                          userId: authStore.userId,
                          roommateId: store.selectedRoom.roommate.id.toString(),
                          sender: 'user',
                          content: message,
                        })
                      } catch (error) {
                        console.error('Failed to save message:', error)
                      }
                    }
                  }}
                  className="bg-cyan-400 hover:bg-cyan-500 border-4 border-black text-black pixel-text px-6"
                  disabled={!store.selectedRoom || isAITyping}
                >
                  {isAITyping ? '...' : '▶'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return store.currentScreen === 'onboarding' ? renderOnboarding() : renderMainView()
}
