import type { Metadata } from "next";
import AppShellLayout from "@/components/layout/AppShellLayout";
import TradeIntelDashboard from "@/components/intelligence/TradeIntelDashboard";

export const metadata: Metadata = {
  title: "Trade Intelligence Cockpit",
  description: "Construct investment theses, score strategic alignments, and run reality scenario simulations."
};

export default function IntelligencePage() {
  return (
    <AppShellLayout>
      <TradeIntelDashboard />
    </AppShellLayout>
  );
}
