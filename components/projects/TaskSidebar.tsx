"use client";

import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn, getInitials } from "@/lib/utils";
import { UserRound, CalendarDays, Tag, ArrowUpRight } from "lucide-react";
import { type AgencyMember } from "@/actions/agency.server";
import { type ProjectVersion } from "@/actions/version.server";
import { TYPE_CONFIG, PRIORITY_CONFIG, STATUS_CONFIG } from "./task-config";
import { SidebarSection, SidebarLabel, SidebarPropRow } from "./task-shared";
import type { ProjectTask } from "./types";
import dayjs from "dayjs";
import "dayjs/locale/fr";

interface TaskSidebarProps {
    task: ProjectTask | null;
    taskPrefix: string;
    parentTask: ProjectTask | null;
    status: string;
    priority: string;
    type: string;
    assigneeId: string | null;
    dueDate: string;
    versionId: string | null;
    members: AgencyMember[];
    versions: ProjectVersion[];
    isOverdue: boolean;
    onOpenTask?: (task: ProjectTask) => void;
    onStatusChange: (v: string) => void;
    onPriorityChange: (v: string) => void;
    onTypeChange: (v: string) => void;
    onAssigneeChange: (v: string | null) => void;
    onDueDateChange: (v: string) => void;
    onVersionChange: (v: string | null) => void;
}

export function TaskSidebar({
    task, taskPrefix, parentTask, status, priority, type,
    assigneeId, dueDate, versionId, members, versions, isOverdue,
    onOpenTask, onStatusChange, onPriorityChange, onTypeChange,
    onAssigneeChange, onDueDateChange, onVersionChange,
}: TaskSidebarProps) {
    const PriorityIcon = PRIORITY_CONFIG[priority]?.icon;
    const TypeIcon = TYPE_CONFIG[type]?.icon;

    const assigneeMember = members.find((m) => m.id === assigneeId);
    const assigneeName = assigneeMember?.first_name
        ? `${assigneeMember.first_name} ${assigneeMember.last_name ?? ""}`.trim()
        : assigneeMember?.email ?? null;

    const selectTriggerCls = "h-7 text-xs border-border/30 bg-card/40 shadow-none focus:ring-0 rounded-md font-medium";

    return (
        <div className="w-[252px] shrink-0 border-l border-border/40 overflow-y-auto bg-muted/10">

            {/* Parent task */}
            {task?.parent_id && parentTask && (
                <SidebarSection>
                    <SidebarLabel>Ticket parent</SidebarLabel>
                    <button
                        onClick={() => onOpenTask?.(parentTask)}
                        className="flex items-center gap-1.5 text-left group w-full mt-1.5 hover:text-primary transition-colors"
                    >
                        <span className="font-mono text-[10px] text-muted-foreground/50 shrink-0">
                            {taskPrefix}-{parentTask.task_number}
                        </span>
                        <span className="text-xs text-foreground/70 group-hover:text-primary truncate transition-colors">
                            {parentTask.title}
                        </span>
                        <ArrowUpRight className="w-3 h-3 shrink-0 text-muted-foreground/0 group-hover:text-primary/50 transition-colors ml-auto" />
                    </button>
                </SidebarSection>
            )}

            {/* Assignee */}
            <SidebarSection>
                <SidebarLabel>Assigné à</SidebarLabel>
                <div className="mt-2 space-y-2">
                    {assigneeMember ? (
                        <div className="flex items-center gap-2">
                            <div
                                className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                                style={{ backgroundColor: "var(--brand-secondary,#6366F1)" }}
                            >
                                {getInitials(assigneeMember.first_name ?? "", assigneeMember.last_name ?? "", assigneeMember.email ?? "")}
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-semibold text-foreground truncate leading-tight">{assigneeName}</p>
                                <p className="text-[10px] text-muted-foreground/60 truncate">{assigneeMember.email}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full border border-dashed border-muted-foreground/20 flex items-center justify-center shrink-0">
                                <UserRound className="w-3.5 h-3.5 text-muted-foreground/30" />
                            </div>
                            <span className="text-xs text-muted-foreground/50">Non assigné</span>
                        </div>
                    )}
                    <Select
                        value={assigneeId ?? "unassigned"}
                        onValueChange={(v) => onAssigneeChange(v === "unassigned" ? null : v)}
                    >
                        <SelectTrigger className="h-7 text-xs border-border/30 bg-transparent shadow-none focus:ring-0 rounded-lg text-muted-foreground">
                            <SelectValue placeholder="Changer…" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="unassigned" className="text-xs text-muted-foreground">Non assigné</SelectItem>
                            {members.map((m) => {
                                const name = m.first_name ? `${m.first_name} ${m.last_name ?? ""}`.trim() : (m.email ?? m.id);
                                return (
                                    <SelectItem key={m.id} value={m.id} className="text-xs">
                                        <span className="flex items-center gap-2">
                                            <span
                                                className="h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0"
                                                style={{ backgroundColor: "var(--brand-secondary,#6366F1)" }}
                                            >
                                                {getInitials(m.first_name ?? "", m.last_name ?? "", m.email ?? "")}
                                            </span>
                                            {name}
                                        </span>
                                    </SelectItem>
                                );
                            })}
                        </SelectContent>
                    </Select>
                </div>
            </SidebarSection>

            {/* Properties */}
            <SidebarSection>
                <SidebarLabel>Propriétés</SidebarLabel>
                <div className="mt-2 space-y-2.5">

                    <SidebarPropRow
                        icon={<div className={cn("w-2 h-2 rounded-full shrink-0", STATUS_CONFIG[status]?.dot)} />}
                        label="Statut"
                    >
                        <Select value={status} onValueChange={onStatusChange}>
                            <SelectTrigger className={selectTriggerCls}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                {Object.entries(STATUS_CONFIG).map(([v, c]) => (
                                    <SelectItem key={v} value={v} className="text-xs">{c.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </SidebarPropRow>

                    <SidebarPropRow
                        icon={PriorityIcon && <PriorityIcon className={cn("w-3.5 h-3.5 shrink-0", PRIORITY_CONFIG[priority]?.color)} />}
                        label="Priorité"
                    >
                        <Select value={priority} onValueChange={onPriorityChange}>
                            <SelectTrigger className={selectTriggerCls}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                {Object.entries(PRIORITY_CONFIG).map(([v, c]) => (
                                    <SelectItem key={v} value={v} className="text-xs">{c.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </SidebarPropRow>

                    <SidebarPropRow
                        icon={TypeIcon && <TypeIcon className="w-3.5 h-3.5 shrink-0 text-muted-foreground/60" />}
                        label="Catégorie"
                    >
                        <Select value={type} onValueChange={onTypeChange}>
                            <SelectTrigger className={selectTriggerCls}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                {Object.entries(TYPE_CONFIG).map(([v, c]) => (
                                    <SelectItem key={v} value={v} className="text-xs">{c.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </SidebarPropRow>

                    <SidebarPropRow
                        icon={<Tag className="w-3.5 h-3.5 shrink-0 text-muted-foreground/60" />}
                        label="Version"
                    >
                        <Select value={versionId ?? "none"} onValueChange={(v) => onVersionChange(v === "none" ? null : v)}>
                            <SelectTrigger className={selectTriggerCls}>
                                <SelectValue placeholder="Aucune" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                <SelectItem value="none" className="text-xs text-muted-foreground">Aucune</SelectItem>
                                {versions.filter((v) => v.status === "open").map((v) => (
                                    <SelectItem key={v.id} value={v.id} className="text-xs">{v.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </SidebarPropRow>
                </div>
            </SidebarSection>

            {/* Due date */}
            <SidebarSection className={isOverdue ? "bg-red-50/40 dark:bg-red-950/10" : ""}>
                <div className="flex items-center gap-1.5 mb-2">
                    <CalendarDays className={cn("w-3 h-3", isOverdue ? "text-red-500" : "text-muted-foreground/50")} />
                    <SidebarLabel className={cn("mb-0", isOverdue ? "text-red-500/80" : "")}>
                        Échéance{isOverdue ? " · En retard" : ""}
                    </SidebarLabel>
                </div>
                {dueDate && (
                    <p className={cn(
                        "text-xs font-semibold mb-2",
                        isOverdue
                            ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 rounded px-1.5 py-0.5 inline-block"
                            : "text-foreground"
                    )}>
                        {dayjs(dueDate).locale("fr").format("D MMM YYYY")}
                    </p>
                )}
                <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => onDueDateChange(e.target.value)}
                    className="w-full h-7 text-xs text-muted-foreground bg-card/60 border border-border/30 rounded-md px-2.5 outline-none focus:border-border cursor-pointer"
                />
            </SidebarSection>

            {/* Meta */}
            {task && (task.created_at || task.creator) && (
                <SidebarSection className="border-b-0">
                    <SidebarLabel>Info</SidebarLabel>
                    <div className="mt-2 space-y-2">
                        {task.created_at && (
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] text-muted-foreground/50">Créé</span>
                                <span className="text-[11px] font-medium text-muted-foreground/60">
                                    {dayjs(task.created_at).locale("fr").fromNow()}
                                </span>
                            </div>
                        )}
                        {task.creator && (
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] text-muted-foreground/50 shrink-0">Par</span>
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <div
                                        className="h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0"
                                        style={{ backgroundColor: "var(--brand-secondary,#6366F1)", color: "#fff" }}
                                    >
                                        {getInitials(task.creator.first_name, task.creator.last_name, task.creator.email)}
                                    </div>
                                    <p className="text-[11px] font-medium text-muted-foreground/70 truncate">
                                        {task.creator.first_name
                                            ? `${task.creator.first_name} ${task.creator.last_name ?? ""}`.trim()
                                            : task.creator.email}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </SidebarSection>
            )}
        </div>
    );
}
