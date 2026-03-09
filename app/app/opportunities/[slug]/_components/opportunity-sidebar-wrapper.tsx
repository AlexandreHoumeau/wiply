import { OpportunityWithCompany } from "@/lib/validators/oppotunities";
import OpportunitySidebarInfo from "./opportunity-sidebar";

export default function OpportunitySidebarWrapper(opportunity: OpportunityWithCompany) {
    return (
        <aside className="hidden lg:flex flex-col w-72 shrink-0 h-full overflow-y-auto border-l bg-background/80 backdrop-blur-md p-6 shadow-sm">
            <OpportunitySidebarInfo {...opportunity} />
        </aside>
    );
}
