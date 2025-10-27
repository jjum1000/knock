import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'

interface Roommate {
  id: number
  name: string
  emoji: string
  lastMessage: string
  time: string
  unread: number
}

interface Message {
  id: number
  sender: 'user' | 'roommate'
  text: string
  time: string
}

const mockRoommates: Roommate[] = [
  { id: 1, name: 'Alex', emoji: '🎮', lastMessage: '너 뭐해? 같이 게임할래?', time: '14:23', unread: 1 },
  { id: 2, name: 'Emma', emoji: '📚', lastMessage: '안녕!', time: '어제', unread: 0 },
  { id: 3, name: 'James', emoji: '☕', lastMessage: '좋은 아침!', time: '3일전', unread: 0 },
]

const mockMessages: Message[] = [
  { id: 1, sender: 'roommate', text: '너 오늘 뭐해? 같이 게임할래?', time: '14:23' },
  { id: 2, sender: 'user', text: '오늘 5시에 할래!', time: '14:25' },
]

export default function App() {
  const [view, setView] = useState<'list' | 'chat'>('list')
  const [selectedRoommate, setSelectedRoommate] = useState<Roommate | null>(null)
  const [messages, setMessages] = useState<Message[]>(mockMessages)
  const [input, setInput] = useState('')

  const handleSelectRoommate = (roommate: Roommate) => {
    setSelectedRoommate(roommate)
    setView('chat')
  }

  const handleSendMessage = () => {
    if (!input.trim()) return

    const newMessage: Message = {
      id: messages.length + 1,
      sender: 'user',
      text: input,
      time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    }

    setMessages([...messages, newMessage])
    setInput('')
  }

  return (
    <div className="w-[360px] h-[600px] overflow-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

        .pixel-text {
          font-family: 'Press Start 2P', cursive;
          image-rendering: pixelated;
          line-height: 1.6;
        }

        .pixel-button {
          font-family: 'Press Start 2P', cursive;
          border: 4px solid black;
          image-rendering: pixelated;
          transition: transform 0.1s, box-shadow 0.1s;
        }

        .pixel-button:hover {
          transform: translate(-2px, -2px);
          box-shadow: 4px 4px 0 black;
        }

        .pixel-button:active {
          transform: translate(0, 0);
          box-shadow: 2px 2px 0 black;
        }

        .pixel-container {
          border: 4px solid black;
          box-shadow: 8px 8px 0 rgba(0, 0, 0, 0.3);
        }

        .pixel-input {
          font-family: 'Press Start 2P', cursive;
          border: 4px solid black;
          font-size: 10px;
          padding: 8px;
        }

        .pixel-badge {
          font-family: 'Press Start 2P', cursive;
          border: 2px solid black;
          font-size: 8px;
        }
      `}</style>

      {view === 'list' ? (
        <div className="h-full flex flex-col bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
          {/* Header */}
          <div className="bg-slate-800 border-b-4 border-black p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏠</span>
                <span className="pixel-text text-white text-xs">KNOCK</span>
              </div>
              <button className="text-white hover:text-cyan-400 transition-colors">
                <span className="text-xl">⚙️</span>
              </button>
            </div>
          </div>

          {/* Roommate List */}
          <div className="flex-1 overflow-hidden">
            <div className="p-3">
              <h2 className="pixel-text text-white text-[10px] mb-3">내 룸메이트들</h2>
              <ScrollArea className="h-[440px]">
                <div className="space-y-2">
                  {mockRoommates.map((roommate) => (
                    <Card
                      key={roommate.id}
                      className="pixel-container bg-slate-800 border-none cursor-pointer hover:bg-slate-700 transition-colors p-3"
                      onClick={() => handleSelectRoommate(roommate)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-3xl">{roommate.emoji}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="pixel-text text-white text-[10px]">{roommate.name}</span>
                            {roommate.unread > 0 && (
                              <span className="pixel-badge bg-red-500 text-white px-2 py-1 rounded-full">
                                {roommate.unread}
                              </span>
                            )}
                          </div>
                          <p className="pixel-text text-gray-400 text-[8px] truncate">
                            {roommate.lastMessage}
                          </p>
                        </div>
                        <span className="pixel-text text-gray-500 text-[8px]">{roommate.time}</span>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t-4 border-black bg-slate-800 p-3 flex gap-2">
            <Button className="pixel-button flex-1 bg-purple-600 hover:bg-purple-700 text-white text-[10px] py-2">
              🏠 건물 보기
            </Button>
            <Button className="pixel-button flex-1 bg-cyan-400 hover:bg-cyan-500 text-black text-[10px] py-2">
              🚪 노크하기
            </Button>
          </div>
        </div>
      ) : (
        <div className="h-full flex flex-col bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
          {/* Chat Header */}
          <div className="bg-slate-800 border-b-4 border-black p-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setView('list')}
                className="text-white hover:text-cyan-400 transition-colors"
              >
                <span className="text-xl">←</span>
              </button>
              <div className="text-3xl">{selectedRoommate?.emoji}</div>
              <div>
                <div className="pixel-text text-white text-xs">{selectedRoommate?.name}</div>
                <div className="pixel-text text-gray-400 text-[8px]">online</div>
              </div>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-3">
            <div className="space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-3 py-2 pixel-container ${
                      msg.sender === 'user'
                        ? 'bg-cyan-400'
                        : 'bg-white'
                    }`}
                  >
                    <p className="pixel-text text-[8px] mb-1">
                      <span className="font-bold">
                        {msg.sender === 'user' ? 'You' : selectedRoommate?.name}:
                      </span>
                    </p>
                    <p className="pixel-text text-[8px]">{msg.text}</p>
                    <p className="pixel-text text-[6px] text-gray-600 mt-1 text-right">
                      {msg.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="border-t-4 border-black bg-slate-800 p-3">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                className="pixel-input flex-1 bg-white"
                placeholder="메시지 입력..."
              />
              <Button
                onClick={handleSendMessage}
                className="pixel-button bg-cyan-400 hover:bg-cyan-500 text-black px-4 text-[10px]"
              >
                ▶
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
