import { Router, Response } from 'express'
import { authenticate } from '../middleware/auth'
import { AuthRequest, ApiResponse, Roommate } from '../types'

const router = Router()

// Mock roommate pool
const roommatePool = [
  { id: 'rm_1', name: 'Luna', age: 24, bio: 'Artist who loves coffee', personality: 'Creative and introspective', avatar: '🎨', interests: ['art', 'coffee', 'music'] },
  { id: 'rm_2', name: 'Max', age: 28, bio: 'Game developer', personality: 'Playful and passionate', avatar: '🎮', interests: ['gaming', 'programming', 'anime'] },
  { id: 'rm_3', name: 'Sofia', age: 26, bio: 'Book lover and writer', personality: 'Thoughtful and curious', avatar: '📚', interests: ['reading', 'writing', 'poetry'] },
  { id: 'rm_4', name: 'Kai', age: 25, bio: 'Musician and night owl', personality: 'Chill and creative', avatar: '🎸', interests: ['music', 'guitar', 'concerts'] },
  { id: 'rm_5', name: 'Emma', age: 27, bio: 'Chef and foodie', personality: 'Warm and nurturing', avatar: '👩‍🍳', interests: ['cooking', 'baking', 'food'] },
  { id: 'rm_6', name: 'Leo', age: 29, bio: 'Photographer', personality: 'Adventurous and observant', avatar: '📷', interests: ['photography', 'travel', 'nature'] },
  { id: 'rm_7', name: 'Mia', age: 23, bio: 'Yoga instructor', personality: 'Calm and positive', avatar: '🧘‍♀️', interests: ['yoga', 'meditation', 'wellness'] },
  { id: 'rm_8', name: 'Noah', age: 30, bio: 'Architect', personality: 'Precise and imaginative', avatar: '🏛️', interests: ['architecture', 'design', 'history'] },
]

// Get all roommates
router.get('/', authenticate, (req: AuthRequest, res: Response<ApiResponse<Roommate[]>>) => {
  const roommates = roommatePool.map(rm => ({
    ...rm,
    systemPrompt: '',
    userId: req.user!.id,
  }))

  res.json({
    success: true,
    data: roommates,
  })
})

// Get roommate by ID
router.get('/:id', authenticate, (req: AuthRequest, res: Response<ApiResponse<Roommate>>) => {
  const { id } = req.params
  const roommate = roommatePool.find(rm => rm.id === id)

  if (!roommate) {
    return res.status(404).json({
      success: false,
      error: 'Roommate not found',
    })
  }

  res.json({
    success: true,
    data: {
      ...roommate,
      systemPrompt: '',
      userId: req.user!.id,
    },
  })
})

// Generate random roommate
router.post('/generate', authenticate, (req: AuthRequest, res: Response<ApiResponse<Roommate>>) => {
  const randomRoommate = roommatePool[Math.floor(Math.random() * roommatePool.length)]

  res.json({
    success: true,
    data: {
      ...randomRoommate,
      systemPrompt: '',
      userId: req.user!.id,
    },
  })
})

export default router
