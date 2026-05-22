"use client";

import { motion } from "framer-motion";
import AppShellLayout from "@/components/layout/AppShellLayout";
import ExposureMap from "@/components/portfolio/ExposureMap";
import HoldingsTable from "@/components/portfolio/HoldingsTable";
import PortfolioGreeks from "@/components/portfolio/PortfolioGreeks";
import RiskSimulator from "@/components/portfolio/RiskSimulator";
import PLTimeline from "@/components/portfolio/PLTimeline";
import { PORTFOLIO_GREEKS } from "@/lib/portfolio-data";

// ── Cinematic header ──────────────────────────────────────────────────────

function PortfolioHeader() {
  const pct = ((PORTFOLIO_GREEKS.netPnl / PORTFOLIO_GREEKS.totalCost) * 100).toFixed(1);
  const isUp = PORTFOLIO_GREEKS.netPnl >= 0;

  return (
    <div className="shrink-0 px-5 pt-4 pb-0">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between"
      >
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-base font-bold text-[var(--ox-text-primary)] tracking-tight">
              Portfolio Intelligence
            </h1>
            <span className="text-[9px] font-mono text-[var(--ox-accent-green)] border border-[var(--ox-accent-green)]/20 bg-[var(--ox-accent-green-dim)] rounded-full px-2 py-0.5 uppercase tracking-wider">
              7 Positions
            </span>
          </div>
          <p className="text-[11px] text-[var(--ox-text-muted)] mt-0.5">
            Exposure · Risk Engine · Greeks · Scenario Analysis · P&L
          </p>
        </div>

        {/* Portfolio snapshot */}
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-[10px] text-[var(--ox-text-muted)] uppercase tracking-wider">Capital Deployed</p>
            <p className="text-sm font-mono font-bold text-[var(--ox-text-primary)]">
              ${PORTFOLIO_GREEKS.totalCost.toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-[var(--ox-text-muted)] uppercase tracking-wider">Net P&L</p>
            <p
              className="text-sm font-mono font-bold"
              style={{ color: isUp ? "var(--ox-accent-green)" : "var(--ox-accent-red)" }}
            >
              {isUp ? "+" : ""}${PORTFOLIO_GREEKS.netPnl.toLocaleString()}
              <span className="text-[10px] ml-1 opacity-60">({isUp ? "+" : ""}{pct}%)</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-[var(--ox-text-muted)] uppercase tracking-wider">Theta/Day</p>
            <p className="text-sm font-mono font-bold text-[var(--ox-accent-red)]">
              −${Math.abs(PORTFOLIO_GREEKS.totalTheta).toFixed(0)}
            </p>
          </div>
        </div>
      </motion.div>

      <div className="mt-3 h-px bg-[var(--ox-border-subtle)]" />
    </div>
  );
}

// ── Portfolio Page ────────────────────────────────────────────────────────

export default function PortfolioPage() {
  return (
    <AppShellLayout>
      <div className="flex-1 overflow-hidden flex flex-col relative">

        {/* Green ambient — distinct from cyan (strategy) and purple (analytics) */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: [
              "radial-gradient(ellipse 50% 60% at 0% 30%, rgba(0,229,160,0.04) 0%, transparent 60%)",
              "radial-gradient(ellipse 40% 40% at 100% 70%, rgba(255,77,106,0.04) 0%, transparent 60%)",
            ].join(", "),
          }}
        />
        <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />

        <PortfolioHeader />

        {/*
         * Layout:
         * ┌──────────────────┬────────────────────────┐
         * │  Exposure Map    │  Holdings Table (tall) │
         * ├──────────────────┤                        │
         * │  Greeks Engine   │                        │
         * ├──────────────────┴────────────────────────┤
         * │  Risk Simulator  │  P/L Timeline          │
         * └──────────────────┴────────────────────────┘
         */}
        <div className="flex-1 overflow-y-auto px-5 py-4 relative z-10">
          <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-4 min-h-full">

            {/* Left column: Exposure + Greeks stacked */}
            <div className="space-y-4">
              <ExposureMap />
              <PortfolioGreeks />
            </div>

            {/* Right column: Holdings top, then 2-col split */}
            <div className="space-y-4">
              <HoldingsTable />

              {/* Bottom row: Risk sim + P&L side by side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <RiskSimulator />
                <PLTimeline />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShellLayout>
  );
}
