"use client";

import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { motion } from "framer-motion";
import { useMemo } from "react";
import { generateProbabilityCone } from "@/lib/analytics-data";

// ── Custom tooltip ────────────────────────────────────────

function ConeTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const spot = payload.find((p) => p.name === "spot");
  const p68h = payload.find((p) => p.name === "p68Hi");
  const p68l = payload.find((p) => p.name === "p68Lo");
  const p95h = payload.find((p) => p.name === "p95Hi");
  const p95l = payload.find((p) => p.name === "p95Lo");

  return (
    <div
      className="rounded-xl border p-3 text-[11px] font-mono space-y-1"
      style={{
        background: "rgba(7,9,15,0.95)",
        borderColor: "rgba(0,212,255,0.2)",
        backdropFilter: "blur(12px)",
        minWidth: 160,
      }}
    >
      <p className="text-[var(--ox-text-muted)] mb-2">{label}</p>
      {spot && (
        <div className="flex justify-between gap-4">
          <span className="text-[var(--ox-text-muted)]">Spot</span>
          <span className="text-[var(--ox-accent-cyan)] font-bold">${spot.value?.toFixed(2)}</span>
        </div>
      )}
      {p68h && p68l && (
        <div className="flex justify-between gap-4">
          <span className="text-[var(--ox-text-muted)]">68% range</span>
          <span className="text-[var(--ox-accent-green)]">
            ${p68l.value?.toFixed(0)} – ${p68h.value?.toFixed(0)}
          </span>
        </div>
      )}
      {p95h && p95l && (
        <div className="flex justify-between gap-4">
          <span className="text-[var(--ox-text-muted)]">95% range</span>
          <span style={{ color: "#f5a623" }}>
            ${p95l.value?.toFixed(0)} – ${p95h.value?.toFixed(0)}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Probability stats row ─────────────────────────────────

function ProbStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-center">
      <p className="text-[9px] uppercase tracking-wider text-[var(--ox-text-muted)]">{label}</p>
      <p className="text-sm font-mono font-bold mt-0.5" style={{ color }}>{value}</p>
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────

export default function ProbabilityCone() {
  const spot = 170;
  const iv = 0.295;
  const coneData = useMemo(() => generateProbabilityCone(spot, iv, 90), []);

  // At 30-day horizon: compute ranges
  const day30 = coneData.find((p) => p.days === 30);
  const day90 = coneData.find((p) => p.days === 90);

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
            <div className="w-1.5 h-4 rounded-full bg-[var(--ox-accent-green)]" style={{ boxShadow: "0 0 8px rgba(0,229,160,0.5)" }} />
            <h2 className="text-sm font-semibold text-[var(--ox-text-primary)]">
              Probability Cone
            </h2>
          </div>
          <p className="text-[10px] text-[var(--ox-text-muted)] mt-0.5 ml-3.5">
            Expected price distribution · lognormal model · IV {(iv * 100).toFixed(1)}%
          </p>
        </div>

        <div className="text-right">
          <p className="text-[10px] text-[var(--ox-text-muted)]">Spot</p>
          <p className="text-sm font-mono font-bold text-[var(--ox-accent-cyan)]">${spot}</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2 rounded-xl border border-[var(--ox-border-subtle)] p-3"
        style={{ background: "rgba(7,9,15,0.6)" }}
      >
        <ProbStat label="IV (30d)" value={`${(iv * 100).toFixed(1)}%`} color="var(--ox-accent-cyan)" />
        <ProbStat
          label="30d ±1σ"
          value={day30 ? `$${day30.p68Lo.toFixed(0)}–$${day30.p68Hi.toFixed(0)}` : "—"}
          color="var(--ox-accent-green)"
        />
        <ProbStat
          label="90d ±2σ"
          value={day90 ? `$${day90.p95Lo.toFixed(0)}–$${day90.p95Hi.toFixed(0)}` : "—"}
          color="#f5a623"
        />
        <ProbStat label="Prob ITM" value="52.3%" color="var(--ox-accent-cyan)" />
      </div>

      {/* Chart */}
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={coneData} margin={{ top: 12, right: 12, left: -16, bottom: 0 }}>
            <defs>
              {/* 99% band — faintest */}
              <linearGradient id="cone99Hi" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f5a623" stopOpacity={0.07} />
                <stop offset="100%" stopColor="#f5a623" stopOpacity={0.01} />
              </linearGradient>
              <linearGradient id="cone99Lo" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#f5a623" stopOpacity={0.07} />
                <stop offset="100%" stopColor="#f5a623" stopOpacity={0.01} />
              </linearGradient>

              {/* 95% band — medium */}
              <linearGradient id="cone95Hi" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f5a623" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#f5a623" stopOpacity={0.03} />
              </linearGradient>
              <linearGradient id="cone95Lo" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#f5a623" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#f5a623" stopOpacity={0.03} />
              </linearGradient>

              {/* 68% band — brightest */}
              <linearGradient id="cone68Hi" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00e5a0" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#00e5a0" stopOpacity={0.04} />
              </linearGradient>
              <linearGradient id="cone68Lo" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#00e5a0" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#00e5a0" stopOpacity={0.04} />
              </linearGradient>

              {/* Spot line glow */}
              <filter id="spotGlow">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.03)" horizontal vertical={false} />

            <XAxis
              dataKey="label"
              tick={{ fill: "#4a5568", fontSize: 9, fontFamily: "monospace" }}
              axisLine={{ stroke: "rgba(255,255,255,0.05)" }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => `$${v}`}
              tick={{ fill: "#4a5568", fontSize: 9, fontFamily: "monospace" }}
              axisLine={false}
              tickLine={false}
              domain={["auto", "auto"]}
            />

            <Tooltip content={<ConeTooltip />} cursor={{ stroke: "rgba(255,255,255,0.05)", strokeWidth: 1 }} />

            {/* ── 99% cone (outermost) ── */}
            <Area type="monotone" dataKey="p99Hi" stroke="#f5a623" strokeWidth={0.5} strokeDasharray="3 3" fill="url(#cone99Hi)" name="p99Hi" dot={false} isAnimationActive animationDuration={800} />
            <Area type="monotone" dataKey="p99Lo" stroke="#f5a623" strokeWidth={0.5} strokeDasharray="3 3" fill="url(#cone99Lo)" name="p99Lo" dot={false} isAnimationActive animationDuration={800} />

            {/* ── 95% cone ── */}
            <Area type="monotone" dataKey="p95Hi" stroke="#f5a623" strokeWidth={1}   fill="url(#cone95Hi)" name="p95Hi" dot={false} isAnimationActive animationDuration={700} />
            <Area type="monotone" dataKey="p95Lo" stroke="#f5a623" strokeWidth={1}   fill="url(#cone95Lo)" name="p95Lo" dot={false} isAnimationActive animationDuration={700} />

            {/* ── 68% cone (innermost) ── */}
            <Area type="monotone" dataKey="p68Hi" stroke="#00e5a0" strokeWidth={1.5} fill="url(#cone68Hi)" name="p68Hi" dot={false} isAnimationActive animationDuration={600} />
            <Area type="monotone" dataKey="p68Lo" stroke="#00e5a0" strokeWidth={1.5} fill="url(#cone68Lo)" name="p68Lo" dot={false} isAnimationActive animationDuration={600} />

            {/* ── Spot price centre line ── */}
            <Line
              type="monotone"
              dataKey="spot"
              stroke="#00d4ff"
              strokeWidth={2}
              dot={{ fill: "#00d4ff", r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: "#00d4ff", stroke: "var(--ox-bg-void)", strokeWidth: 2 }}
              name="spot"
              filter="url(#spotGlow)"
              isAnimationActive
              animationDuration={500}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Confidence band legend */}
      <div className="flex gap-5 justify-center">
        {[
          { color: "#00e5a0", label: "±1σ (68%)" },
          { color: "#f5a623", label: "±2σ (95%)" },
          { color: "#f5a623", label: "±3σ (99%)", dashed: true },
          { color: "#00d4ff", label: "Expected" },
        ].map(({ color, label, dashed }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div
              className="w-5 h-px"
              style={{
                background: color,
                borderTopStyle: dashed ? "dashed" : "solid",
                borderTopWidth: 1,
                borderColor: color,
                height: 0,
              }}
            />
            <span className="text-[9px] text-[var(--ox-text-muted)]">{label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
