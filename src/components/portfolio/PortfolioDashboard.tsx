// ============================================================================
// OPTIXFLOW — Portfolio Dashboard Client Component
// Renders dynamic holdings, exposure maps, and scenario stress testing.
// ============================================================================

"use client";

import { motion } from "framer-motion";
import { Play, Pause, SkipForward, RotateCcw } from "lucide-react";
import ExposureMap from "@/components/portfolio/ExposureMap";
import HoldingsTable from "@/components/portfolio/HoldingsTable";
import PortfolioGreeks from "@/components/portfolio/PortfolioGreeks";
import RiskSimulator from "@/components/portfolio/RiskSimulator";
import PLTimeline from "@/components/portfolio/PLTimeline";
import MonteCarloRisk from "@/components/portfolio/MonteCarloRisk";
import PortfolioConsole from "@/components/portfolio/PortfolioConsole";
import { PortfolioProvider, usePortfolio } from "./PortfolioContext";

function PortfolioHeader() {
  const {
    portfolioGreeks,
    isTicking,
    setIsTicking,
    manualTick,
    resetPortfolio,
    holdings,
  } = usePortfolio();

  const pct = ((portfolioGreeks.netPnl / portfolioGreeks.totalCost) * 100).toFixed(1);
  const isUp = portfolioGreeks.netPnl >= 0;

  return (
    <div className="shrink-0 px-5 pt-4 pb-0">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-base font-bold text-[var(--ox-text-primary)] tracking-tight">
              Portfolio Intelligence
            </h1>
            <span className="text-[9px] font-mono text-[var(--ox-accent-green)] border border-[var(--ox-accent-green)]/20 bg-[var(--ox-accent-green-dim)] rounded-full px-2 py-0.5 uppercase tracking-wider">
              {holdings.length} Positions
            </span>
          </div>
          <p className="text-[11px] text-[var(--ox-text-muted)] mt-0.5">
            Exposure · Risk Engine · Greeks · Scenario Analysis · P&L
          </p>
        </div>

        {/* Dynamic Ticking Controller HUD */}
        <div className="flex items-center gap-2 bg-black/40 border border-white/[0.06] rounded-xl px-3 py-1.5 self-start md:self-auto">
          <span className="text-[9px] font-mono uppercase tracking-widest text-[var(--ox-text-muted)] mr-2 flex items-center gap-1.5">
            Ticking Engine
            {isTicking && (
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--ox-accent-green)] animate-pulse" />
            )}
          </span>

          {/* Play/Pause */}
          <button
            onClick={() => setIsTicking(!isTicking)}
            className={`p-1.5 rounded-lg border transition-all duration-200 flex items-center justify-center ${
              isTicking
                ? "border-[var(--ox-accent-green)]/30 bg-[var(--ox-accent-green)]/10 text-[var(--ox-accent-green)] shadow-[0_0_8px_rgba(0,229,160,0.15)]"
                : "border-white/[0.08] bg-white/[0.02] text-[var(--ox-text-muted)] hover:text-[var(--ox-text-secondary)]"
            }`}
            title={isTicking ? "Pause Simulation" : "Start Live Ticking"}
          >
            {isTicking ? <Pause size={12} /> : <Play size={12} />}
          </button>

          {/* Single Step */}
          <button
            onClick={manualTick}
            disabled={isTicking}
            className="p-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] text-[var(--ox-text-muted)] hover:text-[var(--ox-text-secondary)] disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center justify-center"
            title="Single Price Step"
          >
            <SkipForward size={12} />
          </button>

          {/* Reset */}
          <button
            onClick={resetPortfolio}
            className="p-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] text-[var(--ox-text-muted)] hover:text-[var(--ox-accent-red)] transition-colors flex items-center justify-center"
            title="Reset to Baseline"
          >
            <RotateCcw size={12} />
          </button>
        </div>

        {/* Portfolio snapshot */}
        <div className="flex items-center gap-6 font-mono text-[var(--ox-text-secondary)] self-end md:self-auto">
          <div className="text-right">
            <p className="text-[10px] text-[var(--ox-text-muted)] uppercase tracking-wider">Capital Deployed</p>
            <p className="text-sm font-bold text-[var(--ox-text-primary)]">
              ${portfolioGreeks.totalCost.toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-[var(--ox-text-muted)] uppercase tracking-wider">Net P&L</p>
            <p
              className="text-sm font-bold transition-colors duration-300"
              style={{ color: isUp ? "var(--ox-accent-green)" : "var(--ox-accent-red)" }}
            >
              {isUp ? "+" : ""}${portfolioGreeks.netPnl.toLocaleString()}
              <span className="text-[10px] ml-1 opacity-60">({isUp ? "+" : ""}{pct}%)</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-[var(--ox-text-muted)] uppercase tracking-wider">Theta/Day</p>
            <p className="text-sm font-bold text-[var(--ox-accent-red)]">
              −${Math.abs(portfolioGreeks.totalTheta).toFixed(0)}
            </p>
          </div>
        </div>
      </motion.div>

      <div className="mt-3 h-px bg-[var(--ox-border-subtle)]" />
    </div>
  );
}

function PortfolioDashboardContent() {
  return (
    <div className="flex-1 overflow-hidden flex flex-col relative">
      {/* Green ambient background */}
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

      {/* Grid Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 relative z-10">
        <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-4 min-h-full">
          {/* Left column: Exposure + Greeks + Monte Carlo stacked */}
          <div className="space-y-4">
            <ExposureMap />
            <PortfolioGreeks />
            <MonteCarloRisk />
          </div>

          {/* Right column: Holdings top, then 2-col split, then Telemetry Console */}
          <div className="space-y-4">
            <HoldingsTable />

            {/* Bottom row: Risk sim + P&L side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <RiskSimulator />
              <PLTimeline />
            </div>

            {/* Scrolling Monospace log terminal */}
            <PortfolioConsole />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PortfolioDashboard() {
  return (
    <PortfolioProvider>
      <PortfolioDashboardContent />
    </PortfolioProvider>
  );
}
