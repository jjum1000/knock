/**
 * Gemini 이미지 생성 서비스
 *
 * 이 서비스는 Google Gemini API를 사용하여 이미지를 생성합니다.
 * 대화 생성은 OpenAI GPT를 사용합니다 (src/services/chat.ts 참조)
 */

import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '')

export interface ImageGenerationPrompt {
  prompt: string
  style?: string
}

export const geminiImageService = {
  // TODO: 이미지 생성 기능 구현
  async generateImage(prompt: ImageGenerationPrompt): Promise<string> {
    // 추후 Gemini Imagen API 또는 다른 이미지 생성 API 연동
    throw new Error('Not implemented yet')
  },
}

// 레거시: 대화 생성 (사용하지 않음 - OpenAI GPT 사용)
export interface ChatMessage {
  role: 'user' | 'model'
  content: string
}

/** @deprecated Use chatService from '@/services/chat' instead */
export const geminiService = {
  async chat(messages: ChatMessage[], roommatePersonality: string): Promise<string> {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

      // Build conversation history
      const history = messages.slice(0, -1).map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }],
      }))

      // System prompt to set roommate personality
      const systemPrompt = `You are ${roommatePersonality}. Respond naturally and stay in character. Keep responses conversational, friendly, and not too long (2-3 sentences max).`

      const chat = model.startChat({
        history: [
          {
            role: 'user',
            parts: [{ text: systemPrompt }],
          },
          {
            role: 'model',
            parts: [{ text: 'I understand. I will stay in character and respond naturally.' }],
          },
          ...history,
        ],
      })

      const lastMessage = messages[messages.length - 1]
      const result = await chat.sendMessage(lastMessage.content)
      const response = await result.response
      return response.text()
    } catch (error) {
      console.error('Gemini API error:', error)
      // Fallback to mock responses if API fails
      return getMockResponse(messages[messages.length - 1].content)
    }
  },
}

// Fallback mock responses
function getMockResponse(message: string): string {
  const lowerMessage = message.toLowerCase()

  if (lowerMessage.includes('hi') || lowerMessage.includes('hello') || lowerMessage.includes('hey')) {
    const greetings = ["Hey! How's it going?", "Hi there! Nice to meet you!", "Hello! Welcome!"]
    return greetings[Math.floor(Math.random() * greetings.length)]
  }

  if (lowerMessage.includes('how are you')) {
    return "I'm doing great, thanks for asking! How about you?"
  }

  if (lowerMessage.includes('?')) {
    const questions = [
      "That's an interesting question!",
      "Hmm, let me think about that...",
      "I'm curious what you think?",
    ]
    return questions[Math.floor(Math.random() * questions.length)]
  }

  const defaults = ["That's cool!", "Tell me more!", "Interesting perspective!", "I see what you mean."]
  return defaults[Math.floor(Math.random() * defaults.length)]
}
