// ============================================================================
// OPTIXFLOW — Trade Intelligence Dashboard Viewport
// High-fidelity quant lab interface combining Thesis Constructor,
// Scenario Reality Simulator, Payoff Engine, and Quant Telemetry Console.
// ============================================================================

"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  RotateCcw,
  Compass,
  ShieldAlert,
  TrendingUp,
  TrendingDown,
  Cpu,
  Activity,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Terminal,
  Sliders,
  HelpCircle,
  Percent,
  Clock
} from "lucide-react";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip
} from "recharts";

import ThesisConstructor from "./ThesisConstructor";
import {
  ThesisInput,
  StrategyIntelResult,
  evaluateThesisIntel
} from "@/lib/market/TradeIntelEngine";
import {
  buildDynamicChartSnapshot,
  computeDynamicMetrics
} from "@/lib/finance/theta";

// Formatter helpers
const formatPrice = (v: number) => `$${v.toFixed(2)}`;
const formatXTick = (v: number) => `$${v.toFixed(0)}`;
const formatYTick = (v: number) => {
  if (v === 0) return "$0";
  const abs = Math.abs(v);
  const sign = v > 0 ? "+" : "-";
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}k`;
  return `${sign}$${abs.toFixed(0)}`;
};

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  originalY?: number;
}

export default function TradeIntelDashboard() {
  // Thesis state
  const [thesis, setThesis] = useState<ThesisInput>({
    direction: "bullish",
    magnitude: "moderate",
    horizon: 30,
    ivExpectation: "stable",
    riskAppetite: "defined"
  });

  // Simulator parameters
  const [spot, setSpot] = useState<number>(100);
  const [ivPercent, setIvPercent] = useState<number>(30);
  const [dte, setDte] = useState<number>(30);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeLogTab, setActiveLogTab] = useState<"ALL" | "ALIGN" | "WARN">("ALL");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Selected strategy state (defaults to top ranked)
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);

  // HTML5 Canvas reference for the particle background
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Evaluate thesis to get ranked strategy list
  const rankedStrategies = useMemo(() => {
    const evaluated = evaluateThesisIntel(thesis, spot);
    // Sort descending by score
    return [...evaluated].sort((a, b) => b.score - a.score);
  }, [thesis, spot]);

  // Sync selected strategy when rankings change
  const topStrategy = rankedStrategies[0];
  const selectedStrategy = useMemo(() => {
    if (!selectedStrategyId) return topStrategy;
    return rankedStrategies.find((s) => s.id === selectedStrategyId) || topStrategy;
  }, [rankedStrategies, selectedStrategyId, topStrategy]);

  // Set the selected strategy ID if it hasn't been set yet
  useEffect(() => {
    if (topStrategy && !selectedStrategyId) {
      setSelectedStrategyId(topStrategy.id);
    }
  }, [topStrategy, selectedStrategyId]);

  // Reset simulator to defaults when strategy shifts or user resets
  const handleResetSimulator = () => {
    setSpot(100);
    setIvPercent(thesis.ivExpectation === "expansion" ? 55 : thesis.ivExpectation === "crush" ? 15 : 30);
    setDte(thesis.horizon);
    setIsPlaying(false);
  };

  // Sync simulator controls with thesis changes
  useEffect(() => {
    setDte(thesis.horizon);
    setIvPercent(thesis.ivExpectation === "expansion" ? 55 : thesis.ivExpectation === "crush" ? 15 : 30);
    setSpot(100);
  }, [thesis.horizon, thesis.ivExpectation]);

  // Playback logic for DTE slider (ensures no skipped days)
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isPlaying) {
      timer = setInterval(() => {
        setDte((prevDte) => {
          if (prevDte <= 1) {
            setIsPlaying(false);
            return 1;
          }
          return prevDte - 1;
        });
      }, 400); // 400ms interval for smooth progression
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying]);

  // Calculate dynamic metrics for selected strategy
  const simulatorMetrics = useMemo(() => {
    if (!selectedStrategy) return null;
    return computeDynamicMetrics(
      selectedStrategy.name,
      spot,
      100, // strike
      dte,
      ivPercent,
      100, // initial spot
      30 // initial IV
    );
  }, [selectedStrategy, spot, dte, ivPercent]);

  // Payoff series coordinates for charting
  const chartData = useMemo(() => {
    if (!selectedStrategy) return [];
    const rawData = buildDynamicChartSnapshot(
      selectedStrategy.name,
      spot,
      100, // strike
      dte,
      ivPercent,
      100, // initial spot
      30, // initial IV
      5 // spread width
    );

    // Map to standard contracts dollar value (*100 multiplier)
    return rawData.map((d) => {
      const currentVal = d.currentA * 100;
      return {
        price: d.price,
        baseline: d.baselineA * 100,
        current: currentVal,
        upper: d.upperA * 100,
        lower: d.lowerA * 100,
        profit: Math.max(0, currentVal),
        loss: Math.min(0, currentVal)
      };
    });
  }, [selectedStrategy, spot, dte, ivPercent]);

  // Compute domain bounds for Y-Axis
  const yDomain = useMemo(() => {
    if (chartData.length === 0) return [-200, 200];
    const values = chartData.map((d) => d.current);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 100;
    const pad = range * 0.25;
    return [Math.floor((minVal - pad) / 50) * 50, Math.ceil((maxVal + pad) / 50) * 50];
  }, [chartData]);

  // Atmospheric Canvas Particle Effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    const maxParticles = 120;

    const handleResize = () => {
      if (!canvas) return;
      canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    // Determine particle color scheme by Vol regime
    const getColorsByRegime = () => {
      if (thesis.ivExpectation === "expansion") {
        return ["rgba(168, 85, 247, 0.4)", "rgba(236, 72, 153, 0.3)", "rgba(192, 132, 252, 0.2)"];
      } else if (thesis.ivExpectation === "crush") {
        return ["rgba(14, 165, 233, 0.4)", "rgba(3, 105, 161, 0.3)", "rgba(125, 211, 252, 0.2)"];
      } else {
        return ["rgba(6, 182, 212, 0.4)", "rgba(16, 185, 129, 0.3)", "rgba(34, 211, 238, 0.2)"];
      }
    };

    // Initial particle generator
    const colors = getColorsByRegime();
    for (let i = 0; i < maxParticles; i++) {
      const py = Math.random() * canvas.height;
      particles.push({
        x: Math.random() * canvas.width,
        y: py,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.2,
        size: Math.random() * 2.5 + 0.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: Math.random() * 0.5 + 0.1,
        originalY: py
      });
    }

    // Animation Loop
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Particle speed multipliers based on IV
      const speedMultiplier = (ivPercent / 30) * 1.5;
      // Expiry compression factor (DTE = 1 means particles collapse closer to vertical center)
      const dteCompression = dte / 45; 
      const centerY = canvas.height / 2;

      particles.forEach((p) => {
        // Apply IV speed
        p.x += p.vx * speedMultiplier;
        p.y += p.vy * speedMultiplier;

        // Apply DTE vertical compression
        if (p.originalY !== undefined) {
          const targetY = centerY + (p.originalY - centerY) * dteCompression;
          p.y += (targetY - p.y) * 0.05; // smooth drift towards compressed line
        }

        // Boundary wrap
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = ivPercent > 50 ? 5 : 0;
        ctx.fill();
      });

      // Draw subtle grid mesh lines in the background
      ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
      ctx.lineWidth = 0.5;
      const step = 60;
      for (let x = 0; x < canvas.width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [thesis.ivExpectation, ivPercent, dte]);

  // Format telemetry console logs
  const logsToDisplay = useMemo(() => {
    if (!mounted || !selectedStrategy) return [];
    
    // Base logs from engine
    const rawLogs = selectedStrategy.telemetryLogs || [];
    
    // Add simulated timestamp and format
    const formatted = rawLogs.map((logStr, idx) => {
      const isMismatch = logStr.includes("MISMATCH") || logStr.includes("WARNING");
      const isAlign = logStr.includes("ALIGN");
      let type: "ALIGN" | "WARN" | "INFO" = "INFO";
      if (isMismatch) type = "WARN";
      else if (isAlign) type = "ALIGN";

      return {
        id: `${selectedStrategy.id}-log-${idx}`,
        timestamp: new Date(Date.now() - (rawLogs.length - idx) * 10000)
          .toLocaleTimeString([], { hour12: false }),
        text: logStr,
        type
      };
    });

    // Filter based on selected tab
    if (activeLogTab === "ALIGN") {
      return formatted.filter((l) => l.type === "ALIGN");
    }
    if (activeLogTab === "WARN") {
      return formatted.filter((l) => l.type === "WARN");
    }
    return formatted;
  }, [selectedStrategy, activeLogTab]);

  return (
    <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden bg-[#020408] text-[var(--ox-text-primary)]">
      {/* Background Cinematic Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full z-0 pointer-events-none"
      />

      {/* Ticking HUD Header */}
      <div className="relative z-10 border-b border-white/5 bg-[#05070c]/50 backdrop-blur-md px-6 py-3 flex items-center justify-between shrink-0 font-mono text-[10px]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-cyan-400">
            <Activity size={12} className="animate-pulse" />
            <span className="font-bold tracking-widest uppercase">Optix Quantum Lab</span>
          </div>
          <span className="text-white/20">|</span>
          <span className="text-white/40 uppercase">Regime:</span>
          <span className={`font-bold uppercase ${
            thesis.ivExpectation === "expansion"
              ? "text-purple-400 font-glow-purple"
              : thesis.ivExpectation === "crush"
              ? "text-rose-400 font-glow-rose"
              : "text-emerald-400 font-glow-emerald"
          }`}>
            {thesis.ivExpectation === "expansion" ? "Uncertainty Expansion" : thesis.ivExpectation === "crush" ? "Premium Crash" : "Stable Volatility"}
          </span>
        </div>
        
        <div className="flex items-center gap-5 text-white/50">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-[9px] uppercase tracking-wider text-white/40">Market Engine</span>
            <span className="text-white font-bold">ONLINE</span>
          </div>
        </div>
      </div>

      {/* Main Viewport Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 p-5 min-h-0 relative z-10 overflow-y-auto lg:overflow-hidden">
        
        {/* Left Column: Thesis Constructor Cockpit (col-span-4 / 3) */}
        <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-4 h-full min-h-0 overflow-y-auto pr-0 lg:pr-1">
          <ThesisConstructor onChange={setThesis} />

          {/* Active Regime HUD */}
          <div className="bg-[#05070c]/90 border border-white/10 rounded-2xl p-4 shadow-xl flex flex-col gap-3 font-mono text-[10.5px]">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2 text-white/50">
              <Compass size={13} className="text-cyan-400" />
              <span className="text-[8.5px] uppercase tracking-wider font-bold">Regime Diagnostics</span>
            </div>
            
            <div className="space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-white/40">Direction Vector:</span>
                <span className={`font-bold capitalize ${
                  thesis.direction === "bullish" ? "text-emerald-400" :
                  thesis.direction === "bearish" ? "text-rose-400" :
                  thesis.direction === "neutral" ? "text-cyan-400" : "text-purple-400"
                }`}>
                  {thesis.direction}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/40">Implied Vol (IV):</span>
                <span className="text-white font-bold">{ivPercent}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/40">Horizon Period:</span>
                <span className="text-cyan-400 font-bold">{dte} DTE</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/40">Risk Tolerance:</span>
                <span className="text-white font-bold uppercase text-[9px]">{thesis.riskAppetite}</span>
              </div>
            </div>

            <div className="mt-2 p-2 rounded-xl bg-white/3 border border-white/5 text-[9.5px] text-white/60 leading-normal">
              <span className="text-cyan-400 font-bold block mb-0.5">Scoring Strategy Profile:</span>
              Evaluating optimal derivatives payoffs for high-resolution probability curves centered at K=100.
            </div>
          </div>
        </div>

        {/* Center Column: Scenario Reality Simulator (col-span-5 / 6) */}
        <div className="lg:col-span-5 xl:col-span-6 flex flex-col gap-4 min-h-[500px] lg:min-h-0">
          
          {/* Payoff Graph Viewport */}
          <div className="flex-1 bg-[#05070c]/85 border border-white/10 rounded-2xl p-5 shadow-xl flex flex-col min-h-0 relative overflow-hidden">
            {/* Header / Info bar */}
            <div className="flex justify-between items-start mb-4 shrink-0 font-mono">
              <div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full animate-pulse shadow-lg"
                    style={{
                      backgroundColor: selectedStrategy.score >= 75 ? "#00e5a0" : selectedStrategy.score >= 50 ? "#0ea5e9" : "#ff4d6a",
                      boxShadow: `0 0 10px ${selectedStrategy.score >= 75 ? "#00e5a0" : selectedStrategy.score >= 50 ? "#0ea5e9" : "#ff4d6a"}`
                    }}
                  />
                  <h3 className="text-sm font-bold text-white tracking-wide">
                    {selectedStrategy.name} Payoff Simulation
                  </h3>
                </div>
                <p className="text-[9px] text-white/40 uppercase tracking-widest mt-1">
                  Morphing Payoff Topology Center (Strike 100)
                </p>
              </div>

              {/* Dynamic POP indicator */}
              <div className="text-right">
                <span className="text-[8px] text-white/45 uppercase tracking-widest block font-bold">Probability of Profit</span>
                <span className="text-lg font-bold font-mono text-cyan-400 tracking-tight">
                  {simulatorMetrics?.pop}%
                </span>
              </div>
            </div>

            {/* Metrics HUD Row */}
            {simulatorMetrics && (
              <div className="grid grid-cols-5 gap-2 border border-white/5 bg-white/3 rounded-xl p-2.5 mb-4 shrink-0 font-mono text-[9px]">
                <div className="text-center border-r border-white/5">
                  <span className="text-white/40 uppercase block text-[8px] mb-0.5">PnL (Sim)</span>
                  <span className={`font-bold text-xs ${simulatorMetrics.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {simulatorMetrics.pnl >= 0 ? "+" : ""}${Math.round(simulatorMetrics.pnl * 100).toLocaleString()}
                  </span>
                </div>
                <div className="text-center border-r border-white/5">
                  <span className="text-white/40 uppercase block text-[8px] mb-0.5">Delta</span>
                  <span className="text-white font-bold text-xs">
                    {simulatorMetrics.delta.toFixed(2)}
                  </span>
                </div>
                <div className="text-center border-r border-white/5">
                  <span className="text-white/40 uppercase block text-[8px] mb-0.5">Gamma</span>
                  <span className="text-white font-bold text-xs">
                    {simulatorMetrics.gamma.toFixed(3)}
                  </span>
                </div>
                <div className="text-center border-r border-white/5">
                  <span className="text-white/40 uppercase block text-[8px] mb-0.5">Theta / Day</span>
                  <span className="text-rose-400 font-bold text-xs">
                    {simulatorMetrics.theta.toFixed(2)}
                  </span>
                </div>
                <div className="text-center">
                  <span className="text-white/40 uppercase block text-[8px] mb-0.5">Vega</span>
                  <span className="text-purple-400 font-bold text-xs">
                    {simulatorMetrics.vega.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* Recharts Chart Frame */}
            <div className="flex-1 min-h-0 relative">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    {/* Profit Gradient */}
                    <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00e5a0" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#00e5a0" stopOpacity={0.01} />
                    </linearGradient>
                    {/* Loss Gradient */}
                    <linearGradient id="lossGrad" x1="0" y1="1" x2="0" y2="0">
                      <stop offset="0%" stopColor="#ff4d6a" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#ff4d6a" stopOpacity={0.01} />
                    </linearGradient>
                    {/* Glow filter */}
                    <filter id="payoffGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  <CartesianGrid
                    strokeDasharray="4 4"
                    stroke="rgba(255,255,255,0.03)"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="price"
                    type="number"
                    scale="linear"
                    domain={["dataMin", "dataMax"]}
                    tickFormatter={formatXTick}
                    tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9, fontFamily: "monospace" }}
                    axisLine={{ stroke: "rgba(255,255,255,0.05)" }}
                    tickLine={false}
                  />

                  <YAxis
                    type="number"
                    domain={yDomain}
                    tickFormatter={formatYTick}
                    tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9, fontFamily: "monospace" }}
                    axisLine={{ stroke: "rgba(255,255,255,0.05)" }}
                    tickLine={false}
                  />

                  <Tooltip
                    content={
                      <CustomChartTooltip
                        spotPrice={spot}
                        strategyName={selectedStrategy.name}
                      />
                    }
                  />

                  {/* Horizontal Line at 0 P&L */}
                  <ReferenceLine
                    y={0}
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth={1}
                  />

                  {/* Vertical Line at current simulated Spot */}
                  <ReferenceLine
                    x={spot}
                    stroke="rgba(6, 182, 212, 0.4)"
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                    label={{
                      value: `SPOT: $${spot}`,
                      fill: "#22d3ee",
                      fontSize: 8,
                      fontFamily: "monospace",
                      position: "top",
                      offset: 15
                    }}
                  />

                  {/* Uncertainty Band Area */}
                  <Area
                    dataKey="upper"
                    stroke="none"
                    fill="rgba(6, 182, 212, 0.03)"
                    connectNulls
                  />
                  <Area
                    dataKey="lower"
                    stroke="none"
                    fill="transparent"
                    connectNulls
                  />

                  {/* Payoff Profit Area */}
                  <Area
                    type="monotone"
                    dataKey="profit"
                    stroke="none"
                    fill="url(#profitGrad)"
                    baseValue={0}
                    connectNulls
                  />

                  {/* Payoff Loss Area */}
                  <Area
                    type="monotone"
                    dataKey="loss"
                    stroke="none"
                    fill="url(#lossGrad)"
                    baseValue={0}
                    connectNulls
                  />

                  {/* Payoff Line */}
                  <Line
                    type="monotone"
                    dataKey="current"
                    stroke={selectedStrategy.score >= 75 ? "#00e5a0" : selectedStrategy.score >= 50 ? "#0ea5e9" : "#ff4d6a"}
                    strokeWidth={2}
                    dot={false}
                    filter="url(#payoffGlow)"
                    connectNulls
                  />

                  {/* Payoff Baseline Line (Inception DTE = 45) */}
                  <Line
                    type="monotone"
                    dataKey="baseline"
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                    dot={false}
                    connectNulls
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Simulation Slider Control Center */}
            <div className="mt-4 p-4 border border-white/5 bg-[#05070c]/50 rounded-2xl space-y-3.5 shrink-0 font-mono text-[10px]">
              
              {/* Sliders Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Spot Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-white/40 uppercase text-[8px] font-bold flex items-center gap-1">
                      <Sliders size={9} className="text-cyan-400" /> Spot Price
                    </span>
                    <span className="text-cyan-400 font-bold font-mono">${spot}</span>
                  </div>
                  <input
                    type="range"
                    min="70"
                    max="130"
                    step="0.5"
                    value={spot}
                    onChange={(e) => setSpot(parseFloat(e.target.value))}
                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>

                {/* IV Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-white/40 uppercase text-[8px] font-bold flex items-center gap-1">
                      <Percent size={9} className="text-purple-400" /> Implied Vol (IV)
                    </span>
                    <span className="text-purple-400 font-bold font-mono">{ivPercent}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="1"
                    value={ivPercent}
                    onChange={(e) => setIvPercent(parseInt(e.target.value))}
                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                </div>

                {/* DTE Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-white/40 uppercase text-[8px] font-bold flex items-center gap-1">
                      <Clock size={9} className="text-emerald-400" /> Time to Expiry
                    </span>
                    <span className="text-emerald-400 font-bold font-mono">{dte} DTE</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="45"
                    step="1"
                    value={dte}
                    onChange={(e) => setDte(parseInt(e.target.value))}
                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>
              </div>

              {/* Play / Reset Row */}
              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <span className="text-white/35 text-[8.5px] uppercase tracking-wider">
                  Reality Time Simulation Core
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className={`px-3 py-1 rounded border cursor-pointer font-bold flex items-center gap-1 transition-all ${
                      isPlaying
                        ? "bg-amber-500/10 border-amber-500/25 text-amber-400 shadow-md"
                        : "bg-cyan-500/10 border-cyan-500/25 text-cyan-400 hover:border-cyan-500/50 shadow-md"
                    }`}
                  >
                    {isPlaying ? <Pause size={10} /> : <Play size={10} />}
                    <span>{isPlaying ? "HALT" : "PLAY TIMELINE"}</span>
                  </button>

                  <button
                    onClick={handleResetSimulator}
                    className="p-1.5 rounded border border-white/10 hover:border-white/20 text-white/50 hover:text-white cursor-pointer transition-all"
                  >
                    <RotateCcw size={10} />
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* Telemetry Console (Risk Narrative Console) */}
          <div className="h-44 bg-[#05070c]/90 border border-white/10 rounded-2xl shadow-xl flex flex-col overflow-hidden relative shrink-0">
            {/* Console Header */}
            <div className="px-4 py-2 border-b border-white/5 bg-white/2 flex justify-between items-center font-mono text-[9px] text-white/50 shrink-0">
              <div className="flex items-center gap-1.5">
                <Terminal size={11} className="text-cyan-400" />
                <span className="font-bold tracking-widest text-[8.5px] uppercase">Telemetry Narrative Console</span>
              </div>

              <div className="flex items-center gap-1">
                {(["ALL", "ALIGN", "WARN"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setActiveLogTab(t)}
                    className={`px-2 py-0.5 rounded text-[8px] cursor-pointer transition-colors ${
                      activeLogTab === t
                        ? "bg-white/10 text-cyan-400 font-bold"
                        : "hover:bg-white/5"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Terminal Output Logs */}
            <div className="flex-1 overflow-y-auto p-3 font-mono text-[9px] leading-relaxed space-y-1.5 flex flex-col-reverse">
              <div className="space-y-1.5">
                {logsToDisplay.length === 0 ? (
                  <div className="text-white/20 italic">No telemetry reports match this filter.</div>
                ) : (
                  logsToDisplay.map((log) => (
                    <div
                      key={log.id}
                      className={`flex gap-2.5 items-start ${
                        log.type === "WARN" ? "text-rose-400/90" : log.type === "ALIGN" ? "text-emerald-400/90" : "text-white/60"
                      }`}
                    >
                      <span className="text-white/30 shrink-0">[{log.timestamp}]</span>
                      <span className="shrink-0 font-bold">
                        {log.type === "WARN" ? "⚠️ [CRIT]" : log.type === "ALIGN" ? "✅ [FIT]" : "⚙️ [INFO]"}
                      </span>
                      <span className="break-all">{log.text}</span>
                    </div>
                  ))
                )}
                {/* Active blinking prompt line */}
                <div className="flex gap-1.5 items-center text-cyan-400/60 pt-0.5">
                  <ChevronRight size={11} className="animate-pulse" />
                  <span className="animate-pulse">SYS_TELEMETRY_AWAITING_INPUT_</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Structural Fit Rankings (col-span-3) */}
        <div className="lg:col-span-3 flex flex-col gap-4 h-full min-h-0 overflow-hidden min-w-0 pr-0 lg:pr-1">
          
          {/* Header */}
          <div className="font-mono flex flex-col gap-0.5 shrink-0">
            <span className="text-[8px] uppercase tracking-widest text-white/40 block font-bold">
              Quant Pipeline
            </span>
            <span className="text-xs uppercase font-bold text-white tracking-wide flex items-center gap-1.5">
              <Cpu size={12} className="text-cyan-400" /> Structural Fit Scores
            </span>
          </div>

          {/* Ranked strategies list */}
          <div className="flex-1 flex flex-col gap-3 min-h-0 overflow-y-auto pr-1 pb-4">
            {rankedStrategies.map((strat, idx) => {
              const isSelected = selectedStrategy.id === strat.id;
              
              if (isSelected) {
                // Expanded card view for the selected strategy
                return (
                  <motion.div
                    layout
                    key={strat.id}
                    onClick={() => setSelectedStrategyId(strat.id)}
                    className="group rounded-2xl p-4.5 border border-cyan-500/40 bg-[#061826]/40 cursor-pointer relative overflow-hidden transition-all shadow-xl"
                    style={{
                      boxShadow: "0 0 16px rgba(6, 182, 212, 0.15), inset 0 0 10px rgba(6, 182, 212, 0.05)"
                    }}
                  >
                    {/* Glow border overlay */}
                    <div className="absolute top-0 right-0 h-[1px] w-[50%] bg-gradient-to-l from-cyan-400 to-transparent group-hover:w-full transition-all duration-700" />
                    <div className="absolute top-0 right-0 w-[1px] h-[50%] bg-gradient-to-b from-cyan-400 to-transparent group-hover:h-full transition-all duration-700" />
                    
                    {/* Rank & Complexity Header */}
                    <div className="flex justify-between items-start mb-2 font-mono">
                      <span className={`text-[8px] font-bold border px-2 py-0.5 rounded ${
                        idx === 0
                          ? "border-cyan-500/30 bg-cyan-500/5 text-cyan-400"
                          : "border-white/10 bg-white/5 text-white/50"
                      }`}>
                        #{idx + 1} {idx === 0 ? "STRUCTURAL FIT" : "STRATEGY FIT"}
                      </span>
                      <span className="text-[7.5px] uppercase tracking-wider text-white/40 font-semibold">
                        Complexity: {strat.complexity}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors">
                      {strat.name}
                    </h4>

                    {/* Score Dial */}
                    <div className="my-3 flex items-center gap-3.5">
                      <div className="relative w-11 h-11 shrink-0 flex items-center justify-center">
                        <svg viewBox="0 0 36 36" className="w-full h-full rotate-[-90deg]">
                          <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="2.5" />
                          <circle
                            cx="18"
                            cy="18"
                            r="15.915"
                            fill="none"
                            stroke={strat.score >= 75 ? "#00e5a0" : strat.score >= 50 ? "#0ea5e9" : "#ff4d6a"}
                            strokeWidth="2.5"
                            strokeDasharray={`${strat.score} ${100 - strat.score}`}
                            className="transition-all duration-1000 ease-out"
                          />
                        </svg>
                        <span className={`absolute font-mono text-[10px] font-bold ${
                          strat.score >= 75 ? "text-emerald-400" : strat.score >= 50 ? "text-cyan-400" : "text-rose-400"
                        }`}>{strat.score}</span>
                      </div>

                      <div className="font-mono text-[9px] leading-normal text-white/60">
                        <div>Confidence: <span className={
                          strat.score >= 75 ? "text-emerald-400 font-bold uppercase" :
                          strat.score >= 50 ? "text-cyan-400 font-bold uppercase" :
                          "text-rose-400 font-bold uppercase"
                        }>{strat.confidence}</span></div>
                        <div className="mt-0.5 text-[8.5px] text-white/45">{strat.regimeCompatibility}</div>
                      </div>
                    </div>

                    {/* Greek Profile grid */}
                    <div className="grid grid-cols-4 gap-1.5 font-mono text-[8px] bg-white/2 border border-white/5 rounded-xl p-2 mt-2">
                      <div className="text-center">
                        <span className="text-white/35 block">Delta</span>
                        <span className="text-white font-bold">{strat.greekProfile.delta.toFixed(2)}</span>
                      </div>
                      <div className="text-center">
                        <span className="text-white/35 block">Gamma</span>
                        <span className="text-white font-bold">{strat.greekProfile.gamma.toFixed(3)}</span>
                      </div>
                      <div className="text-center">
                        <span className="text-white/35 block">Theta</span>
                        <span className="text-rose-400 font-bold">{strat.greekProfile.theta.toFixed(1)}</span>
                      </div>
                      <div className="text-center">
                        <span className="text-white/35 block">Vega</span>
                        <span className="text-purple-400 font-bold">{strat.greekProfile.vega.toFixed(1)}</span>
                      </div>
                    </div>

                    {/* Reasoning Statement */}
                    <p className="mt-3 font-mono text-[9px] text-white/55 leading-relaxed bg-white/2 border border-white/5 p-2 rounded-xl">
                      {strat.reasoning}
                    </p>
                  </motion.div>
                );
              } else {
                // Collapsed row view for other strategies
                return (
                  <motion.div
                    layout
                    key={strat.id}
                    onClick={() => setSelectedStrategyId(strat.id)}
                    className="p-3 rounded-xl border border-white/5 bg-[#05070c]/70 hover:border-white/10 text-white/60 hover:text-white font-mono text-[10px] cursor-pointer transition-all flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-[8.5px] text-white/20 font-bold">#{idx + 1}</span>
                      
                      <div className="min-w-0">
                        <span className="font-bold truncate block">{strat.name}</span>
                        <span className="text-[8px] text-white/35 block truncate uppercase">{strat.regimeCompatibility}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 ml-2">
                      <span className={`text-[9.5px] font-bold ${
                        strat.score >= 75 ? "text-emerald-400" :
                        strat.score >= 50 ? "text-cyan-400" :
                        "text-rose-400"
                      }`}>
                        {strat.score}
                      </span>
                      <ChevronRight size={10} className="opacity-40" />
                    </div>
                  </motion.div>
                );
              }
            })}
          </div>

        </div>

      </div>
    </div>
  );
}

// Custom Tooltip component for Recharts Payoff Curve
function CustomChartTooltip({
  active,
  payload,
  label,
  spotPrice,
  strategyName
}: any) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;
  const price = data.price;
  const pnl = data.current;
  const baseline = data.baseline;
  const spotDiff = price - spotPrice;

  return (
    <div className="bg-[#05070c]/95 border border-white/15 rounded-xl p-3 shadow-2xl font-mono text-[9px] space-y-1.5 relative z-50">
      <div className="text-cyan-400 font-bold border-b border-white/5 pb-1">
        {strategyName}
      </div>
      <div>
        <span className="text-white/40 uppercase">Price:</span>{" "}
        <span className="text-white font-bold">${price.toFixed(2)}</span>
      </div>
      <div>
        <span className="text-white/40 uppercase">PnL (Expiry):</span>{" "}
        <span className={`font-bold ${pnl >= 0 ? "text-emerald-400 font-glow-emerald" : "text-rose-400 font-glow-rose"}`}>
          {pnl >= 0 ? "+" : ""}${Math.round(pnl).toLocaleString()}
        </span>
      </div>
      <div>
        <span className="text-white/40 uppercase">PnL (Baseline):</span>{" "}
        <span className="text-white/60">
          {baseline >= 0 ? "+" : ""}${Math.round(baseline).toLocaleString()}
        </span>
      </div>
      <div className="text-[8px] text-white/30 uppercase pt-1 border-t border-white/5">
        Distance: {spotDiff >= 0 ? "+" : ""}{spotDiff.toFixed(2)} ({((spotDiff / spotPrice) * 100).toFixed(1)}%)
      </div>
    </div>
  );
}
