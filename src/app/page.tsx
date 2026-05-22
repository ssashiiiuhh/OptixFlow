"use client";

import { useState } from "react";
import AppShellLayout from "@/components/layout/AppShellLayout";
import DashboardShell from "@/components/layout/DashboardShell";
import StrategyPanel from "@/components/strategy/StrategyPanel";
import PayoffChart from "@/components/chart/PayoffChart";
import type { StrategyParams } from "@/types/options";

const DEFAULT_PARAMS: StrategyParams = {
  strategyType: "long_call",
  optionType: "call",
  strikePrice: 175,
  premium: 5.5,
  quantity: 1,
  currentStockPrice: 170,
};

export default function DashboardPage() {
  const [params, setParams] = useState<StrategyParams>(DEFAULT_PARAMS);

  return (
    <AppShellLayout>
      <DashboardShell>
        <StrategyPanel params={params} onParamsChange={setParams} />
        <div className="overflow-hidden flex flex-col">
          <PayoffChart params={params} />
        </div>
      </DashboardShell>
    </AppShellLayout>
  );
}
