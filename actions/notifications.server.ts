'use server'

import { createClient } from "@/lib/supabase/server"
import type { Notification } from "@/lib/validators/notifications"

export async function getNotifications(): Promise<Notification[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from("notifications")
    .select("id, type, title, body, metadata, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(50)

  return (data ?? []) as Notification[]
}

export async function markAsRead(id: string): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .is("read_at", null)
}

export async function markAllAsRead(): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null)
}
