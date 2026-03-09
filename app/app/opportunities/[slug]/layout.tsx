import { getOpportunityBySlug } from "@/actions/opportunity.server";
import { OpportunityProvider } from "./_components/opportunity-context";
import OpportunityHeader from "./_components/opportunity-header";
import OpportunitySidebarWrapper from "./_components/opportunity-sidebar-wrapper";

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
    return <div className="p-10 text-center">Opportunity not found</div>;
  }

  return (
    <OpportunityProvider opportunity={opportunity}>
      <div className="flex flex-col h-screen bg-background">
        <OpportunityHeader opportunity={opportunity} />

        <main className="flex flex-1 overflow-hidden">
          <div className="flex-1 flex flex-col overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>

          <OpportunitySidebarWrapper {...opportunity} />
        </main>
      </div>
    </OpportunityProvider>
  );
}
