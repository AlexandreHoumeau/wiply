"use client";

import { ReactQueryProvider } from "@/providers/ReactQueryProvider";
import { UpgradeDialogProvider } from "@/providers/UpgradeDialogProvider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ReactQueryProvider>
      <UpgradeDialogProvider>{children}</UpgradeDialogProvider>
    </ReactQueryProvider>
  );
}
