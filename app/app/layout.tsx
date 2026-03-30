// PAS de "use client" ici
export const dynamic = 'force-dynamic'

import { redirect } from "next/navigation"
import { getAuthenticatedUserContext } from "@/actions/profile.server"
import { AgencyProvider } from "@/providers/agency-provider"
import { AppLayoutClient } from "../app-layout-client"
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const userContext = await getAuthenticatedUserContext()

  if (!userContext) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("agency_id")
        .eq("id", user.id)
        .single()

      if (profile && !profile.agency_id) {
        redirect("/no-agency")
      }

      redirect("/onboarding")
    }
    redirect("/auth/login")
  }

  return (
    <AgencyProvider initialData={userContext}>
      <AppLayoutClient>
        {children}
      </AppLayoutClient>
    </AgencyProvider>
  )
}
