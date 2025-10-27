import { Router, Response } from 'express'
import { authenticate } from '../middleware/auth'
import { AuthRequest, ApiResponse, Knock } from '../types'

const router = Router()

// Mock storage
const knocks: Map<string, Knock[]> = new Map()
const dailyKnockLimit = 1

// Execute knock
router.post('/execute', authenticate, (req: AuthRequest, res: Response<ApiResponse<Knock>>) => {
  const userId = req.user!.id
  const today = new Date().toISOString().split('T')[0]

  // Get user's knocks
  const userKnocks = knocks.get(userId) || []

  // Check today's knocks
  const todayKnocks = userKnocks.filter(k => {
    const knockDate = new Date(k.knockedAt).toISOString().split('T')[0]
    return knockDate === today
  })

  if (todayKnocks.length >= dailyKnockLimit) {
    return res.status(429).json({
      success: false,
      error: 'Daily knock limit reached. Come back tomorrow!',
    })
  }

  // Create new knock
  const knock: Knock = {
    id: `knock_${Date.now()}`,
    userId,
    knockedAt: new Date(),
    roomRevealed: Math.floor(Math.random() * 100) + 1,
  }

  userKnocks.push(knock)
  knocks.set(userId, userKnocks)

  res.json({
    success: true,
    data: knock,
    message: 'Knock successful! A new room has been revealed.',
  })
})

// Get knock status
router.get('/status', authenticate, (req: AuthRequest, res: Response<ApiResponse<{ knocksRemaining: number; lastKnock?: Date }>>) => {
  const userId = req.user!.id
  const today = new Date().toISOString().split('T')[0]

  const userKnocks = knocks.get(userId) || []
  const todayKnocks = userKnocks.filter(k => {
    const knockDate = new Date(k.knockedAt).toISOString().split('T')[0]
    return knockDate === today
  })

  const knocksRemaining = Math.max(0, dailyKnockLimit - todayKnocks.length)
  const lastKnock = todayKnocks.length > 0 ? todayKnocks[todayKnocks.length - 1].knockedAt : undefined

  res.json({
    success: true,
    data: {
      knocksRemaining,
      lastKnock,
    },
  })
})

export default router
