import { Skeleton } from "@/components/ui/skeleton";

function HeaderSkeleton({
  icon = true,
  action,
  titleWidth = "w-48",
  subtitleWidth = "w-72",
}: {
  icon?: boolean;
  action?: string;
  titleWidth?: string;
  subtitleWidth?: string;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        {icon ? <Skeleton className="h-12 w-12 rounded-2xl" /> : null}
        <div className="space-y-2">
          <Skeleton className={`h-7 rounded ${titleWidth}`} />
          <Skeleton className={`h-4 rounded ${subtitleWidth}`} />
        </div>
      </div>
      {action ? <Skeleton className={`h-10 rounded-xl ${action}`} /> : null}
    </div>
  );
}

function MetricGridSkeleton({
  count,
  columns,
  cardHeight = "h-24",
}: {
  count: number;
  columns: string;
  cardHeight?: string;
}) {
  return (
    <div className={`grid gap-4 ${columns}`}>
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} className={`${cardHeight} rounded-2xl`} />
      ))}
    </div>
  );
}

function TableSkeleton({
  filters = true,
  rows = 6,
  minHeight = "min-h-[420px]",
}: {
  filters?: boolean;
  rows?: number;
  minHeight?: string;
}) {
  return (
    <div className={`rounded-2xl border bg-card overflow-hidden ${minHeight}`}>
      {filters ? (
        <div className="border-b p-4 space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Skeleton className="h-10 w-full max-w-md rounded-xl" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-10 w-28 rounded-xl" />
              <Skeleton className="h-10 w-32 rounded-xl" />
              <Skeleton className="h-10 w-32 rounded-xl" />
            </div>
          </div>
        </div>
      ) : null}
      <div className="p-4 space-y-3">
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton key={index} className="h-14 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function TabsSkeleton() {
  return (
    <div className="flex items-center gap-2 overflow-x-auto">
      <Skeleton className="h-10 w-28 rounded-xl" />
      <Skeleton className="h-10 w-32 rounded-xl" />
      <Skeleton className="h-10 w-28 rounded-xl" />
      <Skeleton className="h-10 w-32 rounded-xl" />
    </div>
  );
}

export function DashboardPageSkeleton() {
  return (
    <div className="max-w-[1400px] mx-auto p-6 md:p-8 space-y-8">
      <HeaderSkeleton icon={false} action="w-56" titleWidth="w-56" subtitleWidth="w-80" />
      <MetricGridSkeleton count={4} columns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" />
      <Skeleton className="h-40 rounded-3xl" />
      <Skeleton className="h-64 rounded-3xl" />
      <Skeleton className="h-56 rounded-3xl" />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Skeleton className="h-80 rounded-3xl lg:col-span-3" />
        <Skeleton className="h-80 rounded-3xl lg:col-span-2" />
      </div>
      <Skeleton className="h-80 rounded-3xl" />
    </div>
  );
}

export function OpportunitiesPageSkeleton() {
  return (
    <div className="max-w-[1400px] w-full mx-auto p-4 md:p-8 space-y-6 h-full flex flex-col">
      <HeaderSkeleton icon={false} action="w-72" titleWidth="w-64" subtitleWidth="w-80" />
      <MetricGridSkeleton count={6} columns="grid-cols-3 md:grid-cols-6" cardHeight="h-20" />
      <TableSkeleton rows={8} minHeight="min-h-[500px]" />
    </div>
  );
}

export function ProjectsPageSkeleton() {
  return (
    <div className="w-full flex-1 p-6 md:p-8 space-y-6">
      <HeaderSkeleton action="w-40" />
      <MetricGridSkeleton count={3} columns="grid-cols-1 md:grid-cols-3" cardHeight="h-24" />
      <div className="rounded-3xl border bg-card overflow-hidden">
        {Array.from({ length: 3 }).map((_, group) => (
          <div key={group} className={group > 0 ? "border-t" : ""}>
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/40">
              <Skeleton className="h-4 w-40 rounded" />
              <Skeleton className="h-4 w-24 rounded" />
            </div>
            <div className="p-2 space-y-2">
              {Array.from({ length: 3 }).map((__, row) => (
                <Skeleton key={row} className="h-16 rounded-2xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CompaniesPageSkeleton() {
  return (
    <div className="w-full flex-1 p-6 md:p-8 space-y-8">
      <HeaderSkeleton action="w-36" />
      <MetricGridSkeleton count={3} columns="grid-cols-1 sm:grid-cols-3" cardHeight="h-24" />
      <TableSkeleton rows={7} />
    </div>
  );
}

export function FilesPageSkeleton() {
  return (
    <div className="px-6 py-8 space-y-6">
      <HeaderSkeleton icon={false} titleWidth="w-24" subtitleWidth="w-64" />
      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <Skeleton className="h-[520px] rounded-3xl" />
        <div className="space-y-4">
          <Skeleton className="h-24 rounded-3xl" />
          <TableSkeleton rows={8} filters={false} minHeight="min-h-[392px]" />
        </div>
      </div>
    </div>
  );
}

export function WorkspacePageSkeleton() {
  return (
    <div className="flex flex-col h-full bg-background">
      <div className="border-b px-6 py-5 shrink-0">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-11 w-11 rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-40 rounded" />
              <Skeleton className="h-4 w-72 rounded" />
            </div>
          </div>
          <Skeleton className="h-10 w-44 rounded-xl" />
        </div>
      </div>
      <div className="flex-1 p-6">
        <div className="grid h-full min-h-[520px] gap-4 md:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-full rounded-3xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function QuotesListPageSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <HeaderSkeleton icon={false} action="w-36" titleWidth="w-24" subtitleWidth="w-32" />
      <MetricGridSkeleton count={4} columns="grid-cols-2 md:grid-cols-4" cardHeight="h-28" />
      <TabsSkeleton />
      <TableSkeleton rows={6} filters={false} />
    </div>
  );
}

export function QuoteFormPageSkeleton() {
  return (
    <div className="p-6 md:p-10 max-w-2xl mx-auto space-y-8">
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-4 w-16 rounded" />
      </div>
      <div className="rounded-3xl border bg-card p-8 space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40 rounded" />
          <Skeleton className="h-4 w-80 rounded" />
        </div>
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32 rounded" />
            <Skeleton className="h-12 rounded-xl" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-40 rounded" />
            <Skeleton className="h-12 rounded-xl" />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Skeleton className="h-10 w-24 rounded-full" />
          <Skeleton className="h-10 w-32 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function QuoteEditorPageSkeleton() {
  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 rounded" />
          <Skeleton className="h-4 w-64 rounded" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24 rounded-xl" />
          <Skeleton className="h-10 w-28 rounded-xl" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Skeleton className="h-72 rounded-3xl" />
          <Skeleton className="h-80 rounded-3xl" />
        </div>
        <Skeleton className="h-[520px] rounded-3xl" />
      </div>
    </div>
  );
}

export function SettingsPageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1000px] mx-auto px-6 py-10 space-y-8">
        <div className="space-y-3">
          <Skeleton className="h-9 w-48 rounded" />
        </div>
        <TabsSkeleton />
        <div className="space-y-6">
          <Skeleton className="h-72 rounded-3xl" />
          <Skeleton className="h-56 rounded-3xl" />
          <Skeleton className="h-64 rounded-3xl" />
        </div>
      </div>
    </div>
  );
}

export function AgencyOverviewPageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b px-6 py-16 md:py-20" style={{ backgroundColor: "var(--muted)" }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <Skeleton className="h-28 w-28 rounded-3xl" />
            <div className="space-y-4">
              <div className="flex gap-2">
                <Skeleton className="h-6 w-28 rounded-full" />
                <Skeleton className="h-6 w-32 rounded-full" />
              </div>
              <Skeleton className="h-12 w-80 rounded" />
              <Skeleton className="h-5 w-56 rounded" />
              <div className="flex gap-3">
                <Skeleton className="h-8 w-28 rounded-full" />
                <Skeleton className="h-8 w-32 rounded-full" />
                <Skeleton className="h-8 w-44 rounded-full" />
              </div>
            </div>
          </div>
          <Skeleton className="h-11 w-36 rounded-xl" />
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-6 py-12 -mt-8 relative z-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
          <div className="space-y-8 lg:col-span-3">
            <Skeleton className="h-80 rounded-3xl" />
            <Skeleton className="h-72 rounded-3xl" />
            <Skeleton className="h-80 rounded-3xl" />
          </div>
          <div className="space-y-8 lg:col-span-2">
            <Skeleton className="h-80 rounded-3xl" />
            <Skeleton className="h-72 rounded-3xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function AgencyAnalyticsPageSkeleton() {
  return (
    <div className="max-w-6xl mx-auto p-6 md:p-8 space-y-6">
      <HeaderSkeleton icon={false} action="w-36" titleWidth="w-56" subtitleWidth="w-80" />
      <MetricGridSkeleton count={4} columns="grid-cols-1 sm:grid-cols-2 xl:grid-cols-4" cardHeight="h-32" />
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Skeleton className="h-[420px] rounded-3xl" />
        <Skeleton className="h-[420px] rounded-3xl" />
      </div>
      <Skeleton className="h-96 rounded-3xl" />
    </div>
  );
}

export function AgencyConfigPageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1000px] mx-auto px-6 py-10 space-y-8">
        <div className="space-y-4">
          <Skeleton className="h-4 w-20 rounded" />
          <Skeleton className="h-9 w-72 rounded" />
        </div>
        <TabsSkeleton />
        <div className="space-y-6">
          <Skeleton className="h-80 rounded-3xl" />
          <Skeleton className="h-72 rounded-3xl" />
        </div>
      </div>
    </div>
  );
}

export function OpportunityShellSkeleton() {
  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="border-b px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-3">
            <Skeleton className="h-5 w-32 rounded" />
            <Skeleton className="h-8 w-72 rounded" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-6 w-28 rounded-full" />
              <Skeleton className="h-6 w-32 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32 rounded-xl" />
            <Skeleton className="h-10 w-28 rounded-xl" />
          </div>
        </div>
      </div>
      <main className="flex flex-1 items-start overflow-y-auto">
        <div className="flex-1 px-3 py-6 sm:px-4 lg:px-6 space-y-6">
          <TabsSkeleton />
          <Skeleton className="h-40 rounded-3xl" />
          <div className="grid gap-6 xl:grid-cols-2">
            <Skeleton className="h-72 rounded-3xl" />
            <Skeleton className="h-72 rounded-3xl" />
          </div>
        </div>
        <div className="hidden xl:block w-[360px] p-4">
          <Skeleton className="h-[560px] rounded-3xl" />
        </div>
      </main>
    </div>
  );
}

export function OpportunityOverviewPageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-40 rounded-3xl" />
      <div className="grid gap-6 xl:grid-cols-2">
        <Skeleton className="h-80 rounded-3xl" />
        <Skeleton className="h-80 rounded-3xl" />
      </div>
      <Skeleton className="h-64 rounded-3xl" />
    </div>
  );
}

export function OpportunityMessagePageSkeleton() {
  return (
    <div className="w-full max-w-[1600px] space-y-6">
      <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
        <Skeleton className="h-[620px] rounded-3xl" />
        <Skeleton className="h-[620px] rounded-3xl" />
      </div>
    </div>
  );
}

export function OpportunityTimelinePageSkeleton() {
  return (
    <div className="space-y-4 max-w-4xl">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="flex gap-4">
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <Skeleton className="h-24 flex-1 rounded-2xl" />
        </div>
      ))}
    </div>
  );
}

export function OpportunityTrackingPageSkeleton() {
  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <MetricGridSkeleton count={3} columns="grid-cols-1 sm:grid-cols-3" cardHeight="h-28" />
      <TableSkeleton rows={6} />
    </div>
  );
}

export function OpportunityAnalyticsPageSkeleton() {
  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <MetricGridSkeleton count={4} columns="grid-cols-1 sm:grid-cols-2 xl:grid-cols-4" cardHeight="h-28" />
      <div className="grid gap-6 xl:grid-cols-2">
        <Skeleton className="h-80 rounded-3xl" />
        <Skeleton className="h-80 rounded-3xl" />
      </div>
    </div>
  );
}

export function ProjectShellSkeleton() {
  return (
    <div className="flex flex-col h-full bg-background">
      <div className="border-b px-6 py-5">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-5 w-28 rounded" />
              <Skeleton className="h-8 w-64 rounded" />
            </div>
            <Skeleton className="h-10 w-32 rounded-xl" />
          </div>
          <TabsSkeleton />
        </div>
      </div>
      <main className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          <Skeleton className="h-40 rounded-3xl" />
          <div className="grid gap-6 xl:grid-cols-2">
            <Skeleton className="h-72 rounded-3xl" />
            <Skeleton className="h-72 rounded-3xl" />
          </div>
        </div>
      </main>
    </div>
  );
}

export function ProjectOverviewPageSkeleton() {
  return (
    <div className="max-w-[1400px] mx-auto p-6 md:p-8 space-y-6">
      <MetricGridSkeleton count={4} columns="grid-cols-1 sm:grid-cols-2 xl:grid-cols-4" cardHeight="h-28" />
      <div className="grid gap-6 xl:grid-cols-2">
        <Skeleton className="h-80 rounded-3xl" />
        <Skeleton className="h-80 rounded-3xl" />
      </div>
      <Skeleton className="h-80 rounded-3xl" />
    </div>
  );
}

export function ProjectBoardPageSkeleton() {
  return (
    <div className="h-full flex flex-col p-6">
      <div className="grid h-full min-h-[560px] gap-4 md:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-full rounded-3xl" />
        ))}
      </div>
    </div>
  );
}

export function ProjectChecklistPageSkeleton() {
  return (
    <div className="max-w-[1100px] mx-auto p-6 md:p-8 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48 rounded" />
          <Skeleton className="h-4 w-72 rounded" />
        </div>
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>
      {Array.from({ length: 5 }).map((_, index) => (
        <Skeleton key={index} className="h-28 rounded-3xl" />
      ))}
    </div>
  );
}

export function ProjectFilesPageSkeleton() {
  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8 space-y-6">
      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <Skeleton className="h-[520px] rounded-3xl" />
        <div className="space-y-4">
          <Skeleton className="h-24 rounded-3xl" />
          <TableSkeleton rows={8} filters={false} minHeight="min-h-[392px]" />
        </div>
      </div>
    </div>
  );
}

export function ProjectSettingsPageSkeleton() {
  return (
    <div className="max-w-[1000px] mx-auto p-6 md:p-8 space-y-8 pb-20">
      <Skeleton className="h-52 rounded-3xl" />
      <Skeleton className="h-[720px] rounded-3xl" />
    </div>
  );
}

export function ProjectVersionsPageSkeleton() {
  return (
    <div className="max-w-[1400px] mx-auto p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48 rounded" />
          <Skeleton className="h-4 w-80 rounded" />
        </div>
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
        <Skeleton className="h-[640px] rounded-3xl" />
        <Skeleton className="h-[640px] rounded-3xl" />
      </div>
    </div>
  );
}
