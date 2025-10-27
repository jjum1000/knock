export type Room = {
  id: number
  floor: number
  isBlackedOut: boolean
  roommate: Roommate | null
  theme: string
  bgColor: string
}

export type Roommate = {
  id: number
  name: string
  age: number
  bio: string
  personality: string
  avatar: string
}

export type Message = {
  id: number
  sender: 'user' | 'roommate'
  text: string
  timestamp: Date
}
