import { Suspense } from "react";
import { CompaniesPageSkeleton } from "@/app/app/_components/page-skeletons";
import CompaniesPage from "./CompaniesPage";

export default function Page() {
  return (
    <Suspense fallback={<CompaniesPageSkeleton />}>
      <CompaniesPage />
    </Suspense>
  );
}
