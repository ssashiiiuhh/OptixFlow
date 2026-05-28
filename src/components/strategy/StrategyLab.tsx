"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ComposedChart, Area, XAxis, YAxis, ResponsiveContainer, ReferenceLine, Tooltip, Line
} from "recharts";
import {
  Play, Pause, RotateCcw, Zap, TrendingDown, Clock, Target, Sliders,
  Shield, Activity, Sparkles, TrendingUp, HelpCircle, ChevronRight, Flame, AlertCircle,
  ShieldAlert, ShieldCheck
} from "lucide-react";
import {
  buildDynamicChartSnapshot, computeDynamicMetrics, getStrategyLegs,
  TOTAL_DTE
} from "@/lib/finance/theta";
import { marketDataService, MarketAsset } from "@/lib/market/MarketDataService";
import { evaluateStrategySuitability } from "@/lib/market/RegimeSuitabilityEngine";

// Dynamic Tooltip
function PayoffTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number; name: string }> }) {
  if (!active || !payload?.length) return null;
  const relevant = payload.filter(p => p.name !== "bandRange");
  return (
    <div className="text-[11px] font-mono bg-black/90 border border-white/10 rounded-lg px-3 py-2 backdrop-blur-md">
      {relevant.map((p, i) => (
        <div key={i} className={p.value >= 0 ? "text-emerald-400" : "text-rose-400"}>
          {p.name === "currentA" ? "P&L" : p.name === "currentB" ? "Comp P&L" : p.name}: {p.value >= 0 ? "+" : ""}${p.value.toFixed(2)}
        </div>
      ))}
    </div>
  );
}

// Visual Dial for Greeks
interface GreekDialProps {
  label: string;
  value: number;
  unit: string;
  description: string;
  interpretation: string;
  color: string;
  glowColor: string;
  min: number;
  max: number;
}

function GreekCard({ label, value, unit, description, interpretation, color, glowColor, min, max }: GreekDialProps) {
  // Normalize value to 0-100% for progress bar
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

  return (
    <div className="bg-black/40 border border-white/5 rounded-xl p-4 relative overflow-hidden group">
      {/* Background glow matching the Greek's signature color */}
      <div
        className="absolute -right-10 -bottom-10 w-24 h-24 rounded-full blur-2xl opacity-10 group-hover:opacity-20 transition-all duration-700 pointer-events-none"
        style={{ background: color }}
      />

      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">{label}</span>
        <span className="text-[10px] font-mono text-white/20">{description}</span>
      </div>

      <div className="flex items-baseline gap-1 mb-2">
        <div className="text-xl font-bold font-mono tracking-tight" style={{ color }}>
          {value >= 0 && label !== "Theta" && label !== "Gamma" ? "+" : ""}{value.toFixed(label === "Gamma" ? 3 : 2)}
        </div>
        <span className="text-[9px] font-mono text-white/30">{unit}</span>
      </div>

      {/* Progress Bar representation */}
      <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden relative">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color, boxShadow: `0 0 8px ${color}` }}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 100, damping: 15 }}
        />
      </div>

      <div className="text-[9px] leading-relaxed text-white/50 font-mono mt-2 min-h-[26px]">
        {interpretation}
      </div>
    </div>
  );
}

// ── Master Component ──────────────────────────────────────────────────────────
export default function StrategyLab() {
  // Real-time market subscription state
  const [assets, setAssets] = useState<Record<string, MarketAsset>>({});
  const [selectedTicker, setSelectedTicker] = useState("SPY");

  useEffect(() => {
    const unsubscribe = marketDataService.subscribe((updatedAssets) => {
      setAssets({ ...updatedAssets });
    });
    return () => unsubscribe();
  }, []);

  const activeAsset = useMemo(() => {
    return assets[selectedTicker] || marketDataService.getAsset(selectedTicker);
  }, [assets, selectedTicker]);

  // Core Position States
  const [strategy, setStrategy] = useState("Long Call");
  const [spot, setSpot] = useState(100);
  const [strike, setStrike] = useState(100);
  const [spreadWidth, setSpreadWidth] = useState(5);
  const [dte, setDte] = useState(TOTAL_DTE);
  const [iv, setIv] = useState(30); // 10% to 100%
  const [quantity, setQuantity] = useState(1);
  const [autoHedge, setAutoHedge] = useState(false);

  // Comparison State
  const [comparisonStrategy, setComparisonStrategy] = useState<string | null>(null);

  // Scenario entry Lock references
  const [initialSpot, setInitialSpot] = useState(100);
  const [initialIv, setInitialIv] = useState(30);

  // Playback States
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<1 | 2 | 4>(1);

  // Shock System States
  const [activeShock, setActiveShock] = useState<string | null>(null);
  const [shockWave, setShockWave] = useState(false);

  // Dropdown open states
  const [isCompareMenuOpen, setIsCompareMenuOpen] = useState(false);

  // Automatically lock entry spot/IV when strategy changes
  useEffect(() => {
    setInitialSpot(spot);
    setInitialIv(iv);
  }, [strategy]);

  // Handle Timeline Playback (Autoplay)
  useEffect(() => {
    if (!isPlaying || dte <= 0) {
      if (dte <= 0 && isPlaying) {
        setIsPlaying(false);
      }
      return;
    }

    const interval = (120 + 380 * (dte / TOTAL_DTE)) / speed;
    const timer = setTimeout(() => {
      setDte(prev => Math.max(0, prev - 1));
    }, interval);

    return () => clearTimeout(timer);
  }, [isPlaying, dte, speed]);

  const resetTimeline = useCallback(() => {
    setIsPlaying(false);
    setDte(TOTAL_DTE);
    setSpot(initialSpot);
    setIv(initialIv);
  }, [initialSpot, initialIv]);

  // ── Volatility Shock Trigger ───────────────────────────────────────────────
  const triggerShock = useCallback((shockType: string, targetIv: number, targetSpot?: number) => {
    setActiveShock(shockType);
    setShockWave(true);

    const duration = 1000; // ms
    const startIv = iv;
    const startSpot = spot;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const ease = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      setIv(startIv + (targetIv - startIv) * ease);
      if (targetSpot !== undefined) {
        setSpot(startSpot + (targetSpot - startSpot) * ease);
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setTimeout(() => setShockWave(false), 800);
      }
    };

    requestAnimationFrame(animate);
  }, [iv, spot]);

  // ── Preset Scenarios ───────────────────────────────────────────────────────
  const loadPreset = (type: string) => {
    if (type === "long_vol") {
      setStrategy("Long Straddle");
      setStrike(100);
      setSpot(100);
      setDte(45);
      setIv(65);
    } else if (type === "income") {
      setStrategy("Iron Condor");
      setStrike(100);
      setSpot(100);
      setSpreadWidth(5);
      setDte(30);
      setIv(45);
    } else if (type === "leveraged") {
      setStrategy("Bull Call Spread");
      setStrike(95);
      setSpreadWidth(10);
      setSpot(100);
      setDte(45);
      setIv(22);
    } else if (type === "bearish") {
      setStrategy("Bear Put Spread");
      setStrike(105);
      setSpreadWidth(10);
      setSpot(100);
      setDte(40);
      setIv(28);
    }
  };

  // ── Parameter Smoothing Loop ────────────────────────────────────────────────
  const [smoothProps, setSmoothProps] = useState({
    spot: 100,
    strike: 100,
    spreadWidth: 5,
    dte: TOTAL_DTE,
    iv: 30
  });

  const smoothPropsRef = useRef({
    spot: 100,
    strike: 100,
    spreadWidth: 5,
    dte: TOTAL_DTE,
    iv: 30
  });

  useEffect(() => {
    let rafId: number;

    const tick = () => {
      const current = smoothPropsRef.current;
      const target = { spot, strike, spreadWidth, dte, iv };

      const alpha = 0.22; // Smooth catch-up factor (22% per frame)
      const threshold = 0.005;

      let changed = false;
      const next = { ...current };

      // Interpolate Spot
      if (Math.abs(target.spot - current.spot) > threshold) {
        next.spot = current.spot + (target.spot - current.spot) * alpha;
        changed = true;
      } else {
        next.spot = target.spot;
      }

      // Interpolate Strike
      if (Math.abs(target.strike - current.strike) > threshold) {
        next.strike = current.strike + (target.strike - current.strike) * alpha;
        changed = true;
      } else {
        next.strike = target.strike;
      }

      // Interpolate Spread Width
      if (Math.abs(target.spreadWidth - current.spreadWidth) > threshold) {
        next.spreadWidth = current.spreadWidth + (target.spreadWidth - current.spreadWidth) * alpha;
        changed = true;
      } else {
        next.spreadWidth = target.spreadWidth;
      }

      // Interpolate DTE
      if (Math.abs(target.dte - current.dte) > threshold) {
        next.dte = current.dte + (target.dte - current.dte) * alpha;
        changed = true;
      } else {
        next.dte = target.dte;
      }

      // Interpolate IV
      if (Math.abs(target.iv - current.iv) > threshold) {
        next.iv = current.iv + (target.iv - current.iv) * alpha;
        changed = true;
      } else {
        next.iv = target.iv;
      }

      if (changed) {
        smoothPropsRef.current = next;
        setSmoothProps(next);
        rafId = requestAnimationFrame(tick);
      } else {
        smoothPropsRef.current = target;
        setSmoothProps(target);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [spot, strike, spreadWidth, dte, iv]);

  // Strategy name to Node ID map for suitability checks
  const strategyIdMap = useMemo<Record<string, string>>(() => ({
    "Long Call": "long-call",
    "Long Put": "long-put",
    "Bull Call Spread": "bull-call",
    "Bear Put Spread": "bear-put",
    "Long Straddle": "straddle",
    "Iron Condor": "iron-condor"
  }), []);

  const suitabilityResult = useMemo(() => {
    const id = strategyIdMap[strategy] || "long-call";
    return evaluateStrategySuitability(id, activeAsset);
  }, [strategy, activeAsset, strategyIdMap]);

  // Calculate metrics and chart data using smooth properties
  const metrics = useMemo(() => {
    return computeDynamicMetrics(
      strategy,
      smoothProps.spot,
      smoothProps.strike,
      smoothProps.dte,
      smoothProps.iv,
      initialSpot,
      initialIv,
      smoothProps.spreadWidth
    );
  }, [strategy, smoothProps.spot, smoothProps.strike, smoothProps.dte, smoothProps.iv, initialSpot, initialIv, smoothProps.spreadWidth]);

  const chartData = useMemo(() => {
    return buildDynamicChartSnapshot(
      strategy,
      smoothProps.spot,
      smoothProps.strike,
      smoothProps.dte,
      smoothProps.iv,
      initialSpot,
      initialIv,
      smoothProps.spreadWidth,
      comparisonStrategy || undefined
    );
  }, [strategy, smoothProps.spot, smoothProps.strike, smoothProps.dte, smoothProps.iv, initialSpot, initialIv, smoothProps.spreadWidth, comparisonStrategy]);

  // Derived Greek values scaled to contract sizes (* Quantity)
  const rawTotalDelta = metrics.delta * quantity;
  const theoreticalHedgeShares = autoHedge ? -rawTotalDelta * 100 : 0;
  const roundedHedgeShares = Math.round(theoreticalHedgeShares);
  const totalDelta = autoHedge ? rawTotalDelta + (roundedHedgeShares / 100) : rawTotalDelta;
  
  const totalGamma = metrics.gamma * quantity;
  const totalTheta = metrics.theta * quantity;
  const totalVega = metrics.vega * quantity;

  // ── Survivability Corridor Breakevens ──────────────────────────────────────
  const breakevens = useMemo(() => {
    const netCost = computeDynamicMetrics(strategy, initialSpot, smoothProps.strike, TOTAL_DTE, smoothProps.iv, initialSpot, initialIv, smoothProps.spreadWidth).pnl; // entry value
    const cost = Math.abs(netCost);
    if (strategy === "Long Call") {
      return [smoothProps.strike + cost];
    } else if (strategy === "Long Put") {
      return [smoothProps.strike - cost];
    } else if (strategy === "Bull Call Spread") {
      return [smoothProps.strike + cost];
    } else if (strategy === "Bear Put Spread") {
      return [smoothProps.strike - cost];
    } else if (strategy === "Long Straddle") {
      return [smoothProps.strike - cost, smoothProps.strike + cost];
    } else if (strategy === "Iron Condor") {
      const credit = cost; // net credit received
      return [smoothProps.strike - smoothProps.spreadWidth - credit, smoothProps.strike + smoothProps.spreadWidth + credit];
    }
    return [];
  }, [strategy, smoothProps.strike, smoothProps.spreadWidth, initialSpot, initialIv, smoothProps.iv]);

  // Is spot in profitable range?
  const isProfitable = metrics.pnl >= 0;

  // Visual Atmosphere colors based on shock or IV
  const ambientGradient = useMemo(() => {
    if (activeShock === "Earnings Crush") {
      return "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(96,165,250,0.12) 0%, transparent 70%)";
    }
    if (activeShock === "Macro Panic") {
      return "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(251,146,60,0.15) 0%, transparent 70%)";
    }
    if (smoothProps.iv > 50) {
      return "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(168,85,247,0.08) 0%, transparent 60%)";
    }
    return "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(0,212,255,0.05) 0%, transparent 65%)";
  }, [activeShock, smoothProps.iv]);

  const strategyColor = useMemo(() => {
    if (strategy.includes("Call")) return "#00d4ff"; // Cyan
    if (strategy.includes("Put")) return "#ff4d6a";  // Crimson
    if (strategy === "Long Straddle") return "#a855f7"; // Purple
    return "#00e5a0"; // Emerald for Iron Condor
  }, [strategy]);

  const compColor = useMemo(() => {
    if (!comparisonStrategy) return "#ffffff";
    if (comparisonStrategy.includes("Call")) return "#38bdf8";
    if (comparisonStrategy.includes("Put")) return "#fb923c";
    return "#a855f7";
  }, [comparisonStrategy]);

  // Monospace Telemetry Logs
  const telemetryLogs = useMemo(() => {
    const logs = [
      `SYS_READY: Options Mechanics Engine active`,
      `UNDERLYING_SPOT: $${smoothProps.spot.toFixed(2)} | VOLATILITY: ${smoothProps.iv.toFixed(1)}%`,
      `STRUCTURE: ${strategy} (Qty: ${quantity}) | STRIKE: ${smoothProps.strike}`,
    ];

    if (smoothProps.spreadWidth && (strategy.includes("Spread") || strategy === "Iron Condor")) {
      logs.push(`SPREAD_GEOMETRY: width ${smoothProps.spreadWidth} points`);
    }

    // Add Greek specific telemetry
    logs.push(`PORTFOLIO_EXPOSURE: Delta = ${totalDelta.toFixed(2)} | Vega = $${totalVega.toFixed(1)}`);
    logs.push(`SURVIVABILITY: Profit probability currently at ${metrics.pop}%`);

    if (activeShock) {
      logs.push(`ALERT: Volatility shock [${activeShock}] in progress...`);
      logs.push(`ATMOSPHERE_DISTORTION: Extrinsic premiums repricing`);
    } else if (smoothProps.dte <= 7) {
      logs.push(`THETA_CRITICAL: non-linear decay zone active. Expiry imminent`);
    } else if (smoothProps.dte <= 21) {
      logs.push(`THETA_ACCELERATING: extrinsic premium eroding daily`);
    } else {
      logs.push(`TEMPORAL_FLOW: Observation state steady`);
    }

    return logs;
  }, [strategy, smoothProps.spot, smoothProps.strike, smoothProps.spreadWidth, smoothProps.dte, smoothProps.iv, quantity, totalDelta, totalVega, metrics.pop, activeShock]);

  // Click-out detection for comparison dropdown
  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        isCompareMenuOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !(event.target as Element).closest(".compare-trigger")
      ) {
        setIsCompareMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isCompareMenuOpen]);

  return (
    <div className="flex-1 min-h-0 flex flex-col relative bg-black select-none text-white">
      {/* Cinematic Ambient Atmosphere */}
      <motion.div
        className="absolute inset-0 pointer-events-none z-0 transition-all duration-1000"
        style={{ background: ambientGradient }}
      />
      <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none z-0" />

      {/* Volatility Shock Wave Flash */}
      <AnimatePresence>
        {shockWave && (
          <motion.div
            initial={{ opacity: 0.6 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 z-50 pointer-events-none mix-blend-screen"
            style={{
              background: activeShock === "Earnings Crush"
                ? "radial-gradient(circle, rgba(96,165,250,0.4) 0%, rgba(3,5,10,0) 80%)"
                : "radial-gradient(circle, rgba(251,146,60,0.4) 0%, rgba(3,5,10,0) 80%)"
            }}
          />
        )}
      </AnimatePresence>

      {/* ── SUB-TAB NAVIGATION ── */}
      <div className="flex px-6 border-b border-white/5 bg-[#05070a]/90 backdrop-blur-md shrink-0 z-20 font-mono text-[10px] relative">
        <button className="px-4 py-2.5 font-bold border-b-2 border-cyan-400 text-cyan-400 transition-all">
          STRATEGY CONSTRUCTOR
        </button>
        <button className="px-4 py-2.5 font-bold border-b-2 border-transparent text-white/40 hover:text-white/80 transition-all">
          SCENARIO MATRIX
        </button>
        <button className="px-4 py-2.5 font-bold border-b-2 border-transparent text-white/40 hover:text-white/80 transition-all">
          SAVED STRATEGIES
        </button>
      </div>

      {/* ── Outer Laboratory Layout ── */}
      <div className="relative z-10 flex-1 grid grid-cols-[300px_1fr_320px] divide-x divide-white/5 overflow-hidden">

        {/* ── LEFT PANEL: Position Constructor ── */}
        <div className="flex flex-col gap-5 p-5 overflow-y-auto min-w-0 bg-[#03050a]/60 backdrop-blur-md">
          <div>
            <span className="text-[9px] font-mono text-cyan-400 tracking-[0.25em] uppercase block mb-1">Construct</span>
            <h3 className="text-sm font-bold tracking-tight text-white/90">Position Constructor</h3>
          </div>

          {/* Strategy Selector */}
          <div className="flex flex-col gap-2">
            <label className="text-[8px] font-mono text-white/30 uppercase tracking-widest">Select Strategy</label>
            <div className="grid grid-cols-2 gap-1.5">
              {["Long Call", "Long Put", "Bull Call Spread", "Bear Put Spread", "Long Straddle", "Iron Condor"].map(s => {
                const active = strategy === s;
                return (
                  <button
                    key={s}
                    onClick={() => {
                      setStrategy(s);
                      setComparisonStrategy(null);
                    }}
                    className={`px-2 py-2 rounded-lg text-left transition-all text-[9.5px] font-mono border ${
                      active
                        ? "bg-white/10 text-white border-white/20 shadow-md font-bold"
                        : "bg-white/3 border-white/5 text-white/50 hover:bg-white/5 hover:border-white/10 hover:text-white/80"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{
                          background: s.includes("Call") ? "#00d4ff" : s.includes("Put") ? "#ff4d6a" : s === "Long Straddle" ? "#a855f7" : "#00e5a0",
                          boxShadow: active ? `0 0 6px ${s.includes("Call") ? "#00d4ff" : s.includes("Put") ? "#ff4d6a" : s === "Long Straddle" ? "#a855f7" : "#00e5a0"}` : "none"
                        }}
                      />
                      <span className="truncate">{s}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="h-px bg-white/5" />

          {/* Tactile Sliders */}
          <div className="flex flex-col gap-4">
            {/* Spot Price Slider */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-[8px] font-mono uppercase tracking-widest text-white/40">
                <span>Spot Price</span>
                <span className="text-white font-bold">${spot.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="75"
                max="125"
                step="0.5"
                value={spot}
                onChange={e => setSpot(parseFloat(e.target.value))}
                className="w-full h-1 bg-white/8 rounded-lg appearance-none cursor-pointer accent-white"
              />
            </div>

            {/* Strike Price Slider */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-[8px] font-mono uppercase tracking-widest text-white/40">
                <span>Strike Price</span>
                <span className="text-white font-bold">${strike}</span>
              </div>
              <input
                type="range"
                min="85"
                max="115"
                step="1"
                value={strike}
                onChange={e => setStrike(parseInt(e.target.value))}
                className="w-full h-1 bg-white/8 rounded-lg appearance-none cursor-pointer accent-white"
              />
            </div>

            {/* Spread Width Slider (conditionally rendered) */}
            {(strategy.includes("Spread") || strategy === "Iron Condor") && (
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[8px] font-mono uppercase tracking-widest text-white/40">
                  <span>Spread Width</span>
                  <span className="text-white font-bold">{spreadWidth} pts</span>
                </div>
                <input
                  type="range"
                  min="2.5"
                  max="15"
                  step="0.5"
                  value={spreadWidth}
                  onChange={e => setSpreadWidth(parseFloat(e.target.value))}
                  className="w-full h-1 bg-white/8 rounded-lg appearance-none cursor-pointer accent-white"
                />
              </div>
            )}

            {/* Continuous Volatility Slider */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-[8px] font-mono uppercase tracking-widest text-white/40">
                <span>Implied Vol (IV)</span>
                <span className="text-white font-bold">{iv.toFixed(1)}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="0.5"
                value={iv}
                onChange={e => setIv(parseFloat(e.target.value))}
                className="w-full h-1 bg-white/8 rounded-lg appearance-none cursor-pointer accent-white"
              />
            </div>

            {/* Contract Sizing (Quantity) */}
            <div className="flex flex-col gap-2">
              <label className="text-[8px] font-mono text-white/30 uppercase tracking-widest">Contract Size</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="w-8 h-8 rounded-lg border border-white/5 bg-white/3 flex items-center justify-center font-bold text-white/70 hover:bg-white/5 active:bg-white/10"
                >
                  -
                </button>
                <div className="flex-1 h-8 rounded-lg border border-white/5 bg-black/40 flex items-center justify-center font-mono text-xs font-bold">
                  {quantity} contract{quantity > 1 ? "s" : ""}
                </div>
                <button
                  onClick={() => setQuantity(q => Math.min(10, q + 1))}
                  className="w-8 h-8 rounded-lg border border-white/5 bg-white/3 flex items-center justify-center font-bold text-white/70 hover:bg-white/5 active:bg-white/10"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div className="h-px bg-white/5" />

          {/* Sizing & Presets Section */}
          <div className="flex flex-col gap-2.5">
            <label className="text-[8px] font-mono text-white/30 uppercase tracking-widest">Scenario Presets</label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => loadPreset("long_vol")}
                className="flex flex-col gap-0.5 px-2.5 py-2 rounded-lg border border-purple-500/10 bg-purple-500/5 text-left hover:bg-purple-500/10 hover:border-purple-500/20 transition-all cursor-pointer"
              >
                <span className="text-[9px] font-bold text-purple-400">Straddle Surge</span>
                <span className="text-[7.5px] text-white/40 uppercase tracking-wider">Long Volatility</span>
              </button>

              <button
                onClick={() => loadPreset("income")}
                className="flex flex-col gap-0.5 px-2.5 py-2 rounded-lg border border-emerald-500/10 bg-emerald-500/5 text-left hover:bg-emerald-500/10 hover:border-emerald-500/20 transition-all cursor-pointer"
              >
                <span className="text-[9px] font-bold text-emerald-400">Condor Income</span>
                <span className="text-[7.5px] text-white/40 uppercase tracking-wider">Range Capture</span>
              </button>

              <button
                onClick={() => loadPreset("leveraged")}
                className="flex flex-col gap-0.5 px-2.5 py-2 rounded-lg border border-cyan-500/10 bg-cyan-500/5 text-left hover:bg-cyan-500/10 hover:border-cyan-500/20 transition-all cursor-pointer"
              >
                <span className="text-[9px] font-bold text-cyan-400">Bull Spread</span>
                <span className="text-[7.5px] text-white/40 uppercase tracking-wider">Cheap Premium</span>
              </button>

              <button
                onClick={() => loadPreset("bearish")}
                className="flex flex-col gap-0.5 px-2.5 py-2 rounded-lg border border-rose-500/10 bg-rose-500/5 text-left hover:bg-rose-500/10 hover:border-rose-500/20 transition-all cursor-pointer"
              >
                <span className="text-[9px] font-bold text-rose-400">Hedged Put</span>
                <span className="text-[7.5px] text-white/40 uppercase tracking-wider">Protection</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── CENTER VIEWPORT: Market Physics Simulation ── */}
        <div className="flex-1 flex flex-col overflow-hidden relative">

          {/* Viewport Header Controls */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0 z-10 bg-black/40 backdrop-blur-md">
            <div>
              <span className="text-[9px] font-mono text-cyan-400 tracking-[0.25em] uppercase block mb-0.5">Synthetic Simulation</span>
              <h2 className="text-base font-bold text-white tracking-tight">Strategy Physics Lab</h2>
            </div>

            {/* Comparison Setup */}
            <div className="relative">
              {comparisonStrategy ? (
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 text-sky-400 font-mono text-[9px] uppercase tracking-widest">
                  <span>vs {comparisonStrategy}</span>
                  <button
                    onClick={() => setComparisonStrategy(null)}
                    className="hover:text-white transition-colors cursor-pointer font-bold text-[10px]"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div>
                  <button
                    onClick={() => setIsCompareMenuOpen(prev => !prev)}
                    className="compare-trigger text-[9px] uppercase tracking-widest font-mono text-white/50 hover:text-white/80 transition-colors px-2.5 py-1.5 rounded-lg border border-white/10 hover:border-white/20 bg-white/3 cursor-pointer"
                  >
                    Compare Option
                  </button>

                  {isCompareMenuOpen && (
                    <div
                      ref={dropdownRef}
                      className="absolute right-0 mt-2 w-48 rounded-xl border border-white/10 bg-black/95 backdrop-blur-md p-1.5 flex flex-col gap-0.5 z-50 shadow-2xl"
                    >
                      <div className="text-[7px] uppercase tracking-widest font-mono text-white/25 px-2 py-1 select-none border-b border-white/5 mb-1">
                        Compare Target
                      </div>
                      {["Long Call", "Long Put", "Bull Call Spread", "Bear Put Spread", "Long Straddle", "Iron Condor"]
                        .filter(s => s !== strategy)
                        .map(s => (
                          <button
                            key={s}
                            onClick={() => {
                              setComparisonStrategy(s);
                              setIsCompareMenuOpen(false);
                            }}
                            className="w-full text-left px-2 py-1 rounded-lg font-mono text-[9px] text-white/60 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                          >
                            {s}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Main Payoff Chart */}
          <div className="flex-1 p-6 relative min-h-0 z-0">
            {/* Ambient charts wrapper background */}
            <div className="absolute inset-0 rounded-2xl border border-white/5 overflow-hidden bg-black/30">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 25, right: 30, bottom: 20, left: 30 }}>
                  <XAxis
                    dataKey="price"
                    tick={{ fill: "rgba(255,255,255,0.22)", fontSize: 10, fontFamily: "monospace" }}
                    tickLine={false}
                    axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
                    tickFormatter={(v) => `$${v}`}
                    type="number"
                    domain={[smoothProps.strike - 30, smoothProps.strike + 30]}
                  />
                  <YAxis
                    tick={{ fill: "rgba(255,255,255,0.22)", fontSize: 10, fontFamily: "monospace" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v >= 0 ? "+" : ""}$${v}`}
                  />
                  <Tooltip content={<PayoffTooltip />} />

                  {/* Horizontal Breakeven/Zero line */}
                  <ReferenceLine y={0} stroke="rgba(255,255,255,0.13)" strokeDasharray="3 3" />

                  {/* Dynamic Vertical Spot reference line */}
                  <ReferenceLine x={smoothProps.spot} stroke="#00e5a0" strokeWidth={1.5} label={{ value: "Spot", fill: "#00e5a0", fontSize: 9, fontFamily: "monospace", position: "top" }} />

                  {/* Dynamic Vertical Strike reference line */}
                  <ReferenceLine x={smoothProps.strike} stroke="rgba(255,255,255,0.25)" strokeDasharray="5 5" label={{ value: "Strike", fill: "rgba(255,255,255,0.4)", fontSize: 9, fontFamily: "monospace", position: "top" }} />

                  {/* Uncertainty Band (Vol cone fill) */}
                  <Area
                    type="monotone"
                    dataKey="upperA"
                    stroke="none"
                    fill={`url(#theta-band-upper)`}
                    fillOpacity={0.06 + (smoothProps.iv / 100) * 0.12}
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="lowerA"
                    stroke="none"
                    fill={`url(#theta-band-lower)`}
                    fillOpacity={0.04 + (smoothProps.iv / 100) * 0.08}
                    isAnimationActive={false}
                  />

                  {/* Strategy B payoff curve */}
                  {comparisonStrategy && (
                    <Line
                      type="monotone"
                      dataKey="currentB"
                      name={comparisonStrategy}
                      stroke={compColor}
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={false}
                      isAnimationActive={false}
                    />
                  )}

                  {/* Strategy A payoff curve */}
                  <Line
                    type="monotone"
                    dataKey="currentA"
                    name={strategy}
                    stroke={strategyColor}
                    strokeWidth={2.2}
                    dot={false}
                    isAnimationActive={false}
                  />

                  {/* Gradients */}
                  <defs>
                    <linearGradient id="theta-band-upper" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="theta-band-lower" x1="0" y1="1" x2="0" y2="0">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity={0.08} />
                      <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                </ComposedChart>
              </ResponsiveContainer>

              {/* Chart Legend */}
              <div className="absolute top-4 right-6 flex items-center gap-4 bg-black/50 px-3 py-1.5 rounded-lg border border-white/5 backdrop-blur-sm">
                <div className="flex items-center gap-1.5 text-[9px] font-mono text-white/50">
                  <span className="w-3 h-1.5 inline-block opacity-40 rounded bg-white" /> Uncertainty Band
                </div>
                <div className="flex items-center gap-1.5 text-[9px] font-mono" style={{ color: strategyColor }}>
                  <span className="w-4 h-0.5 inline-block" style={{ background: strategyColor }} /> {strategy}
                </div>
                {comparisonStrategy && (
                  <div className="flex items-center gap-1.5 text-[9px] font-mono" style={{ color: compColor }}>
                    <span className="w-4 h-px border-t border-dashed inline-block" style={{ borderColor: compColor }} /> {comparisonStrategy}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── BOTTOM LAYER: Timeline Scrubber & Vol Shocks ── */}
          <div className="p-6 pt-0 shrink-0 flex flex-col gap-4 border-t border-white/5 bg-black/40 backdrop-blur-md z-10">

            {/* Scrubber Controls */}
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={() => setIsPlaying(p => !p)}
                className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center bg-white/5 hover:bg-white/10 active:bg-white/15 cursor-pointer text-white/80"
              >
                {isPlaying ? <Pause size={12} /> : <Play size={12} />}
              </button>

              <button
                onClick={resetTimeline}
                className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center bg-white/5 hover:bg-white/10 active:bg-white/15 cursor-pointer text-white/40 hover:text-white/60"
              >
                <RotateCcw size={12} />
              </button>

              <div className="flex gap-0.5 border border-white/5 bg-white/3 rounded-lg p-0.5">
                {([1, 2, 4] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setSpeed(s)}
                    className={`text-[8.5px] font-mono px-2 py-1 rounded transition-all cursor-pointer ${
                      speed === s ? "bg-white/10 text-white font-bold" : "text-white/40 hover:text-white/70"
                    }`}
                  >
                    {s}×
                  </button>
                ))}
              </div>

              {/* Slider Track */}
              <div className="flex-1 flex items-center gap-3 relative select-none">
                <span className="text-[9px] font-mono text-white/30">45d</span>
                <input
                  type="range"
                  min="0"
                  max="45"
                  step="1"
                  value={dte}
                  onChange={e => {
                    setDte(parseInt(e.target.value));
                    setIsPlaying(false);
                  }}
                  className="flex-grow h-1 bg-white/8 rounded-lg appearance-none cursor-ew-resize accent-white"
                />
                <span className="text-[9px] font-mono text-white/30">0d</span>
              </div>

              {/* DTE Readout */}
              <div className="text-right flex items-baseline gap-1 bg-white/3 px-3 py-1 rounded-lg border border-white/5 font-mono min-w-[70px] justify-center">
                <span className="text-xs font-bold text-white tracking-wider">{dte}</span>
                <span className="text-[8px] text-white/40">DTE</span>
              </div>
            </div>

            {/* Volatility Shock System Triggers */}
            <div className="flex flex-col gap-2">
              <label className="text-[8px] font-mono text-white/35 uppercase tracking-widest">Volatility Shock System</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => triggerShock("Earnings Crush", 15)}
                  className="flex-1 py-2 px-3 rounded-xl border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 hover:border-blue-500/40 text-[9px] font-mono font-bold text-blue-400 tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Flame size={11} className="animate-pulse" />
                  Earnings Crush (-IV)
                </button>

                <button
                  onClick={() => triggerShock("Macro Panic", 75, spot - 8)}
                  className="flex-1 py-2 px-3 rounded-xl border border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10 hover:border-orange-500/40 text-[9px] font-mono font-bold text-orange-400 tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <AlertCircle size={11} className="animate-bounce" />
                  Macro Panic (+IV)
                </button>

                <button
                  onClick={() => triggerShock("Vol Compression", 20)}
                  className="flex-1 py-2 px-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/10 hover:border-cyan-500/40 text-[9px] font-mono font-bold text-cyan-400 tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Activity size={11} />
                  Compression (Decay)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL: Intelligence + Telemetry ── */}
        <div className="w-[320px] flex flex-col gap-5 p-5 overflow-y-auto bg-[#03050a]/60 backdrop-blur-md">
          <div>
            <span className="text-[9px] font-mono text-cyan-400 tracking-[0.25em] uppercase block mb-1">Physics Telemetry</span>
            <h3 className="text-sm font-bold tracking-tight text-white/90">Exposure Analysis</h3>
          </div>

          {/* Regime Suitability Scorecard */}
          <div className="bg-black/45 border border-white/5 rounded-xl p-4 font-mono text-[9px] flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-white/30 uppercase tracking-widest text-[8px]">Regime Suitability</span>
              
              {/* Suitability Badge */}
              {(() => {
                const labels = {
                  HIGHLY_FAVORED: { text: "HIGHLY RESILIENT", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
                  FAVORED: { text: "FAVORED GEOMETRY", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/15" },
                  NEUTRAL: { text: "NEUTRAL ALIGN", color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/15" },
                  VULNERABLE: { text: "VULNERABLE LIMIT", color: "text-rose-400 bg-rose-500/10 border-rose-500/15" },
                  HIGHLY_VULNERABLE: { text: "CRITICAL MISMATCH", color: "text-rose-400 bg-rose-500/10 border-rose-500/20" }
                };
                const meta = labels[suitabilityResult.suitability] || labels.NEUTRAL;
                return (
                  <span className={`px-2 py-0.5 rounded border text-[8px] font-bold ${meta.color}`}>
                    {meta.text}
                  </span>
                );
              })()}
            </div>

            {/* Ingested Asset Selectors */}
            <div className="space-y-1">
              <span className="text-white/30 text-[8px] uppercase tracking-wider">Reference Feed:</span>
              <div className="grid grid-cols-5 gap-1 font-bold text-[8.5px]">
                {["SPY", "AAPL", "NVDA", "TSLA", "IWM"].map((tk) => (
                  <button
                    key={tk}
                    onClick={() => setSelectedTicker(tk)}
                    className={`py-1 rounded border text-center transition-all cursor-pointer ${
                      selectedTicker === tk
                        ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                        : "bg-white/3 border-white/5 text-white/40 hover:text-white/80"
                    }`}
                  >
                    {tk}
                  </button>
                ))}
              </div>
            </div>

            {/* Suitability score bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[8px]">
                <span className="text-white/40">COMPATIBILITY SCORE:</span>
                <span className="text-white font-bold">{suitabilityResult.score}/100</span>
              </div>
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-1000"
                  style={{ 
                    width: `${suitabilityResult.score}%`,
                    backgroundColor: suitabilityResult.score >= 65 ? "#00e5a0" : suitabilityResult.score < 40 ? "#ff4d6a" : "#00d4ff",
                    boxShadow: `0 0 6px ${suitabilityResult.score >= 65 ? "#00e5a0" : suitabilityResult.score < 40 ? "#ff4d6a" : "#00d4ff"}`
                  }}
                />
              </div>
            </div>

            {/* Explanation */}
            <div className="text-white/60 leading-relaxed text-[8.5px] p-2 bg-white/3 border border-white/5 rounded">
              {suitabilityResult.reason}
            </div>

            {/* Warning notes */}
            <div className="flex gap-1.5 items-start text-white/50 text-[8px]">
              {suitabilityResult.suitability.includes("VULNERABLE") ? (
                <ShieldAlert size={11} className="text-rose-400 shrink-0 mt-0.5 animate-pulse" />
              ) : (
                <ShieldCheck size={11} className="text-emerald-400 shrink-0 mt-0.5" />
              )}
              <span>{suitabilityResult.greeksWarning}</span>
            </div>
          </div>

          {/* Dynamic Greeks Panel */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-[8px] font-mono text-white/30 uppercase tracking-widest">Greek Exposures</label>
              <button
                onClick={() => setAutoHedge(!autoHedge)}
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[8px] font-mono uppercase transition-colors ${
                  autoHedge
                    ? "border-[#00d4ff] text-[#00d4ff] bg-[#00d4ff]/10"
                    : "border-white/10 text-white/40 hover:text-white hover:border-white/20"
                }`}
              >
                <span className={`w-1 h-1 rounded-full ${autoHedge ? "bg-[#00d4ff] shadow-[0_0_6px_#00d4ff] animate-pulse" : "bg-gray-500"}`} />
                Auto-Hedge Δ
              </button>
            </div>

            {/* Delta */}
            <GreekCard
              label="Delta"
              value={totalDelta}
              unit="shares"
              description="Price Sensitivity"
              interpretation={
                autoHedge
                  ? `Hedged with ${roundedHedgeShares} shares (Exact: ${theoreticalHedgeShares.toFixed(2)}). Residual risk: ${(totalDelta * 100).toFixed(1)} shares.`
                  : totalDelta > 0.1
                  ? `Bullish exposure. Matches holding ${Math.round(totalDelta * 100)} shares of underlying stock.`
                  : totalDelta < -0.1
                  ? `Bearish exposure. Matches shorting ${Math.round(Math.abs(totalDelta) * 100)} shares.`
                  : `Delta neutral. Insensitive to small asset price fluctuations.`
              }
              color="#00d4ff"
              glowColor="rgba(0,212,255,0.15)"
              min={-2}
              max={2}
            />

            {/* Gamma */}
            <GreekCard
              label="Gamma"
              value={totalGamma}
              unit="Δ/spot"
              description="Curvature Risk"
              interpretation={
                totalGamma > 0.005
                  ? `Positive curvature. Delta will rapidly move in your direction on price swings.`
                  : totalGamma < -0.005
                  ? `Negative curvature. Position exposed to sudden gaps against directional bias.`
                  : `Low curvature. Position path is highly linear.`
              }
              color="#a855f7"
              glowColor="rgba(168,85,247,0.15)"
              min={-0.05}
              max={0.05}
            />

            {/* Theta */}
            <GreekCard
              label="Theta"
              value={totalTheta}
              unit="$/day"
              description="Temporal Decay"
              interpretation={
                totalTheta < -1
                  ? `Time decay eroding $${Math.abs(totalTheta).toFixed(1)} of premium per calendar day.`
                  : totalTheta > 1
                  ? `Positive decay yielding $${totalTheta.toFixed(1)} of income daily.`
                  : `Decay neutral. Minimal temporal premium sensitivity.`
              }
              color="#ff4d6a"
              glowColor="rgba(255,77,106,0.15)"
              min={-150}
              max={150}
            />

            {/* Vega */}
            <GreekCard
              label="Vega"
              value={totalVega}
              unit="$/1% IV"
              description="Volatility Sensitivity"
              interpretation={
                totalVega > 1
                  ? `Long Vega. Position gains $${totalVega.toFixed(1)} per 1% implied volatility expansion.`
                  : totalVega < -1
                  ? `Short Vega. Gains $${Math.abs(totalVega).toFixed(1)} per 1% implied volatility crush.`
                  : `Vega neutral. Insensitive to implied volatility movements.`
              }
              color="#00e5a0"
              glowColor="rgba(0,229,160,0.15)"
              min={-100}
              max={100}
            />
          </div>

          <div className="h-px bg-white/5" />

          {/* Survivability Corridor Component */}
          <div className="bg-black/30 border border-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[9px] font-mono uppercase tracking-widest text-white/40">Survivability Corridor</span>
              <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full ${isProfitable ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"}`}>
                {isProfitable ? "Profitable" : "Loss Zone"}
              </span>
            </div>

            {/* Dynamic visual corridor visualization */}
            <div className="relative h-6 bg-white/5 rounded-lg border border-white/10 flex items-center justify-center overflow-hidden">
              {/* Highlight profitable ranges on the corridor */}
              {(() => {
                // Approximate coordinate ranges representing breakeven boundaries visually
                // Strike is centered at 50%. Standard corridor goes from strike - 30 to strike + 30.
                if (strategy === "Long Call") {
                  const bePos = 50 + ((breakevens[0] - smoothProps.strike) / 30) * 50;
                  return (
                    <div className="absolute right-0 top-0 bottom-0 bg-emerald-500/10 border-l border-emerald-500/30" style={{ left: `${bePos}%` }} />
                  );
                } else if (strategy === "Long Put") {
                  const bePos = 50 - ((smoothProps.strike - breakevens[0]) / 30) * 50;
                  return (
                    <div className="absolute left-0 top-0 bottom-0 bg-emerald-500/10 border-r border-emerald-500/30" style={{ right: `${100 - bePos}%` }} />
                  );
                } else if (strategy === "Bull Call Spread") {
                  const bePos = 50 + ((breakevens[0] - smoothProps.strike) / 30) * 50;
                  return (
                    <div className="absolute right-0 top-0 bottom-0 bg-emerald-500/10 border-l border-emerald-500/30" style={{ left: `${bePos}%` }} />
                  );
                } else if (strategy === "Bear Put Spread") {
                  const bePos = 50 - ((smoothProps.strike - breakevens[0]) / 30) * 50;
                  return (
                    <div className="absolute left-0 top-0 bottom-0 bg-emerald-500/10 border-r border-emerald-500/30" style={{ right: `${100 - bePos}%` }} />
                  );
                } else if (strategy === "Long Straddle") {
                  const loPos = 50 - ((smoothProps.strike - breakevens[0]) / 30) * 50;
                  const hiPos = 50 + ((breakevens[1] - smoothProps.strike) / 30) * 50;
                  return (
                    <>
                      <div className="absolute left-0 top-0 bottom-0 bg-emerald-500/10 border-r border-emerald-500/30" style={{ right: `${100 - loPos}%` }} />
                      <div className="absolute right-0 top-0 bottom-0 bg-emerald-500/10 border-l border-emerald-500/30" style={{ left: `${hiPos}%` }} />
                    </>
                  );
                } else if (strategy === "Iron Condor") {
                  const loPos = 50 - ((smoothProps.strike - breakevens[0]) / 30) * 50;
                  const hiPos = 50 + ((breakevens[1] - smoothProps.strike) / 30) * 50;
                  return (
                    <div className="absolute top-0 bottom-0 bg-emerald-500/10 border-l border-r border-emerald-500/20" style={{ left: `${loPos}%`, right: `${100 - hiPos}%` }} />
                  );
                }
                return null;
              })()}

              {/* Spot reference cursor */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 z-10"
                style={{ left: `${50 + ((smoothProps.spot - smoothProps.strike) / 30) * 50}%`, boxShadow: "0 0 8px #00d4ff" }}
              />

              <span className="text-[8.5px] font-mono text-white/30 uppercase tracking-widest relative z-20 pointer-events-none">
                {breakevens.length > 0 ? breakevens.map(b => `$${b.toFixed(1)}`).join(" | ") : "no breakeven"}
              </span>
            </div>
            <div className="flex justify-between text-[7.5px] font-mono text-white/20 mt-1.5 uppercase tracking-widest">
              <span>Bearish (-30p)</span>
              <span>Strike</span>
              <span>Bullish (+30p)</span>
            </div>
          </div>

          <div className="h-px bg-white/5 shrink-0" />

          {/* Monospace Telemetry Narrator */}
          <div className="bg-black/50 border border-white/5 rounded-xl p-4 font-mono text-[9px] leading-relaxed relative overflow-hidden shrink-0 flex-1 flex flex-col justify-between min-h-[140px]">
            <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
                 style={{ backgroundImage: "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)", backgroundSize: "8px 8px" }} />

            <div className="flex items-center justify-between mb-2 pb-1 border-b border-white/5 shrink-0">
              <span className="text-[7.5px] uppercase tracking-widest text-white/35 font-bold">Lab Telemetry</span>
              <motion.span
                className="w-1.5 h-1.5 rounded-full bg-emerald-500"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.8, repeat: Infinity }}
              />
            </div>

            <div className="flex-1 flex flex-col gap-1 text-white/50 min-h-0 overflow-y-auto">
              {telemetryLogs.map((log, idx) => (
                <div key={idx} className="truncate">
                  <span className="text-white/25">&gt;</span> {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
