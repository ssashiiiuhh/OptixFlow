// ============================================================================
// OPTIXFLOW — Portfolio Exposure Map Component
// Renders dynamic directional and sector weights based on current spot prices.
// ============================================================================

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState, useMemo } from "react";
import { usePortfolio, type ExposureSegment } from "./PortfolioContext";

// ── Canvas particle ring orbiting the allocation dial ────────────────────────

function ParticleRing({
  radius,
  count,
  color,
  speed,
  size,
}: {
  radius: number;
  count: number;
  color: string;
  speed: number;
  size: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    const offsets = Array.from({ length: count }, (_, i) => (i / count) * Math.PI * 2);
    let frame = 0;
    let animId: number;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const t = (frame * speed) / 1000;

      offsets.forEach((offset) => {
        const angle = t + offset;
        const x = cx + radius * Math.cos(angle);
        const y = cy + radius * Math.sin(angle);
        const pulse = 0.5 + 0.5 * Math.sin(angle * 3 + t * 2);

        ctx.beginPath();
        ctx.arc(x, y, size * (0.6 + pulse * 0.4), 0, Math.PI * 2);
        ctx.fillStyle = color + Math.round((0.3 + pulse * 0.5) * 255).toString(16).padStart(2, "0");
        ctx.fill();
      });

      frame++;
      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animId);
  }, [radius, count, color, speed, size]);

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={320}
      className="absolute inset-0 pointer-events-none"
    />
  );
}

// ── Allocation ring arc ─────────────────────────────────────────────────────

function AllocationRing({ segments, netPnl }: { segments: ExposureSegment[]; netPnl: number }) {
  const SIZE = 200;
  const cx = SIZE / 2;
  const cy = SIZE / 2;

  // Render rings based on allocation segments
  const rings = useMemo(() => {
    return [
      { r: 88, width: 14, segments: segments },
      { r: 68, width: 8,  segments: segments.slice(0, 2) },
      { r: 52, width: 5,  segments: segments.slice(2) },
    ];
  }, [segments]);

  function buildArc(
    cx: number,
    cy: number,
    r: number,
    startAngle: number,
    endAngle: number
  ): string {
    const start = { x: cx + r * Math.cos(startAngle), y: cy + r * Math.sin(startAngle) };
    const end   = { x: cx + r * Math.cos(endAngle),   y: cy + r * Math.sin(endAngle) };
    const large = endAngle - startAngle > Math.PI ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`;
  }

  const [hovered, setHovered] = useState<ExposureSegment | null>(null);

  return (
    <div className="relative w-[200px] h-[200px] shrink-0">
      <svg width={SIZE} height={SIZE} className="absolute inset-0">
        <defs>
          {segments.map((s) => (
            <filter key={`gf-${s.id}`} id={`gf-${s.id}`}>
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          ))}
        </defs>

        {rings.map((ring, ri) => {
          const total = ring.segments.reduce((sum, s) => sum + s.pct, 0);
          let angle = -Math.PI / 2;
          const GAP = 0.04;

          return ring.segments.map((seg) => {
            const sweep = ((seg.pct / (total || 100)) * Math.PI * 2) - GAP;
            const start = angle + GAP / 2;
            const end   = start + sweep;
            angle += sweep + GAP;

            const isHov = hovered?.id === seg.id;

            return (
              <motion.path
                key={`${ri}-${seg.id}`}
                d={buildArc(cx, cy, ring.r, start, end)}
                fill="none"
                stroke={seg.color}
                strokeWidth={ring.width}
                strokeLinecap="round"
                opacity={isHov ? 1 : 0.6}
                animate={{ opacity: isHov ? 1 : 0.6 }}
                transition={{ duration: 0.2 }}
                filter={isHov ? `url(#gf-${seg.id})` : undefined}
                onMouseEnter={() => setHovered(seg)}
                onMouseLeave={() => setHovered(null)}
                className="cursor-pointer"
                initial={{ pathLength: 0 }}
                style={{ pathLength: 1 }}
              />
            );
          });
        })}
      </svg>

      {/* Centre readout */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <AnimatePresence mode="wait">
          {hovered ? (
            <motion.div
              key={hovered.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              className="text-center"
            >
              <p className="text-2xl font-black font-mono" style={{ color: hovered.color }}>
                {hovered.pct}%
              </p>
              <p className="text-[10px] text-[var(--ox-text-muted)] mt-0.5">{hovered.label}</p>
            </motion.div>
          ) : (
            <motion.div
              key="default"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <p className="text-xl font-black font-mono text-[var(--ox-text-primary)]">
                {netPnl >= 0 ? "+" : ""}${(netPnl / 1000).toFixed(1)}k
              </p>
              <p className="text-[9px] text-[var(--ox-text-muted)] uppercase tracking-wider mt-0.5">
                Net P&L
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Directional bias bar ────────────────────────────────────────────────────

function DirectionalBias({ segments }: { segments: ExposureSegment[] }) {
  const { bearPct, neutPct, bullPct } = useMemo(() => {
    const bearVal = segments.find((s) => s.id === "bearish")?.pct ?? 0;
    const neutVal = segments.find((s) => s.id === "neutral")?.pct ?? 0;
    const bullVal = segments.find((s) => s.id === "bullish")?.pct ?? 0;
    const volVal = segments.find((s) => s.id === "volatile")?.pct ?? 0;

    const total = bearVal + neutVal + bullVal + volVal || 100;

    const bearPct = Math.round((bearVal / total) * 100);
    const neutPct = Math.round((neutVal / total) * 100);
    const bullPct = 100 - bearPct - neutPct; // Sum to 100%

    return { bearPct, neutPct, bullPct };
  }, [segments]);

  return (
    <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-widest text-[var(--ox-text-muted)]">
        Directional Bias
      </p>
      <div className="relative flex h-2 rounded-full overflow-hidden">
        <motion.div
          className="h-full"
          initial={{ width: 0 }}
          animate={{ width: `${bearPct}%` }}
          transition={{ duration: 0.6 }}
          style={{ background: "linear-gradient(90deg, #ff4d6a80, #ff4d6a)" }}
        />
        <motion.div
          className="h-full"
          initial={{ width: 0 }}
          animate={{ width: `${neutPct}%` }}
          transition={{ duration: 0.6 }}
          style={{ background: "linear-gradient(90deg, #00d4ff60, #00d4ff80)" }}
        />
        <motion.div
          className="h-full"
          initial={{ width: 0 }}
          animate={{ width: `${bullPct}%` }}
          transition={{ duration: 0.6 }}
          style={{ background: "linear-gradient(90deg, #00e5a060, #00e5a0)" }}
        />
      </div>
      <div className="flex justify-between text-[9px] font-mono">
        <span style={{ color: "#ff4d6a" }}>{bearPct}% Bear</span>
        <span style={{ color: "#00d4ff" }}>{neutPct}% Neutral</span>
        <span style={{ color: "#00e5a0" }}>{bullPct}% Bull</span>
      </div>
    </div>
  );
}

// ── Exposure segment detail ─────────────────────────────────────────────────

function ExposureDetail({ segment }: { segment: ExposureSegment }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0"
    >
      <div className="flex items-center gap-2">
        <div
          className="w-1.5 h-6 rounded-full"
          style={{
            backgroundColor: segment.color,
            boxShadow: `0 0 8px ${segment.color}60`,
          }}
        />
        <div>
          <p className="text-[11px] font-medium text-[var(--ox-text-primary)]">{segment.label}</p>
          <p className="text-[9px] text-[var(--ox-text-muted)] mt-0.5">
            {segment.strategies.length} positions
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-[11px] font-mono font-bold" style={{ color: segment.color }}>
          {segment.pct}%
        </p>
        <p className="text-[9px] font-mono text-[var(--ox-text-muted)]">
          ${(segment.value / 1000).toFixed(1)}k
        </p>
      </div>
    </motion.div>
  );
}

// ── Main Panel ──────────────────────────────────────────────────────────────

export default function ExposureMap() {
  const { exposureSegments, portfolioGreeks } = usePortfolio();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass rounded-2xl border border-[var(--ox-border-default)] p-5 space-y-5 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-4 rounded-full bg-[var(--ox-accent-green)] glow-green" />
            <h2 className="text-sm font-semibold text-[var(--ox-text-primary)]">
              Portfolio Exposure Map
            </h2>
          </div>
          <p className="text-[10px] text-[var(--ox-text-muted)] mt-0.5 ml-3.5">
            Delta-weighted directional allocation · hover ring to inspect
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-[var(--ox-text-muted)]">Net P&L</p>
          <p
            className="text-sm font-mono font-bold transition-colors duration-300"
            style={{ color: portfolioGreeks.netPnl >= 0 ? "var(--ox-accent-green)" : "var(--ox-accent-red)" }}
          >
            {portfolioGreeks.netPnl >= 0 ? "+" : ""}
            ${portfolioGreeks.netPnl.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Ring + details */}
      <div className="flex items-start gap-6">
        {/* Animated allocation ring */}
        <div className="relative">
          <AllocationRing segments={exposureSegments} netPnl={portfolioGreeks.netPnl} />
          <ParticleRing radius={100} count={6}  color="#00e5a0" speed={0.4} size={2} />
          <ParticleRing radius={80}  count={4}  color="#00d4ff" speed={0.6} size={1.5} />
        </div>

        {/* Segment details */}
        <div className="flex-1 min-w-0 space-y-0">
          {exposureSegments.map((seg, i) => (
            <motion.div
              key={seg.id}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <ExposureDetail segment={seg} />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Directional bias bar */}
      <DirectionalBias segments={exposureSegments} />

      {/* Portfolio stats row */}
      <div className="grid grid-cols-3 gap-2 rounded-xl border border-[var(--ox-border-subtle)] p-3"
        style={{ background: "rgba(7,9,15,0.6)" }}
      >
        {[
          { label: "Win Rate",    value: `${(portfolioGreeks.winRate * 100).toFixed(0)}%`, color: "var(--ox-accent-green)" },
          { label: "Avg IV",      value: `${portfolioGreeks.avgIV.toFixed(1)}%`,           color: "var(--ox-accent-cyan)" },
          { label: "Max Risk",    value: `$${(portfolioGreeks.maxRisk / 1000).toFixed(1)}k`, color: "var(--ox-accent-red)" },
        ].map(({ label, value, color }) => (
          <div key={label} className="text-center">
            <p className="text-[9px] uppercase tracking-wider text-[var(--ox-text-muted)]">{label}</p>
            <p className="text-sm font-mono font-bold mt-0.5" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
