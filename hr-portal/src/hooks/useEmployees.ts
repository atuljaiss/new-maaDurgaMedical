import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'

export interface CreateEmployeePayload {
  email: string
  password?: string
  full_name: string
  mobile_number?: string
  aadhar_card_url?: string
  other_documents?: string[]
}

export function useCreateEmployee() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CreateEmployeePayload) => {
      // If no password provided, auto-generate a secure one
      const finalPayload = {
        ...payload,
        password: payload.password || Math.random().toString(36).slice(-8) + 'A1!'
      }

      const { data, error } = await supabase.functions.invoke('create-employee', {
        body: finalPayload,
      })

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_employees'] })
    },
  })
}

export interface UpdateEmployeeProfilePayload {
  user_id: string
  full_name: string
  mobile_number?: string
  employee_code?: string
  aadhar_card_url?: string
  other_documents?: string[]
}

export function useUpdateEmployeeProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: UpdateEmployeeProfilePayload) => {
      const { user_id, ...updateData } = payload
      const { data, error } = await supabase
        .from('profiles')
        .update(updateData as any)
        .eq('user_id', user_id)

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_employees'] })
    },
  })
}
