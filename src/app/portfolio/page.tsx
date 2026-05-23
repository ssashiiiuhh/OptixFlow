import type { Metadata } from "next";
import AppShellLayout from "@/components/layout/AppShellLayout";
import PortfolioDashboard from "@/components/portfolio/PortfolioDashboard";

export const metadata: Metadata = {
  title: "Portfolio Intelligence",
  description: "Stress-test option positions, analyze aggregate portfolio Greeks, and monitor capital deployment."
};

export default function PortfolioPage() {
  return (
    <AppShellLayout>
      <PortfolioDashboard />
    </AppShellLayout>
  );
}
