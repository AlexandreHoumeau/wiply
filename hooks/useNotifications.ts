'use client'

import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getNotifications, markAllAsRead, markAsRead } from '@/actions/notifications.server'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { useUserProfile } from '@/hooks/useUserProfile'

export function useNotifications() {
  const queryClient = useQueryClient()
  const { profile } = useUserProfile()

  // Supabase Realtime — invalidate cache + show toast on new notification
  useEffect(() => {
    if (!profile?.id) return

    const supabase = createSupabaseBrowserClient()
    const channel = supabase
      .channel('notifications-feed')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['notifications'] })
          toast.info(payload.new.title as string)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile?.id, queryClient])

  const query = useQuery({
    queryKey: ['notifications'],
    queryFn: () => getNotifications(),
    enabled: !!profile,
    staleTime: 60_000,
    select: (data) => ({
      notifications: data,
      unreadCount: data.filter((n) => !n.read_at).length,
    }),
  })

  return {
    notifications: query.data?.notifications ?? [],
    unreadCount: query.data?.unreadCount ?? 0,
    isLoading: query.isLoading,
    markAsRead,
    markAllAsRead: async () => {
      await markAllAsRead()
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  }
}
