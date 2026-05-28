// ============================================================================
// OPTIXFLOW — Analytics Intelligence Lab Core
// Institutional-grade options intelligence panel.
// Separates ingestion, quant, and rendering. Living derivatives environment.
// ============================================================================

"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import {
  TrendingUp,
  Layers,
  Database,
  AlertCircle,
  Activity,
  ChevronDown,
  Compass,
  AlertTriangle,
  Clock,
  Settings,
  HelpCircle,
  Info,
  ShieldAlert,
  Flame,
  ShieldCheck,
  Zap,
  Filter,
  LogOut,
  Terminal,
  Grid
} from "lucide-react";

import { bsmGreeks, bsmPrice, getStrategyLegs, computeStrategyGreeks, computeStrategyPrice } from "@/lib/finance/theta";
import { marketDataService, MarketAsset, OptionsChainRow, VolatilityRegime } from "@/lib/market/MarketDataService";
import { evaluateStrategySuitability } from "@/lib/market/RegimeSuitabilityEngine";
import VolatilitySurface3D from "./VolatilitySurface3D";
import DataConnectorModal from "./DataConnectorModal";
import MonteCarloEngine from "./MonteCarloEngine";
import BlackScholesEngine from "./BlackScholesEngine";

// ── REGIME VISUAL METADATA ───────────────────────────────────────────────────

interface RegimeConfig {
  label: string;
  color: string;
  glowColor: string;
  description: string;
  alertType: "safe" | "caution" | "critical";
}

const REGIME_CONFIGS: Record<VolatilityRegime, RegimeConfig> = {
  LOW_VOL_COMPLACENCY: {
    label: "LOW-VOL COMPLACENCY",
    color: "#00d4ff", // cyan
    glowColor: "rgba(0, 212, 255, 0.15)",
    description: "Quiet macro tape. VIX is depressed below historical 15. Contango term curves stable.",
    alertType: "safe"
  },
  PANIC_EXPANSION: {
    label: "PANIC RISK EXPANSION",
    color: "#ff4d6a", // crimson
    glowColor: "rgba(255, 77, 106, 0.18)",
    description: "VIX index spiking above 25. Spot momentum drifting bearish. Downside put options heavily bid.",
    alertType: "critical"
  },
  EARNINGS_INSTABILITY: {
    label: "EVENT VOL INSTABILITY",
    color: "#a855f7", // purple
    glowColor: "rgba(168, 85, 247, 0.15)",
    description: "Event uncertainty. High localized front-end implied volatility concentrated near spot strike.",
    alertType: "caution"
  },
  POST_EVENT_CRUSH: {
    label: "POST-EVENT IV CRUSH",
    color: "#00e5a0", // emerald
    glowColor: "rgba(0, 229, 160, 0.15)",
    description: "Catalyst event resolved. IV surface collapsing, front maturities flattening to Contango.",
    alertType: "safe"
  },
  VOL_COMPRESSION: {
    label: "VOL COMPRESSION ZONE",
    color: "#10b981", // green
    glowColor: "rgba(16, 185, 129, 0.12)",
    description: "Option volatility compressed. Option decays drifting inline with standard statistical limits.",
    alertType: "safe"
  },
  LIQUIDITY_SHOCK: {
    label: "LIQUIDITY RISK SHOCK",
    color: "#f5a623", // amber
    glowColor: "rgba(245, 166, 35, 0.18)",
    description: "Market structure stress. Spread widening detected. High convexity mismatch on front maturities.",
    alertType: "critical"
  }
};

type ViewMode = "3d_surface" | "2d_smile" | "2d_term";

// ── CUSTOM DENSE TOOLTIP ──────────────────────────────────────────────────────

function DenseChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="text-[10px] font-mono bg-black/95 border border-white/10 rounded p-2 backdrop-blur-md">
      <div className="text-white/40 mb-1">X-VAL: {label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color }}>
          {p.name.toUpperCase()}: {typeof p.value === "number" ? p.value.toFixed(2) : p.value}%
        </div>
      ))}
    </div>
  );
}

// ── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function AnalyticsIntel() {
  const [assets, setAssets] = useState<Record<string, MarketAsset>>({});
  const [selectedTicker, setSelectedTicker] = useState("SPY");
  const [selectedDte, setSelectedDte] = useState(30);
  const [viewMode, setViewMode] = useState<ViewMode>("3d_surface");
  const [activeTab, setActiveTab] = useState<"intelligence" | "monte_carlo" | "bsm">("intelligence");
  
  // Connection states
  const [isKeysOpen, setIsKeysOpen] = useState(false);
  const [logFilter, setLogFilter] = useState<"ALL" | "RISK" | "VOL" | "MACRO">("ALL");
  const [consoleLogs, setConsoleLogs] = useState<Array<{ time: string; type: "SYS" | "RISK" | "VOL" | "MACRO"; text: string }>>([
    { time: "17:33:05", type: "SYS", text: "Analytics Ingestion Client online." },
    { time: "17:33:06", type: "SYS", text: "Quant mathematical modeling bound to Black-Scholes." },
    { time: "17:33:07", type: "VOL", text: "Implied volatility surface initialized." }
  ]);

  // Quant Engine bindings
  const activeAsset = useMemo(() => {
    return assets[selectedTicker] || marketDataService.getAsset(selectedTicker);
  }, [assets, selectedTicker]);

  const activeRegime = useMemo(() => {
    return REGIME_CONFIGS[activeAsset.regime] || REGIME_CONFIGS.LOW_VOL_COMPLACENCY;
  }, [activeAsset]);

  // Suitability list evaluation
  const strategyRecommendations = useMemo(() => {
    const list = ["long-call", "long-put", "bull-call", "bear-put", "cash-secured-put", "credit-call", "iron-condor", "covered-call", "straddle", "strangle"];
    const evaluated = list.map(id => evaluateStrategySuitability(id, activeAsset));
    evaluated.sort((a, b) => b.score - a.score);
    return evaluated;
  }, [activeAsset]);

  // Telemetry Console Logger helper
  const addLog = useCallback((type: "SYS" | "RISK" | "VOL" | "MACRO", text: string) => {
    const time = new Date().toLocaleTimeString("en-US", { hour12: false });
    setConsoleLogs(prev => [{ time, type, text }, ...prev.slice(0, 39)]);
  }, []);

  // Listen to Market Ingestion Service
  useEffect(() => {
    marketDataService.startTicking();
    const unsubscribe = marketDataService.subscribe((updatedAssets) => {
      setAssets({ ...updatedAssets });
    });

    return () => {
      unsubscribe();
      marketDataService.stopTicking();
    };
  }, []);

  // Options Chain data (Quant calculation bound)
  const optionsChain = useMemo<OptionsChainRow[]>(() => {
    return marketDataService.generateOptionChain(selectedTicker, selectedDte);
  }, [selectedTicker, selectedDte, activeAsset.price, activeAsset.iv30]);

  // Dynamic Portfolio positions mapped around current spot
  const portfolioPositions = useMemo(() => {
    const spot = activeAsset.price;
    let step = 5;
    if (spot < 100) step = 2.5;
    else if (spot > 500) step = 10;
    
    // Normalize strikes dynamically based on asset spot price
    const centerStrike = Math.round(spot / step) * step;

    return [
      { strategy: "Bull Call Spread", side: "long", strike: centerStrike - step, qty: 3, expiry: "30D", dte: 30 },
      { strategy: "Iron Condor", side: "short", strike: centerStrike, qty: 2, expiry: "14D", dte: 14 },
      { strategy: "Long Straddle", side: "long", strike: centerStrike + step, qty: 1, expiry: "45D", dte: 45 },
    ];
  }, [activeAsset.price]);

  // Compute portfolio-level Greeks
  const netGreeks = useMemo(() => {
    let delta = 0;
    let gamma = 0;
    let vega = 0;
    let theta = 0;

    portfolioPositions.forEach((pos) => {
      const sign = pos.side === "long" ? 1 : -1;
      const t = pos.dte / 365;
      const strikeIv = marketDataService.calculateStrikeIv(activeAsset, pos.strike, pos.dte);
      
      const legs = getStrategyLegs(pos.strategy, pos.strike, 5);
      const greeks = computeStrategyGreeks(legs, activeAsset.price, t, strikeIv);

      delta += greeks.delta * sign * pos.qty * 100;
      gamma += greeks.gamma * sign * pos.qty * 100;
      vega += greeks.vega * sign * pos.qty;
      theta += greeks.theta * sign * pos.qty;
    });

    return { delta, gamma, vega, theta };
  }, [portfolioPositions, activeAsset]);

  // Selected strategy for the 2D Stress grid
  const [selectedStrategyForStress, setSelectedStrategyForStress] = useState<string>("Portfolio");

  // Stress matrix calculation
  const stressMatrix = useMemo(() => {
    const spot = activeAsset.price;
    const dte = selectedDte;
    
    let targetLegs: any[] = [];
    let targetQty = 1;

    if (selectedStrategyForStress === "Portfolio") {
      // Map aggregated legs
      portfolioPositions.forEach((pos) => {
        const sign = pos.side === "long" ? 1 : -1;
        const subLegs = getStrategyLegs(pos.strategy, pos.strike, 5).map(l => ({
          ...l,
          side: pos.side === "long" ? l.side : (l.side === "long" ? "short" : "long"), // invert short wings
          quantity: l.quantity * pos.qty
        }));
        targetLegs.push(...subLegs);
      });
    } else {
      const step = spot < 100 ? 2.5 : 5;
      const centerStrike = Math.round(spot / step) * step;
      targetLegs = getStrategyLegs(selectedStrategyForStress, centerStrike, 5);
    }

    return marketDataService.generateStressGrid(selectedTicker, targetLegs, dte, targetQty);
  }, [selectedStrategyForStress, selectedTicker, activeAsset, selectedDte, portfolioPositions]);

  // Scenario shock triggers
  const handleShock = (type: "cpi_print" | "earnings_crush" | "black_swan" | "compression" | "reset") => {
    marketDataService.injectScenarioShock(selectedTicker, type);
    
    if (type === "cpi_print") {
      addLog("MACRO", `CPI SHOCK: Injected spot squeeze. Volatility surface steepened.`);
      addLog("RISK", `ALERT: Short gamma concentrations under severe stress.`);
      addLog("SYS", `SUITABILITY: Vol expansion favors long volatility assets (Long Put, Straddle).`);
    } else if (type === "earnings_crush") {
      addLog("VOL", `VOL CRUSH: Speculative premium collapsed. Surface flattening.`);
      addLog("SYS", `INFO: Extrinsic decay capture complete.`);
      addLog("SYS", `SUITABILITY: Vol collapse favors defined-risk range trades (Iron Condor).`);
    } else if (type === "black_swan") {
      addLog("MACRO", `CRITICAL: Black Swan tail shock triggered. Spot -16%, IV spikes.`);
      addLog("RISK", `FATALITY: Convex gamma bounds breached across multiple strikes.`);
      addLog("RISK", `SUITABILITY: Severe mismatch. Dimming short gamma; defined-risk required.`);
    } else if (type === "compression") {
      addLog("VOL", `DECAY: Volatility compression zone initiated. Contango slopes normal.`);
      addLog("SYS", `SUITABILITY: Stable ranges favor yield strategies (Covered Call, Spreads).`);
    } else if (type === "reset") {
      addLog("SYS", `RESTORATION: Normalized baseline parameters restored.`);
    }
  };

  // Recharts Volatility Smile curve coordinates
  const smileCurveData = useMemo(() => {
    return optionsChain.map((row) => ({
      strike: row.strike,
      iv: row.ivPercent,
      label: `$${row.strike}`
    }));
  }, [optionsChain]);

  // Recharts Term Structure curve coordinates
  const termCurveData = useMemo(() => {
    const expiries = [7, 14, 21, 30, 45, 60, 90];
    return expiries.map((dte) => {
      const iv = marketDataService.calculateStrikeIv(activeAsset, activeAsset.price, dte) * 100;
      return {
        expiry: `${dte}D`,
        iv: Math.round(iv * 10) / 10
      };
    });
  }, [activeAsset]);

  // Telemetry logs filtering
  const filteredLogs = useMemo(() => {
    if (logFilter === "ALL") return consoleLogs;
    return consoleLogs.filter(log => log.type === logFilter);
  }, [consoleLogs, logFilter]);

  return (
    <div
      className="flex-grow min-h-0 flex flex-col relative bg-black select-none text-[var(--ox-text-primary)] transition-all duration-1000 overflow-hidden"
      style={{
        background: `radial-gradient(ellipse at 50% 0%, ${activeRegime.color}0a, transparent 65%)`
      }}
    >
      {/* Cinematic ambient glowing atmosphere backplate */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] rounded-full pointer-events-none z-0 filter blur-[140px] opacity-40 transition-all duration-1000"
        style={{
          background: `radial-gradient(circle, ${activeRegime.color}40 0%, transparent 75%)`
        }}
      />
      <div className="absolute inset-0 bg-grid opacity-10 pointer-events-none z-0" />

      {/* ── HEADER DECK: REGIME SUMMARY & ASSET SELECTOR ── */}
      <div className="border-b border-white/5 bg-[#05070a]/90 backdrop-blur-md px-6 py-4 flex flex-wrap items-center justify-between gap-4 shrink-0 z-10">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-[9px] font-mono text-cyan-400 tracking-[0.25em] uppercase block mb-0.5">Market Intelligence</span>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              Derivatives Cognition Engine
              <span
                className="text-[9px] font-mono border px-2 py-0.5 rounded transition-all duration-700 font-bold"
                style={{
                  borderColor: `${activeRegime.color}40`,
                  backgroundColor: `${activeRegime.color}15`,
                  color: activeRegime.color,
                  boxShadow: `0 0 10px ${activeRegime.color}10`
                }}
              >
                {activeRegime.label}
              </span>
            </h2>
          </div>
        </div>

        {/* Ticker Selector buttons */}
        <div className="flex items-center gap-1.5 p-0.5 bg-white/3 border border-white/5 rounded-lg font-mono text-[10px]">
          {["SPY", "AAPL", "NVDA", "TSLA", "IWM"].map((tk) => {
            const isSel = selectedTicker === tk;
            const assetData = assets[tk] || marketDataService.getAsset(tk);
            const walkColor = assetData.change >= 0 ? "text-emerald-400" : "text-rose-400";
            return (
              <button
                key={tk}
                onClick={() => {
                  setSelectedTicker(tk);
                  addLog("SYS", `ASSET: ingestion focus shifted to [${tk}].`);
                }}
                className={`px-3 py-1.5 rounded cursor-pointer transition-all flex items-center gap-1.5 font-bold ${
                  isSel
                    ? "bg-cyan-500/10 border border-cyan-500/20 text-cyan-400"
                    : "text-white/40 border border-transparent hover:text-white/70"
                }`}
              >
                <span>{tk}</span>
                <span className={`text-[8px] font-normal ${walkColor}`}>${assetData.price.toFixed(0)}</span>
              </button>
            );
          })}
        </div>

        {/* Telemetry numbers deck */}
        <div className="flex items-center gap-5 font-mono text-[10px] text-white/50">
          <div>
            <span className="text-white/30 uppercase text-[8px] block tracking-widest">Implied Vol</span>
            <span className="text-white font-semibold text-xs tracking-wider">{activeAsset.iv30.toFixed(1)}%</span>
          </div>
          <div className="h-6 w-px bg-white/10" />
          <div>
            <span className="text-white/30 uppercase text-[8px] block tracking-widest">IV Rank</span>
            <span className={`font-semibold text-xs tracking-wider ${activeAsset.ivRank > 50 ? "text-rose-400" : "text-emerald-400"}`}>
              {activeAsset.ivRank}%
            </span>
          </div>
          <div className="h-6 w-px bg-white/10" />
          <div>
            <span className="text-white/30 uppercase text-[8px] block tracking-widest">VIX Index</span>
            <span className="text-white font-semibold text-xs tracking-wider">{activeAsset.vix.toFixed(1)}</span>
          </div>
          <div className="h-6 w-px bg-white/10" />
          
          {/* Connector configurations */}
          <button
            onClick={() => setIsKeysOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white font-bold cursor-pointer transition-colors"
          >
            <Settings size={12} className="text-cyan-400 animate-spin-slow" />
            <span>CONNECTOR</span>
          </button>
        </div>
      </div>

      {/* ── SUB-TAB NAVIGATION ── */}
      <div className="flex px-6 border-b border-white/5 bg-[#05070a]/90 backdrop-blur-md shrink-0 z-10 font-mono text-[10px]">
        <button
          onClick={() => setActiveTab("intelligence")}
          className={`px-4 py-2.5 font-bold border-b-2 transition-all ${
            activeTab === "intelligence"
              ? "border-cyan-400 text-cyan-400"
              : "border-transparent text-white/40 hover:text-white/80"
          }`}
        >
          MARKET INTELLIGENCE
        </button>
        <button
          onClick={() => setActiveTab("monte_carlo")}
          className={`px-4 py-2.5 font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "monte_carlo"
              ? "border-purple-400 text-purple-400"
              : "border-transparent text-white/40 hover:text-white/80"
          }`}
        >
          <Compass size={12} className={activeTab === "monte_carlo" ? "text-purple-400" : ""} />
          MONTE CARLO RISK ENGINE
        </button>
        <button
          onClick={() => setActiveTab("bsm")}
          className={`px-4 py-2.5 font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "bsm"
              ? "border-emerald-400 text-emerald-400"
              : "border-transparent text-white/40 hover:text-white/80"
          }`}
        >
          <Zap size={12} className={activeTab === "bsm" ? "text-emerald-400" : ""} />
          BLACK-SCHOLES PRICER
        </button>
      </div>

      {/* ── CONDITIONAL RENDER WORKSPACE ── */}
      {activeTab === "monte_carlo" ? (
        <MonteCarloEngine />
      ) : activeTab === "bsm" ? (
        <BlackScholesEngine />
      ) : (
      <div className="flex-1 min-h-0 grid grid-cols-[330px_1fr] divide-x divide-white/5 overflow-hidden z-10 relative">
        
        {/* ── LEFT DRAWER: Greeks exposure and What-If Stress matrix ── */}
        <div className="flex flex-col gap-4.5 p-4.5 overflow-y-auto min-w-0 bg-[#04060b]/75 backdrop-blur-md">
          
          {/* Greeks diagnostics */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[8.5px] font-mono text-white/30 uppercase tracking-widest">Greek Matrix (Net Portfolio)</span>
              <Zap size={11} className="text-cyan-400" />
            </div>

            <div className="grid grid-cols-2 gap-2 font-mono">
              <div className="bg-black/40 border border-white/5 rounded-lg p-2 flex flex-col justify-between">
                <span className="text-[8px] text-white/30 uppercase block mb-1">Delta Position</span>
                <span className={`text-xs font-bold tracking-wider ${netGreeks.delta >= 0 ? "text-cyan-400" : "text-rose-400"}`}>
                  {netGreeks.delta >= 0 ? "+" : ""}{netGreeks.delta.toFixed(1)} Δ
                </span>
                <span className="text-[7px] text-white/20 mt-1">Stressed to Spot shifts</span>
              </div>

              <div className="bg-black/40 border border-white/5 rounded-lg p-2 flex flex-col justify-between">
                <span className="text-[8px] text-white/30 uppercase block mb-1">Net Convexity</span>
                <span className={`text-xs font-bold tracking-wider ${netGreeks.gamma >= 0 ? "text-purple-400" : "text-orange-400"}`}>
                  {netGreeks.gamma.toFixed(4)} Γ
                </span>
                <span className="text-[7px] text-white/20 mt-1">Curvature speed</span>
              </div>

              <div className="bg-black/40 border border-white/5 rounded-lg p-2 flex flex-col justify-between">
                <span className="text-[8px] text-white/30 uppercase block mb-1">Vega Sensitivity</span>
                <span className={`text-xs font-bold tracking-wider ${netGreeks.vega >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {netGreeks.vega >= 0 ? "+" : ""}${netGreeks.vega.toFixed(1)} ν
                </span>
                <span className="text-[7px] text-white/20 mt-1">per 1% Vol shift</span>
              </div>

              <div className="bg-black/40 border border-white/5 rounded-lg p-2 flex flex-col justify-between">
                <span className="text-[8px] text-white/30 uppercase block mb-1">Theta Decay</span>
                <span className={`text-xs font-bold tracking-wider ${netGreeks.theta >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {netGreeks.theta >= 0 ? "+" : ""}${netGreeks.theta.toFixed(1)} θ
                </span>
                <span className="text-[7px] text-white/20 mt-1">Calendar erosion/day</span>
              </div>
            </div>
          </div>

          <div className="h-px bg-white/5" />

          {/* Regime Strategy Recommendations */}
          <div className="flex flex-col gap-2 font-mono text-[9px]">
            <span className="text-[8.5px] text-white/30 uppercase tracking-widest">Regime Suitability Rankings</span>
            <div className="bg-black/40 border border-white/5 rounded-lg p-2.5 flex flex-col gap-2">
              <div className="grid grid-cols-2 divide-x divide-white/5 gap-2">
                {/* Resilient strategies (Favored) */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[7.5px] text-emerald-400 font-bold uppercase tracking-wider">▲ Favored / Resilient</span>
                  {strategyRecommendations.slice(0, 3).map((item) => (
                    <div key={item.strategyId} className="flex justify-between items-center bg-emerald-500/5 border border-emerald-500/10 rounded px-1.5 py-1">
                      <span className="text-white/80 font-bold truncate text-[8px]">{item.strategyName}</span>
                      <span className="text-emerald-400 font-bold text-[8.5px]">{item.score}</span>
                    </div>
                  ))}
                </div>

                {/* Vulnerable strategies (Mismatched) */}
                <div className="flex flex-col gap-1.5 pl-2">
                  <span className="text-[7.5px] text-rose-400 font-bold uppercase tracking-wider">▼ Vulnerable / Hostile</span>
                  {strategyRecommendations.slice(-3).reverse().map((item) => (
                    <div key={item.strategyId} className="flex justify-between items-center bg-rose-500/5 border border-rose-500/10 rounded px-1.5 py-1">
                      <span className="text-white/80 font-bold truncate text-[8px]">{item.strategyName}</span>
                      <span className="text-rose-400 font-bold text-[8.5px]">{item.score}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="h-px bg-white/5" />

          {/* Dynamic 2D Stress grid */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[8.5px] font-mono text-white/30 uppercase tracking-widest">What-If Risk Stress Matrix</span>
              <div className="flex items-center gap-1 font-mono text-[8px] bg-white/3 border border-white/5 rounded px-1.5 py-0.5">
                <span className="text-white/40">TARGET:</span>
                <select
                  value={selectedStrategyForStress}
                  onChange={(e) => setSelectedStrategyForStress(e.target.value)}
                  className="bg-transparent text-cyan-400 border-none outline-none font-bold text-[8px] cursor-pointer"
                >
                  <option value="Portfolio" className="bg-[#0b0c10]">Net Portfolio</option>
                  <option value="Long Call" className="bg-[#0b0c10]">Long Call</option>
                  <option value="Bull Call Spread" className="bg-[#0b0c10]">Bull Call Spread</option>
                  <option value="Iron Condor" className="bg-[#0b0c10]">Iron Condor</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1 overflow-x-auto font-mono text-[8.5px]">
              {/* Header row (Spot moves) */}
              <div className="flex items-center gap-1 min-w-[280px]">
                <div className="w-14 text-white/30 text-right font-bold pr-1">VOL\SPOT</div>
                {stressMatrix.spotMoves.map((sm, idx) => (
                  <div key={idx} className="flex-1 text-center font-bold text-white/40">
                    {sm >= 0 ? "+" : ""}{(sm * 100).toFixed(0)}%
                  </div>
                ))}
              </div>

              {/* Grid matrix rows */}
              <div className="flex flex-col gap-1">
                {stressMatrix.rows.map((row, rIdx) => (
                  <div key={rIdx} className="flex items-center gap-1 min-w-[280px]">
                    <div className="w-14 text-white/30 text-right pr-1 font-bold">
                      {row.volShift >= 0 ? "+" : ""}{row.volShift}%
                    </div>
                    {row.cells.map((cell, cIdx) => {
                      const isProfit = cell.pnl > 0;
                      const isLoss = cell.pnl < 0;
                      
                      let cellStyle = "bg-white/3 text-white/40 border border-white/5";
                      if (isProfit) {
                        // Dynamic opacity based on PNL scale
                        const opacity = Math.min(0.35, 0.08 + (cell.pnl / 1500) * 0.25);
                        cellStyle = `text-emerald-400 border border-emerald-500/10`;
                      } else if (isLoss) {
                        const opacity = Math.min(0.35, 0.08 + (Math.abs(cell.pnl) / 1500) * 0.25);
                        cellStyle = `text-rose-400 border border-rose-500/10`;
                      }

                      return (
                        <div
                          key={cIdx}
                          title={`Spot Shift: ${cell.spotShift * 100}%, Vol Shift: ${cell.volShift}%\nPNL: ${cell.pnl >= 0 ? "+" : ""}$${cell.pnl}`}
                          className={`flex-grow h-6 rounded text-center flex items-center justify-center font-bold relative transition-colors overflow-hidden ${cellStyle}`}
                          style={{
                            backgroundColor: isProfit 
                              ? `rgba(16, 185, 129, ${Math.min(0.4, 0.06 + (cell.pnl / 1200) * 0.3)})`
                              : isLoss 
                              ? `rgba(239, 68, 68, ${Math.min(0.4, 0.06 + (Math.abs(cell.pnl) / 1200) * 0.3)})`
                              : "rgba(255,255,255,0.03)"
                          }}
                        >
                          ${Math.round(cell.pnl)}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="h-px bg-white/5" />

          {/* Option event triggers */}
          <div className="flex flex-col gap-2">
            <span className="text-[8.5px] font-mono text-white/30 uppercase tracking-widest">Inject Macro Event Shocks</span>
            
            <div className="grid grid-cols-2 gap-1.5 font-mono text-[9px]">
              <button
                onClick={() => handleShock("cpi_print")}
                className="flex flex-col gap-0.5 px-2 py-1.5 rounded-lg border border-white/5 bg-white/3 hover:bg-white/5 hover:border-white/10 text-left cursor-pointer transition-all"
              >
                <div className="flex items-center gap-1.5 font-bold text-rose-400">
                  <ShieldAlert size={10} className="animate-pulse" />
                  <span>CPI Squeeze</span>
                </div>
                <span className="text-[7px] text-white/20 uppercase">Spot- / Vol+</span>
              </button>

              <button
                onClick={() => handleShock("earnings_crush")}
                className="flex flex-col gap-0.5 px-2 py-1.5 rounded-lg border border-white/5 bg-white/3 hover:bg-white/5 hover:border-white/10 text-left cursor-pointer transition-all"
              >
                <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                  <Flame size={10} />
                  <span>Earnings Crush</span>
                </div>
                <span className="text-[7px] text-white/20 uppercase">IV Collapse</span>
              </button>

              <button
                onClick={() => handleShock("black_swan")}
                className="flex flex-col gap-0.5 px-2 py-1.5 rounded-lg border border-white/5 bg-white/3 hover:bg-white/5 hover:border-white/10 text-left cursor-pointer transition-all"
              >
                <div className="flex items-center gap-1.5 font-bold text-orange-400">
                  <AlertTriangle size={10} className="animate-bounce" />
                  <span>Black Swan</span>
                </div>
                <span className="text-[7px] text-white/20 uppercase">Tail Liquidity</span>
              </button>

              <button
                onClick={() => handleShock("compression")}
                className="flex flex-col gap-0.5 px-2 py-1.5 rounded-lg border border-white/5 bg-white/3 hover:bg-white/5 hover:border-white/10 text-left cursor-pointer transition-all"
              >
                <div className="flex items-center gap-1.5 font-bold text-cyan-400">
                  <Activity size={10} />
                  <span>Compression</span>
                </div>
                <span className="text-[7px] text-white/20 uppercase">Theta Decay</span>
              </button>
            </div>

            <button
              onClick={() => handleShock("reset")}
              className="w-full py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/15 text-[8px] font-mono uppercase tracking-widest text-white/40 hover:text-white/80 rounded-lg cursor-pointer transition-all mt-1"
            >
              Reset Market State
            </button>
          </div>

          <div className="h-px bg-white/5" />

          {/* Event Calendars display */}
          <div className="flex flex-col gap-2">
            <span className="text-[8.5px] font-mono text-white/30 uppercase tracking-widest">Macro Event Calendar</span>
            <div className="flex flex-col gap-1.5 font-mono text-[9px]">
              {activeAsset.events.map((ev, idx) => (
                <div key={idx} className="bg-black/35 border border-white/5 rounded p-2 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white/80">{ev.title}</span>
                    <span
                      className={`text-[7px] border px-1 rounded uppercase font-bold ${
                        ev.impact === "high"
                          ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
                          : "border-cyan-500/30 bg-cyan-500/10 text-cyan-400"
                      }`}
                    >
                      {ev.impact}
                    </span>
                  </div>
                  <div className="text-white/30 text-[8px]">{ev.date}</div>
                  <div className="text-white/50 leading-relaxed text-[8.5px]">{ev.description}</div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* ── RIGHT VIEWPORT: Surface visualization, options matrix & console logs ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          
          {/* Dynamic tabs bar for Volatility Surfaces */}
          <div className="px-5 border-b border-white/5 flex items-center justify-between shrink-0 bg-[#05070c]/50 relative z-10">
            <div className="flex gap-2.5 py-2 font-mono text-[9px]">
              <button
                onClick={() => setViewMode("3d_surface")}
                className={`pb-2 border-b-2 font-bold cursor-pointer transition-all ${
                  viewMode === "3d_surface"
                    ? "border-cyan-400 text-cyan-400"
                    : "border-transparent text-white/40 hover:text-white/80"
                }`}
              >
                3D LIVING SURFACE
              </button>
              <button
                onClick={() => setViewMode("2d_smile")}
                className={`pb-2 border-b-2 font-bold cursor-pointer transition-all ${
                  viewMode === "2d_smile"
                    ? "border-cyan-400 text-cyan-400"
                    : "border-transparent text-white/40 hover:text-white/80"
                }`}
              >
                2D SMILE (SKEW)
              </button>
              <button
                onClick={() => setViewMode("2d_term")}
                className={`pb-2 border-b-2 font-bold cursor-pointer transition-all ${
                  viewMode === "2d_term"
                    ? "border-cyan-400 text-cyan-400"
                    : "border-transparent text-white/40 hover:text-white/80"
                }`}
              >
                2D TERM STRUCTURE
              </button>
            </div>

            <div className="flex items-center gap-1 font-mono text-[8px] bg-white/3 border border-white/5 rounded px-2 py-0.5">
              <span className="text-white/20">GRID RESOLUTION:</span>
              <span className="text-cyan-400 font-bold">9 x 7 SURFACE MESH</span>
            </div>
          </div>

          {/* Interactive display panel */}
          <div className="h-68 shrink-0 border-b border-white/5 relative z-10 bg-black/20 flex items-center justify-center overflow-hidden">
            {viewMode === "3d_surface" ? (
              <VolatilitySurface3D asset={activeAsset} regimeColor={activeRegime.color} />
            ) : viewMode === "2d_smile" ? (
              <div className="w-full h-full p-4 pl-0 pr-6">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={smileCurveData} margin={{ top: 10, right: 10, bottom: 5, left: -25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis dataKey="label" stroke="rgba(255,255,255,0.15)" tick={{ fontSize: 7.5, fontFamily: "monospace" }} />
                    <YAxis stroke="rgba(255,255,255,0.15)" tick={{ fontSize: 7.5, fontFamily: "monospace" }} domain={["auto", "auto"]} />
                    <Tooltip content={<DenseChartTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="iv"
                      name="IV%"
                      stroke="#00d4ff"
                      strokeWidth={1.5}
                      dot={{ r: 2, fill: "#00d4ff", strokeWidth: 0 }}
                      activeDot={{ r: 4 }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="w-full h-full p-4 pl-0 pr-6">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={termCurveData} margin={{ top: 10, right: 10, bottom: 5, left: -25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis dataKey="expiry" stroke="rgba(255,255,255,0.15)" tick={{ fontSize: 7.5, fontFamily: "monospace" }} />
                    <YAxis stroke="rgba(255,255,255,0.15)" tick={{ fontSize: 7.5, fontFamily: "monospace" }} domain={["auto", "auto"]} />
                    <Tooltip content={<DenseChartTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="iv"
                      name="IV%"
                      stroke="#a855f7"
                      strokeWidth={1.5}
                      dot={{ r: 2, fill: "#a855f7", strokeWidth: 0 }}
                      activeDot={{ r: 4 }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* ── BOTTOM MATRIX: Option Chain with Probability band overlays ── */}
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative z-10">
            <div className="px-5 py-2 border-b border-white/5 bg-black/40 flex items-center justify-between shrink-0 font-mono text-[9px]">
              <div className="flex items-center gap-2">
                <span className="text-white/30 uppercase tracking-widest">Option Strike Ingestion Matrix</span>
                
                {/* Expiry / DTE slider selector */}
                <div className="flex items-center gap-1.5 ml-4 bg-white/3 border border-white/5 px-2 py-0.5 rounded text-[8px]">
                  <span className="text-white/20">MATURITY:</span>
                  <select
                    value={selectedDte}
                    onChange={(e) => {
                      const dteVal = Number(e.target.value);
                      setSelectedDte(dteVal);
                      addLog("SYS", `EXPIRY: chain view shifted to [${dteVal}D].`);
                    }}
                    className="bg-transparent text-cyan-400 border-none outline-none font-bold cursor-pointer"
                  >
                    <option value={7} className="bg-[#0b0c10]">7 Days</option>
                    <option value={14} className="bg-[#0b0c10]">14 Days</option>
                    <option value={21} className="bg-[#0b0c10]">21 Days</option>
                    <option value={30} className="bg-[#0b0c10]">30 Days</option>
                    <option value={45} className="bg-[#0b0c10]">45 Days</option>
                    <option value={60} className="bg-[#0b0c10]">60 Days</option>
                    <option value={90} className="bg-[#0b0c10]">90 Days</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[8px] text-white/20">
                <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> Gamma Accelerator</div>
                <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Vega Halo</div>
                <div className="flex items-center gap-1"><Clock size={10} className="text-rose-500" /> Theta Cliff</div>
              </div>
            </div>

            {/* Options chain strike table */}
            <div className="flex-1 overflow-auto p-4 pt-1.5 min-h-0 relative">
              <table className="w-full border-collapse font-mono text-[9px] text-left select-text relative">
                <thead>
                  <tr className="border-b border-white/10 text-white/30 text-[8px] uppercase tracking-wider sticky top-0 bg-[#040609] py-1.5 z-20">
                    <th className="py-2 pl-1.5">OI</th>
                    <th className="py-2 text-right">Vol</th>
                    <th className="py-2 text-right">Delta</th>
                    <th className="py-2 text-right">Gamma</th>
                    <th className="py-2 text-right">IV%</th>
                    <th className="py-2 text-right text-emerald-400">Call Ask</th>
                    
                    <th className="py-2 text-center text-white/70 font-bold bg-white/3 px-3">Strike</th>
                    
                    <th className="py-2 pl-3 text-rose-400">Put Ask</th>
                    <th className="py-2 text-right">IV%</th>
                    <th className="py-2 text-right">Gamma</th>
                    <th className="py-2 text-right">Delta</th>
                    <th className="py-2 text-right">Vol</th>
                    <th className="py-2 text-right pr-1.5">OI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {optionsChain.map((row) => {
                    const spot = activeAsset.price;
                    const isAtTheMoney = Math.abs(row.strike - spot) / spot <= 0.02;

                    // Probability Band class mappings (render background zones behind strikes)
                    let strikeBg = "bg-white/[0.04]";
                    if (row.probBand68) {
                      strikeBg = "bg-cyan-500/10 font-bold text-cyan-400";
                    } else if (row.probBand95) {
                      strikeBg = "bg-cyan-500/5 text-cyan-300/80";
                    }

                    return (
                      <tr
                        key={row.strike}
                        className={`hover:bg-white/[0.03] transition-colors ${
                          isAtTheMoney ? "bg-cyan-500/5 font-semibold" : ""
                        }`}
                      >
                        {/* Calls Column */}
                        <td className="py-2 pl-1.5 text-white/50">{row.call.oi.toLocaleString()}</td>
                        <td className="py-2 text-right text-white/50">{row.call.vol.toLocaleString()}</td>
                        <td className="py-2 text-right text-cyan-400/90 flex items-center justify-end gap-1">
                          {row.vegaHalo > 0.6 && (
                            <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse glow-green" />
                          )}
                          <span>{row.call.delta.toFixed(2)}</span>
                        </td>
                        <td className="py-2 text-right text-purple-400/90 relative">
                          <div>{row.call.gamma.toFixed(3)}</div>
                          {/* Gamma Speed indicator overlay */}
                          {row.gammaSpeed > 0.1 && (
                            <div className="absolute bottom-0.5 right-0 h-0.5 bg-purple-500/60 rounded" style={{ width: `${row.gammaSpeed * 30}px` }} />
                          )}
                        </td>
                        <td className="py-2 text-right text-white/40">{row.call.iv.toFixed(1)}%</td>
                        <td className="py-2 text-right text-emerald-400 font-bold">${row.call.price.toFixed(2)}</td>
                        
                        {/* Center Strike with Probability Band backdrop */}
                        <td
                          className={`py-2 text-center border-x border-white/5 px-3 select-none relative ${strikeBg}`}
                          title={
                            row.probBand68 
                              ? "Within 68% (1 Std Dev) Probability Cone" 
                              : row.probBand95 
                              ? "Within 95% (2 Std Dev) Probability Cone" 
                              : "Tail Risk Area"
                          }
                        >
                          <div className="flex items-center justify-center gap-1 font-bold">
                            {row.thetaCliff && (
                              <span title="Theta Cliff Zone: rapid time decay">
                                <Clock size={9} className="text-rose-500 animate-pulse" />
                              </span>
                            )}
                            <span>${row.strike.toFixed(1)}</span>
                          </div>
                        </td>
                        
                        {/* Puts Column */}
                        <td className="py-2 pl-3 text-rose-400 font-bold">${row.put.price.toFixed(2)}</td>
                        <td className="py-2 text-right text-white/40">{row.put.iv.toFixed(1)}%</td>
                        <td className="py-2 text-right text-purple-400/90 relative">
                          <div>{row.put.gamma.toFixed(3)}</div>
                          {/* Gamma Speed indicator overlay */}
                          {row.gammaSpeed > 0.1 && (
                            <div className="absolute bottom-0.5 right-0 h-0.5 bg-purple-500/60 rounded" style={{ width: `${row.gammaSpeed * 30}px` }} />
                          )}
                        </td>
                        <td className="py-2 text-right text-rose-400/90 flex items-center justify-end gap-1">
                          {row.vegaHalo > 0.6 && (
                            <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse glow-green" />
                          )}
                          <span>{row.put.delta.toFixed(2)}</span>
                        </td>
                        <td className="py-2 text-right text-white/50">{row.put.vol.toLocaleString()}</td>
                        <td className="py-2 text-right pr-1.5 text-white/50">{row.put.oi.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── FOOTER: Telemetry logs with classification filters ── */}
            <div className="h-[105px] border-t border-white/5 bg-[#030508]/90 px-4 py-2 font-mono text-[8.5px] text-white/40 flex flex-col gap-1 shrink-0 relative z-20">
              <div className="flex items-center justify-between text-white/20 border-b border-white/5 pb-1 mb-1 font-bold shrink-0">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1"><Terminal size={11} className="text-cyan-400" /> SYSTEM NARRATIVE FEED</span>
                  <div className="h-3 w-px bg-white/10" />
                  
                  {/* Log type filter tags */}
                  <div className="flex gap-1.5 text-[7.5px]">
                    {(["ALL", "SYS", "RISK", "VOL", "MACRO"] as const).map((t) => {
                      const isAct = logFilter === (t === "SYS" ? "SYS" : t);
                      return (
                        <button
                          key={t}
                          onClick={() => setLogFilter(t as any)}
                          className={`px-1.5 rounded cursor-pointer transition-colors ${
                            isAct ? "bg-white/10 text-white font-bold" : "text-white/30 hover:text-white/60"
                          }`}
                        >
                          {t}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <span className="flex items-center gap-1.5 text-[8px]">
                  <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                  FEED SYNCED // LIVE WALK ACTIVE
                </span>
              </div>

              {/* Logs loop */}
              <div className="flex-grow overflow-y-auto flex flex-col gap-0.5">
                {filteredLogs.map((log, idx) => {
                  let colorClass = "text-white/45";
                  if (log.type === "RISK") colorClass = "text-rose-400 font-bold";
                  else if (log.type === "VOL") colorClass = "text-purple-400";
                  else if (log.type === "MACRO") colorClass = "text-cyan-400";
                  
                  return (
                    <div key={idx} className={`flex gap-2 ${colorClass}`}>
                      <span className="text-white/25">[{log.time}]</span>
                      <span className="text-white/15">[{log.type}]</span>
                      <span className="flex-1">{log.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>

      </div>
      )}

      {/* Settings key connector modal */}
      <DataConnectorModal
        isOpen={isKeysOpen}
        onClose={() => setIsKeysOpen(false)}
        onLogMessage={(msg) => addLog("SYS", msg)}
      />
    </div>
  );
}
