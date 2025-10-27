import { Router, Response } from 'express'
import { authenticate } from '../middleware/auth'
import { AuthRequest, ApiResponse, Message } from '../types'
import geminiService from '../services/geminiService'

const router = Router()

// Mock data storage
const messages: Map<string, Message[]> = new Map()
const roommates = new Map([
  ['rm_1', { id: 'rm_1', name: 'Luna', age: 24, bio: 'Artist who loves coffee', personality: 'Creative and introspective', avatar: '🎨', interests: ['art', 'coffee', 'music'] }],
  ['rm_2', { id: 'rm_2', name: 'Max', age: 28, bio: 'Game developer', personality: 'Playful and passionate', avatar: '🎮', interests: ['gaming', 'programming', 'anime'] }],
  ['rm_3', { id: 'rm_3', name: 'Sofia', age: 26, bio: 'Book lover and writer', personality: 'Thoughtful and curious', avatar: '📚', interests: ['reading', 'writing', 'poetry'] }],
])

// Send message to roommate
router.post('/message', authenticate, async (req: AuthRequest, res: Response<ApiResponse<{ message: Message; response: Message }>>) => {
  try {
    const { roommateId, content } = req.body
    const userId = req.user!.id

    if (!roommateId || !content) {
      return res.status(400).json({
        success: false,
        error: 'roommateId and content are required',
      })
    }

    const roommate = roommates.get(roommateId)
    if (!roommate) {
      return res.status(404).json({
        success: false,
        error: 'Roommate not found',
      })
    }

    // Create user message
    const userMessage: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      roommateId,
      sender: 'user',
      content,
      createdAt: new Date(),
    }

    // Get conversation history
    const conversationKey = `${userId}_${roommateId}`
    const history = messages.get(conversationKey) || []
    history.push(userMessage)

    // Generate AI response
    const systemPrompt = geminiService.buildRoommatePrompt(roommate)
    const conversationHistory = history.slice(-10).map(msg => ({
      role: msg.sender === 'user' ? 'User' : 'Roommate',
      content: msg.content,
    }))

    const aiResponse = await geminiService.generateResponse(
      systemPrompt,
      content,
      conversationHistory
    )

    // Create roommate response message
    const roommateMessage: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      roommateId,
      sender: 'roommate',
      content: aiResponse,
      createdAt: new Date(),
    }

    history.push(roommateMessage)
    messages.set(conversationKey, history)

    res.json({
      success: true,
      data: {
        message: userMessage,
        response: roommateMessage,
      },
    })
  } catch (error) {
    console.error('Chat error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to send message',
    })
  }
})

// Get conversation history
router.get('/history/:roommateId', authenticate, (req: AuthRequest, res: Response<ApiResponse<Message[]>>) => {
  const { roommateId } = req.params
  const userId = req.user!.id

  const conversationKey = `${userId}_${roommateId}`
  const history = messages.get(conversationKey) || []

  res.json({
    success: true,
    data: history,
  })
})

export default router
