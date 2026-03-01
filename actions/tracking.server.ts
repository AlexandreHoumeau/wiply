"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type CreateTrackingLinkInput = {
    opportunityId: string;
    agencyId: string;
    originalUrl: string;
    campaignName?: string;
    expiresAt?: Date;
};

export async function createTrackingLink(input: CreateTrackingLinkInput) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    try {
        // Générer un short code unique
        const { data: shortCodeData } = await supabase.rpc('generate_short_code');
        const shortCode = shortCodeData as string;

        const { data, error } = await supabase
            .from("tracking_links")
            .insert({
                opportunity_id: input.opportunityId,
                agency_id: input.agencyId,
                short_code: shortCode,
                original_url: input.originalUrl,
                campaign_name: input.campaignName,
                expires_at: input.expiresAt?.toISOString(),
            })
            .select()
            .single();

        if (error) {
            console.error("Error creating tracking link:", error);
            return { success: false, error: error.message };
        }

        revalidatePath(`/opportunities/${input.opportunityId}`);

        // Log timeline event (fire-and-forget)
        if (user) {
            supabase.from("opportunity_events").insert({
                opportunity_id: input.opportunityId,
                user_id: user.id,
                event_type: "tracking_link_created",
                metadata: { campaign_name: input.campaignName ?? null },
            }).then(() => {});
        }

        return {
            success: true,
            data,
            trackingUrl: `${process.env.NEXT_PUBLIC_APP_URL}/t/${shortCode}`
        };
    } catch (error) {
        console.error("Error creating tracking link:", error);
        return { success: false, error: "Une erreur est survenue" };
    }
}

export async function getTrackingLinks(opportunityId: string) {
    const supabase = await createClient();

    try {
        const { data, error } = await supabase
            .from("tracking_links")
            .select("*")
            .eq("opportunity_id", opportunityId)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching tracking links:", error);
            return { success: false, error: error.message, data: [] };
        }

        return { success: true, data: data || [] };
    } catch (error) {
        console.error("Error fetching tracking links:", error);
        return { success: false, error: "Une erreur est survenue", data: [] };
    }
}

export async function getTrackingLinkAnalytics(opportunityId: string) {
    const supabase = await createClient();

    try {
        // 1. Récupérer TOUS les liens de l'opportunité
        const { data: links, error: linkError } = await supabase
            .from("tracking_links")
            .select("*")
            .eq("opportunity_id", opportunityId);

        if (linkError) throw linkError;
        if (!links || links.length === 0) return { success: false, error: "Aucun lien trouvé" };

        const linkIds = links.map(l => l.id);

        // 2. Récupérer TOUS les clics pour ces liens
        const { data: clicks, error: clicksError } = await supabase
            .from("tracking_clicks")
            .select("*")
            .in("tracking_link_id", linkIds)
            .order("clicked_at", { ascending: false });

        if (clicksError) throw clicksError;

        // 3. Calculs agrégés
        const totalClicks = clicks?.length || 0;
        const uniqueIPs = new Set(clicks?.map(c => c.ip_address)).size;

        const deviceBreakdown = clicks?.reduce((acc, click) => {
            const device = click.device_type || 'unknown';
            acc[device] = (acc[device] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const countryBreakdown = clicks?.reduce((acc, click) => {
            const country = click.country_code || 'unknown';
            acc[country] = (acc[country] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        // Trouver la date du dernier clic parmi tous les liens
        const lastClickedAt = links.reduce((latest, current) => {
            if (!current.last_clicked_at) return latest;
            if (!latest) return current.last_clicked_at;
            return new Date(current.last_clicked_at) > new Date(latest)
                ? current.last_clicked_at
                : latest;
        }, null as string | null);

        return {
            success: true,
            data: {
                links, // On renvoie la liste complète
                clicks: clicks || [],
                analytics: {
                    totalClicks,
                    uniqueClicks: uniqueIPs,
                    deviceBreakdown,
                    countryBreakdown,
                    lastClickedAt,
                    activeLinksCount: links.filter(l => l.is_active).length
                }
            }
        };
    } catch (error) {
        console.error("Error fetching analytics:", error);
        return { success: false, error: "Une erreur est survenue" };
    }
}

export type AnalyticsRange = "24h" | "7d" | "30d";

export type AgencyAnalyticsData = {
    totalClicks: number;
    uniqueIPs: number;
    activeLinks: number;
    topCountry: string | null;
    clicksByTime: Array<{ label: string; clicks: number }>;
    countryBreakdown: Array<{ code: string; clicks: number; pct: number }>;
    deviceBreakdown: Array<{ device: string; clicks: number; pct: number }>;
    topLinks: Array<{ opportunity_name: string | null; opportunity_slug: string | null; click_count: number; links_count: number }>;
    recentClicks: Array<{
        ip_address: string;
        country_code: string | null;
        device_type: string | null;
        os_type: string | null;
        clicked_at: string;
        opportunity_name: string | null;
        opportunity_slug: string | null;
    }>;
};

export async function fetchAgencyAnalytics(agencyId: string, range: AnalyticsRange): Promise<AgencyAnalyticsData> {
    const supabase = await createClient();

    const now = new Date();
    const ms = range === "24h" ? 24 * 3600e3 : range === "7d" ? 7 * 24 * 3600e3 : 30 * 24 * 3600e3;
    const startDate = new Date(now.getTime() - ms);

    const { data: links } = await supabase
        .from("tracking_links")
        .select("id, short_code, click_count, is_active, last_clicked_at, opportunities(name, slug)")
        .eq("agency_id", agencyId);

    const empty: AgencyAnalyticsData = {
        totalClicks: 0, uniqueIPs: 0, activeLinks: 0, topCountry: null,
        clicksByTime: [], countryBreakdown: [], deviceBreakdown: [],
        topLinks: [], recentClicks: [],
    };

    if (!links || links.length === 0) return empty;

    const linkIds = links.map((l) => l.id);
    const linkMap = new Map(links.map((l) => [l.id, l]));

    const { data: clicks } = await supabase
        .from("tracking_clicks")
        .select("tracking_link_id, clicked_at, ip_address, country_code, device_type, os_type")
        .in("tracking_link_id", linkIds)
        .gte("clicked_at", startDate.toISOString())
        .order("clicked_at", { ascending: false });

    const allClicks = clicks || [];

    const totalClicks = allClicks.length;
    const uniqueIPs = new Set(allClicks.map((c) => c.ip_address).filter(Boolean)).size;
    const activeLinks = links.filter((l) => l.is_active).length;

    const countryCounts = allClicks.reduce((acc, c) => {
        if (c.country_code) acc[c.country_code] = (acc[c.country_code] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    const topCountry = Object.entries(countryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    // Time buckets
    const clicksByTime: Array<{ label: string; clicks: number }> = [];
    if (range === "24h") {
        for (let i = 23; i >= 0; i--) {
            const bucketEnd = new Date(now.getTime() - i * 3600e3);
            const bucketStart = new Date(bucketEnd.getTime() - 3600e3);
            const count = allClicks.filter((c) => {
                const t = new Date(c.clicked_at).getTime();
                return t >= bucketStart.getTime() && t < bucketEnd.getTime();
            }).length;
            clicksByTime.push({ label: `${String(bucketEnd.getHours()).padStart(2, "0")}h`, clicks: count });
        }
    } else {
        const days = range === "7d" ? 7 : 30;
        for (let i = days - 1; i >= 0; i--) {
            const bucketStart = new Date(now);
            bucketStart.setDate(bucketStart.getDate() - i);
            bucketStart.setHours(0, 0, 0, 0);
            const bucketEnd = new Date(bucketStart);
            bucketEnd.setDate(bucketEnd.getDate() + 1);
            const count = allClicks.filter((c) => {
                const t = new Date(c.clicked_at).getTime();
                return t >= bucketStart.getTime() && t < bucketEnd.getTime();
            }).length;
            clicksByTime.push({
                label: `${String(bucketStart.getDate()).padStart(2, "0")}/${String(bucketStart.getMonth() + 1).padStart(2, "0")}`,
                clicks: count,
            });
        }
    }

    const countryBreakdown = Object.entries(countryCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([code, count]) => ({ code, clicks: count, pct: totalClicks > 0 ? Math.round((count / totalClicks) * 100) : 0 }));

    const deviceCounts = allClicks.reduce((acc, c) => {
        const d = c.device_type || "Desktop";
        acc[d] = (acc[d] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    const deviceBreakdown = Object.entries(deviceCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([device, count]) => ({ device, clicks: count, pct: totalClicks > 0 ? Math.round((count / totalClicks) * 100) : 0 }));

    const oppMap = new Map<string, { opportunity_name: string | null; opportunity_slug: string | null; click_count: number; links_count: number }>();
    links.forEach((l) => {
        const opp = (l.opportunities as any)?.[0] ?? (l.opportunities as any) ?? null;
        const key = opp?.slug ?? `__${l.short_code}`;
        const existing = oppMap.get(key);
        if (existing) {
            existing.click_count += l.click_count || 0;
            existing.links_count += 1;
        } else {
            oppMap.set(key, { opportunity_name: opp?.name ?? null, opportunity_slug: opp?.slug ?? null, click_count: l.click_count || 0, links_count: 1 });
        }
    });
    const topLinks = [...oppMap.values()].sort((a, b) => b.click_count - a.click_count).slice(0, 5);

    const recentClicks = allClicks.slice(0, 20).map((c) => {
        const link = linkMap.get(c.tracking_link_id);
        const opp = (link?.opportunities as any)?.[0] ?? (link?.opportunities as any) ?? null;
        return {
            ip_address: c.ip_address || "—",
            country_code: c.country_code,
            device_type: c.device_type,
            os_type: c.os_type,
            clicked_at: c.clicked_at,
            opportunity_name: opp?.name ?? null,
            opportunity_slug: opp?.slug ?? null,
        };
    });

    return { totalClicks, uniqueIPs, activeLinks, topCountry, clicksByTime, countryBreakdown, deviceBreakdown, topLinks, recentClicks };
}

export type AgencyTrackingStats = {
    totalLinks: number;
    totalClicks: number;
    activeLinks: number;
    lastClickedAt: string | null;
    deviceBreakdown: Record<string, number>;
    topLinks: Array<{ opportunity_name: string | null; opportunity_slug: string | null; click_count: number; links_count: number }>;
};

export async function fetchAgencyTrackingStats(agencyId: string): Promise<AgencyTrackingStats> {
    const supabase = await createClient();

    const { data: links } = await supabase
        .from("tracking_links")
        .select("id, click_count, is_active, last_clicked_at, short_code, opportunities(name, slug)")
        .eq("agency_id", agencyId);

    if (!links || links.length === 0) {
        return { totalLinks: 0, totalClicks: 0, activeLinks: 0, lastClickedAt: null, deviceBreakdown: {}, topLinks: [] };
    }

    const totalLinks = links.length;
    const totalClicks = links.reduce((sum, l) => sum + (l.click_count || 0), 0);
    const activeLinks = links.filter((l) => l.is_active).length;
    const lastClickedAt = links.reduce((latest, l) => {
        if (!l.last_clicked_at) return latest;
        if (!latest) return l.last_clicked_at;
        return new Date(l.last_clicked_at) > new Date(latest) ? l.last_clicked_at : latest;
    }, null as string | null);

    const linkIds = links.map((l) => l.id);
    const { data: clicks } = await supabase
        .from("tracking_clicks")
        .select("device_type")
        .in("tracking_link_id", linkIds);

    const deviceBreakdown = (clicks || []).reduce((acc, click) => {
        const d = click.device_type || "Desktop";
        acc[d] = (acc[d] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const oppMap2 = new Map<string, { opportunity_name: string | null; opportunity_slug: string | null; click_count: number; links_count: number }>();
    links.forEach((l) => {
        const opp = (l.opportunities as any)?.[0] ?? (l.opportunities as any) ?? null;
        const key = opp?.slug ?? `__${l.short_code}`;
        const existing = oppMap2.get(key);
        if (existing) {
            existing.click_count += l.click_count || 0;
            existing.links_count += 1;
        } else {
            oppMap2.set(key, { opportunity_name: opp?.name ?? null, opportunity_slug: opp?.slug ?? null, click_count: l.click_count || 0, links_count: 1 });
        }
    });
    const topLinks = [...oppMap2.values()].sort((a, b) => b.click_count - a.click_count).slice(0, 3);

    return { totalLinks, totalClicks, activeLinks, lastClickedAt, deviceBreakdown, topLinks };
}

export async function toggleTrackingLink(linkId: string, isActive: boolean) {
    const supabase = await createClient();

    try {
        const { data, error } = await supabase
            .from("tracking_links")
            .update({ is_active: isActive })
            .eq("id", linkId)
            .select()
            .single();

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error("Error toggling link:", error);
        return { success: false, error: "Une erreur est survenue" };
    }
}
