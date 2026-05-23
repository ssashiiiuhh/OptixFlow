import type { Metadata } from "next";
import AppShellLayout from "@/components/layout/AppShellLayout";
import StrategyLab from "@/components/strategy/StrategyLab";

export const metadata: Metadata = {
  title: "Strategy Lab Sandbox",
  description: "Construct and experiment with custom synthetic options structures and payoff diagnostics."
};

export default function StrategyLabPage() {
  return (
    <AppShellLayout>
      <StrategyLab />
    </AppShellLayout>
  );
}
