import { Router, Request, Response } from 'express'
import { generateToken } from '../middleware/auth'
import { ApiResponse, User } from '../types'

const router = Router()

// Mock user database (in-memory for now)
const users: Map<string, User> = new Map()

// Register/Login (simplified for MVP)
router.post('/register', (req: Request, res: Response<ApiResponse<{ user: User; token: string }>>) => {
  const { name, age } = req.body

  if (!name || !age) {
    return res.status(400).json({
      success: false,
      error: 'Name and age are required',
    })
  }

  const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const user: User = {
    id: userId,
    name,
    age: parseInt(age),
    createdAt: new Date(),
  }

  users.set(userId, user)

  const token = generateToken({ id: user.id, name: user.name })

  res.status(201).json({
    success: true,
    data: { user, token },
  })
})

router.post('/login', (req: Request, res: Response<ApiResponse<{ user: User; token: string }>>) => {
  const { name } = req.body

  if (!name) {
    return res.status(400).json({
      success: false,
      error: 'Name is required',
    })
  }

  // Find user by name (simplified)
  const user = Array.from(users.values()).find(u => u.name === name)

  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found',
    })
  }

  const token = generateToken({ id: user.id, name: user.name })

  res.json({
    success: true,
    data: { user, token },
  })
})

export default router
