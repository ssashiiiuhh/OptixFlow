// ============================================================================
// OPTIXFLOW — Monte Carlo Risk Analysis HUD
// Displays dynamic Value at Risk (VaR) and Expected Shortfall (CVaR).
// ============================================================================

"use client";

import { motion } from "framer-motion";
import { usePortfolio } from "./PortfolioContext";
import { ShieldAlert, TrendingDown, HelpCircle } from "lucide-react";

export default function MonteCarloRisk() {
  const { varMetrics, expectedStdDev, isTicking } = usePortfolio();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="glass rounded-2xl border border-[var(--ox-border-default)] p-4 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-4 rounded-full bg-[var(--ox-accent-red)] glow-red" />
            <h2 className="text-sm font-semibold text-[var(--ox-text-primary)] flex items-center gap-1.5">
              Monte Carlo Risk Engine
              {isTicking && (
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--ox-accent-red)] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--ox-accent-red)]"></span>
                </span>
              )}
            </h2>
          </div>
          <p className="text-[10px] text-[var(--ox-text-muted)] mt-0.5 ml-3.5">
            500 path GBM walk · 10d horizon · 95% / 99% confidence
          </p>
        </div>
        <ShieldAlert size={16} className="text-[var(--ox-accent-red)] opacity-60" />
      </div>

      {/* Primary VaR readouts */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-[var(--ox-border-subtle)] p-3 bg-white/[0.01] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-12 h-12 bg-[var(--ox-accent-red)]/5 rounded-bl-full pointer-events-none" />
          <p className="text-[9px] text-[var(--ox-text-muted)] uppercase tracking-wider">Value at Risk (95% VaR)</p>
          <p className="text-lg font-black font-mono text-[var(--ox-accent-red)] mt-0.5">
            ${Math.round(varMetrics.var95).toLocaleString()}
          </p>
          <p className="text-[8px] text-[var(--ox-text-muted)] mt-1">
            Max loss threshold with 95% certainty over 10 days
          </p>
        </div>

        <div className="rounded-xl border border-[var(--ox-border-subtle)] p-3 bg-white/[0.01] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-12 h-12 bg-[#a855f7]/5 rounded-bl-full pointer-events-none" />
          <p className="text-[9px] text-[var(--ox-text-muted)] uppercase tracking-wider">Extreme Tail (99% VaR)</p>
          <p className="text-lg font-black font-mono text-[#a855f7] mt-0.5">
            ${Math.round(varMetrics.var99).toLocaleString()}
          </p>
          <p className="text-[8px] text-[var(--ox-text-muted)] mt-1">
            Max loss threshold under 1% tail volatility event
          </p>
        </div>
      </div>

      {/* Expected Shortfall (CVaR) */}
      <div className="rounded-xl border border-[var(--ox-border-subtle)] p-3 bg-white/[0.02] flex items-center justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1">
            <TrendingDown size={11} className="text-[var(--ox-accent-red)]" />
            <p className="text-[9px] text-[var(--ox-text-muted)] uppercase tracking-wider">Expected Shortfall (CVaR 95%)</p>
          </div>
          <p className="text-sm font-bold font-mono text-[var(--ox-text-secondary)]">
            ${Math.round(varMetrics.cvar95).toLocaleString()}
          </p>
          <p className="text-[8px] text-[var(--ox-text-muted)] leading-relaxed">
            Average projected loss if portfolio falls beyond the 95% VaR threshold
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[8px] text-[var(--ox-text-muted)] uppercase">Simulated StdDev</p>
          <p className="text-xs font-mono font-bold text-[var(--ox-accent-cyan)] mt-0.5">
            ±${Math.round(expectedStdDev).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Visual Risk Distribution Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[9px] font-mono text-[var(--ox-text-muted)]">
          <span>Profit / Flat Zone</span>
          <span>VaR (95%)</span>
          <span>VaR (99%)</span>
        </div>
        <div className="h-2.5 rounded-full bg-white/5 overflow-hidden flex relative">
          <div className="h-full bg-[var(--ox-accent-green)]/30" style={{ width: "70%" }} />
          <div className="h-full bg-[var(--ox-accent-amber)]/40" style={{ width: "20%" }} />
          <div className="h-full bg-[var(--ox-accent-red)]/50" style={{ width: "10%" }} />
          {/* Vertical marker lines */}
          <div className="absolute left-[70%] top-0 bottom-0 w-0.5 bg-[var(--ox-accent-amber)] shadow-lg" />
          <div className="absolute left-[90%] top-0 bottom-0 w-0.5 bg-[var(--ox-accent-red)] shadow-lg" />
        </div>
        <div className="flex justify-between text-[8px] text-[var(--ox-text-muted)] leading-normal px-0.5">
          <span>Hedge Effectiveness: <b className="text-[var(--ox-accent-green)]">Optimal</b></span>
          <span>Expected Tail Loss: <b className="text-[var(--ox-accent-red)]">Uncapped</b></span>
        </div>
      </div>
    </motion.div>
  );
}
