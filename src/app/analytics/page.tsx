"use client";

import { motion } from "framer-motion";
import AppShellLayout from "@/components/layout/AppShellLayout";
import VolatilityPanel from "@/components/analytics/VolatilityPanel";
import GreeksPanel from "@/components/analytics/GreeksPanel";
import ProbabilityCone from "@/components/analytics/ProbabilityCone";
import MarketRegimePanel from "@/components/analytics/MarketRegimePanel";
import AssetIntelPanel from "@/components/analytics/AssetIntelPanel";

// ── Page header banner ────────────────────────────────────

function AnalyticsHeader() {
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
              Options Intelligence
            </h1>
            <span className="text-[9px] font-mono text-[var(--ox-accent-cyan)] border border-[var(--ox-accent-cyan)]/20 bg-[var(--ox-accent-cyan-dim)] rounded-full px-2 py-0.5 uppercase tracking-wider">
              Analytics
            </span>
          </div>
          <p className="text-[11px] text-[var(--ox-text-muted)] mt-0.5">
            Volatility · Greeks · Probability · Regime · Asset Intelligence
          </p>
        </div>

        {/* Live timestamp */}
        <div className="text-right">
          <p className="text-[10px] text-[var(--ox-text-muted)] uppercase tracking-wider">
            Market Data
          </p>
          <p className="text-[11px] font-mono text-[var(--ox-accent-green)]">
            <motion.span
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              ● LIVE
            </motion.span>
          </p>
        </div>
      </motion.div>

      {/* Thin separator */}
      <div className="mt-3 h-px bg-[var(--ox-border-subtle)]" />
    </div>
  );
}

// ── Analytics Page ────────────────────────────────────────

export default function AnalyticsPage() {
  return (
    <AppShellLayout>
      {/*
       * Full-height scrollable canvas with a subtle ambient glow.
       * The grid is 2 columns on large screens:
       *   Left  (narrow): MarketRegime + AssetIntel stacked
       *   Right (wide):   Volatility on top, then Greeks + Cone side-by-side
       */}
      <div className="flex-1 overflow-hidden flex flex-col relative">
        {/* Ambient background — different hue from strategy lab */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 70% 50% at 80% 0%, rgba(168,85,247,0.05) 0%, transparent 60%)",
          }}
        />
        <div className="absolute inset-0 bg-grid opacity-40 pointer-events-none" />

        <AnalyticsHeader />

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 relative z-10">
          {/*
           * Layout:
           * ┌──────────────────────┬────────────┐
           * │  Volatility (full W) │            │
           * ├───────────┬──────────┤ Asset Intel│
           * │  Greeks   │  Prob    │            │
           * │  Exposure │  Cone    │            │
           * └───────────┴──────────┴────────────┘
           * And Market Regime sits under Asset Intel on smaller screens
           */}
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4 min-h-full">
            {/* Main left column */}
            <div className="space-y-4">
              {/* Row 1 — Volatility (full width of left col) */}
              <VolatilityPanel />

              {/* Row 2 — Greeks + Probability Cone side-by-side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <GreeksPanel />
                <ProbabilityCone />
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-4">
              <MarketRegimePanel />
              <AssetIntelPanel />
            </div>
          </div>
        </div>
      </div>
    </AppShellLayout>
  );
}
