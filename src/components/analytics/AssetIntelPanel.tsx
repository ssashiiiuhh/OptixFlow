"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { FEATURED_ASSETS, type AssetData } from "@/lib/analytics-data";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";

// ── Inline mini sparkline ─────────────────────────────────

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const W = 80;
  const H = 28;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 0.001;

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * W;
      const y = H - ((v - min) / range) * H;
      return `${x},${y}`;
    })
    .join(" ");

  const areaPoints = `0,${H} ${points} ${W},${H}`;

  return (
    <svg width={W} height={H} className="overflow-visible">
      <defs>
        <linearGradient id={`spark-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0.01} />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#spark-${color.replace("#", "")})`} />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 3px ${color}80)` }}
      />
    </svg>
  );
}

// ── IV Rank pill ─────────────────────────────────────────

function IVRankBar({ rank }: { rank: number }) {
  const color =
    rank < 30 ? "var(--ox-accent-green)" :
    rank < 60 ? "var(--ox-accent-cyan)" :
    rank < 80 ? "var(--ox-accent-amber)" :
    "var(--ox-accent-red)";

  return (
    <div className="space-y-1">
      <div className="flex justify-between">
        <span className="text-[9px] text-[var(--ox-text-muted)] uppercase tracking-wider">IV Rank</span>
        <span className="text-[9px] font-mono" style={{ color }}>{rank}th</span>
      </div>
      <div className="h-1 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${rank}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
    </div>
  );
}

// ── Sentiment bar ─────────────────────────────────────────

function SentimentBar({ score }: { score: number }) {
  const color =
    score > 65 ? "var(--ox-accent-green)" :
    score < 35 ? "var(--ox-accent-red)" :
    "var(--ox-accent-amber)";

  return (
    <div className="space-y-1">
      <div className="flex justify-between">
        <span className="text-[9px] text-[var(--ox-text-muted)] uppercase tracking-wider">Sentiment</span>
        <span className="text-[9px] font-mono" style={{ color }}>
          {score > 65 ? "Bullish" : score < 35 ? "Bearish" : "Neutral"} {score}
        </span>
      </div>
      <div className="relative h-1 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.1 }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
    </div>
  );
}

// ── P/C Ratio bar ─────────────────────────────────────────

function PCBar({ callOi, putOi }: { callOi: number; putOi: number }) {
  const total = callOi + putOi;
  const callPct = (callOi / total) * 100;
  const putPct = (putOi / total) * 100;

  return (
    <div className="space-y-1">
      <div className="flex justify-between">
        <span className="text-[9px] text-[var(--ox-text-muted)] uppercase tracking-wider">Open Interest</span>
        <span className="text-[9px] font-mono text-[var(--ox-text-muted)]">
          P/C: {(putOi / callOi).toFixed(2)}
        </span>
      </div>
      <div className="flex h-1 rounded-full overflow-hidden gap-px">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${callPct}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="h-full rounded-l-full"
          style={{ background: "var(--ox-accent-green)" }}
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${putPct}%` }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.05 }}
          className="h-full rounded-r-full"
          style={{ background: "var(--ox-accent-red)" }}
        />
      </div>
      <div className="flex justify-between">
        <span className="text-[9px] text-[var(--ox-text-muted)]">▲ {(callOi / 1000).toFixed(0)}K calls</span>
        <span className="text-[9px] text-[var(--ox-text-muted)]">{(putOi / 1000).toFixed(0)}K puts ▼</span>
      </div>
    </div>
  );
}

// ── Asset card ────────────────────────────────────────────

function AssetCard({ asset, isActive, onClick }: {
  asset: AssetData;
  isActive: boolean;
  onClick: () => void;
}) {
  const isUp = asset.change >= 0;
  const color = isUp ? "var(--ox-accent-green)" : "var(--ox-accent-red)";

  return (
    <motion.button
      whileHover={{ scale: 1.015 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className="w-full text-left rounded-xl border p-3 transition-all duration-200 space-y-3"
      style={{
        background: isActive ? "rgba(17,23,34,0.9)" : "rgba(11,14,22,0.5)",
        borderColor: isActive ? "rgba(0,212,255,0.25)" : "var(--ox-border-default)",
        boxShadow: isActive ? "0 0 20px rgba(0,212,255,0.08)" : "none",
      }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-[var(--ox-text-primary)] font-mono">
              {asset.ticker}
            </span>
            <span
              className="text-[9px] font-mono px-1.5 py-0.5 rounded"
              style={{ background: isUp ? "rgba(0,229,160,0.15)" : "rgba(255,77,106,0.15)", color }}
            >
              {isUp ? "+" : ""}{asset.changePct.toFixed(2)}%
            </span>
          </div>
          <p className="text-[10px] text-[var(--ox-text-muted)] mt-0.5">{asset.name}</p>
        </div>

        <div className="flex items-end gap-2">
          <Sparkline data={asset.sparkline} color={color} />
          <div className="text-right">
            <p className="text-sm font-bold font-mono text-[var(--ox-text-primary)]">
              ${asset.price.toFixed(2)}
            </p>
            <p className="text-[10px]" style={{ color }}>
              {isUp ? "+" : ""}{asset.change.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 overflow-hidden"
          >
            {/* IV vs HV */}
            <div className="grid grid-cols-3 gap-2 rounded-lg border border-[var(--ox-border-subtle)] p-2"
              style={{ background: "rgba(7,9,15,0.5)" }}
            >
              <div className="text-center">
                <p className="text-[9px] text-[var(--ox-text-muted)]">IV 30D</p>
                <p className="text-xs font-mono font-bold text-[var(--ox-accent-cyan)]">
                  {asset.iv30}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-[9px] text-[var(--ox-text-muted)]">HV 30D</p>
                <p className="text-xs font-mono font-bold text-[var(--ox-text-secondary)]">
                  {asset.hv30}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-[9px] text-[var(--ox-text-muted)]">Earnings</p>
                <p className="text-xs font-mono font-bold text-[var(--ox-accent-amber)]">
                  {asset.earningsDate}
                </p>
              </div>
            </div>

            <IVRankBar rank={asset.ivRank} />
            <SentimentBar score={asset.sentiment} />
            <PCBar callOi={asset.callOi} putOi={asset.putOi} />

            {/* Volume */}
            <div className="flex justify-between text-[10px]">
              <span className="text-[var(--ox-text-muted)]">Volume</span>
              <span className="font-mono text-[var(--ox-text-secondary)]">
                {(asset.volume / 1_000_000).toFixed(1)}M
                <span className="text-[var(--ox-text-muted)] ml-1">
                  ({((asset.volume / asset.avgVolume - 1) * 100).toFixed(0)}% avg)
                </span>
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

// ── Main Panel ────────────────────────────────────────────

export default function AssetIntelPanel() {
  const [activeIdx, setActiveIdx] = useState(0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
      className="glass rounded-2xl border border-[var(--ox-border-default)] p-4 space-y-3"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-4 rounded-full bg-[var(--ox-accent-amber)]" style={{ boxShadow: "0 0 8px rgba(245,166,35,0.5)" }} />
            <h2 className="text-sm font-semibold text-[var(--ox-text-primary)]">
              Asset Intelligence
            </h2>
          </div>
          <p className="text-[10px] text-[var(--ox-text-muted)] mt-0.5 ml-3.5">
            Options activity · IV rank · sentiment · click to expand
          </p>
        </div>
        <Activity size={14} className="text-[var(--ox-text-muted)]" />
      </div>

      {/* Asset cards */}
      <div className="space-y-2">
        {FEATURED_ASSETS.map((asset, i) => (
          <AssetCard
            key={asset.ticker}
            asset={asset}
            isActive={activeIdx === i}
            onClick={() => setActiveIdx(activeIdx === i ? -1 : i)}
          />
        ))}
      </div>
    </motion.div>
  );
}
