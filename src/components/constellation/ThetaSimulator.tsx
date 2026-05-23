"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence, useSpring, useTransform } from "framer-motion";
import {
  ComposedChart, Area, XAxis, YAxis, ResponsiveContainer, ReferenceLine, Tooltip
} from "recharts";
import { Play, Pause, RotateCcw, Zap, TrendingDown, Clock, Target } from "lucide-react";
import {
  computeThetaMetrics, buildMultiChartSnapshot, buildComparisonChartSnapshot,
  TOTAL_DTE, IV_INTENSITIES, IV_REGIME_META,
  type IVScenario, type MultiChartPoint as ChartPoint
} from "@/lib/finance/theta";
import type { StrategyNode } from "@/lib/playbook-data";

interface ThetaSimulatorProps {
  node: StrategyNode;
  onClose: () => void;
  onDecayChange: (intensity: number) => void;
  onIVChange: (intensity: number) => void;
}

export const THETA_ELIGIBLE = new Set([
  "Long Call", "Long Put", "Long Straddle", "Bull Call Spread", "Bear Put Spread", "Iron Condor",
]);

// ─── Play interval physics ───────────────────────────────────────────────────
function playIntervalMs(dte: number, speedMult: number): number {
  const base = 80 + 520 * Math.sqrt(Math.max(0, dte - 1) / (TOTAL_DTE - 1));
  return base / speedMult;
}

// ─── Custom chart tooltip ────────────────────────────────────────────────────
function PayoffTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number; name: string }> }) {
  if (!active || !payload?.length) return null;
  const relevant = payload.filter(p => p.name !== "bandRange");
  return (
    <div className="text-[11px] font-mono bg-black/90 border border-white/10 rounded-lg px-3 py-2 backdrop-blur-sm">
      {relevant.map((p, i) => (
        <div key={i} className={p.value >= 0 ? "text-emerald-400" : "text-rose-400"}>
          {p.name}: {p.value >= 0 ? "+" : ""}{p.value.toFixed(2)}
        </div>
      ))}
    </div>
  );
}

// ─── Animated rolling counter ─────────────────────────────────────────────────
function AnimatedNumber({ value, decimals = 2 }: { value: number; decimals?: number }) {
  const [displayed, setDisplayed] = useState(value);
  const prev = useRef(value);
  const raf = useRef<number>(0);

  useEffect(() => {
    cancelAnimationFrame(raf.current);
    const start = prev.current;
    const diff = value - start;

    // For small integer steps (e.g. DTE counting down by 1) or when the value
    // is already at the target, snap instantly — no animation. This prevents
    // the 350ms RAF from being cancelled mid-flight by the next tick when
    // playback accelerates near expiry (intervals < 100ms).
    if (Math.abs(diff) <= 1.01 && decimals === 0) {
      setDisplayed(value);
      prev.current = value;
      return;
    }

    const duration = 350;
    const startTime = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayed(start + diff * eased);
      if (t < 1) {
        raf.current = requestAnimationFrame(tick);
      } else {
        prev.current = value;
      }
    };
    raf.current = requestAnimationFrame(tick);
    // Always update prev on cleanup so the next animation starts from a sane
    // point even if this one was cancelled mid-flight.
    return () => {
      cancelAnimationFrame(raf.current);
      prev.current = value;
    };
  }, [value, decimals]);

  return <>{displayed.toFixed(decimals)}</>;
}

// ─── IV Atmosphere Overlay ───────────────────────────────────────────────────
// Renders a full-bleed ambient layer that shifts color temperature with IV.
// Low IV → blue-calm. Normal → neutral. High IV → warm amber pressure.
function IVAtmosphere({ ivIntensity }: { ivIntensity: number }) {
  return (
    <>
      {/* Low IV: cold blue radial from top */}
      <motion.div
        className="absolute inset-0 pointer-events-none z-0"
        animate={{ opacity: Math.max(0, (0.4 - ivIntensity) * 2 * 0.3) }}
        transition={{ duration: 1.6, ease: "easeInOut" }}
        style={{ background: "radial-gradient(ellipse at 50% -10%, rgba(96,165,250,0.18) 0%, transparent 65%)" }}
      />
      {/* High IV: warm amber pressure from edges */}
      <motion.div
        className="absolute inset-0 pointer-events-none z-0"
        animate={{ opacity: Math.max(0, (ivIntensity - 0.5) * 2 * 0.35) }}
        transition={{ duration: 1.6, ease: "easeInOut" }}
        style={{ background: "radial-gradient(ellipse at 50% 110%, rgba(251,146,60,0.2) 0%, transparent 60%)" }}
      />
      {/* High IV: lateral edge pressure */}
      <motion.div
        className="absolute inset-0 pointer-events-none z-0"
        animate={{ opacity: Math.max(0, (ivIntensity - 0.5) * 2 * 0.15) }}
        transition={{ duration: 2, ease: "easeInOut" }}
        style={{ background: "radial-gradient(ellipse at 0% 50%, rgba(251,146,60,0.12) 0%, transparent 50%)" }}
      />
    </>
  );
}

// ─── Pressure Overlay (decay) ─────────────────────────────────────────────────
function PressureOverlay({ intensity }: { intensity: number }) {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none z-0"
      animate={{ opacity: intensity * 0.35 }}
      transition={{ duration: 1.2, ease: "easeOut" }}
      style={{ background: "radial-gradient(ellipse at 50% 110%, rgba(255,30,60,0.15) 0%, transparent 70%)" }}
    />
  );
}

// ─── Temporal Atmosphere Response ────────────────────────────────────────────
function TemporalAtmosphere({
  pinnedDtes,
  activeDte,
  nodeColor,
  comparisonStrategy,
  compColor
}: {
  pinnedDtes: number[];
  activeDte: number;
  nodeColor: string;
  comparisonStrategy: string | null;
  compColor: string;
}) {
  const hasHighDte = pinnedDtes.some(d => d >= 30) || activeDte >= 30;
  const hasLowDte = pinnedDtes.some(d => d <= 7) || activeDte <= 7;
  const numPinned = pinnedDtes.length;
  
  // Vignette pressure expands in comparison mode or when checkpoints accumulate
  const vignetteOpacity = comparisonStrategy
    ? 0.38
    : Math.min(0.7, numPinned * 0.12);

  return (
    <>
      {/* High DTE soft ambient glow */}
      <motion.div
        className="absolute inset-0 pointer-events-none z-0"
        animate={{ opacity: hasHighDte ? 0.22 : 0 }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
        style={{
          background: "radial-gradient(circle at 50% 40%, rgba(96,165,250,0.12) 0%, transparent 60%)",
        }}
      />
      
      {/* Comparison Split Reality Background */}
      {comparisonStrategy && (
        <motion.div
          className="absolute inset-0 pointer-events-none z-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.22 }}
          transition={{ duration: 1.0 }}
          style={{
            background: `linear-gradient(to right, ${nodeColor}0d 0%, transparent 50%, ${compColor}0d 100%)`,
          }}
        />
      )}

      {/* Near-expiry high contrast overlay */}
      <motion.div
        className="absolute inset-0 pointer-events-none z-0"
        animate={{ opacity: hasLowDte ? 0.35 : 0 }}
        transition={{ duration: 1.2, ease: "easeInOut" }}
        style={{
          background: "radial-gradient(circle at 50% 50%, transparent 20%, rgba(3,5,10,0.85) 75%)",
        }}
      />
      {/* Reality convergence vignette */}
      <motion.div
        className="absolute inset-0 pointer-events-none z-0"
        animate={{ opacity: vignetteOpacity }}
        transition={{ duration: 1.0 }}
        style={{
          background: "radial-gradient(circle at 50% 50%, transparent 40%, rgba(0,0,0,0.85) 100%)",
          mixBlendMode: "multiply",
        }}
      />
    </>
  );
}

// ─── IV Regime Badge ─────────────────────────────────────────────────────────
function IVRegimeBadge({ iv }: { iv: IVScenario }) {
  const meta = IV_REGIME_META[iv];
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={iv}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.4 }}
        className="text-[9px] font-mono text-white/40 leading-relaxed"
      >
        {meta.description}
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Living Decay Rate Bar ────────────────────────────────────────────────────
function DecayRateBar({ dailyDecay, maxDecay, color }: { dailyDecay: number; maxDecay: number; color: string }) {
  const pct = Math.min(100, (dailyDecay / maxDecay) * 100);
  return (
    <div className="relative h-2 bg-white/8 rounded-full overflow-hidden mt-2">
      <motion.div
        className="absolute left-0 top-0 bottom-0 rounded-full"
        animate={{ width: `${pct}%`, background: `hsl(${120 - pct * 1.2}, 70%, 55%)` }}
        transition={{ duration: 0.5 }}
      />
      {pct > 65 && (
        <motion.div
          className="absolute top-0 bottom-0 w-2 rounded-full blur-sm"
          style={{ left: `${pct - 2}%`, background: "#ff4d6a" }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.9, repeat: Infinity }}
        />
      )}
    </div>
  );
}

// ─── Volatility Band Legend ───────────────────────────────────────────────────
function BandLegend({ iv, color }: { iv: IVScenario; color: string }) {
  const label = iv === "high" ? "Wide uncertainty band" : iv === "low" ? "Narrow uncertainty band" : "Baseline uncertainty band";
  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={iv}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="text-[9px] font-mono flex items-center gap-1.5"
        style={{ color: color + "70" }}
      >
        <span className="w-5 h-2 rounded-sm inline-block opacity-60" style={{ background: color }} />
        {label}
      </motion.span>
    </AnimatePresence>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ThetaSimulator({ node, onClose, onDecayChange, onIVChange }: ThetaSimulatorProps) {
  const [dte, setDte] = useState(TOTAL_DTE);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<1 | 2 | 4>(1);
  const [iv, setIv] = useState<IVScenario>("normal");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPlayingRef = useRef(false);
  const dteRef = useRef(dte);
  const scrubberRef = useRef<HTMLDivElement>(null);

  const [pinnedDtes, setPinnedDtes] = useState<number[]>([]);
  const pinnedDtesRef = useRef<number[]>([]);
  useEffect(() => { pinnedDtesRef.current = pinnedDtes; }, [pinnedDtes]);

  const [comparisonStrategy, setComparisonStrategy] = useState<string | null>(null);
  const comparisonStrategyRef = useRef<string | null>(null);
  useEffect(() => { comparisonStrategyRef.current = comparisonStrategy; }, [comparisonStrategy]);

  const [isCompOpen, setIsCompOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        isCompOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !(event.target as Element).closest(".compare-trigger")
      ) {
        setIsCompOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isCompOpen]);

  const [isDragging, setIsDragging] = useState(false);
  
  // Spring physics for scrubber thumb position
  const thumbPct = useSpring((1 - dte / TOTAL_DTE) * 100, {
    stiffness: 140,
    damping: 18,
    mass: 0.8
  });
  
  useEffect(() => {
    thumbPct.set((1 - dte / TOTAL_DTE) * 100);
  }, [dte, thumbPct]);
  
  const thumbLeft = useTransform(thumbPct, v => `${v}%`);

  // Smooth IV intensity spring
  const targetIvIntensity = IV_INTENSITIES[iv];
  const ivSpring = useSpring(targetIvIntensity, { stiffness: 60, damping: 20, mass: 1 });
  useEffect(() => { ivSpring.set(targetIvIntensity); }, [iv, ivSpring, targetIvIntensity]);

  const [ivIntensity, setIvIntensity] = useState(targetIvIntensity);
  useEffect(() => ivSpring.on("change", v => {
    setIvIntensity(v);
    onIVChange(v);  // propagate spring value to universe particles
  }), [ivSpring, onIVChange]);

  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { dteRef.current = dte; }, [dte]);
  // ivRef: lets PATH A read current IV without including it as a dependency
  // (which would cause PATH A to stomp PATH B's fromData capture)
  const ivRef = useRef<IVScenario>(iv);
  useEffect(() => { ivRef.current = iv; }, [iv]);

  const decayProgress = useMemo(() => 1 - dte / TOTAL_DTE, [dte]);
  const metrics = useMemo(() => computeThetaMetrics(node.name, dte, iv), [node.name, dte, iv]);
  const maxDecay = useMemo(() => computeThetaMetrics(node.name, 1, iv).dailyDecay, [node.name, iv]);
  const ivMeta = IV_REGIME_META[iv];

  // ── Chart data with two update paths ──────────────────────────────────────
  // DTE changes → instant update (keeps autoplay smooth at any speed).
  // IV changes  → RAF-interpolated transition (morphs geometry in-place).
  // Both paths write to the same `chartData` state — no keys, no remounts.
  const [chartData, setChartData] = useState<ChartPoint[]>(
    () => buildMultiChartSnapshot(node.name, TOTAL_DTE, iv, [])
  );
  // Stable ref so RAF closures always read the latest displayed data
  const chartDataRef   = useRef<ChartPoint[]>(chartData);
  const ivAnimRafRef   = useRef<number>(0);
  const prevIvRef      = useRef<IVScenario>(iv);

  // PATH A — DTE update: instant, does NOT cancel IV morph.
  // iv intentionally excluded from deps — reads live value via ivRef.
  // This prevents PATH A from running when iv changes and destroying PATH B's fromData.
  useEffect(() => {
    const snap = comparisonStrategy
      ? (buildComparisonChartSnapshot(node.name, comparisonStrategy, dteRef.current, ivRef.current) as any[])
      : buildMultiChartSnapshot(node.name, dteRef.current, ivRef.current, pinnedDtes);
    chartDataRef.current = snap;
    setChartData(snap);
  }, [dte, node.name, pinnedDtes, comparisonStrategy]); // iv intentionally excluded

  // PATH B — IV change: smooth RAF lerp between current geometry and new snapshot.
  // fromData is captured BEFORE PATH A can overwrite chartDataRef, because PATH B
  // fires on [iv] change and PATH A does NOT have iv in its deps.
  useEffect(() => {
    if (prevIvRef.current === iv) return;  // skip initial mount
    prevIvRef.current = iv;

    // Capture current displayed geometry as the animation start point
    const fromData = chartDataRef.current;
    const toData   = comparisonStrategyRef.current
      ? (buildComparisonChartSnapshot(node.name, comparisonStrategyRef.current, dteRef.current, iv) as any[])
      : buildMultiChartSnapshot(node.name, dteRef.current, iv, pinnedDtesRef.current);

    const DURATION = 650;
    const startTime = performance.now();
    cancelAnimationFrame(ivAnimRafRef.current);

    const animate = (now: number) => {
      const rawT = Math.min((now - startTime) / DURATION, 1);
      const t = rawT < 0.5 ? 4 * rawT ** 3 : 1 - (-2 * rawT + 2) ** 3 / 2;

      const lerped = fromData.map((from, i) => {
        const to = toData[i] ?? from;
        const l  = (a: number, b: number) => a + (b - a) * t;
        const res: any = { price: from.price };
        for (const key in from) {
          if (key === "price") continue;
          if (typeof from[key] === "number" && typeof to[key] === "number") {
            res[key] = l(from[key], to[key]);
          } else {
            res[key] = from[key];
          }
        }
        return res as ChartPoint;
      });

      chartDataRef.current = lerped;
      setChartData(lerped);

      if (rawT < 1) {
        ivAnimRafRef.current = requestAnimationFrame(animate);
      }
    };

    ivAnimRafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(ivAnimRafRef.current);
  }, [iv, node.name]);

  useEffect(() => { onDecayChange(decayProgress); }, [decayProgress, onDecayChange]);

  // Accelerating play
  const scheduleNext = useCallback(() => {
    const currentDte = dteRef.current;
    if (!isPlayingRef.current || currentDte <= 0) {
      if (currentDte <= 0) setIsPlaying(false);
      return;
    }
    timeoutRef.current = setTimeout(() => {
      setDte(prev => { const next = Math.max(0, prev - 1); dteRef.current = next; return next; });
      scheduleNext();
    }, playIntervalMs(currentDte, speed));
  }, [speed]);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (isPlaying) scheduleNext();
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [isPlaying, scheduleNext]);

  const reset = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setDte(TOTAL_DTE);
    setIsPlaying(false);
  }, []);

  const calculateDteFromX = useCallback((clientX: number) => {
    if (!scrubberRef.current) return TOTAL_DTE;
    const rect = scrubberRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const rawDte = (1 - pct) * TOTAL_DTE;
    
    // Snapping targets: canonical checkpoints + any other custom pinned DTEs
    const snapTargets = Array.from(new Set([45, 30, 21, 14, 7, 1, ...pinnedDtesRef.current]));
    const snapThreshold = 1.3; // Snapping range in days
    
    for (const target of snapTargets) {
      if (Math.abs(rawDte - target) < snapThreshold) {
        return target;
      }
    }
    return Math.round(rawDte);
  }, []);

  const handleScrubberMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only handle left-click
    setIsDragging(true);
    setIsPlaying(false);
    
    const handleMouseMove = (ev: MouseEvent) => {
      const newDte = calculateDteFromX(ev.clientX);
      setDte(newDte);
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
    
    const newDte = calculateDteFromX(e.clientX);
    setDte(newDte);
    
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }, [calculateDteFromX]);

  const handleScrubberTouchStart = useCallback((e: React.TouchEvent) => {
    setIsDragging(true);
    setIsPlaying(false);
    
    const handleTouchMove = (ev: TouchEvent) => {
      const touch = ev.touches[0];
      if (touch) {
        const newDte = calculateDteFromX(touch.clientX);
        setDte(newDte);
      }
    };
    
    const handleTouchEnd = () => {
      setIsDragging(false);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
    
    const touch = e.touches[0];
    if (touch) {
      const newDte = calculateDteFromX(touch.clientX);
      setDte(newDte);
    }
    
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleTouchEnd);
  }, [calculateDteFromX]);

  const handleTickClick = useCallback((e: React.MouseEvent, m: number) => {
    e.stopPropagation(); // prevent scrubber drag/click
    setPinnedDtes(prev => {
      if (prev.includes(m)) {
        return prev.filter(d => d !== m);
      } else {
        if (prev.length >= 5) return prev; // limit comparison curves to 5
        return [...prev, m].sort((a, b) => b - a);
      }
    });
    // Snap scrubber to this checkpoint
    setDte(m);
    setIsPlaying(false);
  }, []);

  const urgencyColor = metrics.urgency === "critical" ? "#ff4d6a" : metrics.urgency === "caution" ? "#f59e0b" : node.color;
  const dtePulse = metrics.urgency === "critical" && isPlaying;

  // IV-driven glow: stronger and warmer at high IV
  const chartGlowColor = ivIntensity > 0.5 ? `rgba(251,146,60,${(ivIntensity - 0.5) * 0.2})` : `rgba(96,165,250,${(0.5 - ivIntensity) * 0.15})`;
  const bandOpacity = 0.06 + ivIntensity * 0.12; // Low IV: barely visible. High IV: clearly visible.

  const compColor = useMemo(() => {
    if (!comparisonStrategy) return "#ffffff";
    if (comparisonStrategy === "Bull Call Spread") return "#38bdf8"; // Sky blue
    if (comparisonStrategy === "Bear Put Spread") return "#fb923c";  // Orange
    if (comparisonStrategy === "Iron Condor") return "#00d4ff";      // Cyan
    
    if (node.color === "#00e5a0") return "#6366f1"; // Green -> Indigo
    if (node.color === "#ff4d6a") return "#fb923c"; // Red -> Orange/Amber
    if (node.color === "#a855f7") return "#00d4ff"; // Purple -> Cyan
    return "#e2e8f0";
  }, [comparisonStrategy, node.color]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="absolute inset-0 z-60 flex flex-col pointer-events-auto overflow-hidden"
      style={{ background: "rgb(3,5,10)", backdropFilter: "blur(24px)" }}
    >
      {/* Atmospheric layers — IV regime + decay pressure */}
      <IVAtmosphere ivIntensity={ivIntensity} />
      <PressureOverlay intensity={decayProgress} />
      <TemporalAtmosphere pinnedDtes={pinnedDtes} activeDte={dte} nodeColor={node.color} comparisonStrategy={comparisonStrategy} compColor={compColor} />

      {/* ── Header ── */}
      <div className="relative z-20 flex items-center justify-between px-8 pt-6 pb-4 border-b border-white/5 shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <motion.div
              className="w-2 h-2 rounded-full"
              style={{ background: urgencyColor }}
              animate={{ boxShadow: [`0 0 6px ${urgencyColor}`, `0 0 14px ${urgencyColor}`, `0 0 6px ${urgencyColor}`] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="text-[10px] uppercase tracking-[0.25em] font-mono" style={{ color: urgencyColor }}>
              Theta Simulation
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">{node.name} · Time Decay Engine</h2>
        </div>

        <div className="flex items-center gap-4">
          {/* IV Regime Toggle — now with color-coded atmospheric indicators */}
          <div className="flex items-center gap-1 p-1 rounded-lg border border-white/10 bg-white/5 relative">
            {(["low", "normal", "high"] as IVScenario[]).map(scenario => {
              const meta = IV_REGIME_META[scenario];
              const isActive = iv === scenario;
              return (
                <button
                  key={scenario}
                  onClick={() => setIv(scenario)}
                  className="relative text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-md font-mono transition-all duration-300"
                  style={{
                    background: isActive ? meta.colorHint + "22" : "transparent",
                    color: isActive ? meta.colorHint : "rgba(255,255,255,0.35)",
                    border: isActive ? `1px solid ${meta.colorHint}50` : "1px solid transparent",
                  }}
                >
                  {/* Active IV atmospheric dot */}
                  {isActive && (
                    <motion.span
                      layoutId="iv-active-dot"
                      className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full"
                      style={{ background: meta.colorHint }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    />
                  )}
                  {scenario === "low" ? "Low" : scenario === "high" ? "High" : "Normal"} IV
                </button>
              );
            })}
          </div>

          {/* Comparison Selector Capsule */}
          <div className="relative">
            {comparisonStrategy ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 text-sky-400 font-mono text-[10px] uppercase tracking-widest pointer-events-auto">
                <span>vs {comparisonStrategy}</span>
                <button
                  onClick={() => setComparisonStrategy(null)}
                  className="hover:text-white transition-colors cursor-pointer ml-1 font-bold text-[11px]"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="relative pointer-events-auto">
                <button
                  onClick={() => setIsCompOpen(prev => !prev)}
                  className="compare-trigger text-[10px] uppercase tracking-widest font-mono text-white/45 hover:text-white/75 transition-colors px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 cursor-pointer"
                >
                  Compare Strategy
                </button>
                
                {isCompOpen && (
                  <div
                    ref={dropdownRef}
                    className="absolute right-0 mt-2 w-56 rounded-xl border border-white/10 bg-black/95 backdrop-blur-md p-2 flex flex-col gap-1 z-50 shadow-2xl"
                  >
                    <div className="text-[8px] uppercase tracking-widest font-mono text-white/25 px-2 py-1 border-b border-white/5 mb-1 select-none">
                      Select Comparison
                    </div>
                    
                    {/* Suggested pairing */}
                    {(() => {
                      const rec =
                        node.name === "Long Call" ? "Bull Call Spread" :
                        node.name === "Long Put" ? "Bear Put Spread" :
                        node.name === "Long Straddle" ? "Iron Condor" : null;
                        
                      if (!rec) return null;
                      return (
                        <button
                          onClick={() => {
                            setComparisonStrategy(rec);
                            setIsCompOpen(false);
                          }}
                          className="w-full text-left px-2 py-1.5 rounded-lg font-mono text-[10px] hover:bg-white/10 transition-colors flex flex-col cursor-pointer bg-white/5 border border-sky-500/20"
                        >
                          <span className="text-sky-400 font-bold">★ {rec}</span>
                          <span className="text-[7.5px] text-white/40 uppercase tracking-widest mt-0.5">Recommended Compare</span>
                        </button>
                      );
                    })()}
                    
                    {/* Other choices */}
                    {Array.from(THETA_ELIGIBLE)
                      .filter(s => s !== node.name && s !== (
                        node.name === "Long Call" ? "Bull Call Spread" :
                        node.name === "Long Put" ? "Bear Put Spread" :
                        node.name === "Long Straddle" ? "Iron Condor" : null
                      ))
                      .map(s => (
                        <button
                          key={s}
                          onClick={() => {
                            setComparisonStrategy(s);
                            setIsCompOpen(false);
                          }}
                          className="w-full text-left px-2 py-1.5 rounded-lg font-mono text-[10px] text-white/60 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          {s}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="text-[10px] uppercase tracking-widest font-mono text-white/40 hover:text-white/70 transition-colors px-3 py-2 rounded-lg border border-white/10 hover:border-white/20 cursor-pointer pointer-events-auto"
          >
            ← Exit
          </button>
        </div>
      </div>

      {/* ── IV Regime Context Strip ── */}
      <motion.div
        className="relative z-10 px-8 py-2 border-b border-white/5 flex items-center gap-3 shrink-0"
        animate={{ background: ivMeta.colorHint + "08" }}
        transition={{ duration: 1.2 }}
      >
        <motion.div
          className="w-1.5 h-1.5 rounded-full shrink-0"
          animate={{ background: ivMeta.colorHint, boxShadow: `0 0 8px ${ivMeta.colorHint}` }}
          transition={{ duration: 0.8 }}
        />
        <IVRegimeBadge iv={iv} />
      </motion.div>

      {/* ── Main Body ── */}
      <div className="relative z-10 flex flex-1 overflow-hidden">

        {/* ── Chart Area ── */}
        <div className="flex-1 flex flex-col p-8 pr-4 min-w-0">

          {/* DTE Banner */}
          <div className="flex items-baseline gap-3 mb-4 shrink-0">
            <motion.span
              key={`dte-${dte}`}
              initial={{ opacity: 0.6, y: -6 }}
              animate={dtePulse ? { opacity: 1, y: 0, scale: [1, 1.03, 1] } : { opacity: 1, y: 0, scale: 1 }}
              transition={dtePulse ? { duration: 0.6, repeat: Infinity } : { duration: 0.2 }}
              className="text-6xl font-bold font-mono tabular-nums leading-none"
              style={{
                color: urgencyColor,
                textShadow: `0 0 ${20 + decayProgress * 30}px ${urgencyColor}${Math.round(40 + decayProgress * 40).toString(16)}`,
              }}
            >
              {dte}
            </motion.span>
            <div className="flex flex-col">
              <span className="text-lg text-white/40 font-mono leading-tight">days to expiry</span>
              <motion.span
                className="text-[10px] font-mono uppercase tracking-widest"
                style={{ color: urgencyColor + "80" }}
                animate={{ opacity: [0.4, 0.9, 0.4] }}
                transition={{ duration: 2 + (1 - decayProgress) * 2, repeat: Infinity }}
              >
                {metrics.urgency === "critical" ? "⚠ Expiry imminent" : metrics.urgency === "caution" ? "Theta accelerating" : "Time value active"}
              </motion.span>
            </div>
            <motion.div
              className="ml-auto text-[10px] font-mono uppercase tracking-widest px-3 py-1 rounded-full border"
              animate={{ borderColor: urgencyColor + "60", background: urgencyColor + "12", color: urgencyColor }}
              transition={{ duration: 0.8 }}
            >
              {metrics.urgency === "critical" ? "Critical" : metrics.urgency === "caution" ? "Caution" : "Time-rich"}
            </motion.div>

            <button
              onClick={() => {
                setPinnedDtes(prev => {
                  if (prev.includes(dte)) {
                    return prev.filter(d => d !== dte);
                  } else {
                    if (prev.length >= 5) return prev;
                    return [...prev, dte].sort((a, b) => b - a);
                  }
                });
              }}
              className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest px-3 py-1 rounded-full border transition-all duration-300 pointer-events-auto cursor-pointer"
              style={{
                borderColor: pinnedDtes.includes(dte) ? node.color + "60" : "rgba(255,255,255,0.15)",
                background: pinnedDtes.includes(dte) ? node.color + "20" : "transparent",
                color: pinnedDtes.includes(dte) ? node.color : "rgba(255,255,255,0.4)",
              }}
            >
              <Zap size={10} className={pinnedDtes.includes(dte) ? "fill-current animate-pulse" : ""} />
              {pinnedDtes.includes(dte) ? "Pinned" : "Pin State"}
            </button>
          </div>

          {/* Chart */}
          <div className="flex-1 relative min-h-0">
            {/* Atmospheric glow — weakens with decay, shifts temperature with IV */}
            {/* Uses CSS transition on a sibling div — does NOT wrap ResponsiveContainer */}
            <motion.div
              className="absolute inset-0 rounded-2xl pointer-events-none blur-3xl"
              animate={{ background: chartGlowColor }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
              style={{ opacity: 0.3 + (1 - decayProgress) * 0.2 }}
            />

            {/* Chart border color transitions via motion.div overlay — NOT on the chart wrapper itself */}
            <motion.div
              className="absolute inset-0 rounded-2xl pointer-events-none z-10 border"
              animate={{ borderColor: `${ivMeta.colorHint}25` }}
              transition={{ duration: 1.0, ease: "easeInOut" }}
              style={{ borderRadius: "1rem" }}
            />

            {/* Chart wrapper: NO transition-all, NO border animation — kept static for ResizeObserver stability */}
            <div className="absolute inset-0 rounded-2xl overflow-hidden bg-black/30">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 36 }}>
                  <defs>
                    {/*
                      STABILITY NOTE: All gradient stop values are intentionally static strings.
                      Dynamic opacity is controlled by `bandOpacity` only through stable SVG attributes
                      that do NOT cause Recharts to remount the defs block. The actual visual
                      variation is achieved via the Area strokeOpacity + fill-opacity attributes below.
                      The gradient IDs never change — browser gradient references stay valid across renders.
                    */}
                    <linearGradient id="theta-band-upper" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="theta-band-lower" x1="0" y1="1" x2="0" y2="0">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity={0.08} />
                      <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="theta-baseline" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity={0.04} />
                      <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="theta-current" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                    </linearGradient>
                    {/* Glow filter: stdDeviation is stable (decay-driven) — not IV-driven */}
                    <filter id="theta-glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation={2 + (1 - decayProgress) * 3} result="blur" />
                      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                    {/* Ghost filters for pinned checkpoints (stable stdDeviation to prevent layout thrashing) */}
                    <filter id="glow-soft" x="-30%" y="-30%" width="160%" height="160%">
                      <feGaussianBlur stdDeviation={6} result="blur" />
                      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                    <filter id="glow-mid" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation={3} result="blur" />
                      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                    <filter id="glow-sharp" x="-10%" y="-10%" width="120%" height="120%">
                      <feGaussianBlur stdDeviation={1} result="blur" />
                      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                  </defs>

                  <XAxis
                    dataKey="price"
                    tick={{ fill: "rgba(255,255,255,0.18)", fontSize: 10, fontFamily: "monospace" }}
                    tickLine={false}
                    axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
                    tickFormatter={(v) => `$${v}`}
                    interval={4}
                  />
                  <YAxis
                    tick={{ fill: "rgba(255,255,255,0.18)", fontSize: 10, fontFamily: "monospace" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v >= 0 ? "+" : ""}${v}`}
                    width={36}
                  />
                  <Tooltip content={<PayoffTooltip />} />
                  <ReferenceLine y={0} stroke="rgba(255,255,255,0.13)" strokeDasharray="4 4" />

                  {/* Pinned uncertainty bands (Upper) — only when NOT comparing */}
                  {!comparisonStrategy && pinnedDtes.map(d => {
                    const age = d / TOTAL_DTE;
                    const fillOpacity = 0.003 + (1 - age) * 0.012;
                    const strokeOpacity = 0.08 + (1 - age) * 0.15;
                    return (
                      <Area
                        key={`pinned-upper-${d}`}
                        type="monotone"
                        dataKey={`upper_${d}`}
                        name={`Upper Band ${d}D`}
                        stroke={ivMeta.colorHint}
                        strokeWidth={0.3}
                        strokeOpacity={strokeOpacity}
                        fill="url(#theta-band-upper)"
                        fillOpacity={fillOpacity}
                        isAnimationActive={false}
                        dot={false}
                        legendType="none"
                      />
                    );
                  })}

                  {/* Pinned uncertainty bands (Lower) — only when NOT comparing */}
                  {!comparisonStrategy && pinnedDtes.map(d => {
                    const age = d / TOTAL_DTE;
                    const fillOpacity = 0.002 + (1 - age) * 0.008;
                    const strokeOpacity = 0.05 + (1 - age) * 0.1;
                    return (
                      <Area
                        key={`pinned-lower-${d}`}
                        type="monotone"
                        dataKey={`lower_${d}`}
                        name={`Lower Band ${d}D`}
                        stroke={ivMeta.colorHint}
                        strokeWidth={0.3}
                        strokeOpacity={strokeOpacity}
                        fill="url(#theta-band-lower)"
                        fillOpacity={fillOpacity}
                        isAnimationActive={false}
                        dot={false}
                        legendType="none"
                      />
                    );
                  })}

                  {/* Pinned P&L curves — only when NOT comparing */}
                  {!comparisonStrategy && pinnedDtes.map(d => {
                    const age = d / TOTAL_DTE;
                    const strokeOpacity = 0.10 + (1 - age) * 0.35;
                    const strokeWidth = 1.0 + (1 - age) * 1.2;
                    const strokeDasharray = d > 15 ? `${Math.max(2, Math.round(d / 4))} ${Math.max(2, Math.round(d / 6))}` : undefined;
                    
                    let filterId = "glow-sharp";
                    if (d >= 30) filterId = "glow-soft";
                    else if (d >= 15) filterId = "glow-mid";

                    return (
                      <Area
                        key={`pinned-pnl-${d}`}
                        type="monotone"
                        dataKey={`pnl_${d}`}
                        name={`P&L ${d}D`}
                        stroke={node.color}
                        strokeWidth={strokeWidth}
                        strokeOpacity={strokeOpacity}
                        fill="none"
                        strokeDasharray={strokeDasharray}
                        isAnimationActive={false}
                        dot={false}
                        legendType="none"
                        style={{ filter: `url(#${filterId})` }}
                      />
                    );
                  })}

                  {/* Strategy B Uncertainty Bands (Upper & Lower) */}
                  {comparisonStrategy && (
                    <>
                      <Area
                        type="monotone"
                        dataKey="upperB"
                        name={`Upper Band ${comparisonStrategy}`}
                        stroke={compColor}
                        strokeWidth={0.5}
                        strokeOpacity={0.3}
                        fill="url(#theta-band-upper)"
                        fillOpacity={bandOpacity * 1.1}
                        isAnimationActive={false}
                        dot={false}
                        legendType="none"
                      />
                      <Area
                        type="monotone"
                        dataKey="lowerB"
                        name={`Lower Band ${comparisonStrategy}`}
                        stroke={compColor}
                        strokeWidth={0.5}
                        strokeOpacity={0.18}
                        fill="url(#theta-band-lower)"
                        fillOpacity={bandOpacity * 0.8}
                        isAnimationActive={false}
                        dot={false}
                        legendType="none"
                      />
                    </>
                  )}

                  {/* Upper uncertainty band (Strategy A) */}
                  <Area
                    type="monotone"
                    dataKey={comparisonStrategy ? "upperA" : "upper"}
                    name="Upper Band"
                    stroke={ivMeta.colorHint}
                    strokeWidth={0.5}
                    strokeOpacity={0.4}
                    fill="url(#theta-band-upper)"
                    fillOpacity={bandOpacity * 1.8}
                    isAnimationActive={false}
                    dot={false}
                    legendType="none"
                  />

                  {/* Lower uncertainty band (Strategy A) */}
                  <Area
                    type="monotone"
                    dataKey={comparisonStrategy ? "lowerA" : "lower"}
                    name="Lower Band"
                    stroke={ivMeta.colorHint}
                    strokeWidth={0.5}
                    strokeOpacity={0.25}
                    fill="url(#theta-band-lower)"
                    fillOpacity={bandOpacity * 1.2}
                    isAnimationActive={false}
                    dot={false}
                    legendType="none"
                  />

                  {/* Strategy B Baseline */}
                  {comparisonStrategy && (
                    <Area
                      type="monotone"
                      dataKey="baselineB"
                      name={`45-DTE Ref (${comparisonStrategy})`}
                      stroke="rgba(255,255,255,0.06)"
                      strokeWidth={1}
                      fill="none"
                      strokeDasharray="4 4"
                      isAnimationActive={false}
                      dot={false}
                    />
                  )}

                  {/* Static 45-DTE baseline (Strategy A) */}
                  <Area
                    type="monotone"
                    dataKey={comparisonStrategy ? "baselineA" : "baseline"}
                    name="45-DTE Ref"
                    stroke="rgba(255,255,255,0.09)"
                    strokeWidth={1}
                    fill="url(#theta-baseline)"
                    strokeDasharray="6 3"
                    isAnimationActive={false}
                    dot={false}
                  />

                  {/* Strategy B Current P&L (Dashed curve) */}
                  {comparisonStrategy && (
                    <Area
                      type="monotone"
                      dataKey="currentB"
                      name={`Current P&L (${comparisonStrategy})`}
                      stroke={compColor}
                      strokeWidth={Math.max(1.3, 2.2 - decayProgress * 0.8)}
                      strokeDasharray="5 3"
                      fill="none"
                      isAnimationActive={false}
                      dot={false}
                      style={{ filter: "url(#theta-glow)" }}
                    />
                  )}

                  {/* Live decaying payoff curve (Strategy A) */}
                  <Area
                    type="monotone"
                    dataKey={comparisonStrategy ? "currentA" : "current"}
                    name="Current P&L"
                    stroke={node.color}
                    strokeWidth={Math.max(1.5, 2.5 - decayProgress * 1)}
                    fill="url(#theta-current)"
                    fillOpacity={Math.max(0.05, 0.5 - decayProgress * 0.45)}
                    isAnimationActive={false}
                    dot={false}
                    style={{ filter: "url(#theta-glow)" }}
                  />
                </ComposedChart>
              </ResponsiveContainer>

              {/* Chart legend */}
              <div className="absolute top-3 right-4 flex items-center gap-3 flex-wrap justify-end">
                {comparisonStrategy ? (
                  <>
                    <span className="text-[9px] font-mono flex items-center gap-1.5" style={{ color: node.color }}>
                      <span className="w-4 h-0.5 inline-block" style={{ background: node.color }} /> {node.name}
                    </span>
                    <span className="text-[9px] font-mono flex items-center gap-1.5" style={{ color: compColor }}>
                      <span className="w-4 h-0.5 border-t border-dashed inline-block" style={{ borderColor: compColor }} /> {comparisonStrategy}
                    </span>
                  </>
                ) : (
                  <>
                    <BandLegend iv={iv} color={ivMeta.colorHint} />
                    <span className="text-[9px] font-mono text-white/18 flex items-center gap-1.5">
                      <span className="w-5 h-px border-t border-dashed border-white/20 inline-block" /> 45-DTE
                    </span>
                    <span className="text-[9px] font-mono flex items-center gap-1.5" style={{ color: node.color + "99" }}>
                      <span className="w-5 h-0.5 inline-block" style={{ background: node.color }} /> Now
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ── Scrubber ── */}
          <div className="mt-5 shrink-0">
            <div className="flex items-center gap-3 mb-3">
              <motion.button
                onClick={() => setIsPlaying(p => !p)}
                className="w-9 h-9 rounded-full flex items-center justify-center border"
                animate={{
                  background: isPlaying ? urgencyColor + "25" : "rgba(255,255,255,0.05)",
                  borderColor: isPlaying ? urgencyColor + "60" : "rgba(255,255,255,0.1)",
                  color: isPlaying ? urgencyColor : "rgba(255,255,255,0.5)",
                }}
                transition={{ duration: 0.3 }}
              >
                {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              </motion.button>

              <button onClick={reset} className="w-9 h-9 rounded-full flex items-center justify-center border border-white/10 text-white/40 hover:text-white/60 transition-colors">
                <RotateCcw size={13} />
              </button>

              <div className="flex gap-1">
                {([1, 2, 4] as const).map(s => (
                  <button key={s} onClick={() => setSpeed(s)} className="text-[10px] font-mono px-2 py-1 rounded border transition-all duration-150"
                    style={{
                      background: speed === s ? node.color + "20" : "transparent",
                      borderColor: speed === s ? node.color + "50" : "rgba(255,255,255,0.1)",
                      color: speed === s ? node.color : "rgba(255,255,255,0.35)",
                    }}>
                    {s}×
                  </button>
                ))}
              </div>

              <AnimatePresence>
                {isPlaying && (
                  <motion.span initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                    className="text-[9px] font-mono text-white/25 uppercase tracking-widest ml-1">
                    {dte <= 7 ? "⚡ Accelerating" : dte <= 21 ? "↗ Picking up" : "· Flowing"}
                  </motion.span>
                )}
              </AnimatePresence>

              <span className="ml-auto text-[10px] font-mono text-white/22 uppercase tracking-widest">Scrub to explore</span>
            </div>

            {/* Track */}
            <div
              ref={scrubberRef}
              className="relative cursor-ew-resize select-none pointer-events-auto"
              style={{ height: `${28 + decayProgress * 8}px`, transition: "height 1s ease" }}
              onMouseDown={handleScrubberMouseDown}
              onTouchStart={handleScrubberTouchStart}
            >
              <div className="absolute left-0 right-0 bg-white/8 rounded-full overflow-hidden pointer-events-none"
                   style={{ top: "50%", transform: "translateY(-50%)", height: `${4 + decayProgress * 4}px` }}>
                <div className="absolute right-0 top-0 bottom-0 rounded-full"
                     style={{ width: `${decayProgress * 100}%`, background: `linear-gradient(to left, ${urgencyColor}, ${node.color})`, transition: "width 0ms" }} />
              </div>

              {/* Checkpoint Markers (Canonical Ticks) */}
              {[45, 30, 21, 14, 7, 1].map(m => {
                const isPinned = pinnedDtes.includes(m);
                const isActive = dte === m;
                const leftPos = (1 - m / TOTAL_DTE) * 100;
                const checkpointColor = m <= 7 ? "#ff4d6a" : m <= 21 ? "#f59e0b" : node.color;

                return (
                  <button
                    key={m}
                    onClick={(e) => handleTickClick(e, m)}
                    onMouseDown={e => e.stopPropagation()} // prevent starting a drag on the track
                    onTouchStart={e => e.stopPropagation()} // prevent starting a drag on the track
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center group cursor-pointer focus:outline-none pointer-events-auto z-20"
                    style={{ left: `${leftPos}%` }}
                  >
                    <motion.div
                      className="rounded-full transition-all duration-300"
                      animate={{
                        width: isPinned ? 10 : 4,
                        height: isPinned ? 10 : 4,
                        backgroundColor: isPinned ? checkpointColor : "rgba(255,255,255,0.2)",
                        boxShadow: isPinned ? `0 0 10px ${checkpointColor}` : "none",
                      }}
                    />
                    <div className="w-px h-2 bg-white/10 mt-1 group-hover:bg-white/30 transition-colors" />
                    <span
                      className="text-[7.5px] font-mono mt-0.5 whitespace-nowrap transition-all duration-300"
                      style={{
                        color: isActive ? "#ffffff" : isPinned ? checkpointColor : "rgba(255,255,255,0.22)",
                        fontWeight: isActive || isPinned ? "bold" : "normal",
                        transform: isActive ? "scale(1.15)" : "scale(1)",
                      }}
                    >
                      {m}D
                    </span>
                  </button>
                );
              })}

              {/* Custom Pinned Checkpoint Markers */}
              {pinnedDtes
                .filter(pd => ![45, 30, 21, 14, 7, 1].includes(pd))
                .map(m => {
                  const isActive = dte === m;
                  const leftPos = (1 - m / TOTAL_DTE) * 100;
                  const checkpointColor = m <= 7 ? "#ff4d6a" : m <= 21 ? "#f59e0b" : node.color;

                  return (
                    <button
                      key={`custom-${m}`}
                      onClick={(e) => handleTickClick(e, m)}
                      onMouseDown={e => e.stopPropagation()}
                      onTouchStart={e => e.stopPropagation()}
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center group cursor-pointer focus:outline-none pointer-events-auto z-20"
                      style={{ left: `${leftPos}%` }}
                    >
                      <motion.div
                        className="w-2.5 h-2.5 rounded-full border border-dashed transition-all duration-300"
                        animate={{
                          backgroundColor: checkpointColor + "33",
                          borderColor: checkpointColor,
                          boxShadow: `0 0 8px ${checkpointColor}`,
                        }}
                      />
                      <div className="w-px h-2 bg-white/10 mt-1" />
                      <span
                        className="text-[7.5px] font-mono mt-0.5 whitespace-nowrap transition-all duration-300"
                        style={{
                          color: isActive ? "#ffffff" : checkpointColor + "cc",
                          fontWeight: "bold",
                        }}
                      >
                        {m}D*
                      </span>
                    </button>
                  );
                })}

              <motion.div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 cursor-grab active:cursor-grabbing pointer-events-auto z-30"
                style={{ left: thumbLeft }}
                animate={{
                  width: 16 + decayProgress * 6,
                  height: 16 + decayProgress * 6,
                  background: urgencyColor,
                  borderColor: "rgba(255,255,255,0.25)",
                  boxShadow: `0 0 ${10 + decayProgress * 20}px ${urgencyColor}${Math.round(50 + decayProgress * 80).toString(16)}`,
                }}
                transition={{ duration: 0.2 }}
              />
            </div>

            <div className="flex justify-between text-[9px] font-mono text-white/20 mt-1 uppercase tracking-widest">
              <span>45 DTE</span>
              <span>Expiry</span>
            </div>
          </div>
        </div>

        {/* ── Intelligence Panel ── */}
        <div className="w-72 border-l border-white/5 p-5 flex flex-col gap-4 shrink-0 overflow-y-auto">
          {/* IV Regime Header in panel */}
          <motion.div
            className="rounded-xl p-3 border flex items-center gap-3"
            animate={{ borderColor: ivMeta.colorHint + "30", background: ivMeta.colorHint + "08" }}
            transition={{ duration: 1 }}
          >
            <motion.div className="w-2 h-2 rounded-full shrink-0"
              animate={{ background: ivMeta.colorHint, boxShadow: `0 0 8px ${ivMeta.colorHint}` }}
              transition={{ duration: 0.8 }}
            />
            <div>
              <div className="text-[9px] font-mono uppercase tracking-widest text-white/30 mb-0.5">Regime</div>
              <AnimatePresence mode="wait">
                <motion.div key={iv} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="text-xs font-mono font-bold" style={{ color: ivMeta.colorHint }}>
                  {ivMeta.label}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Extrinsic Value */}
          <div className="relative bg-black/30 border border-white/5 rounded-xl p-4 overflow-hidden">
            <div className="absolute inset-0 pointer-events-none transition-all duration-1000"
                 style={{ background: `linear-gradient(135deg, ${node.color}${Math.round(5 + (1 - decayProgress) * 10).toString(16).padStart(2, "0")}, transparent)` }} />
            <div className="flex items-center gap-2 mb-2">
              <Target size={12} style={{ color: node.color }} />
              <span className="text-[9px] font-mono uppercase tracking-widest text-white/40">Extrinsic Value</span>
            </div>
            <div className="text-3xl font-bold font-mono tabular-nums" style={{ color: node.color }}>
              $<AnimatedNumber value={metrics.extrinsicValue} decimals={2} />
            </div>
            <div className="h-1.5 w-full bg-white/8 rounded-full overflow-hidden mt-3">
              <motion.div
                className="h-full rounded-full"
                animate={{ width: `${metrics.extrinsicPct}%`, background: `hsl(${metrics.extrinsicPct * 1.5}, 80%, 55%)` }}
                transition={{ duration: 0.4 }}
              />
            </div>
            <div className="flex justify-between text-[9px] font-mono text-white/30 mt-1">
              <span>Remaining</span>
              <span><AnimatedNumber value={metrics.extrinsicPct} decimals={0} />%</span>
            </div>
          </div>

          {/* Daily Decay */}
          <div className="bg-black/30 border border-white/5 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown size={12} style={{ color: metrics.urgency === "critical" ? "#ff4d6a" : "#f59e0b" }} />
              <span className="text-[9px] font-mono uppercase tracking-widest text-white/40">Daily Θ Decay</span>
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-rose-400">
              −$<AnimatedNumber value={metrics.dailyDecay} decimals={2} />
            </div>
            <DecayRateBar dailyDecay={metrics.dailyDecay} maxDecay={maxDecay} color={node.color} />
            <div className="flex justify-between text-[8px] font-mono text-white/20 mt-1">
              <span>Slow</span><span>Fast</span>
            </div>
          </div>

          {/* Time Remaining */}
          <div className="bg-black/30 border border-white/5 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={12} style={{ color: urgencyColor }} />
              <span className="text-[9px] font-mono uppercase tracking-widest text-white/40">Time Remaining</span>
            </div>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-bold font-mono tabular-nums" style={{ color: urgencyColor }}>
                <AnimatedNumber value={dte} decimals={0} />
              </div>
              <span className="text-xs text-white/30 font-mono">/ {TOTAL_DTE}</span>
            </div>
            <div className="flex gap-px mt-3">
              {Array.from({ length: TOTAL_DTE }).map((_, i) => {
                const dayNum = TOTAL_DTE - i;
                const active = dayNum <= dte;
                const segColor = dayNum <= 7 ? "#ff4d6a" : dayNum <= 21 ? "#f59e0b" : node.color;
                return (
                  <div key={i} className="flex-1 rounded-sm transition-all"
                    style={{
                      minWidth: 3,
                      height: active ? (dayNum <= 7 ? 8 : dayNum <= 21 ? 6 : 4) : 3,
                      background: active ? segColor : "rgba(255,255,255,0.05)",
                      transition: "all 0.15s ease",
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* Probability of Profit — band narrows with decay AND compresses at low IV */}
          <div className="bg-black/30 border border-white/5 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={12} style={{ color: node.color }} />
              <span className="text-[9px] font-mono uppercase tracking-widest text-white/40">Prob. of Profit</span>
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums" style={{ color: node.color }}>
              <AnimatedNumber value={metrics.pop} decimals={0} />%
            </div>
            {/* Spatial band: width = POP%, shifts with IV color hint */}
            <div className="relative h-6 bg-white/5 rounded-lg overflow-hidden mt-2">
              {(() => {
                const bandWidth = metrics.pop;
                const left = 50 - bandWidth / 2;
                return (
                  <>
                    <motion.div
                      className="absolute top-1 bottom-1 rounded"
                      animate={{ left: `${left}%`, width: `${bandWidth}%`, background: node.color + "20", borderColor: node.color + "40" }}
                      transition={{ duration: 0.5 }}
                      style={{ border: `1px solid ${node.color}40` }}
                    />
                    <div className="absolute top-0 bottom-0 w-px bg-white/18" style={{ left: "50%" }} />
                  </>
                );
              })()}
              <div className="absolute inset-0 flex items-center justify-center text-[9px] font-mono text-white/25">
                profitable range
              </div>
            </div>
          </div>

          {/* Insight Card — transitions with both DTE urgency and IV regime */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`${metrics.urgency}-${iv}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4 }}
              className="rounded-xl p-4 text-[10px] leading-relaxed border"
              style={{ borderColor: urgencyColor + "25", background: urgencyColor + "08", color: "rgba(255,255,255,0.5)" }}
            >
              <div className="font-semibold mb-1 text-[9px] uppercase tracking-widest" style={{ color: urgencyColor }}>
                {metrics.urgency === "critical" ? "⚠  Final Stage" : metrics.urgency === "caution" ? "●  Acceleration Zone" : "◎  Observation"}
              </div>
              {metrics.urgency === "critical"
                ? "Time value has evaporated. The position is now almost purely intrinsic. Every remaining day carries maximum Theta cost."
                : metrics.urgency === "caution"
                ? iv === "high"
                  ? "High IV amplifies both your gains and your decay exposure. The bands are wide — but they're compressing fast."
                  : iv === "low"
                  ? "Low IV means you paid less premium, but the opportunity window is narrower. Decay still accelerates here."
                  : "You're in the acceleration zone. Theta is compounding daily — the curve steepens beneath you."
                : iv === "high"
                ? "High IV has expanded your uncertainty envelope. You have wider opportunity but are paying more in daily Theta."
                : iv === "low"
                ? "Low IV has compressed opportunity. The band is narrow. Your cost basis is lower, but so is your potential expansion."
                : "Time value erodes slowly now. The acceleration you'll feel near expiry is non-linear — this curve will collapse faster."
              }
            </motion.div>
          </AnimatePresence>

          {/* Temporal Telemetry Card */}
          <div className="bg-black/40 border border-white/5 rounded-xl p-4 font-mono text-[9px] leading-relaxed relative overflow-hidden shrink-0">
            {/* Soft grid background design */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
                 style={{ backgroundImage: "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)", backgroundSize: "8px 8px" }} />
                 
            <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-white/5 shrink-0">
              <span className="text-[8px] uppercase tracking-widest text-white/35 font-bold">Temporal Telemetry</span>
              <motion.span
                className="w-1.5 h-1.5 rounded-full bg-emerald-500"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.8, repeat: Infinity }}
              />
            </div>
            
            <div className="flex flex-col gap-1.5 text-white/50">
              {/* Telemetry rows */}
              <div className="flex justify-between">
                <span className="text-white/25">SYSTEM_STATE:</span>
                <span className={dte <= 7 ? "text-rose-400" : dte <= 21 ? "text-amber-400" : "text-emerald-400"}>
                  {dte <= 0 ? "TERMINAL" : isPlaying ? "SIMULATING_FLOW" : "STEADY"}
                </span>
              </div>
              {comparisonStrategy ? (
                <div className="flex justify-between">
                  <span className="text-white/25">COMP_TARGET:</span>
                  <span className="text-sky-400 font-bold select-all">{comparisonStrategy}</span>
                </div>
              ) : (
                <div className="flex justify-between">
                  <span className="text-white/25">LAYERS_ACTIVE:</span>
                  <span>{pinnedDtes.length + 1} realities</span>
                </div>
              )}
              
              {/* Observational Narration prompts */}
              <div className="mt-2 pt-2 border-t border-white/5 text-[9.5px] leading-normal text-white/60 min-h-[42px] flex items-center">
                {(() => {
                  if (dte === 0) {
                    return (
                      <span className="text-rose-400 font-bold animate-pulse">
                        &gt; TERMINAL STATUS ACHIEVED. EXTRINICS TOTAL LOSS. FLEXIBILITY UNSTABLE.
                      </span>
                    );
                  }

                  if (comparisonStrategy) {
                    const isAUncapped = ["Long Call", "Long Put", "Long Straddle"].includes(node.name);
                    const isBUncapped = ["Long Call", "Long Put", "Long Straddle"].includes(comparisonStrategy);

                    if (isAUncapped && !isBUncapped) {
                      return (
                        <span className="text-sky-300">
                          &gt; comparative telemetry: {node.name} uncapped upside retaining broader possibility field. spread structure reducing temporal exposure. defined-risk geometry stabilizing.
                        </span>
                      );
                    }
                    if (!isAUncapped && isBUncapped) {
                      return (
                        <span className="text-sky-300">
                          &gt; comparative telemetry: defined-risk geometry stabilizing. spread structure reducing temporal exposure. {comparisonStrategy} retains broader, uncapped possibility field.
                        </span>
                      );
                    }
                    if (node.name === "Long Straddle" && comparisonStrategy === "Iron Condor") {
                      return (
                        <span className="text-sky-300">
                          &gt; comparative telemetry: straddle theta exposure accelerating. iron condor defined-risk range trade capturing positive decay margin. extrinsic erosion diverging.
                        </span>
                      );
                    }
                    return (
                      <span className="text-sky-300">
                        &gt; comparative telemetry: observing relative decay rates. extrinsic erosion and structural payoff rigidity diverging across structures.
                      </span>
                    );
                  }
                  
                  const activePinned = pinnedDtes.length;
                  const hasHigh = pinnedDtes.some(d => d >= 30) || dte >= 30;
                  const hasLow = pinnedDtes.some(d => d <= 7) || dte <= 7;
                  
                  if (activePinned >= 3 && hasLow && hasHigh) {
                    return (
                      <span className="text-amber-400">
                        &gt; reality convergence detected. optionality rapidly compressing. probability envelopes collapsing to single terminal path.
                      </span>
                    );
                  }
                  
                  if (dte <= 7) {
                    return (
                      <span className="text-rose-400">
                        &gt; near-expiry rigidity active. extrinsic flexibility deteriorating. recovery pathways narrowing toward zero.
                      </span>
                    );
                  }
                  
                  if (dte <= 21) {
                    return (
                      <span className="text-amber-300">
                        &gt; non-linear decay zone entered. acceleration phase initiated. time-driven optionality compression in progress.
                      </span>
                    );
                  }
                  
                  if (activePinned > 0) {
                    return (
                      <span className="text-sky-400">
                        &gt; multi-reality comparison active. comparing historical probability envelopes. time decay profile visible.
                      </span>
                    );
                  }
                  
                  return (
                    <span className="text-white/40">
                      &gt; system awaiting temporal inputs. pin checkpoints or scrub timeline to observe probability envelope compression.
                    </span>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
