// ============================================================================
// OPTIXFLOW — Portfolio Dashboard Client Component v2
// Integrates: 3D Vol Surface, Delta-Hedger, Market Playback, AI Console.
// ============================================================================

"use client";

import { motion } from "framer-motion";
import { Play, Pause, SkipForward, RotateCcw, Clock, Settings } from "lucide-react";
import { useState } from "react";
import ExposureMap from "@/components/portfolio/ExposureMap";
import HoldingsTable from "@/components/portfolio/HoldingsTable";
import PortfolioGreeks from "@/components/portfolio/PortfolioGreeks";
import RiskSimulator from "@/components/portfolio/RiskSimulator";
import PLTimeline from "@/components/portfolio/PLTimeline";
import MonteCarloRisk from "@/components/portfolio/MonteCarloRisk";
import PortfolioConsole from "@/components/portfolio/PortfolioConsole";
import VolatilitySurface3D from "@/components/portfolio/VolatilitySurface3D";
import DeltaHedger from "@/components/portfolio/DeltaHedger";
import TradierBridge from "@/components/portfolio/TradierBridge";
import MarketPlayback from "@/components/portfolio/MarketPlayback";
import SettingsModal from "@/components/portfolio/SettingsModal";
import OnboardingTour from "@/components/portfolio/OnboardingTour";
import { PortfolioProvider, usePortfolio } from "./PortfolioContext";
import { cn } from "@/lib/utils";

function PortfolioHeader() {
  const {
    portfolioGreeks,
    isTicking,
    setIsTicking,
    manualTick,
    resetPortfolio,
    holdings,
    playbackMode,
    playbackIsPlaying,
  } = usePortfolio();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const pct = ((portfolioGreeks.netPnl / portfolioGreeks.totalCost) * 100).toFixed(1);
  const isUp = portfolioGreeks.netPnl >= 0;

  return (
    <header className="shrink-0 px-5 pt-4 pb-0" role="banner">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-base font-bold text-[var(--ox-text-primary)] tracking-tight" id="dashboard-title">
              Portfolio Intelligence
            </h1>
            <span className="text-[9px] font-mono text-[var(--ox-accent-green)] border border-[var(--ox-accent-green)]/20 bg-[var(--ox-accent-green-dim)] rounded-full px-2 py-0.5 uppercase tracking-wider">
              {holdings.length} Positions
            </span>
            {playbackMode && (
              <span className="text-[9px] font-mono text-[var(--ox-accent-amber)] border border-[var(--ox-accent-amber)]/30 bg-[var(--ox-accent-amber)]/10 rounded-full px-2 py-0.5 uppercase tracking-wider flex items-center gap-1">
                <Clock size={8} />
                {playbackIsPlaying ? "Playback ●" : "Playback ‖"}
              </span>
            )}
          </div>
          <p className="text-[11px] text-[var(--ox-text-muted)] mt-0.5">
            Exposure · 3D Vol Surface · Delta-Hedger · Market Playback · AI Narration
          </p>
        </div>

        {/* Ticking Engine HUD (hidden during playback) */}
        {!playbackMode && (
          <div className="flex items-center gap-2 bg-black/40 border border-white/[0.06] rounded-xl px-3 py-1.5 self-start md:self-auto" role="toolbar" aria-label="Simulation Controls">
            <span className="text-[9px] font-mono uppercase tracking-widest text-[var(--ox-text-muted)] mr-2 flex items-center gap-1.5">
              Ticking Engine
              {isTicking && <span className="h-1.5 w-1.5 rounded-full bg-[var(--ox-accent-green)] animate-pulse" />}
            </span>
            <button
              onClick={() => setIsTicking(!isTicking)}
              className={cn(
                "p-1.5 rounded-lg border transition-all duration-200 flex items-center justify-center",
                isTicking
                  ? "border-[var(--ox-accent-green)]/30 bg-[var(--ox-accent-green)]/10 text-[var(--ox-accent-green)] shadow-[0_0_8px_rgba(0,229,160,0.15)]"
                  : "border-white/[0.08] bg-white/[0.02] text-[var(--ox-text-muted)] hover:text-[var(--ox-text-secondary)]"
              )}
              title={isTicking ? "Pause Simulation" : "Start Live Ticking"}
              aria-label={isTicking ? "Pause live simulation" : "Start live simulation"}
              aria-pressed={isTicking}
            >
              {isTicking ? <Pause size={12} aria-hidden="true" /> : <Play size={12} aria-hidden="true" />}
            </button>
            <button
              onClick={manualTick}
              disabled={isTicking}
              className="p-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] text-[var(--ox-text-muted)] hover:text-[var(--ox-text-secondary)] disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center justify-center"
              title="Single Price Step"
              aria-label="Advance simulation by one price step"
            >
              <SkipForward size={12} aria-hidden="true" />
            </button>
            <button
              onClick={resetPortfolio}
              className="p-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] text-[var(--ox-text-muted)] hover:text-[var(--ox-accent-red)] transition-colors flex items-center justify-center"
              title="Reset to Baseline"
              aria-label="Reset simulation to baseline state"
            >
              <RotateCcw size={12} aria-hidden="true" />
            </button>
            <div className="w-px h-4 bg-white/[0.08] mx-1" role="separator" />
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] text-[var(--ox-text-muted)] hover:text-white transition-colors flex items-center justify-center"
              title="System Settings"
              aria-label="Open System Settings"
              aria-haspopup="dialog"
            >
              <Settings size={12} aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Portfolio snapshot */}
        <div className="flex items-center gap-6 font-mono text-[var(--ox-text-secondary)] self-end md:self-auto" role="group" aria-label="Portfolio Snapshot Metrics">
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

      <div className="mt-3 h-px bg-[var(--ox-border-subtle)]" role="separator" />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </header>
  );
}

function PortfolioDashboardContent() {
  const [activeTab, setActiveTab] = useState("DASHBOARD");

  return (
    <main className="flex-1 overflow-hidden flex flex-col relative" aria-labelledby="dashboard-title">
      {/* Ambient background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: [
            "radial-gradient(ellipse 50% 60% at 0% 30%, rgba(0,229,160,0.04) 0%, transparent 60%)",
            "radial-gradient(ellipse 40% 40% at 100% 70%, rgba(255,77,106,0.04) 0%, transparent 60%)",
            "radial-gradient(ellipse 30% 50% at 50% 100%, rgba(168,85,247,0.03) 0%, transparent 60%)",
          ].join(", "),
        }}
      />
      <div className="absolute inset-0 bg-grid opacity-25 pointer-events-none" />

      <PortfolioHeader />

      {/* ── SUB-TAB NAVIGATION ── */}
      <div className="flex px-6 border-b border-[var(--ox-border-default)] bg-[#05070a]/90 backdrop-blur-md shrink-0 z-20 font-mono text-[10px] relative">
        {["DASHBOARD", "TRADE LOG"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 font-bold border-b-2 transition-all ${
              activeTab === tab
                ? "border-cyan-400 text-cyan-400"
                : "border-transparent text-white/40 hover:text-white/80"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "DASHBOARD" ? (      <div className="flex-1 overflow-y-auto px-5 py-4 relative z-10">
        {/* Market Playback — collapsible transport at top */}
        <div className="mb-4">
          <MarketPlayback />
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-4">
          {/* Left column */}
          <div className="space-y-4">
            <ExposureMap />
            <PortfolioGreeks />
            <MonteCarloRisk />
            <DeltaHedger />
            <TradierBridge />
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* 3D Volatility Surface — full-width feature panel */}
            <VolatilitySurface3D />

            <HoldingsTable />

            {/* Bottom split: Risk Sim + P&L */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <RiskSimulator />
              <PLTimeline />
            </div>

            {/* AI-enhanced telemetry console */}
            <PortfolioConsole />
          </div>
        </div>
      </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-5 py-4 relative z-10 flex items-center justify-center text-white/50 font-mono text-sm">
          {activeTab} under construction...
        </div>
      )}
      
      {/* Onboarding Tour overlay */}
      <OnboardingTour />
    </main>
  );
}

export default function PortfolioDashboard() {
  return (
    <PortfolioProvider>
      <PortfolioDashboardContent />
    </PortfolioProvider>
  );
}
