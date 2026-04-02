import { getOpportunityBySlug } from "@/actions/opportunity.server";
import { OpportunityProvider } from "./_components/opportunity-context";
import OpportunityHeader from "./_components/opportunity-header";
import OpportunitySidebarWrapper from "./_components/opportunity-sidebar-wrapper";
import { notFound } from "next/navigation";

export default async function OpportunityLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const opportunity = await getOpportunityBySlug(slug);

  if (!opportunity) {
    notFound();
  }

  return (
    <OpportunityProvider opportunity={opportunity}>
      <div className="flex flex-col h-screen bg-background">
        <OpportunityHeader opportunity={opportunity} />

        <main className="flex flex-1 items-start overflow-y-auto">
          <div className="flex-1 px-3 py-6 sm:px-4 lg:px-6">
            {children}
          </div>

          <OpportunitySidebarWrapper {...opportunity} />
        </main>
      </div>
    </OpportunityProvider>
  );
}
