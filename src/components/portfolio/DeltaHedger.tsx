// ============================================================================
// OPTIXFLOW — Automated Delta-Hedger HUD Panel
// Live delta-meter, tolerance bands, hedge recommendations, auto-hedge toggle.
// ============================================================================

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Shield, ShieldAlert, ShieldCheck, ShieldOff, Zap, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { usePortfolio } from "./PortfolioContext";
import { cn } from "@/lib/utils";

const SEVERITY_CONFIG = {
  neutral:  { color: "var(--ox-accent-green)",  bg: "rgba(0,229,160,0.08)",   border: "rgba(0,229,160,0.2)",  label: "NEUTRAL",  icon: ShieldCheck },
  caution:  { color: "var(--ox-accent-amber)",  bg: "rgba(245,166,35,0.08)",  border: "rgba(245,166,35,0.2)", label: "CAUTION",  icon: Shield },
  warning:  { color: "#f97316",                 bg: "rgba(249,115,22,0.08)",  border: "rgba(249,115,22,0.2)", label: "WARNING",  icon: ShieldAlert },
  critical: { color: "var(--ox-accent-red)",    bg: "rgba(255,77,106,0.08)",  border: "rgba(255,77,106,0.2)", label: "CRITICAL", icon: ShieldOff },
};

export default function DeltaHedger() {
  const { hedgerState, autoHedgeEnabled, setAutoHedgeEnabled, simulateHedge } = usePortfolio();

  if (!hedgerState) return null;

  const { netDelta, toleranceLow, toleranceHigh, severity, recommendation, deltaExposurePct } = hedgerState;
  const cfg = SEVERITY_CONFIG[severity];
  const SeverityIcon = cfg.icon;

  // Gauge: map delta to 0-100% position
  const gaugeMax = Math.max(Math.abs(toleranceLow), toleranceHigh) * 2;
  const gaugeNeutralLow = (toleranceLow + gaugeMax / 2) / gaugeMax * 100;
  const gaugeNeutralHigh = (toleranceHigh + gaugeMax / 2) / gaugeMax * 100;
  const gaugeFill = Math.max(0, Math.min(100, (netDelta + gaugeMax / 2) / gaugeMax * 100));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="glass rounded-2xl border border-[var(--ox-border-default)] p-4 flex flex-col gap-3 relative overflow-hidden"
      style={{ borderColor: severity !== "neutral" ? cfg.border : undefined }}
    >
      {/* Critical glow pulse */}
      {severity === "critical" && (
        <div
          className="absolute inset-0 pointer-events-none animate-pulse"
          style={{ background: "radial-gradient(ellipse 80% 40% at 50% 0%, rgba(255,77,106,0.06) 0%, transparent 70%)" }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <SeverityIcon
            size={14}
            style={{ color: cfg.color, filter: `drop-shadow(0 0 6px ${cfg.color})` }}
          />
          <span className="text-[11px] font-mono uppercase tracking-widest text-[var(--ox-text-primary)]">
            Delta-Hedger
          </span>
          <span
            className="text-[8px] font-mono px-1.5 py-0.5 rounded-full border font-bold tracking-widest"
            style={{ color: cfg.color, borderColor: cfg.border, background: cfg.bg }}
          >
            {cfg.label}
          </span>
        </div>

        {/* Auto-hedge toggle */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-[var(--ox-text-muted)]">AUTO</span>
          <button
            onClick={() => setAutoHedgeEnabled(!autoHedgeEnabled)}
            className={cn(
              "relative w-8 h-4 rounded-full transition-all duration-300 border",
              autoHedgeEnabled
                ? "bg-[var(--ox-accent-green)]/20 border-[var(--ox-accent-green)]/40"
                : "bg-white/5 border-white/10"
            )}
            title={autoHedgeEnabled ? "Disable Auto-Hedge" : "Enable Auto-Hedge"}
          >
            <span
              className={cn(
                "absolute top-0.5 h-3 w-3 rounded-full transition-all duration-300",
                autoHedgeEnabled
                  ? "left-[18px] bg-[var(--ox-accent-green)] shadow-[0_0_6px_rgba(0,229,160,0.6)]"
                  : "left-0.5 bg-white/30"
              )}
            />
          </button>
        </div>
      </div>

      {/* Delta Gauge */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[9px] font-mono text-[var(--ox-text-muted)]">
          <span>Net Delta</span>
          <span
            className="font-bold text-[11px] tabular-nums"
            style={{ color: cfg.color }}
          >
            {netDelta > 0 ? "+" : ""}{netDelta.toFixed(1)} Δ
          </span>
        </div>

        {/* Gauge bar */}
        <div className="relative h-3 bg-white/[0.03] rounded-full overflow-hidden border border-white/[0.04]">
          {/* Neutral zone highlight */}
          <div
            className="absolute top-0 h-full rounded-full opacity-20"
            style={{
              left: `${gaugeNeutralLow}%`,
              width: `${gaugeNeutralHigh - gaugeNeutralLow}%`,
              background: "var(--ox-accent-green)",
            }}
          />
          {/* Delta fill bar */}
          <motion.div
            className="absolute top-0 left-0 h-full rounded-full"
            style={{ background: `linear-gradient(90deg, rgba(0,212,255,0.4), ${cfg.color})` }}
            animate={{ width: `${gaugeFill}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
          {/* Center tick (neutral center) */}
          <div className="absolute top-0 bottom-0 w-px bg-white/20" style={{ left: "50%" }} />
          {/* Tolerance markers */}
          <div
            className="absolute top-0 bottom-0 w-px"
            style={{ left: `${gaugeNeutralLow}%`, background: "rgba(0,229,160,0.5)" }}
          />
          <div
            className="absolute top-0 bottom-0 w-px"
            style={{ left: `${gaugeNeutralHigh}%`, background: "rgba(0,229,160,0.5)" }}
          />
        </div>

        {/* Labels */}
        <div className="flex justify-between text-[8px] font-mono text-[var(--ox-text-muted)]">
          <span>{toleranceLow}Δ</span>
          <span className="text-[var(--ox-accent-green)]/60">Neutral Zone</span>
          <span>+{toleranceHigh}Δ</span>
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Δ Exposure", value: `${Math.abs(deltaExposurePct).toFixed(0)}%`, color: cfg.color },
          { label: "Tolerance", value: `±${toleranceHigh}Δ`, color: "var(--ox-text-secondary)" },
          { label: "Status", value: recommendation ? "ACTION" : "CLEAR", color: recommendation ? cfg.color : "var(--ox-accent-green)" },
        ].map((m) => (
          <div key={m.label} className="bg-white/[0.02] border border-white/[0.05] rounded-lg p-2 text-center">
            <p className="text-[8px] font-mono text-[var(--ox-text-muted)] uppercase">{m.label}</p>
            <p className="text-[11px] font-mono font-bold mt-0.5 tabular-nums" style={{ color: m.color }}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Hedge Recommendation */}
      <AnimatePresence mode="wait">
        {recommendation ? (
          <motion.div
            key="recommendation"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-xl border p-3 space-y-2"
            style={{ borderColor: cfg.border, background: cfg.bg }}
          >
            {/* Recommendation header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <AlertTriangle size={11} style={{ color: cfg.color }} />
                <span className="text-[9px] font-mono uppercase tracking-widest font-bold" style={{ color: cfg.color }}>
                  Hedge Required
                </span>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[10px]">
                {recommendation.direction === "buy"
                  ? <TrendingUp size={11} className="text-[var(--ox-accent-green)]" />
                  : <TrendingDown size={11} className="text-[var(--ox-accent-red)]" />
                }
                <span className="font-bold text-[var(--ox-text-primary)]">
                  {recommendation.direction.toUpperCase()} {recommendation.quantity}×{" "}
                  {recommendation.ticker}
                  {recommendation.strike ? ` ${recommendation.strike}${recommendation.instrument === "put" ? "P" : "C"}` : ""}
                  {recommendation.dte ? ` (${recommendation.dte}d)` : ""}
                </span>
              </div>
            </div>

            {/* Rationale */}
            <p className="text-[9px] font-mono text-[var(--ox-text-secondary)] leading-relaxed">
              {recommendation.rationale}
            </p>

            {/* Cost + Delta offset + Simulate */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="flex gap-3 text-[9px] font-mono">
                <span className="text-[var(--ox-text-muted)]">
                  Δ offset: <span className="text-[var(--ox-text-secondary)]">{recommendation.deltaOffset > 0 ? "+" : ""}{recommendation.deltaOffset.toFixed(0)}</span>
                </span>
                <span className="text-[var(--ox-text-muted)]">
                  Est. cost: <span className="text-[var(--ox-text-secondary)]">${recommendation.estimatedCost.toLocaleString()}</span>
                </span>
              </div>
              <button
                onClick={simulateHedge}
                className="flex items-center gap-1 text-[9px] font-mono px-2.5 py-1 rounded-lg border transition-all duration-200 hover:scale-105 active:scale-95"
                style={{
                  borderColor: cfg.border,
                  color: cfg.color,
                  background: cfg.bg,
                }}
              >
                <Zap size={9} />
                Simulate Hedge
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="clear"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 text-[9px] font-mono text-[var(--ox-accent-green)] bg-[var(--ox-accent-green-dim)] border border-[var(--ox-accent-green)]/15 rounded-xl px-3 py-2"
          >
            <ShieldCheck size={11} />
            Portfolio delta within tolerance band — no hedge required.
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
