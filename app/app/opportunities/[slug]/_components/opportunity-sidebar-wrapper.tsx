import { OpportunityWithCompany } from "@/lib/validators/oppotunities";
import OpportunitySidebarInfo from "./opportunity-sidebar";

export default function OpportunitySidebarWrapper(opportunity: OpportunityWithCompany) {
    return (
        <aside className="hidden lg:flex w-72 shrink-0 self-stretch border-l bg-background/80 p-6 shadow-sm backdrop-blur-md">
            <OpportunitySidebarInfo {...opportunity} />
        </aside>
    );
}
