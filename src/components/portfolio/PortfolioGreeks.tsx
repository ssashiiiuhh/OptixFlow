"use client";

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";
import { motion } from "framer-motion";
import { PORTFOLIO_GREEKS, GREEKS_RADAR } from "@/lib/portfolio-data";

// ── Animated arc exposure meter ─────────────────────────────────────────────

interface ExposureMeterProps {
  label: string;
  value: number;         // display raw value
  normalised: number;    // 0–1 for gauge fill
  color: string;
  unit: string;
  direction: "positive" | "negative";
  interpretation: string;
  delay: number;
}

function ExposureMeter({
  label,
  value,
  normalised,
  color,
  unit,
  direction,
  interpretation,
  delay,
}: ExposureMeterProps) {
  const SIZE = 72;
  const R = 27;
  const CX = SIZE / 2;
  const CY = SIZE / 2 + 4;
  const arc = Math.PI; // half-circle
  const filled = arc * Math.min(1, normalised);
  const unfilled = arc - filled;

  // Arc path helpers
  const arcPath = (startAngle: number, endAngle: number) => {
    const sx = CX + R * Math.cos(startAngle);
    const sy = CY + R * Math.sin(startAngle);
    const ex = CX + R * Math.cos(endAngle);
    const ey = CY + R * Math.sin(endAngle);
    const large = endAngle - startAngle > Math.PI ? 1 : 0;
    return `M ${sx} ${sy} A ${R} ${R} 0 ${large} 1 ${ex} ${ey}`;
  };

  const displayVal =
    Math.abs(value) >= 1000
      ? `${(value / 1000).toFixed(1)}k`
      : label === "Gamma"
      ? value.toFixed(3)
      : value.toFixed(1);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay }}
      className="rounded-xl border border-[var(--ox-border-default)] p-3 space-y-1"
      style={{
        background: "rgba(11,14,22,0.7)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Ambient glow blob */}
      <div
        className="absolute -top-4 -right-4 w-16 h-16 rounded-full pointer-events-none"
        style={{ background: color, filter: "blur(20px)", opacity: 0.08 }}
      />

      {/* Mini arc gauge */}
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <div
              className="w-1 h-1 rounded-full"
              style={{ background: color, boxShadow: `0 0 4px ${color}` }}
            />
            <p className="text-[9px] uppercase tracking-widest text-[var(--ox-text-muted)]">
              {label}
            </p>
          </div>
          <p className="text-lg font-black font-mono" style={{ color }}>
            {direction === "negative" && value < 0 ? "" : direction === "negative" ? "+" : "+"}
            {displayVal}
            <span className="text-[9px] text-[var(--ox-text-muted)] ml-0.5">{unit}</span>
          </p>
        </div>

        <svg width={SIZE} height={SIZE / 2 + 8} className="shrink-0">
          <defs>
            <filter id={`meter-glow-${label}`}>
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Track */}
          <path
            d={arcPath(-Math.PI, 0)}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={5}
            strokeLinecap="round"
          />

          {/* Fill */}
          <motion.path
            d={arcPath(-Math.PI, -Math.PI + filled)}
            fill="none"
            stroke={color}
            strokeWidth={5}
            strokeLinecap="round"
            filter={`url(#meter-glow-${label})`}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, delay: delay + 0.3, ease: "easeOut" }}
            style={{ pathLength: 1 }}
          />
        </svg>
      </div>

      {/* Interpretation */}
      <p className="text-[9px] text-[var(--ox-text-muted)] leading-relaxed">
        {interpretation}
      </p>
    </motion.div>
  );
}

// ── Portfolio radar ─────────────────────────────────────────────────────────

function PortfolioRadar() {
  const data = GREEKS_RADAR.map((g) => ({
    axis: g.axis,
    value: Math.round(g.value * 100),
    fullMark: 100,
  }));

  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
          <defs>
            <linearGradient id="radarFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00d4ff" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#a855f7" stopOpacity={0.15} />
            </linearGradient>
          </defs>

          <PolarGrid
            stroke="rgba(255,255,255,0.05)"
            gridType="polygon"
          />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fill: "#4a5568", fontSize: 9, fontFamily: "monospace" }}
          />
          <Radar
            name="Portfolio"
            dataKey="value"
            stroke="#00d4ff"
            strokeWidth={1.5}
            fill="url(#radarFill)"
            dot={{ fill: "#00d4ff", r: 3, strokeWidth: 0 }}
            isAnimationActive
            animationDuration={800}
            animationEasing="ease-out"
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Concentration risk indicator ──────────────────────────────────────────

function ConcentrationRisk() {
  const risks = [
    { label: "Tech", pct: 64, color: "#00d4ff" },
    { label: "Index", pct: 22, color: "#a855f7" },
    { label: "Comm.", pct: 14, color: "#f5a623" },
  ];

  return (
    <div className="space-y-2">
      <p className="text-[9px] uppercase tracking-widest text-[var(--ox-text-muted)]">
        Sector Concentration
      </p>
      {risks.map((r) => (
        <div key={r.label} className="space-y-0.5">
          <div className="flex justify-between text-[10px]">
            <span className="text-[var(--ox-text-secondary)]">{r.label}</span>
            <span className="font-mono" style={{ color: r.color }}>{r.pct}%</span>
          </div>
          <div className="h-1 rounded-full bg-white/5 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${r.pct}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{ background: r.color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────

const METERS = [
  {
    label: "Delta",
    value: PORTFOLIO_GREEKS.totalDelta,
    normalised: 0.53,
    color: "#00d4ff",
    unit: "",
    direction: "positive" as const,
    interpretation: "Moderately long. ~1.06 share equivalent directional exposure.",
  },
  {
    label: "Gamma",
    value: PORTFOLIO_GREEKS.totalGamma,
    normalised: 0.70,
    color: "#a855f7",
    unit: "",
    direction: "positive" as const,
    interpretation: "Elevated curvature. Delta will shift rapidly on strong moves.",
  },
  {
    label: "Theta",
    value: PORTFOLIO_GREEKS.totalTheta,
    normalised: 0.58,
    color: "#ff4d6a",
    unit: "/d",
    direction: "negative" as const,
    interpretation: "Losing $115/day to time erosion across all positions.",
  },
  {
    label: "Vega",
    value: PORTFOLIO_GREEKS.totalVega,
    normalised: 0.84,
    color: "#00e5a0",
    unit: "/1%",
    direction: "positive" as const,
    interpretation: "High vol sensitivity. +$252 for each 1% IV rise.",
  },
];

export default function PortfolioGreeks() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.12 }}
      className="glass rounded-2xl border border-[var(--ox-border-default)] p-4 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-4 rounded-full bg-[#a855f7]" style={{ boxShadow: "0 0 8px #a855f780" }} />
            <h2 className="text-sm font-semibold text-[var(--ox-text-primary)]">
              Greeks Engine
            </h2>
          </div>
          <p className="text-[10px] text-[var(--ox-text-muted)] mt-0.5 ml-3.5">
            Portfolio-level risk sensitivity · aggregate exposure
          </p>
        </div>
        <span className="text-[9px] font-mono text-[var(--ox-text-muted)] border border-[var(--ox-border-default)] rounded-md px-2 py-1">
          7 POSITIONS
        </span>
      </div>

      {/* Radar chart */}
      <PortfolioRadar />

      {/* Meter grid */}
      <div className="grid grid-cols-2 gap-2">
        {METERS.map((m, i) => (
          <ExposureMeter key={m.label} {...m} delay={i * 0.07} />
        ))}
      </div>

      {/* Concentration risk */}
      <div className="rounded-xl border border-[var(--ox-border-subtle)] p-3"
        style={{ background: "rgba(7,9,15,0.6)" }}
      >
        <ConcentrationRisk />
      </div>
    </motion.div>
  );
}
