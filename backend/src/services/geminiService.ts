import { GoogleGenerativeAI } from '@google/generative-ai'

class GeminiService {
  private genAI: GoogleGenerativeAI
  private model: any

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.warn('GEMINI_API_KEY not set. AI responses will be mocked.')
      return
    }
    this.genAI = new GoogleGenerativeAI(apiKey)
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro' })
  }

  async generateResponse(
    systemPrompt: string,
    userMessage: string,
    conversationHistory: Array<{ role: string; content: string }> = []
  ): Promise<string> {
    try {
      // If API key not set, return mock response
      if (!this.model) {
        return this.getMockResponse(userMessage)
      }

      // Build the full prompt
      let fullPrompt = `${systemPrompt}\n\n`

      if (conversationHistory.length > 0) {
        fullPrompt += 'Previous conversation:\n'
        conversationHistory.forEach(msg => {
          fullPrompt += `${msg.role}: ${msg.content}\n`
        })
        fullPrompt += '\n'
      }

      fullPrompt += `User: ${userMessage}\nRoommate:`

      const result = await this.model.generateContent(fullPrompt)
      const response = await result.response
      return response.text()
    } catch (error) {
      console.error('Gemini API Error:', error)
      return this.getMockResponse(userMessage)
    }
  }

  private getMockResponse(userMessage: string): string {
    const lowerMessage = userMessage.toLowerCase()

    if (lowerMessage.includes('hi') || lowerMessage.includes('hello') || lowerMessage.includes('hey')) {
      return "Hey! How's it going?"
    } else if (lowerMessage.includes('how are you')) {
      return "I'm doing great! Just been working on some projects. How about you?"
    } else if (lowerMessage.includes('what do you do') || lowerMessage.includes('hobby')) {
      return "I love what I do! It's my passion. Want to know more about it?"
    } else if (lowerMessage.includes('?')) {
      return "That's an interesting question! Let me think about that..."
    } else {
      const responses = [
        "That's cool! Tell me more!",
        "Interesting perspective!",
        "I see what you mean.",
        "Yeah, I totally get that!",
      ]
      return responses[Math.floor(Math.random() * responses.length)]
    }
  }

  buildRoommatePrompt(roommate: {
    name: string
    personality: string
    interests: string[]
    bio: string
  }): string {
    return `You are ${roommate.name}, a roommate living in the same building.

Bio: ${roommate.bio}
Personality: ${roommate.personality}
Interests: ${roommate.interests.join(', ')}

Guidelines:
1. Always stay in character as ${roommate.name}
2. Use a friendly and conversational tone
3. Share your interests naturally in conversation
4. Show curiosity about the user's life
5. Be supportive and empathetic
6. Keep responses concise (2-3 sentences max)
7. Never break character or mention you're an AI

Remember: You're a real person living in this building, not an AI assistant.`
  }
}

export default new GeminiService()
