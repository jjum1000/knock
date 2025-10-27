import { Request } from 'express'

// User Types
export interface User {
  id: string
  name: string
  age: number
  createdAt: Date
}

// Roommate Types
export interface Roommate {
  id: string
  name: string
  age: number
  bio: string
  personality: string
  avatar: string
  interests: string[]
  systemPrompt: string
  userId: string
}

// Message Types
export interface Message {
  id: string
  userId: string
  roommateId: string
  sender: 'user' | 'roommate'
  content: string
  createdAt: Date
}

// Knock Types
export interface Knock {
  id: string
  userId: string
  knockedAt: Date
  roomRevealed: number
}

// Auth Types
export interface AuthRequest extends Request {
  user?: {
    id: string
    name: string
  }
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}
