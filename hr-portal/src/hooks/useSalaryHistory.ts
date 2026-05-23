import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import type { SalaryHistory, Database } from '../types/database.types'

type SalaryInsert = Database['public']['Tables']['salary_history']['Insert']

export function useSalaryHistory(userId: string) {
  return useQuery<SalaryHistory[]>({
    queryKey: ['salary_history', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('salary_history')
        .select('*')
        .eq('user_id', userId)
        .order('effective_from', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    staleTime: 60_000,
  })
}

export function useCurrentSalary(userId: string) {
  const { data: history, ...rest } = useSalaryHistory(userId)
  const current = history?.[0] ?? null
  return { data: current, ...rest }
}

export function useAddSalary() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (salary: SalaryInsert) => {
      const { error } = await supabase.from('salary_history').insert(salary)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary_history'] })
      queryClient.invalidateQueries({ queryKey: ['admin_employees'] })
    },
  })
}
