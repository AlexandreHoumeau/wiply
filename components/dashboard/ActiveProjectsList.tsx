import Link from "next/link";
import { ArrowRight, FolderKanban } from "lucide-react";
import type { RecentProject } from "@/actions/dashboard.server";

export function ActiveProjectsList({ projects }: { projects: RecentProject[] }) {
  return (
    <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <FolderKanban className="h-4 w-4 text-slate-500" />
          <h2 className="card-title">Projets Actifs</h2>
        </div>
        <Link
          href="/app/projects"
          className="text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors flex items-center gap-1"
        >
          Voir tout <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-10 text-slate-400">
          <FolderKanban className="w-8 h-8 mb-3 opacity-30" />
          <p className="text-sm font-medium">Aucun projet actif</p>
          <Link
            href="/app/projects"
            className="mt-4 text-xs font-bold text-slate-600 hover:text-slate-900 hover:underline transition-colors"
          >
            Créer un projet →
          </Link>
        </div>
      ) : (
        <div className="space-y-1 flex-1">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/app/projects/${project.slug}`}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group"
            >
              <div className="h-9 w-9 rounded-xl flex items-center justify-center font-extrabold text-sm shrink-0 text-white" style={{ backgroundColor: 'var(--brand-secondary, #6366F1)' }}>
                {project.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900 truncate group-hover:text-slate-700 transition-colors">
                  {project.name}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {project.company?.name ?? "Projet interne"}
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 shrink-0 transition-colors" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
