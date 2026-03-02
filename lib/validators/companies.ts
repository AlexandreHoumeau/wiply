export type Company = {
  id: string;
  name: string;
  address: string | null;
  email: string | null;
  phone_number: string | null;
  website: string | null;
  business_sector: string | null;
  created_at: string;
};

export type CompanyWithRelations = Company & {
  opportunities: { id: string; status: string; name: string; slug: string }[];
  projects: { id: string; status: string; name: string; slug: string }[];
};

export type CompanyTab = "all" | "clients" | "prospects";

export type CompanySortKey =
  | "name_asc"
  | "name_desc"
  | "created_at_desc"
  | "created_at_asc";

export const SORT_LABELS: Record<CompanySortKey, string> = {
  name_asc: "Nom A → Z",
  name_desc: "Nom Z → A",
  created_at_desc: "Plus récent",
  created_at_asc: "Plus ancien",
};

export const DEFAULT_TAB: CompanyTab = "all";
export const DEFAULT_SORT: CompanySortKey = "created_at_desc";
export const DEFAULT_PAGE_SIZE = 12;

export type FetchCompaniesParams = {
  agencyId: string;
  search?: string;
  tab?: CompanyTab;
  sectors?: string[];
  sort?: CompanySortKey;
  page?: number;
  pageSize?: number;
};
