import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003'

// Create axios instance
const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('authToken')
      localStorage.removeItem('userId')
      // You can add redirect logic here if needed
    }
    return Promise.reject(error)
  }
)

// API Types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

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

// Auth API
export const authApi = {
  register: async (name: string, age: number) => {
    const response = await api.post<ApiResponse<{ user: User; token: string }>>('/auth/register', { name, age })
    return response.data
  },

  login: async (name: string) => {
    const response = await api.post<ApiResponse<{ user: User; token: string }>>('/auth/login', { name })
    return response.data
  },
}

// Roommate API
export const roommateApi = {
  getAll: async () => {
    const response = await api.get<ApiResponse<Roommate[]>>('/roommate')
    return response.data
  },

  getById: async (id: string) => {
    const response = await api.get<ApiResponse<Roommate>>(`/roommate/${id}`)
    return response.data
  },

  generate: async () => {
    const response = await api.post<ApiResponse<Roommate>>('/roommate/generate')
    return response.data
  },
}

// Knock API
export const knockApi = {
  execute: async () => {
    const response = await api.post<ApiResponse<Knock>>('/knock/execute')
    return response.data
  },

  getStatus: async () => {
    const response = await api.get<ApiResponse<{ knocksRemaining: number; lastKnock?: Date }>>('/knock/status')
    return response.data
  },
}

// Chat API
export const chatApi = {
  sendMessage: async (roommateId: string, content: string) => {
    const response = await api.post<ApiResponse<{ message: Message; response: Message }>>('/chat/message', {
      roommateId,
      content,
    })
    return response.data
  },

  getHistory: async (roommateId: string) => {
    const response = await api.get<ApiResponse<Message[]>>(`/chat/history/${roommateId}`)
    return response.data
  },
}

export default api
