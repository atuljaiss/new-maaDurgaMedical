import { createContext, useContext } from 'react'
import type { Profile } from '../types/database.types'

export const ProfileContext = createContext<Profile | null>(null)

export function useProfileContext(): Profile {
  const profile = useContext(ProfileContext)
  if (!profile) {
    throw new Error('useProfileContext must be used within ProfileContext.Provider')
  }
  return profile
}
