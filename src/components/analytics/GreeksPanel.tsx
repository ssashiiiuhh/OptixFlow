"use client";

import { motion } from "framer-motion";
import { useMemo, useEffect, useState } from "react";
import { GREEKS_DATA, type GreekData } from "@/lib/analytics-data";

// ── SVG Arc Gauge ─────────────────────────────────────────

interface ArcGaugeProps {
  value: number;      // 0–1 normalised fill
  color: string;
  size?: number;
  strokeWidth?: number;
  animated?: boolean;
}

function ArcGauge({ value, color, size = 80, strokeWidth = 7, animated = true }: ArcGaugeProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = Math.PI * radius; // Half-circle arc length
  const cx = size / 2;
  const cy = size / 2 + 4;

  // Clamp to valid range
  const fill = Math.min(1, Math.max(0, value));
  const dashOffset = circumference * (1 - fill);

  return (
    <svg width={size} height={size / 2 + 8} className="overflow-visible">
      {/* Glow filter */}
      <defs>
        <filter id={`gauge-glow-${color.replace("#", "")}`}>
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Track (background arc) */}
      <path
        d={`M ${strokeWidth / 2} ${cy} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${cy}`}
        fill="none"
        stroke="rgba(255,255,255,0.05)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />

      {/* Filled arc */}
      <motion.path
        d={`M ${strokeWidth / 2} ${cy} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${cy}`}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: dashOffset }}
        transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
        filter={`url(#gauge-glow-${color.replace("#", "")})`}
      />

      {/* Tip dot */}
      <motion.circle
        cx={cx + radius * Math.cos(Math.PI * (1 - fill))}
        cy={cy - radius * Math.sin(Math.PI * (1 - fill))}
        r={strokeWidth / 2 + 1}
        fill={color}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.8 }}
        style={{ filter: `drop-shadow(0 0 6px ${color})` }}
      />
    </svg>
  );
}

// ── Directional indicator bar ─────────────────────────────

function DirectionBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.abs(value) / Math.abs(max);
  const isNeg = value < 0;

  return (
    <div className="flex items-center gap-2">
      {/* Negative side */}
      <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden flex justify-end">
        {isNeg && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct * 100}%` }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
            className="h-full rounded-full"
            style={{ background: color }}
          />
        )}
      </div>

      {/* Center tick */}
      <div className="w-px h-3 bg-white/10" />

      {/* Positive side */}
      <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
        {!isNeg && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct * 100}%` }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
            className="h-full rounded-full"
            style={{ background: color }}
          />
        )}
      </div>
    </div>
  );
}

// ── Single Greek Card ─────────────────────────────────────

function GreekCard({ greek, delay }: { greek: GreekData; delay: number }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Format value with sign + unit
  const displayValue =
    greek.id === "delta"
      ? greek.value.toFixed(2)
      : greek.id === "gamma"
      ? greek.value.toFixed(4)
      : greek.id === "theta"
      ? greek.value.toFixed(2)
      : greek.value.toFixed(2);

  const sign = greek.value > 0 ? "+" : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ scale: 1.015 }}
      onClick={() => setIsExpanded(!isExpanded)}
      className="rounded-2xl border border-[var(--ox-border-default)] p-4 cursor-pointer transition-all glass-hover"
      style={{
        background: "rgba(11,14,22,0.7)",
        boxShadow: isExpanded ? `0 0 24px ${greek.color}20` : "none",
        borderColor: isExpanded ? `${greek.color}30` : undefined,
      }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-1.5">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: greek.color, boxShadow: `0 0 6px ${greek.color}` }}
            />
            <span className="text-[11px] uppercase tracking-widest text-[var(--ox-text-muted)] font-medium">
              {greek.label}
            </span>
          </div>
          <p className="text-[10px] text-[var(--ox-text-muted)] mt-0.5 leading-tight">
            {greek.description}
          </p>
        </div>

        {/* Value */}
        <motion.div
          key={greek.value}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-right"
        >
          <span
            className="text-xl font-bold font-mono"
            style={{ color: greek.color }}
          >
            {sign}{displayValue}
          </span>
          {greek.unit && (
            <span className="text-[10px] text-[var(--ox-text-muted)] ml-1">{greek.unit}</span>
          )}
        </motion.div>
      </div>

      {/* Arc gauge */}
      <div className="flex justify-center -mt-1 -mb-1">
        <ArcGauge value={greek.normalised} color={greek.color} size={80} />
      </div>

      {/* Direction bar */}
      <div className="mt-3">
        <DirectionBar
          value={greek.direction === "negative" ? -greek.normalised : greek.normalised}
          max={1}
          color={greek.color}
        />
      </div>

      {/* Expanded interpretation */}
      {isExpanded && (
        <motion.p
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="text-[10px] text-[var(--ox-text-secondary)] mt-3 pt-3 border-t border-white/5 leading-relaxed"
        >
          {greek.interpretation}
        </motion.p>
      )}
    </motion.div>
  );
}

// ── Portfolio Greeks Summary ──────────────────────────────

function GreeksSummaryBar() {
  return (
    <div className="grid grid-cols-4 gap-2 rounded-xl border border-[var(--ox-border-subtle)] p-3"
      style={{ background: "rgba(7,9,15,0.6)" }}
    >
      {GREEKS_DATA.map((g) => (
        <div key={g.id} className="text-center">
          <p className="text-[9px] uppercase tracking-wider text-[var(--ox-text-muted)]">{g.label}</p>
          <p className="text-sm font-mono font-bold mt-0.5" style={{ color: g.color }}>
            {g.value > 0 ? "+" : ""}{g.value.toFixed(g.id === "gamma" ? 4 : 2)}
          </p>
        </div>
      ))}
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────

export default function GreeksPanel() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="glass rounded-2xl border border-[var(--ox-border-default)] p-4 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-4 rounded-full bg-[#a855f7]" style={{ boxShadow: "0 0 8px #a855f780" }} />
            <h2 className="text-sm font-semibold text-[var(--ox-text-primary)]">
              Greeks Exposure
            </h2>
          </div>
          <p className="text-[10px] text-[var(--ox-text-muted)] mt-0.5 ml-3.5">
            Portfolio sensitivity · click a card for detail
          </p>
        </div>
        <span className="text-[9px] font-mono text-[var(--ox-text-muted)] border border-[var(--ox-border-default)] rounded-md px-2 py-1">
          1 CONTRACT
        </span>
      </div>

      {/* Summary bar */}
      <GreeksSummaryBar />

      {/* Greek cards grid */}
      <div className="grid grid-cols-2 gap-3">
        {GREEKS_DATA.map((greek, i) => (
          <GreekCard key={greek.id} greek={greek} delay={i * 0.08} />
        ))}
      </div>
    </motion.div>
  );
}
