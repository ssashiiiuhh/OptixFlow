// ============================================================================
// OPTIXFLOW — Greeks Risk Analytics Panel (Sensitivity Redesign)
// Renders dynamic Sparkline sensitivities, Ghost Radar, and Beta-Weighted Risk.
// ============================================================================

"use client";

import React, { useMemo, useState } from "react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ReferenceLine,
  Tooltip,
} from "recharts";
import { motion } from "framer-motion";
import { usePortfolio } from "../portfolio/PortfolioContext";
import { bsmGreeks } from "@/lib/quant/greeks/bsm";
import { getBeta } from "@/lib/quant/market/betaMap";
import { Zap, AlertTriangle, TrendingUp, Compass, Target, Clock } from "lucide-react";

type ShockType = "NONE" | "CRASH" | "RALLY" | "THETA_BURN";

const SHOCKS: Record<ShockType, { label: string; spotMultiplier: number; ivAdd: number; dteAdd: number; icon: React.ReactNode }> = {
  NONE: { label: "CURRENT", spotMultiplier: 1, ivAdd: 0, dteAdd: 0, icon: <Target size={14} /> },
  CRASH: { label: "CRASH (-10% S, +20% IV)", spotMultiplier: 0.9, ivAdd: 0.20, dteAdd: 0, icon: <AlertTriangle size={14} /> },
  RALLY: { label: "RALLY (+5% S, -10% IV)", spotMultiplier: 1.05, ivAdd: -0.10, dteAdd: 0, icon: <TrendingUp size={14} /> },
  THETA_BURN: { label: "THETA BURN (T-1D)", spotMultiplier: 1, ivAdd: 0, dteAdd: -1, icon: <Clock size={14} /> },
};

// ── Custom Tooltip for Sparklines ──────────────────────────────────────────
const SparklineTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0b0e16]/95 border border-[var(--ox-border-default)] p-2 rounded shadow-2xl font-mono text-[10px]">
        <div className="text-[var(--ox-text-muted)] mb-1">Spot Shift: {label > 0 ? "+" : ""}{Number(label).toFixed(1)}%</div>
        <div className="text-white font-bold">{payload[0].name}: {Number(payload[0].value).toFixed(2)}</div>
      </div>
    );
  }
  return null;
};

// ── Sensitivity Sparkline Component ─────────────────────────────────────────
function SensitivitySparkline({ data, dataKey, color, label }: { data: any[]; dataKey: string; color: string; label: string }) {
  // Find min and max for y-axis domain to make it look dynamic
  const values = data.map(d => d[dataKey]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = (max - min) * 0.1 || Math.abs(max) * 0.1 || 1;

  // Add gradient ID
  const gradId = `grad-${dataKey}`;

  return (
    <div className="rounded-xl border border-[var(--ox-border-default)] p-3" style={{ background: "rgba(11,14,22,0.7)" }}>
      <div className="flex justify-between items-end mb-2">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
          <span className="text-[10px] uppercase tracking-widest text-[var(--ox-text-muted)]">{label}</span>
        </div>
        <span className="text-xs font-mono font-bold" style={{ color }}>
          {Number(data.find(d => d.shiftPct === 0)?.[dataKey] || 0).toFixed(2)}
        </span>
      </div>
      <div className="h-16">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="shiftPct" hide type="number" domain={[-15, 15]} />
            <YAxis hide domain={[min - padding, max + padding]} />
            <Tooltip content={<SparklineTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
            <ReferenceLine x={0} stroke="rgba(255,255,255,0.3)" strokeDasharray="3 3" />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={1.5}
              fillOpacity={1}
              fill={`url(#${gradId})`}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Systemic Risk Map (Beta-Weighted) ───────────────────────────────────────
function SystemicRiskMap({ holdings, spotPrices }: { holdings: any[]; spotPrices: Record<string, number> }) {
  const systemicRisk = useMemo(() => {
    const exposureBySector: Record<string, number> = {};
    for (const holding of holdings) {
      const beta = getBeta(holding.ticker);
      const spot = spotPrices[holding.ticker] || holding.initialSpot || 100;
      
      let holdingDelta = 0;
      for (const leg of holding.legs) {
        const qty = leg.quantity;
        const sign = leg.side === "long" ? 1 : -1;
        if (leg.type === "stock") {
          holdingDelta += qty * sign;
        } else if (leg.type !== "cash") {
          const t = Math.max(0, leg.expiryDte) / 365;
          const greeks = bsmGreeks(spot, leg.strike, t, leg.initialIv, 0.05, leg.type as "call" | "put");
          holdingDelta += greeks.delta * qty * sign * 100;
        }
      }
      // Risk = Beta-Weighted Delta Dollars
      const risk = holdingDelta * spot * beta;
      exposureBySector[holding.sector] = (exposureBySector[holding.sector] || 0) + risk;
    }
    
    return Object.entries(exposureBySector)
      .map(([sector, risk]) => ({ sector, risk, absRisk: Math.abs(risk) }))
      .sort((a, b) => b.absRisk - a.absRisk)
      .slice(0, 4);
  }, [holdings, spotPrices]);

  const maxRisk = Math.max(...systemicRisk.map(r => r.absRisk), 1);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5">
        <Compass size={12} className="text-[#00d4ff]" />
        <p className="text-[9px] uppercase tracking-widest text-[var(--ox-text-muted)]">
          Systemic Risk Map (β-Weighted SPY Eq)
        </p>
      </div>
      {systemicRisk.length === 0 ? (
        <div className="text-[10px] text-white/30 italic">No exposure detected.</div>
      ) : (
        systemicRisk.map((r) => {
          const isLong = r.risk >= 0;
          const color = isLong ? "#00d4ff" : "#ff4d6a"; // Cyan for Long, Red/Purple for Short
          const pct = (r.absRisk / maxRisk) * 100;
          return (
            <div key={r.sector} className="space-y-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-[var(--ox-text-secondary)]">{r.sector}</span>
                <span className="font-mono" style={{ color }}>
                  {isLong ? "+" : "-"}${Math.round(r.absRisk).toLocaleString()}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden flex">
                {!isLong && <div className="flex-1" />}
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{ background: color, marginLeft: isLong ? 0 : "auto" }}
                />
                {isLong && <div className="flex-1" />}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────
export default function PortfolioGreeks() {
  const { strategyGroups: holdings, spotPrices, ivs } = usePortfolio();
  const [activeShock, setActiveShock] = useState<ShockType>("NONE");

  // Main compute loop for Sparklines and Ghost Radar
  const { sparklineData, radarData } = useMemo(() => {
    const shock = SHOCKS[activeShock];
    
    // 1. Compute Radar Data (Current vs Ghost)
    let curDelta = 0, curGamma = 0, curTheta = 0, curVega = 0, curVanna = 0, curVolga = 0;
    let ghDelta = 0, ghGamma = 0, ghTheta = 0, ghVega = 0, ghVanna = 0, ghVolga = 0;
    
    for (const holding of holdings) {
      for (const leg of holding.legs) {
        const baseSpot = spotPrices[leg.ticker] || leg.initialSpot;
        const baseIv = ivs[leg.ticker] || leg.initialIv;
        
        const shockedSpot = baseSpot * shock.spotMultiplier;
        const shockedIv = Math.max(0.01, baseIv + shock.ivAdd);
        const shockedDte = Math.max(0, leg.expiryDte + shock.dteAdd);
        
        const qty = leg.quantity;
        const sign = leg.side === "long" ? 1 : -1;
        
        if (leg.type === "stock") {
          curDelta += qty * sign;
          ghDelta += qty * sign;
        } else if (leg.type !== "cash") {
          const tCur = Math.max(0, leg.expiryDte) / 365;
          const gCur = bsmGreeks(baseSpot, leg.strike, tCur, baseIv, 0.05, leg.type as "call" | "put");
          
          curDelta += gCur.delta * qty * sign * 100;
          curGamma += gCur.gamma * qty * sign * 100;
          curTheta += gCur.theta * qty * sign * 100;
          curVega += gCur.vega * qty * sign * 100;
          curVanna += gCur.vanna * qty * sign * 100;
          curVolga += gCur.volga * qty * sign * 100;
          
          const tGh = shockedDte / 365;
          const gGh = bsmGreeks(shockedSpot, leg.strike, tGh, shockedIv, 0.05, leg.type as "call" | "put");
          
          ghDelta += gGh.delta * qty * sign * 100;
          ghGamma += gGh.gamma * qty * sign * 100;
          ghTheta += gGh.theta * qty * sign * 100;
          ghVega += gGh.vega * qty * sign * 100;
          ghVanna += gGh.vanna * qty * sign * 100;
          ghVolga += gGh.volga * qty * sign * 100;
        }
      }
    }
    
    const normalize = (val: number, scale: number) => Math.min(100, Math.max(0, Math.abs(val) * scale));
    
    const mergedRadar = [
      { axis: "Delta", current: normalize(curDelta, 0.5), ghost: normalize(ghDelta, 0.5) },
      { axis: "Gamma", current: normalize(curGamma, 1500), ghost: normalize(ghGamma, 1500) },
      { axis: "Theta", current: normalize(curTheta, 0.5), ghost: normalize(ghTheta, 0.5) },
      { axis: "Vega",  current: normalize(curVega, 0.5), ghost: normalize(ghVega, 0.5) },
      { axis: "Vanna", current: normalize(curVanna, 20), ghost: normalize(ghVanna, 20) },
      { axis: "Volga", current: normalize(curVolga, 20), ghost: normalize(ghVolga, 20) },
    ];

    // 2. Compute Sparkline Data (-15% to +15% Sweep on the Shocked State)
    const sweepData = [];
    for (let i = 0; i <= 30; i++) {
      const shiftPct = -0.15 + (i / 30) * 0.30;
      let sDelta = 0, sGamma = 0, sTheta = 0, sVega = 0;
      
      for (const holding of holdings) {
        for (const leg of holding.legs) {
          const baseSpot = spotPrices[leg.ticker] || leg.initialSpot;
          const baseIv = ivs[leg.ticker] || leg.initialIv;
          
          const shockedSpot = baseSpot * shock.spotMultiplier;
          const shockedIv = Math.max(0.01, baseIv + shock.ivAdd);
          const shockedDte = Math.max(0, leg.expiryDte + shock.dteAdd);
          
          const sweepSpot = shockedSpot * (1 + shiftPct);
          const qty = leg.quantity;
          const sign = leg.side === "long" ? 1 : -1;
          
          if (leg.type === "stock") {
            sDelta += qty * sign;
          } else if (leg.type !== "cash") {
            const t = shockedDte / 365;
            const g = bsmGreeks(sweepSpot, leg.strike, t, shockedIv, 0.05, leg.type as "call" | "put");
            sDelta += g.delta * qty * sign * 100;
            sGamma += g.gamma * qty * sign * 100;
            sTheta += g.theta * qty * sign * 100;
            sVega += g.vega * qty * sign * 100;
          }
        }
      }
      sweepData.push({ shiftPct: shiftPct * 100, delta: sDelta, gamma: sGamma, theta: sTheta, vega: sVega });
    }
    
    return { sparklineData: sweepData, radarData: mergedRadar };
  }, [holdings, spotPrices, ivs, activeShock]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.12 }}
      className="glass rounded-2xl border border-[var(--ox-border-default)] p-4 flex flex-col gap-4"
    >
      {/* Tactile Shock Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[var(--ox-border-default)]">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-4 rounded-full bg-[#00d4ff] glow-cyan" />
            <h2 className="text-sm font-semibold text-[var(--ox-text-primary)]">
              Sensitivity Engine
            </h2>
          </div>
          <p className="text-[10px] text-[var(--ox-text-muted)] mt-0.5 ml-3.5">
            Real-time multi-state risk matrix
          </p>
        </div>
        
        <div className="flex items-center gap-1.5 bg-[#0b0e16] p-1 rounded-lg border border-[var(--ox-border-default)]">
          {(Object.keys(SHOCKS) as ShockType[]).map((key) => {
            const isActive = activeShock === key;
            return (
              <button
                key={key}
                onClick={() => setActiveShock(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[9px] font-mono uppercase transition-all duration-200 ${
                  isActive
                    ? "bg-[#2545ff]/20 text-[#00d4ff] border border-[#00d4ff]/30 shadow-[0_0_10px_rgba(0,212,255,0.1)]"
                    : "text-[var(--ox-text-muted)] hover:text-white border border-transparent"
                }`}
              >
                {SHOCKS[key].icon}
                {SHOCKS[key].label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-4">
        {/* Left Column: Ghost Radar & Risk Map */}
        <div className="xl:w-1/3 flex flex-col gap-4">
          <div className="h-48 relative border border-[var(--ox-border-default)] rounded-xl" style={{ background: "rgba(11,14,22,0.7)" }}>
            <div className="absolute top-2 left-2 text-[9px] font-mono text-[var(--ox-text-muted)] flex items-center gap-1">
              <Zap size={10} /> MULTI-STATE GHOST RADAR
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <defs>
                  <linearGradient id="radarCurrent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00d4ff" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#2545ff" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <PolarGrid stroke="rgba(255,255,255,0.05)" gridType="polygon" />
                <PolarAngleAxis dataKey="axis" tick={{ fill: "#4a5568", fontSize: 9, fontFamily: "monospace" }} />
                
                {/* Current State (Filled) */}
                <Radar
                  name="Current"
                  dataKey="current"
                  stroke="#00d4ff"
                  strokeWidth={1.5}
                  fill="url(#radarCurrent)"
                  isAnimationActive={false}
                />
                
                {/* Ghost State (Dashed) */}
                {activeShock !== "NONE" && (
                  <Radar
                    name="Shock"
                    dataKey="ghost"
                    stroke="#ff4d6a"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    fill="transparent"
                    isAnimationActive={false}
                  />
                )}
              </RadarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="rounded-xl border border-[var(--ox-border-subtle)] p-3 flex-1" style={{ background: "rgba(7,9,15,0.6)" }}>
            <SystemicRiskMap holdings={holdings} spotPrices={spotPrices} />
          </div>
        </div>

        {/* Right Column: Sparklines Matrix */}
        <div className="xl:w-2/3 grid grid-cols-2 gap-3">
          <SensitivitySparkline data={sparklineData} dataKey="delta" color="#00d4ff" label="Δ DELTA" />
          <SensitivitySparkline data={sparklineData} dataKey="gamma" color="#a855f7" label="Γ GAMMA" />
          <SensitivitySparkline data={sparklineData} dataKey="theta" color="#ffc13a" label="Θ THETA" />
          <SensitivitySparkline data={sparklineData} dataKey="vega" color="#00e5a0" label="V VEGA" />
        </div>
      </div>
    </motion.div>
  );
}
