"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { HOLDINGS, type StrategyHolding } from "@/lib/portfolio-data";
import { ChevronDown, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Strategy badge ────────────────────────────────────────────────────────

function StrategyBadge({ strategy, color }: { strategy: string; color: string }) {
  return (
    <span
      className="text-[9px] font-medium px-1.5 py-0.5 rounded-md border"
      style={{
        color,
        borderColor: `${color}30`,
        background: `${color}12`,
      }}
    >
      {strategy}
    </span>
  );
}

// ── Risk score pill ───────────────────────────────────────────────────────

function RiskScore({ score }: { score: number }) {
  const color =
    score < 25 ? "#00e5a0" :
    score < 50 ? "#00d4ff" :
    score < 75 ? "#f5a623" :
    "#ff4d6a";

  const label =
    score < 25 ? "Low" :
    score < 50 ? "Med" :
    score < 75 ? "High" :
    "Extreme";

  return (
    <div className="flex items-center gap-1">
      <div
        className="w-1 h-1 rounded-full"
        style={{ background: color, boxShadow: `0 0 4px ${color}` }}
      />
      <span className="text-[9px] font-mono" style={{ color }}>
        {label} {score}
      </span>
    </div>
  );
}

// ── Mini Greek bar ────────────────────────────────────────────────────────

function GreekBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = Math.min(1, Math.abs(value) / max);
  const isNeg = value < 0;

  return (
    <div className="space-y-0.5">
      <div className="flex justify-between">
        <span className="text-[9px] text-[var(--ox-text-muted)]">{label}</span>
        <span className="text-[9px] font-mono" style={{ color }}>
          {isNeg ? "" : "+"}{value.toFixed(label === "Γ" ? 4 : 2)}
        </span>
      </div>
      <div className="h-0.5 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct * 100}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
    </div>
  );
}

// ── Single holding card ───────────────────────────────────────────────────

function HoldingCard({
  holding,
  index,
  isExpanded,
  onToggle,
}: {
  holding: StrategyHolding;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const isProfit = holding.pnl > 0;
  const pnlColor = isProfit ? "var(--ox-accent-green)" : "var(--ox-accent-red)";
  const PnlIcon = isProfit ? TrendingUp : holding.pnl === 0 ? Minus : TrendingDown;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        "rounded-xl border transition-all duration-200 overflow-hidden",
        isExpanded
          ? "border-white/10"
          : "border-[var(--ox-border-default)]"
      )}
      style={{
        background: isExpanded ? "rgba(17,23,34,0.95)" : "rgba(11,14,22,0.6)",
        boxShadow: isExpanded ? `0 0 20px ${holding.color}10` : "none",
      }}
    >
      {/* ── Collapsed header row ── */}
      <motion.button
        onClick={onToggle}
        whileHover={{ backgroundColor: "rgba(255,255,255,0.02)" }}
        className="w-full text-left px-4 py-3 flex items-center gap-3"
      >
        {/* Color strip */}
        <div
          className="w-0.5 h-8 rounded-full shrink-0"
          style={{
            background: holding.color,
            boxShadow: `0 0 8px ${holding.color}80`,
          }}
        />

        {/* Ticker + Strategy */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-bold font-mono text-[var(--ox-text-primary)]">
              {holding.ticker}
            </span>
            <StrategyBadge strategy={holding.strategy} color={holding.color} />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-[var(--ox-text-muted)] font-mono">
              {holding.strikes}
            </span>
            <span className="text-[10px] text-[var(--ox-text-muted)]">
              {holding.expiry}
            </span>
            <span className="text-[10px] text-[var(--ox-text-muted)]">
              ×{holding.quantity}
            </span>
          </div>
        </div>

        {/* P/L */}
        <div className="text-right shrink-0">
          <div className="flex items-center gap-1 justify-end">
            <PnlIcon size={10} style={{ color: pnlColor }} />
            <span className="text-sm font-bold font-mono" style={{ color: pnlColor }}>
              {isProfit ? "+" : ""}${Math.abs(holding.pnl).toLocaleString()}
            </span>
          </div>
          <span
            className="text-[9px] font-mono"
            style={{ color: isProfit ? "rgba(0,229,160,0.6)" : "rgba(255,77,106,0.6)" }}
          >
            {isProfit ? "+" : ""}{holding.pnlPct.toFixed(1)}%
          </span>
        </div>

        {/* Risk score */}
        <div className="shrink-0 w-16 text-right">
          <RiskScore score={holding.riskScore} />
        </div>

        {/* DTE */}
        <div className="shrink-0 text-right w-12">
          <p className="text-[10px] font-mono text-[var(--ox-text-muted)]">{holding.daysToExpiry}d</p>
          <p className="text-[9px] text-[var(--ox-text-muted)]">DTE</p>
        </div>

        {/* Expand chevron */}
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0 text-[var(--ox-text-muted)]"
        >
          <ChevronDown size={14} />
        </motion.div>
      </motion.button>

      {/* ── Expanded detail ── */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-white/[0.04]"
          >
            <div className="px-4 py-3 grid grid-cols-2 gap-4">
              {/* Greeks */}
              <div className="space-y-2">
                <p className="text-[9px] uppercase tracking-widest text-[var(--ox-text-muted)] mb-2">
                  Greeks
                </p>
                <GreekBar label="Δ Delta" value={holding.delta} max={1}      color="#00d4ff" />
                <GreekBar label="Γ Gamma" value={holding.gamma} max={0.05}   color="#a855f7" />
                <GreekBar label="Θ Theta" value={holding.theta} max={60}     color="#ff4d6a" />
                <GreekBar label="ν Vega"  value={holding.vega}  max={100}    color="#00e5a0" />
              </div>

              {/* Position detail */}
              <div className="space-y-2">
                <p className="text-[9px] uppercase tracking-widest text-[var(--ox-text-muted)] mb-2">
                  Position Detail
                </p>
                {[
                  { label: "Cost Basis",     value: `$${Math.abs(holding.costBasis).toLocaleString()}` },
                  { label: "Current Value",  value: `$${Math.abs(holding.currentValue).toLocaleString()}` },
                  { label: "Implied Vol",    value: `${holding.iv}%` },
                  { label: "Sector",         value: holding.sector },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-[10px]">
                    <span className="text-[var(--ox-text-muted)]">{label}</span>
                    <span className="font-mono text-[var(--ox-text-secondary)]">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* IV sparkline placeholder */}
            <div className="px-4 pb-3">
              <p className="text-[9px] uppercase tracking-widest text-[var(--ox-text-muted)] mb-1.5">
                IV Trend (30d)
              </p>
              <div className="h-0.5 rounded-full bg-white/5 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${holding.iv}%` }}
                  transition={{ duration: 0.8 }}
                  className="h-full rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${holding.color}40, ${holding.color})`,
                    boxShadow: `0 0 8px ${holding.color}60`,
                  }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Sorting / filter controls ─────────────────────────────────────────────

type SortKey = "pnl" | "dte" | "risk" | "ticker";

function SortButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "text-[10px] px-2 py-1 rounded-md border transition-colors",
        active
          ? "border-[var(--ox-accent-cyan)]/30 bg-[var(--ox-accent-cyan-dim)] text-[var(--ox-accent-cyan)]"
          : "border-[var(--ox-border-default)] text-[var(--ox-text-muted)] hover:text-[var(--ox-text-secondary)]"
      )}
    >
      {label}
    </button>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────

export default function HoldingsTable() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("pnl");

  const sorted = [...HOLDINGS].sort((a, b) => {
    if (sortKey === "pnl")    return b.pnl - a.pnl;
    if (sortKey === "dte")    return a.daysToExpiry - b.daysToExpiry;
    if (sortKey === "risk")   return b.riskScore - a.riskScore;
    if (sortKey === "ticker") return a.ticker.localeCompare(b.ticker);
    return 0;
  });

  const totalPnl = HOLDINGS.reduce((s, h) => s + h.pnl, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.08 }}
      className="glass rounded-2xl border border-[var(--ox-border-default)] p-4 space-y-3"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-4 rounded-full bg-[var(--ox-accent-cyan)]" style={{ boxShadow: "0 0 8px rgba(0,212,255,0.5)" }} />
            <h2 className="text-sm font-semibold text-[var(--ox-text-primary)]">
              Strategy Holdings
            </h2>
          </div>
          <p className="text-[10px] text-[var(--ox-text-muted)] mt-0.5 ml-3.5">
            {HOLDINGS.length} positions · click to expand Greeks
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-[var(--ox-text-muted)]">Portfolio P&L</p>
          <p
            className="text-sm font-mono font-bold"
            style={{ color: totalPnl >= 0 ? "var(--ox-accent-green)" : "var(--ox-accent-red)" }}
          >
            {totalPnl >= 0 ? "+" : ""}${totalPnl.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Sort controls */}
      <div className="flex gap-1.5">
        {(["pnl", "dte", "risk", "ticker"] as SortKey[]).map((key) => (
          <SortButton
            key={key}
            label={key === "pnl" ? "P/L" : key === "dte" ? "DTE" : key === "risk" ? "Risk" : "Ticker"}
            active={sortKey === key}
            onClick={() => setSortKey(key)}
          />
        ))}
      </div>

      {/* Holdings list */}
      <div className="space-y-1.5">
        {sorted.map((holding, i) => (
          <HoldingCard
            key={holding.id}
            holding={holding}
            index={i}
            isExpanded={expanded === holding.id}
            onToggle={() => setExpanded(expanded === holding.id ? null : holding.id)}
          />
        ))}
      </div>
    </motion.div>
  );
}
