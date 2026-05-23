import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { LeaveRequest, Database } from '../types/database.types'

type LeaveInsert = Database['public']['Tables']['leave_requests']['Insert']

export function useLeaveRequests(userId: string) {
  return useQuery<LeaveRequest[]>({
    queryKey: ['leave_requests', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    staleTime: 30_000,
  })
}

export function useSubmitLeave() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (leave: LeaveInsert) => {
      const { error } = await supabase.from('leave_requests').insert(leave)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave_requests'] })
    },
  })
}

export function useLeaveRealtimeSync(userId: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const channel = supabase
      .channel(`leave_requests:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leave_requests',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['leave_requests', userId] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, queryClient])
}

// Admin: fetch all leave requests with profile info
export function useAdminLeaveRequests(statusFilter?: string) {
  return useQuery({
    queryKey: ['admin_leave_requests', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('leave_requests')
        .select('*, profiles!leave_requests_user_id_fkey(full_name, employee_code)')
        .order('created_at', { ascending: false })

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter as 'pending' | 'approved' | 'rejected')
      }

      const { data, error } = await query
      if (error) throw error
      return data ?? []
    },
    staleTime: 15_000,
  })
}

export function useAdminLeaveRealtime() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const channel = supabase
      .channel('admin_leave_requests')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leave_requests' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['admin_leave_requests'] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])
}

export function useUpdateLeaveStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      status,
      admin_comment,
      decided_by,
    }: {
      id: number
      status: 'approved' | 'rejected'
      admin_comment?: string
      decided_by: string
    }) => {
      const updateData: Database['public']['Tables']['leave_requests']['Update'] = {
        status,
        admin_comment: admin_comment || null,
        decided_by,
        decided_at: new Date().toISOString(),
      }
      const { error } = await supabase
        .from('leave_requests')
        .update(updateData)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_leave_requests'] })
    },
  })
}

export function useDeleteLeave() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('leave_requests').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave_requests'] })
    },
  })
}
