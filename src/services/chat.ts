import OpenAI from 'openai'

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true, // Next.js 클라이언트 사이드에서 사용
})

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export const chatService = {
  async chat(messages: ChatMessage[], roommatePersonality: string): Promise<string> {
    try {
      // System prompt to set roommate personality
      const systemPrompt = `You are ${roommatePersonality}. Respond naturally and stay in character. Keep responses conversational, friendly, and not too long (2-3 sentences max).`

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        temperature: 0.8,
        max_tokens: 150,
      })

      return completion.choices[0]?.message?.content || 'Sorry, I could not respond.'
    } catch (error) {
      console.error('OpenAI API error:', error)
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
