"use client";

import AppShellLayout from "@/components/layout/AppShellLayout";
import TradeIntelDashboard from "@/components/intelligence/TradeIntelDashboard";

export default function IntelligencePage() {
  return (
    <AppShellLayout>
      <TradeIntelDashboard />
    </AppShellLayout>
  );
}
