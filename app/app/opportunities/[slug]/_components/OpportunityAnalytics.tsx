"use client";

import { getTrackingLinkAnalytics } from "@/actions/tracking.server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Activity,
    Clock,
    MapPin,
    Monitor,
    MousePointer2,
    Smartphone,
    Tablet,
    Users,
    Zap
} from "lucide-react";
import { useEffect, useState } from "react";

export function OpportunityAnalytics({ opportunityId }: { opportunityId: string }) {
    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            const result = await getTrackingLinkAnalytics(opportunityId);
            if (result.success) setData(result.data);
            setIsLoading(false);
        };
        load();
    }, [opportunityId]);

    if (isLoading) return <AnalyticsSkeleton />;
    if (!data) return <div className="p-10 text-center text-muted-foreground">Données indisponibles.</div>;

    const { links, clicks, analytics } = data;
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* --- HEADER STATUT --- */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border/50 shadow-sm">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <h2 className="card-title">Vue d'ensemble des liens</h2>
                        <Badge className="bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-800/40">
                            {analytics.activeLinksCount} actifs / {links.length} total
                        </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Activity className="h-3 w-3" /> Données cumulées pour cette opportunité
                    </p>
                </div>
                <div className="flex gap-3">
                    <div className="text-right hidden md:block">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Dernière activité</p>
                        <p className="text-sm font-medium text-muted-foreground">
                            {analytics.lastClickedAt ? new Date(analytics.lastClickedAt).toLocaleDateString() : 'Aucune'}
                        </p>
                    </div>
                </div>
            </div>

            {/* --- METRICS GRID --- */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Total Interactions", value: analytics.totalClicks, icon: MousePointer2, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/40" },
                    { label: "Prospects Uniques", value: analytics.uniqueClicks, icon: Users, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-950/40" },
                    { label: "Localisation Top", value: Object.keys(analytics.countryBreakdown)[0] || "N/A", icon: MapPin, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/40" },
                    { label: "Dernier Clic", value: analytics.lastClickedAt ? new Date(analytics.lastClickedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--", icon: Clock, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/40" },
                ].map((stat, i) => (
                    <Card key={i} className="border-none shadow-sm overflow-hidden group hover:ring-1 hover:ring-border transition-all">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div className={`${stat.bg} ${stat.color} p-2 rounded-lg`}>
                                    <stat.icon className="h-5 w-5" />
                                </div>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Real-time</span>
                            </div>
                            <div className="mt-4">
                                <h3 className="text-3xl text-foreground">{stat.value}</h3>
                                <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* --- COMPORTEMENT (DISTRIBUTION) --- */}
                <div className="space-y-6">
                    <Card className="border-none shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <Zap className="h-4 w-4 text-amber-500" /> Plateformes
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            {Object.entries(analytics.deviceBreakdown).length > 0 ? Object.entries(analytics.deviceBreakdown).map(([device, count]: any) => (
                                <div key={device} className="space-y-2">
                                    <div className="flex justify-between items-center text-xs">
                                        <div className="flex items-center gap-2 text-muted-foreground capitalize">
                                            {device === 'Mobile' ? <Smartphone className="h-3 w-3" /> : device === 'Desktop' ? <Monitor className="h-3 w-3" /> : <Tablet className="h-3 w-3" />}
                                            {device}
                                        </div>
                                        <span className="font-bold text-foreground">{Math.round((count / analytics.totalClicks) * 100)}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-foreground rounded-full transition-all duration-1000"
                                            style={{ width: `${(count / analytics.totalClicks) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            )) : <p className="text-xs text-muted-foreground italic">Aucune donnée</p>}
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm bg-slate-900 dark:bg-slate-800 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-2 mb-4 text-slate-400">
                                <Activity className="h-4 w-4" />
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Quick Insight</span>
                            </div>
                            <p className="text-sm leading-relaxed text-slate-300">
                                La majorité de vos prospects consultent vos liens sur <span className="text-white font-bold">{Object.keys(analytics.deviceBreakdown)[0] || "Desktop"}</span>.
                                Assurez-vous que votre landing page est optimisée pour ce support.
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* --- LIVE ACTIVITY FEED --- */}
                <Card className="lg:col-span-2 border-none shadow-sm overflow-hidden">
                    <CardHeader className="border-b border-border/50 flex flex-row items-center justify-between py-4 px-6">
                        <CardTitle className="text-sm font-bold">Flux d'activité en direct</CardTitle>
                        <div className="flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Live Updates</span>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-border/30 max-h-[450px] overflow-y-auto">
                            {clicks.length > 0 ? clicks.map((click: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between p-4 px-6 hover:bg-muted/50 transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-xl bg-muted border border-border flex items-center justify-center text-muted-foreground group-hover:bg-card group-hover:shadow-sm transition-all">
                                            {click.device_type === 'Mobile' ? <Smartphone className="h-5 w-5 text-blue-500" /> : <Monitor className="h-5 w-5 text-indigo-500" />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-foreground">{click.ip_address}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-medium text-muted-foreground border-border">
                                                    {click.os_type}
                                                </Badge>
                                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                    <MapPin className="h-2 w-2" /> {click.country_code || 'Inconnu'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-bold text-foreground">{new Date(click.clicked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                        <p className="text-[10px] text-muted-foreground">{new Date(click.clicked_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            )) : (
                                <div className="p-12 text-center text-muted-foreground text-sm italic">Aucun clic enregistré pour le moment.</div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function AnalyticsSkeleton() {
    return (
        <div className="space-y-8 animate-pulse">
            <div className="h-24 bg-card rounded-2xl border border-border/50" />
            <div className="grid grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => <div key={i} className="h-32 bg-card rounded-xl shadow-sm" />)}
            </div>
            <div className="grid grid-cols-3 gap-6">
                <div className="h-[400px] bg-card rounded-xl" />
                <div className="col-span-2 h-[400px] bg-card rounded-xl" />
            </div>
        </div>
    );
}
