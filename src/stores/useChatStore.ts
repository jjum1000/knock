import { create } from 'zustand'
import { chatApi } from '@/lib/api'
import type { Message } from '@/types'

interface ChatState {
  messages: Map<string, Message[]>
  isLoading: boolean
  error: string | null

  // Actions
  sendMessage: (roommateId: string, content: string) => Promise<void>
  loadHistory: (roommateId: string) => Promise<void>
  getConversation: (roommateId: string) => Message[]
  clearError: () => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: new Map(),
  isLoading: false,
  error: null,

  sendMessage: async (roommateId: string, content: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await chatApi.sendMessage(roommateId, content)
      if (response.success && response.data) {
        const { message, response: aiResponse } = response.data
        const messages = get().messages
        const conversation = messages.get(roommateId) || []
        conversation.push(message, aiResponse)
        messages.set(roommateId, conversation)
        set({ messages: new Map(messages), isLoading: false })
      }
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to send message',
        isLoading: false,
      })
      throw error
    }
  },

  loadHistory: async (roommateId: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await chatApi.getHistory(roommateId)
      if (response.success && response.data) {
        const messages = get().messages
        messages.set(roommateId, response.data)
        set({ messages: new Map(messages), isLoading: false })
      }
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to load history',
        isLoading: false,
      })
    }
  },

  getConversation: (roommateId: string) => {
    return get().messages.get(roommateId) || []
  },

  clearError: () => set({ error: null }),
}))
