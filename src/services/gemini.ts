import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '')

export interface ChatMessage {
  role: 'user' | 'model'
  content: string
}

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
