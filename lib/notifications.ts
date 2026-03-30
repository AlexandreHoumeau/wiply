import { supabaseAdmin } from "@/lib/supabase/admin"

export async function createNotification(input: {
  agencyId: string
  userId: string
  type: string
  title: string
  body?: string
  metadata?: Record<string, unknown>
}) {
  await supabaseAdmin.from("notifications").insert({
    agency_id: input.agencyId,
    user_id: input.userId,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    metadata: input.metadata ?? {},
  })
}
