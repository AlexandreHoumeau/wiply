// src/hooks/useUserProfile.ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useOptionalAgency } from "@/providers/agency-provider";

export function useUserProfile() {
  const agencyContext = useOptionalAgency();

  const { data: profile, isLoading: loading } = useQuery({
    queryKey: ['user-profile'],
    staleTime: 5 * 60 * 1000,
    enabled: !agencyContext,
    queryFn: async () => {
      const supabase = createSupabaseBrowserClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (!user || userError) return null;

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("Failed to fetch profile:", profileError);
        return null;
      }

      return profileData;
    },
  });

  return { profile: agencyContext ?? profile ?? null, loading: agencyContext ? false : loading };
}
