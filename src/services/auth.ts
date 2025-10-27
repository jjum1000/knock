import {
  signInAnonymously,
  updateProfile,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { userService } from './firestore'

export interface AuthUser {
  uid: string
  displayName: string | null
  email: string | null
}

// Register with name and age
export const register = async (name: string, age: number) => {
  try {
    // Sign in anonymously first
    const userCredential = await signInAnonymously(auth)
    const user = userCredential.user

    // Update display name
    await updateProfile(user, {
      displayName: name,
    })

    // Create user document in Firestore
    await userService.create({
      name,
      age,
    })

    return {
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
    }
  } catch (error) {
    console.error('Register error:', error)
    throw error
  }
}

// Login (for returning users)
export const login = async (name: string) => {
  try {
    // Find user in Firestore
    const firestoreUser = await userService.findByName(name)

    if (!firestoreUser) {
      throw new Error('User not found')
    }

    // Sign in anonymously (or use custom token in production)
    const userCredential = await signInAnonymously(auth)
    const user = userCredential.user

    // Update display name
    await updateProfile(user, {
      displayName: name,
    })

    return {
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
    }
  } catch (error) {
    console.error('Login error:', error)
    throw error
  }
}

// Sign out
export const signOut = async () => {
  try {
    await firebaseSignOut(auth)
  } catch (error) {
    console.error('Sign out error:', error)
    throw error
  }
}

// Get current user
export const getCurrentUser = (): FirebaseUser | null => {
  return auth.currentUser
}

// Listen to auth state changes
export const onAuthChanged = (callback: (user: FirebaseUser | null) => void) => {
  return onAuthStateChanged(auth, callback)
}
