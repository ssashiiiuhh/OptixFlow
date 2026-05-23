"use client";

import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { useMemo } from "react";
import {
  generatePayoffSeries,
  computeMetrics,
  computeYDomain,
  formatPrice,
} from "@/lib/finance/payoff";
import type { StrategyParams } from "@/types/options";
import { STRATEGY_MAP } from "@/lib/finance/strategies";
import ChartTooltip from "./ChartTooltip";
import MetricsBar from "./MetricsBar";
import { BarChart2, Info } from "lucide-react";

interface PayoffChartProps {
  params: StrategyParams;
}

/** Format price axis ticks compactly */
const formatXTick = (value: number) => `$${value.toFixed(0)}`;

/** Format P&L axis ticks with sign + k-suffix */
const formatYTick = (value: number) => {
  if (value === 0) return "$0";
  const abs = Math.abs(value);
  const sign = value > 0 ? "+" : "-";
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}k`;
  return `${sign}$${abs.toFixed(0)}`;
};

export default function PayoffChart({ params }: PayoffChartProps) {
  // Derive chart data every time params change
  const series  = useMemo(() => generatePayoffSeries(params), [params]);
  const metrics = useMemo(() => computeMetrics(params),       [params]);

  /**
   * Explicit Y-axis domain from our helper.
   * Recharts' auto-domain clips the flat floor/ceiling of spreads because
   * it computes extent over ALL dataKeys, not just pnl. Setting it explicitly
   * with generous padding guarantees all three phases are fully visible.
   */
  const [yMin, yMax] = useMemo(() => computeYDomain(series), [series]);

  const strategyMeta = STRATEGY_MAP[params.strategyType];

  const currentPrice =
    params.strategyType === "bull_call_spread"
      ? params.currentStockPrice
      : params.currentStockPrice;

  // Unique key: triggers Framer Motion exit/enter on every meaningful change
  const chartKey = params.strategyType;

  return (
    <div className="flex flex-col h-full gap-4 p-5 overflow-hidden relative z-10">

      {/* ── Chart header ── */}
      <div className="flex items-start justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor: strategyMeta.color,
                boxShadow: `0 0 8px ${strategyMeta.color}`,
              }}
            />
            <h1 className="text-sm font-semibold text-[var(--ox-text-primary)]">
              {strategyMeta.label} — Payoff at Expiration
            </h1>
          </div>
          <p className="text-xs text-[var(--ox-text-muted)] flex items-center gap-1">
            <Info size={10} />
            Hover the chart for exact P&amp;L at each stock price
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-[var(--ox-text-muted)]">
              Current Price
            </p>
            <p className="text-sm font-mono font-bold text-[var(--ox-accent-cyan)]">
              {formatPrice(currentPrice)}
            </p>
          </div>
          <BarChart2 size={18} className="text-[var(--ox-text-muted)]" />
        </div>
      </div>

      {/* ── Metrics bar ── */}
      <MetricsBar metrics={metrics} />

      {/* ── Chart canvas ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={chartKey}
          initial={{ opacity: 0, scale: 0.99 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="flex-1 min-h-0 rounded-2xl border border-[var(--ox-border-default)] overflow-hidden"
          style={{ background: "rgba(7, 9, 15, 0.5)" }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={series}
              margin={{ top: 24, right: 28, left: 4, bottom: 8 }}
            >
              <defs>
                {/*
                 * Profit gradient — fills the region above zero (y=0 → pnl).
                 * Gradient direction: top (peak profit) fades toward zero.
                 */}
                <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#00e5a0" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#00e5a0" stopOpacity={0.03} />
                </linearGradient>

                {/*
                 * Loss gradient — fills the region below zero (y=0 → pnl).
                 * Gradient direction: bottom (max loss) fades toward zero.
                 * Note: direction is inverted relative to profit because the
                 * area is drawn downward from the baseline.
                 */}
                <linearGradient id="lossGradient" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%"   stopColor="#ff4d6a" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#ff4d6a" stopOpacity={0.03} />
                </linearGradient>

                {/* Subtle glow filter on the payoff line */}
                <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Horizontal-only grid lines for cleaner look */}
              <CartesianGrid
                strokeDasharray="4 4"
                stroke="rgba(255,255,255,0.04)"
                horizontal={true}
                vertical={false}
              />

              {/*
               * X Axis — stock price
               * type="number" + scale="linear" ensures Recharts treats price
               * as a continuous numeric axis, so injected inflection points
               * are positioned correctly and don't cause layout jumps.
               */}
              <XAxis
                dataKey="price"
                type="number"
                scale="linear"
                domain={["dataMin", "dataMax"]}
                tickFormatter={formatXTick}
                tick={{ fill: "#4a5568", fontSize: 10, fontFamily: "monospace" }}
                axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
                tickLine={false}
                minTickGap={56}
              />

              {/*
               * Y Axis — P&L
               * Explicit domain from computeYDomain() with 20% vertical pad
               * guarantees the flat floor/ceiling regions are always visible.
               */}
              <YAxis
                tickFormatter={formatYTick}
                tick={{ fill: "#4a5568", fontSize: 10, fontFamily: "monospace" }}
                axisLine={false}
                tickLine={false}
                width={60}
                domain={[yMin, yMax]}
              />

              {/* Custom glassmorphism tooltip */}
              <Tooltip
                content={<ChartTooltip />}
                cursor={{
                  stroke: "rgba(255,255,255,0.08)",
                  strokeWidth: 1,
                  strokeDasharray: "4 2",
                }}
              />

              {/* ── Reference lines ── */}

              {/* Zero P&L baseline */}
              <ReferenceLine
                y={0}
                stroke="rgba(255,255,255,0.12)"
                strokeWidth={1}
              />

              {/* Current stock price — cyan dashed vertical */}
              <ReferenceLine
                x={currentPrice}
                stroke="rgba(0, 212, 255, 0.4)"
                strokeWidth={1.5}
                strokeDasharray="5 3"
                label={{
                  value: "Spot",
                  position: "top",
                  fill: "rgba(0, 212, 255, 0.65)",
                  fontSize: 9,
                  fontFamily: "monospace",
                }}
              />

              {/* Breakeven — amber dashed vertical */}
              {metrics.breakevenPrice !== null && (
                <ReferenceLine
                  x={metrics.breakevenPrice}
                  stroke="rgba(245, 166, 35, 0.55)"
                  strokeWidth={1.5}
                  strokeDasharray="5 3"
                  label={{
                    value: `BE ${formatPrice(metrics.breakevenPrice)}`,
                    position: "top",
                    fill: "rgba(245, 166, 35, 0.75)",
                    fontSize: 9,
                    fontFamily: "monospace",
                  }}
                />
              )}

              {/*
               * ── Area fills ──
               *
               * FIX: `profit` = Math.max(0, pnl) and `loss` = Math.min(0, pnl)
               * These are NEVER null — they are 0 when outside their zone.
               * A 0-height Area is invisible, so there are no gaps.
               *
               * FIX: baseValue={0} is explicit. Recharts fills the area between
               * the data value and baseValue, which is the zero line.
               *
               * FIX: type="linear" matches the piecewise-linear payoff math.
               * "monotone" creates cubic splines that incorrectly round the
               * sharp kinks at the strike prices.
               */}
              <Area
                type="linear"
                dataKey="profit"
                baseValue={0}
                stroke="none"
                fill="url(#profitGradient)"
                isAnimationActive={false}
              />

              <Area
                type="linear"
                dataKey="loss"
                baseValue={0}
                stroke="none"
                fill="url(#lossGradient)"
                isAnimationActive={false}
              />

              {/*
               * ── Main payoff line ──
               *
               * FIX: type="linear" is essential. Options payoffs at expiration
               * are piecewise-linear by definition — cubic smoothing misrepresents
               * the actual risk/reward profile.
               *
               * Rendered last so it sits on top of both area fills.
               */}
              <Line
                type="linear"
                dataKey="pnl"
                stroke={strategyMeta.color}
                strokeWidth={2.5}
                dot={false}
                activeDot={{
                  r: 5,
                  fill: strategyMeta.color,
                  stroke: "var(--ox-bg-void)",
                  strokeWidth: 2,
                }}
                isAnimationActive={false}
                filter="url(#lineGlow)"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </motion.div>
      </AnimatePresence>

      {/* ── Legend ── */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-8 h-[2px]" style={{ background: strategyMeta.color }} />
          <span className="text-[10px] text-[var(--ox-text-muted)]">Payoff curve</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="w-8 h-px border-t"
            style={{ borderColor: "rgba(0,212,255,0.4)", borderTopStyle: "dashed" }}
          />
          <span className="text-[10px] text-[var(--ox-text-muted)]">Spot price</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="w-8 h-px border-t"
            style={{ borderColor: "rgba(245,166,35,0.55)", borderTopStyle: "dashed" }}
          />
          <span className="text-[10px] text-[var(--ox-text-muted)]">Breakeven</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ background: "rgba(0,229,160,0.3)" }} />
          <span className="text-[10px] text-[var(--ox-text-muted)]">Profit</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ background: "rgba(255,77,106,0.3)" }} />
          <span className="text-[10px] text-[var(--ox-text-muted)]">Loss</span>
        </div>
      </div>
    </div>
  );
}
