import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import type { SalaryPayout, PayrollPreview } from '../types/database.types'

export function useSalaryPayouts(userId: string) {
  return useQuery<SalaryPayout[]>({
    queryKey: ['salary_payouts', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('salary_payouts')
        .select('*')
        .eq('user_id', userId)
        .order('month', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    staleTime: 60_000,
  })
}

export function usePayrollPreview() {
  return useMutation<PayrollPreview[], Error, string>({
    mutationFn: async (month: string) => {
      const { data, error } = await supabase.rpc('generate_payroll_preview' as never, {
        p_month: month,
      } as never)
      if (error) throw error
      return (data as unknown as PayrollPreview[]) ?? []
    },
  })
}

export function useCommitPayroll() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: async (month: string) => {
      const { error } = await supabase.rpc('commit_payroll' as never, {
        p_month: month,
      } as never)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary_payouts'] })
    },
  })
}
