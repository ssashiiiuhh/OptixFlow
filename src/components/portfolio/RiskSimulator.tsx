// ============================================================================
// OPTIXFLOW — Dynamic Scenario Risk Simulator
// Recalculates position P&L shock sensitivities relative to ticking spot price walks.
// ============================================================================

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer, ReferenceLine, Tooltip } from "recharts";
import { usePortfolio, type Scenario, type StrategyHolding } from "./PortfolioContext";
import { cn } from "@/lib/utils";

// ── Scenario selector button ──────────────────────────────────────────────

function ScenarioButton({
  scenario,
  active,
  onClick,
}: {
  scenario: Scenario;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "relative p-3 rounded-xl border text-left transition-all duration-200 overflow-hidden",
        active ? "border-opacity-50" : "border-[var(--ox-border-default)]"
      )}
      style={{
        borderColor: active ? scenario.color + "40" : undefined,
        background: active
          ? `radial-gradient(ellipse at 0% 0%, ${scenario.color}10, rgba(11,14,22,0.9))`
          : "rgba(11,14,22,0.5)",
        boxShadow: active ? `0 0 24px ${scenario.color}15` : "none",
      }}
    >
      {/* Active glow strip */}
      {active && (
        <motion.div
          layoutId="scenario-strip"
          className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-xl"
          style={{ background: scenario.color, boxShadow: `0 0 8px ${scenario.color}` }}
        />
      )}

      <p className="text-base mb-0.5">{scenario.icon}</p>
      <p className="text-[11px] font-semibold text-[var(--ox-text-primary)]">{scenario.label}</p>
      <p className="text-[9px] text-[var(--ox-text-muted)] mt-0.5 leading-relaxed">
        {scenario.description}
      </p>
    </motion.button>
  );
}

// ── Per-holding impact bar chart ──────────────────────────────────────────

function HoldingImpactChart({ scenario, holdings }: { scenario: Scenario; holdings: StrategyHolding[] }) {
  const data = useMemo(() => {
    return holdings.map((h) => ({
      ticker: h.ticker,
      impact: scenario.holdingImpacts[h.id] ?? 0,
      color: (scenario.holdingImpacts[h.id] ?? 0) >= 0 ? "#00e5a0" : "#ff4d6a",
    }));
  }, [holdings, scenario]);

  const maxAbs = useMemo(() => {
    const impacts = data.map((d) => Math.abs(d.impact));
    return impacts.length > 0 ? Math.max(...impacts, 100) : 100;
  }, [data]);

  return (
    <div className="h-36">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
          <XAxis
            dataKey="ticker"
            tick={{ fill: "#4a5568", fontSize: 9, fontFamily: "monospace" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
            tick={{ fill: "#4a5568", fontSize: 9, fontFamily: "monospace" }}
            axisLine={false}
            tickLine={false}
            domain={[-maxAbs * 1.2, maxAbs * 1.2]}
          />
          <Tooltip
            contentStyle={{
              background: "rgba(7,9,15,0.95)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8,
              fontSize: 10,
              fontFamily: "monospace",
            }}
            formatter={(v: unknown) => {
              const n = Number(v);
              return [`${n >= 0 ? "+" : ""}$${n.toLocaleString()}`, "P&L Impact"];
            }}
          />
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
          <Bar dataKey="impact" radius={[3, 3, 0, 0]} maxBarSize={32} isAnimationActive={false}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.color}
                fillOpacity={0.85}
                style={{ filter: `drop-shadow(0 0 4px ${entry.color}60)` }}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Scenario result readout ───────────────────────────────────────────────

function ScenarioResult({ scenario, holdings, delay }: { scenario: Scenario; holdings: StrategyHolding[]; delay: number }) {
  const isProfit = scenario.pnlImpact >= 0;
  const impactColor = isProfit ? "#00e5a0" : "#ff4d6a";

  const { best, worst } = useMemo(() => {
    const impacts = Object.entries(scenario.holdingImpacts);
    if (impacts.length === 0) return { best: null, worst: null };

    const sorted = [...impacts].sort(([, a], [, b]) => b - a);
    const bestEntry = sorted[0];
    const worstEntry = sorted[sorted.length - 1];

    const bestHolding = holdings.find((h) => h.id === bestEntry[0]);
    const worstHolding = holdings.find((h) => h.id === worstEntry[0]);

    return {
      best: { holding: bestHolding, value: bestEntry[1] },
      worst: { holding: worstHolding, value: worstEntry[1] },
    };
  }, [scenario, holdings]);

  return (
    <motion.div
      key={scenario.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3, delay }}
      className="space-y-3"
    >
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-2 rounded-xl border border-[var(--ox-border-subtle)] p-3"
        style={{ background: "rgba(7,9,15,0.7)" }}
      >
        <div className="text-center">
          <p className="text-[9px] text-[var(--ox-text-muted)] uppercase tracking-wider">P&L Impact</p>
          <p className="text-base font-black font-mono mt-0.5" style={{ color: impactColor }}>
            {isProfit ? "+" : ""}${Math.round(scenario.pnlImpact).toLocaleString()}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[9px] text-[var(--ox-text-muted)] uppercase tracking-wider">IV Change</p>
          <p
            className="text-base font-black font-mono mt-0.5"
            style={{ color: scenario.ivChange > 0 ? "#ff4d6a" : scenario.ivChange < 0 ? "#00e5a0" : "#4a5568" }}
          >
            {scenario.ivChange > 0 ? "+" : ""}{scenario.ivChange}%
          </p>
        </div>
        <div className="text-center">
          <p className="text-[9px] text-[var(--ox-text-muted)] uppercase tracking-wider">Spot Δ</p>
          <p
            className="text-base font-black font-mono mt-0.5"
            style={{ color: scenario.spotChange > 0 ? "#00e5a0" : scenario.spotChange < 0 ? "#ff4d6a" : "#4a5568" }}
          >
            {scenario.spotChange > 0 ? "+" : ""}{scenario.spotChange}%
          </p>
        </div>
      </div>

      {/* Assumptions */}
      <p className="text-[10px] text-[var(--ox-text-muted)] leading-relaxed px-0.5">
        ⚠ {scenario.assumptions}
      </p>

      {/* Per-holding breakdown */}
      <div>
        <p className="text-[9px] uppercase tracking-widest text-[var(--ox-text-muted)] mb-2">
          Per-Position Impact
        </p>
        <HoldingImpactChart scenario={scenario} holdings={holdings} />
      </div>

      {/* Largest winner/loser */}
      <div className="grid grid-cols-2 gap-2">
        {best && (
          <div
            className="rounded-lg border border-[var(--ox-border-subtle)] p-2 bg-[var(--ox-accent-green)]/[0.03]"
          >
            <p className="text-[9px] text-[var(--ox-text-muted)] uppercase tracking-wider mb-0.5">
              Best Position
            </p>
            <p className="text-[11px] font-bold font-mono text-[var(--ox-accent-green)]">
              {best.holding?.ticker}
            </p>
            <p className="text-[10px] font-mono text-[var(--ox-accent-green)]">
              {best.value >= 0 ? "+" : ""}${Math.round(best.value).toLocaleString()}
            </p>
          </div>
        )}
        {worst && (
          <div
            className="rounded-lg border border-[var(--ox-border-subtle)] p-2 bg-[var(--ox-accent-red)]/[0.03]"
          >
            <p className="text-[9px] text-[var(--ox-text-muted)] uppercase tracking-wider mb-0.5">
              Worst Position
            </p>
            <p className="text-[11px] font-bold font-mono text-[var(--ox-accent-red)]">
              {worst.holding?.ticker}
            </p>
            <p className="text-[10px] font-mono text-[var(--ox-accent-red)]">
              {worst.value >= 0 ? "+" : ""}${Math.round(worst.value).toLocaleString()}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────

export default function RiskSimulator() {
  const { scenarios, holdings } = usePortfolio();
  const [activeId, setActiveId] = useState<string>(scenarios[0].id);

  const activeScenario = useMemo(
    () => scenarios.find((s) => s.id === activeId) ?? scenarios[0],
    [activeId, scenarios]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.18 }}
      className="glass rounded-2xl border border-[var(--ox-border-default)] p-4 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-4 rounded-full bg-[var(--ox-accent-red)] glow-red" />
            <h2 className="text-sm font-semibold text-[var(--ox-text-primary)]">
              Risk Simulation
            </h2>
          </div>
          <p className="text-[10px] text-[var(--ox-text-muted)] mt-0.5 ml-3.5">
            Scenario engine · select a shock to stress-test your portfolio
          </p>
        </div>
        <span
          className="text-[9px] font-mono px-2 py-1 rounded-full border uppercase"
          style={{
            color: activeScenario.color,
            borderColor: `${activeScenario.color}30`,
            background: `${activeScenario.color}12`,
          }}
        >
          {activeScenario.label}
        </span>
      </div>

      {/* Scenario selector grid */}
      <div className="grid grid-cols-2 gap-2">
        {scenarios.map((s) => (
          <ScenarioButton
            key={s.id}
            scenario={s}
            active={activeId === s.id}
            onClick={() => setActiveId(s.id)}
          />
        ))}
      </div>

      {/* Results */}
      <AnimatePresence mode="wait">
        <ScenarioResult
          key={activeScenario.id}
          scenario={activeScenario}
          holdings={holdings}
          delay={0.05}
        />
      </AnimatePresence>
    </motion.div>
  );
}
