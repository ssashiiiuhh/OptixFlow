"use client";

import {
  Area,
  AreaChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo } from "react";
import {
  IV_TERM_STRUCTURE,
  generateVolSmile,
  generateHeatmap,
  type HeatCell,
} from "@/lib/analytics-data";
import { cn } from "@/lib/utils";

// ── IV color scale ────────────────────────────────────────

function ivToColor(iv: number): string {
  // 15% → blue, 30% → cyan, 45% → amber, 60%+ → red
  if (iv < 20) return "rgba(0,212,255,0.15)";
  if (iv < 28) return "rgba(0,212,255,0.3)";
  if (iv < 36) return "rgba(0,229,160,0.3)";
  if (iv < 44) return "rgba(245,166,35,0.4)";
  return "rgba(255,77,106,0.45)";
}

function ivTextColor(iv: number): string {
  if (iv < 20) return "var(--ox-accent-cyan)";
  if (iv < 28) return "var(--ox-accent-cyan)";
  if (iv < 36) return "var(--ox-accent-green)";
  if (iv < 44) return "var(--ox-accent-amber)";
  return "var(--ox-accent-red)";
}

// ── Sub-panel tab button ──────────────────────────────────

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors",
        active
          ? "text-[var(--ox-accent-cyan)] bg-[var(--ox-accent-cyan-dim)]"
          : "text-[var(--ox-text-muted)] hover:text-[var(--ox-text-secondary)]"
      )}
    >
      {children}
      {active && (
        <motion.div
          layoutId="vol-tab"
          className="absolute inset-0 rounded-lg border border-[var(--ox-accent-cyan)]/20"
        />
      )}
    </button>
  );
}

// ── Heatmap ───────────────────────────────────────────────

function VolatilityHeatmap() {
  const cells = useMemo(() => generateHeatmap(), []);
  const expiries = ["1W", "2W", "1M", "2M", "3M", "6M"];
  const strikes = [145, 150, 155, 160, 165, 170, 175, 180, 185, 190, 195];
  const [hovered, setHovered] = useState<HeatCell | null>(null);

  return (
    <div className="space-y-2">
      {/* Strike labels across top */}
      <div className="flex gap-px pl-8">
        {strikes.map((s) => (
          <div
            key={s}
            className="flex-1 text-center text-[9px] text-[var(--ox-text-muted)] font-mono"
          >
            {s}
          </div>
        ))}
      </div>

      {/* Grid rows */}
      {expiries.map((exp) => (
        <div key={exp} className="flex items-center gap-px">
          {/* Expiry label */}
          <div className="w-7 text-[9px] text-[var(--ox-text-muted)] font-mono shrink-0">
            {exp}
          </div>

          {strikes.map((strike) => {
            const cell = cells.find(
              (c) => c.expiry === exp && c.strike === strike
            );
            if (!cell) return <div key={strike} className="flex-1 h-6" />;
            return (
              <motion.div
                key={strike}
                whileHover={{ scale: 1.15, zIndex: 10 }}
                onHoverStart={() => setHovered(cell)}
                onHoverEnd={() => setHovered(null)}
                className="flex-1 h-6 rounded-sm cursor-crosshair flex items-center justify-center transition-all"
                style={{ background: ivToColor(cell.iv) }}
              >
                <span
                  className="text-[8px] font-mono font-bold"
                  style={{ color: ivTextColor(cell.iv) }}
                >
                  {cell.iv.toFixed(0)}
                </span>
              </motion.div>
            );
          })}
        </div>
      ))}

      {/* Hover tooltip */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="rounded-xl border border-[var(--ox-border-strong)] p-3 mt-2"
            style={{ background: "rgba(7,9,15,0.95)" }}
          >
            <div className="flex gap-6 text-[11px]">
              <div>
                <span className="text-[var(--ox-text-muted)]">Strike </span>
                <span className="font-mono text-[var(--ox-text-primary)]">${hovered.strike}</span>
              </div>
              <div>
                <span className="text-[var(--ox-text-muted)]">Expiry </span>
                <span className="font-mono text-[var(--ox-text-primary)]">{hovered.expiry}</span>
              </div>
              <div>
                <span className="text-[var(--ox-text-muted)]">IV </span>
                <span className="font-mono font-bold" style={{ color: ivTextColor(hovered.iv) }}>
                  {hovered.iv}%
                </span>
              </div>
              <div>
                <span className="text-[var(--ox-text-muted)]">OI </span>
                <span className="font-mono text-[var(--ox-text-primary)]">{hovered.oi}K</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Color legend */}
      <div className="flex items-center gap-2 pt-1">
        <span className="text-[9px] text-[var(--ox-text-muted)]">Low IV</span>
        <div className="flex gap-0.5 flex-1">
          {[15, 20, 25, 30, 35, 40, 45, 50, 55].map((iv) => (
            <div
              key={iv}
              className="flex-1 h-1.5 rounded-sm"
              style={{ background: ivToColor(iv) }}
            />
          ))}
        </div>
        <span className="text-[9px] text-[var(--ox-text-muted)]">High IV</span>
      </div>
    </div>
  );
}

// ── Term Structure ────────────────────────────────────────

function TermStructureChart() {
  return (
    <div className="h-44">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={IV_TERM_STRUCTURE} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="termGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00d4ff" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#00d4ff" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="callGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00e5a0" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#00e5a0" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="putGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff4d6a" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#ff4d6a" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <XAxis
            dataKey="expiry"
            tick={{ fill: "#4a5568", fontSize: 9, fontFamily: "monospace" }}
            axisLine={{ stroke: "rgba(255,255,255,0.05)" }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => `${v}%`}
            tick={{ fill: "#4a5568", fontSize: 9, fontFamily: "monospace" }}
            axisLine={false}
            tickLine={false}
            domain={["auto", "auto"]}
          />
          <Tooltip
            contentStyle={{
              background: "rgba(7,9,15,0.95)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 10,
              fontSize: 11,
              fontFamily: "monospace",
              color: "#e4e8f0",
            }}
            formatter={(v: unknown, name: unknown) => [`${v}%`, String(name)]}
          />

          <Area type="monotone" dataKey="ivCall" stroke="#00e5a0" strokeWidth={1.5} fill="url(#callGrad)" name="Call IV" dot={false} />
          <Area type="monotone" dataKey="ivPut"  stroke="#ff4d6a" strokeWidth={1.5} fill="url(#putGrad)"  name="Put IV"  dot={false} />
          <Area type="monotone" dataKey="iv"     stroke="#00d4ff" strokeWidth={2}   fill="url(#termGrad)" name="Composite IV" dot={false} />
        </AreaChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex gap-4 pt-1">
        {[
          { color: "#00d4ff", label: "Composite IV" },
          { color: "#00e5a0", label: "Call IV" },
          { color: "#ff4d6a", label: "Put IV" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-5 h-px" style={{ background: color }} />
            <span className="text-[9px] text-[var(--ox-text-muted)]">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Volatility Smile ──────────────────────────────────────

function VolatilitySmile() {
  const smileData = useMemo(() => generateVolSmile(170, 29.5), []);

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={smileData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <filter id="smileGlow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <XAxis
            dataKey="label"
            tick={{ fill: "#4a5568", fontSize: 9, fontFamily: "monospace" }}
            axisLine={{ stroke: "rgba(255,255,255,0.05)" }}
            tickLine={false}
            interval={1}
          />
          <YAxis
            tickFormatter={(v) => `${v}%`}
            tick={{ fill: "#4a5568", fontSize: 9, fontFamily: "monospace" }}
            axisLine={false}
            tickLine={false}
            domain={["auto", "auto"]}
          />
          <ReferenceLine
            x="ATM"
            stroke="rgba(245,166,35,0.4)"
            strokeDasharray="4 2"
            label={{ value: "ATM", position: "top", fill: "rgba(245,166,35,0.6)", fontSize: 8, fontFamily: "monospace" }}
          />
          <Tooltip
            contentStyle={{
              background: "rgba(7,9,15,0.95)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 10,
              fontSize: 11,
              fontFamily: "monospace",
              color: "#e4e8f0",
            }}
            formatter={(v: unknown) => [`${v}%`, "Implied Vol"]}
          />
          <Line
            type="monotone"
            dataKey="iv"
            stroke="#a855f7"
            strokeWidth={2.5}
            dot={{ fill: "#a855f7", r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: "#a855f7", stroke: "var(--ox-bg-void)", strokeWidth: 2 }}
            filter="url(#smileGlow)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────

type VolTab = "term" | "smile" | "heatmap";

export default function VolatilityPanel() {
  const [activeTab, setActiveTab] = useState<VolTab>("term");

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass rounded-2xl border border-[var(--ox-border-default)] p-4 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-4 rounded-full bg-[var(--ox-accent-cyan)] glow-cyan" />
            <h2 className="text-sm font-semibold text-[var(--ox-text-primary)]">
              Volatility Intelligence
            </h2>
          </div>
          <p className="text-[10px] text-[var(--ox-text-muted)] mt-0.5 ml-3.5">
            IV surface · term structure · skew dynamics
          </p>
        </div>

        {/* Live IV badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[var(--ox-accent-cyan)]/20 bg-[var(--ox-accent-cyan-dim)]">
          <motion.div
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 1.8, repeat: Infinity }}
            className="w-1.5 h-1.5 rounded-full bg-[var(--ox-accent-cyan)]"
          />
          <span className="text-[9px] font-mono text-[var(--ox-accent-cyan)] font-bold">IV LIVE</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1">
        <TabButton active={activeTab === "term"}    onClick={() => setActiveTab("term")}>Term Structure</TabButton>
        <TabButton active={activeTab === "smile"}   onClick={() => setActiveTab("smile")}>Vol Smile</TabButton>
        <TabButton active={activeTab === "heatmap"} onClick={() => setActiveTab("heatmap")}>IV Surface</TabButton>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "term"    && <TermStructureChart />}
          {activeTab === "smile"   && <VolatilitySmile />}
          {activeTab === "heatmap" && <VolatilityHeatmap />}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
