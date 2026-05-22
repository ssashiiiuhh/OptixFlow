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
import { PL_TIMELINE, type PLPoint } from "@/lib/portfolio-data";

// ── Event icons ───────────────────────────────────────────────────────────

const EVENT_COLORS: Record<string, string> = {
  earnings: "#f5a623",
  crash: "#ff4d6a",
  spike: "#a855f7",
  recovery: "#00e5a0",
};

const EVENT_ICONS: Record<string, string> = {
  earnings: "📊",
  crash: "💥",
  spike: "⚡",
  recovery: "↗",
};

// ── Custom tooltip ────────────────────────────────────────────────────────

function PLTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const pnl    = payload.find((p) => p.name === "pnl");
  const cumPnl = payload.find((p) => p.name === "cumulative");
  const point  = PL_TIMELINE.find((p) => p.date === label);

  return (
    <div
      className="rounded-xl border p-3 text-[11px] font-mono space-y-1"
      style={{
        background: "rgba(7,9,15,0.97)",
        borderColor: "rgba(0,212,255,0.2)",
        backdropFilter: "blur(12px)",
        minWidth: 160,
      }}
    >
      <p className="text-[var(--ox-text-muted)] mb-2 font-sans text-[10px]">{label}</p>
      {pnl && (
        <div className="flex justify-between gap-4">
          <span className="text-[var(--ox-text-muted)]">Week P&L</span>
          <span style={{ color: (pnl.value ?? 0) >= 0 ? "#00e5a0" : "#ff4d6a" }}>
            {(pnl.value ?? 0) >= 0 ? "+" : ""}${pnl.value?.toLocaleString()}
          </span>
        </div>
      )}
      {cumPnl && (
        <div className="flex justify-between gap-4">
          <span className="text-[var(--ox-text-muted)]">Cumulative</span>
          <span className="text-[var(--ox-accent-cyan)]">
            {(cumPnl.value ?? 0) >= 0 ? "+" : ""}${cumPnl.value?.toLocaleString()}
          </span>
        </div>
      )}
      {point?.event && (
        <div
          className="mt-1 pt-1 border-t border-white/5 text-[10px]"
          style={{ color: EVENT_COLORS[point.eventType ?? "earnings"] }}
        >
          {EVENT_ICONS[point.eventType ?? "earnings"]} {point.event}
        </div>
      )}
    </div>
  );
}

// ── Event dot ─────────────────────────────────────────────────────────────

function EventDot(props: {
  cx?: number;
  cy?: number;
  index?: number;
  payload?: PLPoint;
}) {
  const { cx, cy, payload } = props;
  if (!payload?.event || cx == null || cy == null) return null;

  const color = EVENT_COLORS[payload.eventType ?? "earnings"];

  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={5}
        fill={color}
        stroke="var(--ox-bg-void)"
        strokeWidth={2}
        style={{ filter: `drop-shadow(0 0 6px ${color})` }}
      />
    </g>
  );
}

// ── Timeline stats row ────────────────────────────────────────────────────

function TimelineStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-center">
      <p className="text-[9px] uppercase tracking-wider text-[var(--ox-text-muted)]">{label}</p>
      <p className="text-sm font-mono font-bold mt-0.5" style={{ color }}>{value}</p>
    </div>
  );
}

// ── Cinematic event marker overlay ────────────────────────────────────────

function EventLegend() {
  const events = PL_TIMELINE.filter((p) => p.event);
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {events.map((e) => (
        <div key={e.date} className="flex items-center gap-1.5">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: EVENT_COLORS[e.eventType ?? "earnings"] }}
          />
          <span
            className="text-[9px] font-mono"
            style={{ color: EVENT_COLORS[e.eventType ?? "earnings"] }}
          >
            {e.date} — {e.event}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────

export default function PLTimeline() {
  const cumulative = PL_TIMELINE[PL_TIMELINE.length - 1].cumulative;
  const maxDrawdown = Math.min(0, ...PL_TIMELINE.map((p) => p.cumulative));
  const peakPnl = Math.max(...PL_TIMELINE.map((p) => p.pnl));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.22 }}
      className="glass rounded-2xl border border-[var(--ox-border-default)] p-4 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-4 rounded-full bg-[var(--ox-accent-amber)]" style={{ boxShadow: "0 0 8px rgba(245,166,35,0.5)" }} />
            <h2 className="text-sm font-semibold text-[var(--ox-text-primary)]">
              P&L Timeline
            </h2>
          </div>
          <p className="text-[10px] text-[var(--ox-text-muted)] mt-0.5 ml-3.5">
            Simulated 8-week history · marked events · hover for detail
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[var(--ox-accent-amber)]/20 bg-[var(--ox-accent-amber-dim)]">
          <span className="text-[9px] font-mono text-[var(--ox-accent-amber)] font-bold">
            DEMO
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 rounded-xl border border-[var(--ox-border-subtle)] p-3"
        style={{ background: "rgba(7,9,15,0.6)" }}
      >
        <TimelineStat
          label="Net Return"
          value={`+$${cumulative.toLocaleString()}`}
          color="var(--ox-accent-green)"
        />
        <TimelineStat
          label="Max Drawdown"
          value={`$${Math.abs(maxDrawdown).toLocaleString()}`}
          color="var(--ox-accent-red)"
        />
        <TimelineStat
          label="Best Week"
          value={`+$${peakPnl.toLocaleString()}`}
          color="var(--ox-accent-amber)"
        />
      </div>

      {/* Timeline chart */}
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={PL_TIMELINE} margin={{ top: 12, right: 8, left: -16, bottom: 0 }}>
            <defs>
              {/* Cumulative P&L gradient */}
              <linearGradient id="cumulGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00d4ff" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#00d4ff" stopOpacity={0.02} />
              </linearGradient>

              {/* Weekly P&L — profit */}
              <linearGradient id="weekProfitGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00e5a0" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#00e5a0" stopOpacity={0.05} />
              </linearGradient>

              {/* Weekly P&L — loss */}
              <linearGradient id="weekLossGrad" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#ff4d6a" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#ff4d6a" stopOpacity={0.02} />
              </linearGradient>

              {/* Glow filter */}
              <filter id="lineGlowPL">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.03)" horizontal vertical={false} />

            <XAxis
              dataKey="date"
              tick={{ fill: "#4a5568", fontSize: 9, fontFamily: "monospace" }}
              axisLine={{ stroke: "rgba(255,255,255,0.05)" }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => `$${v >= 0 ? "+" : ""}${v}`}
              tick={{ fill: "#4a5568", fontSize: 9, fontFamily: "monospace" }}
              axisLine={false}
              tickLine={false}
              domain={["auto", "auto"]}
            />
            <Tooltip content={<PLTooltip />} cursor={{ stroke: "rgba(255,255,255,0.06)", strokeWidth: 1, strokeDasharray: "4 2" }} />

            {/* Zero line */}
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />

            {/* Weekly P&L profit fill */}
            <Area
              type="linear"
              dataKey="pnl"
              stroke="none"
              fill="url(#weekProfitGrad)"
              baseValue={0}
              isAnimationActive
              animationDuration={800}
              // Only fill positive values
              name="pnl"
            />

            {/* Cumulative area fill */}
            <Area
              type="monotone"
              dataKey="cumulative"
              stroke="none"
              fill="url(#cumulGrad)"
              baseValue={0}
              isAnimationActive
              animationDuration={700}
              name="cumulative"
            />

            {/* Cumulative P&L line */}
            <Line
              type="monotone"
              dataKey="cumulative"
              stroke="#00d4ff"
              strokeWidth={2.5}
              dot={<EventDot />}
              activeDot={{ r: 5, fill: "#00d4ff", stroke: "var(--ox-bg-void)", strokeWidth: 2 }}
              name="cumulative"
              filter="url(#lineGlowPL)"
              isAnimationActive
              animationDuration={600}
            />

            {/* Weekly P&L bars as a line */}
            <Line
              type="linear"
              dataKey="pnl"
              stroke="#00e5a0"
              strokeWidth={1}
              strokeDasharray="3 2"
              dot={false}
              name="pnl"
              isAnimationActive
              animationDuration={700}
              opacity={0.5}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Event legend */}
      <EventLegend />

      {/* Chart legend */}
      <div className="flex gap-5">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-px bg-[var(--ox-accent-cyan)]" />
          <span className="text-[9px] text-[var(--ox-text-muted)]">Cumulative P&L</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-px bg-[var(--ox-accent-green)] opacity-50" style={{ borderTop: "1px dashed" }} />
          <span className="text-[9px] text-[var(--ox-text-muted)]">Weekly P&L</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[var(--ox-accent-amber)]" />
          <span className="text-[9px] text-[var(--ox-text-muted)]">Marked event</span>
        </div>
      </div>
    </motion.div>
  );
}
