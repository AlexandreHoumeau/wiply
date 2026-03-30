import type { ProjectVersion } from "@/actions/version.server";

export type ProjectTaskAssignee = {
    id?: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
};

export type ProjectTaskCommentCount = {
    count: number;
};

export type ProjectTaskVersion = Pick<ProjectVersion, "id" | "name" | "status">;

export type ProjectTask = {
    id: string;
    title: string;
    status: string;
    type: string | null;
    priority: string | null;
    description: string | null;
    due_date: string | null;
    created_at?: string;
    updated_at?: string;
    position?: number | null;
    parent_id: string | null;
    task_number: number | null;
    assignee_id?: string | null;
    assignee: ProjectTaskAssignee | null;
    version_id?: string | null;
    version?: ProjectTaskVersion | null;
    task_comments?: ProjectTaskCommentCount[] | null;
    creator?: { first_name: string | null; last_name: string | null; email: string | null } | null;
};
