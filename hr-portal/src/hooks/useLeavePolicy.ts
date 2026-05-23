import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import type { LeavePolicy } from '../types/database.types'

export function useLeavePolicy() {
  return useQuery<LeavePolicy>({
    queryKey: ['leave_policy'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_policy')
        .select('*')
        .eq('id', 1)
        .single()
      if (error) throw error
      return data
    },
    staleTime: 5 * 60 * 1000,
  })
}
