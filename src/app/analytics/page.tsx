import type { Metadata } from "next";
import AppShellLayout from "@/components/layout/AppShellLayout";
import AnalyticsIntel from "@/components/analytics/AnalyticsIntel";

export const metadata: Metadata = {
  title: "Analytics Intelligence Lab",
  description: "Evaluate live market structures, 3D implied volatility surfaces, and Greek exposure profiles."
};

export default function AnalyticsPage() {
  return (
    <AppShellLayout>
      <AnalyticsIntel />
    </AppShellLayout>
  );
}
