"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createVersion, releaseVersion, deleteVersion } from "@/actions/version.server";
import type { ProjectVersion } from "@/actions/version.server";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { ProjectContextValue } from "@/providers/project-provider";
import {
    Tag, Plus, CheckCircle2, Circle, Loader2, Trash2, Rocket, ChevronDown, ChevronRight,
    Inbox, PlayCircle, Clock,
    type LucideIcon,
} from "lucide-react";
import dayjs from "dayjs";
import "dayjs/locale/fr";

type VersionTask = {
    id: string;
    title: string;
    status: string | null;
    version_id: string | null;
    task_number: number | null;
    assignee?: {
        first_name: string | null;
        last_name: string | null;
        email: string | null;
    } | null;
};

const STATUS_CONFIG: Record<string, { icon: LucideIcon; label: string; color: string }> = {
    todo:        { icon: Inbox,        label: "À faire",  color: "text-muted-foreground" },
    in_progress: { icon: PlayCircle,   label: "En cours", color: "text-blue-500" },
    review:      { icon: Clock,        label: "En revue", color: "text-amber-500" },
    done:        { icon: CheckCircle2, label: "Terminé",  color: "text-emerald-500" },
};

interface VersionsClientProps {
    project: ProjectContextValue;
    versions: ProjectVersion[];
    tasks: VersionTask[];
}

export function VersionsClient({ project, versions: initialVersions, tasks }: VersionsClientProps) {
    const router = useRouter();
    const [versions, setVersions] = useState(initialVersions);
    const [newName, setNewName] = useState("");
    const [isCreating, startCreating] = useTransition();
    const [releasing, setReleasing] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
    const taskPrefix = project.task_prefix ?? "TCK";

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) return;
        startCreating(async () => {
            const result = await createVersion(project.id, project.agency_id, newName.trim());
            if (result.success) {
                setVersions((prev) => [result.data, ...prev]);
                setNewName("");
                toast.success("Version créée");
            } else {
                toast.error(result.error);
            }
        });
    };

    const handleRelease = async (versionId: string) => {
        setReleasing(versionId);
        const result = await releaseVersion(versionId);
        setReleasing(null);
        if (result.success) {
            setVersions((prev) =>
                prev.map((v) =>
                    v.id === versionId
                        ? { ...v, status: "released" as const, released_at: new Date().toISOString() }
                        : v
                )
            );
            toast.success("Version livrée !");
            router.refresh();
        } else {
            toast.error(result.error);
        }
    };

    const handleDelete = async (versionId: string) => {
        setDeleting(versionId);
        const result = await deleteVersion(versionId);
        setDeleting(null);
        if (result.success) {
            setVersions((prev) => prev.filter((v) => v.id !== versionId));
            toast.success("Version supprimée");
        } else {
            toast.error(result.error);
        }
    };

    const openVersions = versions.filter((v) => v.status === "open");
    const releasedVersions = versions.filter((v) => v.status === "released");

    const getVersionTasks = (versionId: string) =>
        tasks.filter((t) => t.version_id === versionId);

    const unassignedTasks = tasks.filter((t) => !t.version_id);

    return (
        <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-foreground">Versions</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Groupez vos tickets terminés en versions et livrez-les.
                    </p>
                </div>
            </div>

            {/* Create version form */}
            <form onSubmit={handleCreate} className="flex gap-3">
                <div className="flex-1 relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Nom de la version (ex: v1.0, Sprint 3…)"
                        className="w-full h-10 pl-9 pr-4 text-sm bg-card border border-border rounded-xl outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                    />
                </div>
                <Button type="submit" disabled={isCreating || !newName.trim()} size="sm" className="h-10 px-4 gap-2">
                    {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    Créer
                </Button>
            </form>

            {/* Open versions */}
            {openVersions.length > 0 && (
                <section className="space-y-3">
                    <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">En cours</p>
                    {openVersions.map((version) => (
                        <VersionCard
                            key={version.id}
                            version={version}
                            versionTasks={getVersionTasks(version.id)}
                            taskPrefix={taskPrefix}
                            collapsed={collapsed[version.id] ?? false}
                            onToggle={() => setCollapsed((s) => ({ ...s, [version.id]: !s[version.id] }))}
                            onRelease={() => handleRelease(version.id)}
                            onDelete={() => handleDelete(version.id)}
                            releasing={releasing === version.id}
                            deleting={deleting === version.id}
                        />
                    ))}
                </section>
            )}

            {/* Released versions */}
            {releasedVersions.length > 0 && (
                <section className="space-y-3">
                    <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Livrées</p>
                    {releasedVersions.map((version) => (
                        <VersionCard
                            key={version.id}
                            version={version}
                            versionTasks={getVersionTasks(version.id)}
                            taskPrefix={taskPrefix}
                            collapsed={collapsed[version.id] ?? true}
                            onToggle={() => setCollapsed((s) => ({ ...s, [version.id]: !s[version.id] }))}
                            onRelease={() => {}}
                            onDelete={() => handleDelete(version.id)}
                            releasing={false}
                            deleting={deleting === version.id}
                        />
                    ))}
                </section>
            )}

            {/* Unassigned tasks */}
            {unassignedTasks.length > 0 && (
                <section className="space-y-3">
                    <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                        Sans version ({unassignedTasks.length})
                    </p>
                    <div className="bg-card border border-border/50 rounded-2xl divide-y divide-border/50">
                        {unassignedTasks.map((task) => (
                            <TaskRow key={task.id} task={task} taskPrefix={taskPrefix} />
                        ))}
                    </div>
                </section>
            )}

            {versions.length === 0 && (
                <div className="text-center py-16 text-muted-foreground">
                    <Tag className="w-8 h-8 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Aucune version créée pour ce projet.</p>
                    <p className="text-xs mt-1 opacity-70">Créez une version pour grouper vos tickets terminés.</p>
                </div>
            )}
        </div>
    );
}

function VersionCard({
    version, versionTasks, taskPrefix, collapsed, onToggle,
    onRelease, onDelete, releasing, deleting,
}: {
    version: ProjectVersion;
    versionTasks: VersionTask[];
    taskPrefix: string;
    collapsed: boolean;
    onToggle: () => void;
    onRelease: () => void;
    onDelete: () => void;
    releasing: boolean;
    deleting: boolean;
}) {
    const isReleased = version.status === "released";
    const doneCount = versionTasks.filter((t) => t.status === "done").length;

    return (
        <div className={cn(
            "bg-card border rounded-2xl overflow-hidden",
            isReleased ? "border-emerald-200 dark:border-emerald-800/40" : "border-border"
        )}>
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4">
                <button onClick={onToggle} className="text-muted-foreground hover:text-foreground transition-colors">
                    {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                <div className="flex items-center gap-2 flex-1 min-w-0">
                    {isReleased
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        : <Circle className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                    }
                    <span className="font-semibold text-sm text-foreground truncate">{version.name}</span>
                    <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0",
                        isReleased
                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
                            : "bg-muted text-muted-foreground"
                    )}>
                        {isReleased ? "Livrée" : "En cours"}
                    </span>
                    {versionTasks.length > 0 && (
                        <span className="text-xs text-muted-foreground shrink-0">
                            {doneCount}/{versionTasks.length} terminés
                        </span>
                    )}
                </div>

                {isReleased && version.released_at && (
                    <span className="text-xs text-muted-foreground shrink-0">
                        {dayjs(version.released_at).locale("fr").format("D MMM YYYY")}
                    </span>
                )}

                <div className="flex items-center gap-1 shrink-0">
                    {!isReleased && (
                        <button
                            onClick={onRelease}
                            disabled={releasing}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
                        >
                            {releasing
                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                : <Rocket className="w-3 h-3" />}
                            Livrer
                        </button>
                    )}
                    <button
                        onClick={onDelete}
                        disabled={deleting}
                        className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                    >
                        {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    </button>
                </div>
            </div>

            {/* Task list */}
            {!collapsed && versionTasks.length > 0 && (
                <div className="border-t border-border/50 divide-y divide-border/40">
                    {versionTasks.map((task) => (
                        <TaskRow key={task.id} task={task} taskPrefix={taskPrefix} />
                    ))}
                </div>
            )}
            {!collapsed && versionTasks.length === 0 && (
                <div className="border-t border-border/50 px-5 py-4 text-sm text-muted-foreground/60 text-center">
                    Aucun ticket assigné à cette version. Ouvrez un ticket et sélectionnez cette version.
                </div>
            )}
        </div>
    );
}

function TaskRow({ task, taskPrefix }: { task: VersionTask; taskPrefix: string }) {
    const statusConf = STATUS_CONFIG[task.status ?? "todo"];
    const StatusIcon = statusConf.icon;
    const taskSlug = task.task_number ? `${taskPrefix}-${task.task_number}` : null;

    return (
        <div className="flex items-center gap-3 px-5 py-3">
            <StatusIcon className={cn("w-3.5 h-3.5 shrink-0", statusConf.color)} />
            {taskSlug && (
                <span className="font-mono text-[10px] text-muted-foreground/50 shrink-0">{taskSlug}</span>
            )}
            <span className="text-sm text-foreground truncate flex-1">{task.title}</span>
            {task.assignee && (
                <div
                    className="h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                    style={{ backgroundColor: "var(--brand-secondary,#6366F1)" }}
                    title={task.assignee.first_name ? `${task.assignee.first_name} ${task.assignee.last_name ?? ""}`.trim() : task.assignee.email ?? undefined}
                >
                    {task.assignee.first_name?.charAt(0)}{task.assignee.last_name?.charAt(0)}
                </div>
            )}
        </div>
    );
}
