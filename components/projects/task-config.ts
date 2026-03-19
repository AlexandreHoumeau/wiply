// components/projects/task-config.ts
import {
    AlignLeft, Bug, LayoutTemplate, PenTool, Settings,
    ArrowUp, ArrowDown, Equal, AlertOctagon,
    CheckCircle2, Clock, Inbox, PlayCircle,
} from "lucide-react";

export const TYPE_CONFIG: Record<string, { icon: any; label: string; dot: string; chip: string }> = {
    feature: { icon: AlignLeft,      label: "Fonctionnalité", dot: "bg-blue-500",    chip: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/40" },
    bug:     { icon: Bug,            label: "Bug",            dot: "bg-red-500",     chip: "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/40" },
    design:  { icon: LayoutTemplate, label: "Design",         dot: "bg-purple-500",  chip: "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800/40" },
    content: { icon: PenTool,        label: "Contenu",        dot: "bg-emerald-500", chip: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40" },
    setup:   { icon: Settings,       label: "Setup / Infra",  dot: "bg-muted-foreground/40", chip: "bg-muted text-muted-foreground border-border" },
};

export const PRIORITY_CONFIG: Record<string, { icon: any; label: string; color: string; badge: string }> = {
    low:    { icon: ArrowDown,    label: "Basse",   color: "text-muted-foreground", badge: "bg-muted text-muted-foreground" },
    medium: { icon: Equal,        label: "Moyenne", color: "text-muted-foreground", badge: "bg-muted text-muted-foreground" },
    high:   { icon: ArrowUp,      label: "Haute",   color: "text-orange-500",       badge: "bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400" },
    urgent: { icon: AlertOctagon, label: "Urgente", color: "text-red-500",          badge: "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400" },
};

export const STATUS_CONFIG: Record<string, { icon: any; label: string; color: string; dot: string }> = {
    todo:        { icon: Inbox,        label: "À faire",  color: "text-muted-foreground", dot: "bg-muted-foreground/30" },
    in_progress: { icon: PlayCircle,   label: "En cours", color: "text-blue-500",          dot: "bg-blue-500" },
    review:      { icon: Clock,        label: "En revue", color: "text-amber-500",         dot: "bg-amber-500" },
    done:        { icon: CheckCircle2, label: "Terminé",  color: "text-emerald-500",       dot: "bg-emerald-500" },
};
