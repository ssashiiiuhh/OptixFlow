// ============================================================================
// OPTIXFLOW — Playbook Strategy Preview Capsule
// Displays options strategy payoffs, metrics, and details.
// Integrates Regime Alignment diagnostics representing suitability under live feeds.
// ============================================================================

"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, ReferenceLine } from "recharts";
import { X, Activity, AlertTriangle, Crosshair, BarChart3, Timer, Compass, ShieldAlert, ShieldCheck } from "lucide-react";

import { generateMiniPayoff, PLAYBOOK_NODES } from "@/lib/playbook-data";
import ThetaSimulator, { THETA_ELIGIBLE } from "./ThetaSimulator";
import { MarketAsset } from "@/lib/market/MarketDataService";
import { evaluateStrategySuitability } from "@/lib/market/RegimeSuitabilityEngine";

interface StrategyPreviewProps {
  nodeId: string | null;
  onClose: () => void;
  onDecayChange: (intensity: number) => void;
  onIVChange: (intensity: number) => void;
  onThetaModeChange: (active: boolean) => void;
  activeAsset?: MarketAsset;
}

// Visual color tags for suitability result categories
const SUITABILITY_ACCENTS = {
  HIGHLY_FAVORED: { label: "HIGHLY RESILIENT", color: "#00e5a0", bg: "rgba(0, 229, 160, 0.1)" },
  FAVORED: { label: "FAVORED GEOMETRY", color: "#10b981", bg: "rgba(16, 185, 129, 0.1)" },
  NEUTRAL: { label: "NEUTRAL ALIGNMENT", color: "#00d4ff", bg: "rgba(0, 212, 255, 0.1)" },
  VULNERABLE: { label: "EXPOSURE UNDER STRESS", color: "#f5a623", bg: "rgba(245, 166, 35, 0.1)" },
  HIGHLY_VULNERABLE: { label: "CRITICAL REGIME MISMATCH", color: "#ff4d6a", bg: "rgba(255, 77, 106, 0.1)" }
};

// Staggered animation variants
const containerVariants: Variants = {
  hidden: { opacity: 0, x: 50, scale: 0.95, filter: "blur(10px)" },
  visible: { 
    opacity: 1, x: 0, scale: 1, filter: "blur(0px)",
    transition: { 
      type: "spring", damping: 30, stiffness: 200, staggerChildren: 0.1 
    } 
  },
  exit: { 
    opacity: 0, x: 40, scale: 0.95, filter: "blur(10px)", 
    transition: { duration: 0.3 } 
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function StrategyPreview({ 
  nodeId, 
  onClose, 
  onDecayChange, 
  onIVChange, 
  onThetaModeChange,
  activeAsset
}: StrategyPreviewProps) {
  const node = PLAYBOOK_NODES.find(n => n.id === nodeId);
  const [thetaMode, setThetaMode] = useState(false);

  // Notify parent whenever simulation mode changes
  useEffect(() => { onThetaModeChange(thetaMode); }, [thetaMode, onThetaModeChange]);

  const handleClose = useCallback(() => {
    setThetaMode(false);
    onDecayChange(0);
    onIVChange(0.5);
    onClose();
  }, [onClose, onDecayChange, onIVChange]);

  const handleThetaClose = useCallback(() => {
    setThetaMode(false);
    onDecayChange(0);
    onIVChange(0.5);
  }, [onDecayChange, onIVChange]);

  // Compute live suitability rating
  const suitabilityInfo = useMemo(() => {
    if (!nodeId || !activeAsset) return null;
    return evaluateStrategySuitability(nodeId, activeAsset);
  }, [nodeId, activeAsset]);

  const suitabilityMeta = useMemo(() => {
    if (!suitabilityInfo) return null;
    return SUITABILITY_ACCENTS[suitabilityInfo.suitability] || SUITABILITY_ACCENTS.NEUTRAL;
  }, [suitabilityInfo]);

  return (
    <>
    {/* Theta Simulation fullscreen overlay */}
    <div onClick={e => e.stopPropagation()}>
    <AnimatePresence>
      {thetaMode && node && (
        <ThetaSimulator
          node={node}
          onClose={handleThetaClose}
          onDecayChange={onDecayChange}
          onIVChange={onIVChange}
        />
      )}
    </AnimatePresence>
    </div>

    {/* Preview panel */}
    <div onClick={e => e.stopPropagation()}>
    <AnimatePresence>
      {node && (
        <motion.div
          key={node.id}
          variants={containerVariants}
          initial="hidden"
          animate={thetaMode ? "hidden" : "visible"}
          exit="exit"
          className={`absolute right-8 top-1/2 -translate-y-1/2 w-[390px] z-50 ${
            thetaMode ? "pointer-events-none" : "pointer-events-auto"
          }`}
        >
          {/* Deep ambient background glow layer */}
          <div 
            className="absolute inset-0 rounded-2xl blur-3xl opacity-20 pointer-events-none transition-colors duration-1000" 
            style={{ background: node.color }} 
          />
          
          {/* Main Glass Panel */}
          <div className="relative glass rounded-2xl border overflow-y-auto max-h-[90vh]"
               style={{ 
                 borderColor: "rgba(255,255,255,0.08)", 
                 background: "rgba(8, 10, 15, 0.82)",
                 backdropFilter: "blur(45px)",
                 boxShadow: `0 30px 60px -12px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.1)`
               }}>
               
            {/* Top Edge Laser Highlight */}
            <motion.div 
              initial={{ scaleX: 0 }} 
              animate={{ scaleX: 1 }} 
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="absolute top-0 left-0 right-0 h-[2px] w-full origin-left" 
              style={{ background: `linear-gradient(90deg, transparent, ${node.color}, transparent)`, opacity: 0.8 }} 
            />

            <div className="p-5 flex flex-col gap-4 font-sans select-none">
              
              {/* Header Area */}
              <motion.div variants={itemVariants} className="flex justify-between items-start">
                <div>
                  <div 
                    className="text-[9px] uppercase tracking-[0.2em] mb-1 font-mono flex items-center gap-1.5"
                    style={{ color: node.color }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: node.color, boxShadow: `0 0 10px ${node.color}` }} />
                    Structure Capsule
                  </div>
                  <h3 className="text-xl font-bold tracking-tight text-white drop-shadow-md">
                    {node.name}
                  </h3>
                </div>
                <button 
                  onClick={handleClose}
                  className="p-1.5 rounded-full hover:bg-white/10 transition-colors text-white/40 hover:text-white cursor-pointer"
                >
                  <X size={15} />
                </button>
              </motion.div>

              {/* Payoff Graph Viewport */}
              <motion.div variants={itemVariants} className="h-32 w-full relative shrink-0">
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-transparent rounded-xl border border-white/5 overflow-hidden">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={generateMiniPayoff(node.name)} margin={{ top: 15, right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id={`fill-${node.id}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={node.color} stopOpacity={0.5} />
                          <stop offset="100%" stopColor={node.color} stopOpacity={0.0} />
                        </linearGradient>
                        <filter id={`glow-${node.id}`} x="-20%" y="-20%" width="140%" height="140%">
                          <feGaussianBlur stdDeviation="3" result="blur" />
                          <feMerge>
                            <feMergeNode in="blur"/>
                            <feMergeNode in="SourceGraphic"/>
                          </feMerge>
                        </filter>
                      </defs>
                      <ReferenceLine y={0} stroke="rgba(255,255,255,0.12)" strokeDasharray="3 3" />
                      <XAxis dataKey="price" hide />
                      <YAxis hide domain={['dataMin - 10', 'dataMax + 10']} />
                      <Area 
                        type="monotone" 
                        dataKey="pnl" 
                        stroke={node.color} 
                        strokeWidth={2.5} 
                        fill={`url(#fill-${node.id})`} 
                        isAnimationActive={false}
                        style={{ filter: `url(#glow-${node.id})` }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="absolute bottom-2 left-3 right-3 flex justify-between text-[8px] font-mono text-white/30 uppercase tracking-widest">
                  <span>Max Loss</span>
                  <span>Max Profit</span>
                </div>
              </motion.div>

              {/* Description */}
              <motion.p variants={itemVariants} className="text-xs text-white/70 leading-relaxed font-light">
                {node.description}
              </motion.p>

              {/* ── REGIME ALIGNMENT DIAGNOSTICS DECK ── */}
              {suitabilityInfo && suitabilityMeta && activeAsset && (
                <motion.div
                  variants={itemVariants}
                  className="bg-[#05070a]/90 border border-white/5 rounded-xl p-3 flex flex-col gap-2.5 font-mono text-[9px]"
                >
                  <div className="flex items-center justify-between border-b border-white/5 pb-1.5 mb-0.5">
                    <span className="text-white/30 uppercase tracking-widest text-[8px]">Regime Suitability Rating</span>
                    <span 
                      className="px-2 py-0.5 rounded text-[8px] font-bold"
                      style={{ color: suitabilityMeta.color, backgroundColor: suitabilityMeta.bg }}
                    >
                      {suitabilityMeta.label}
                    </span>
                  </div>

                  {/* Suitability score bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[8.5px]">
                      <span className="text-white/45">MATCH RATING:</span>
                      <span style={{ color: suitabilityMeta.color }} className="font-bold">{suitabilityInfo.score}/100</span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-1000"
                        style={{ 
                          width: `${suitabilityInfo.score}%`,
                          backgroundColor: suitabilityMeta.color,
                          boxShadow: `0 0 8px ${suitabilityMeta.color}80`
                        }}
                      />
                    </div>
                  </div>

                  {/* Detailed suitability reasons */}
                  <div className="text-white/60 leading-relaxed text-[8.5px] p-2 bg-white/3 border border-white/5 rounded">
                    {suitabilityInfo.reason}
                  </div>

                  {/* Greeks warnings */}
                  <div className="flex gap-2 items-start text-white/50 text-[8px] leading-relaxed">
                    {suitabilityInfo.suitability.includes("VULNERABLE") ? (
                      <ShieldAlert size={12} className="text-rose-400 shrink-0 mt-0.5" />
                    ) : (
                      <ShieldCheck size={12} className="text-emerald-400 shrink-0 mt-0.5" />
                    )}
                    <span>{suitabilityInfo.greeksWarning}</span>
                  </div>
                </motion.div>
              )}

              {/* Strategy Parameters Grid */}
              <motion.div variants={itemVariants} className="grid grid-cols-2 gap-2 text-left">
                <div className="bg-black/30 border border-white/5 rounded-lg p-2.5 flex items-center gap-2.5">
                  <Crosshair size={14} style={{ color: node.color }} />
                  <div>
                    <div className="text-[8px] text-white/40 uppercase tracking-wider mb-0.5">Direction</div>
                    <div className="text-[10px] text-white font-medium">{node.condition}</div>
                  </div>
                </div>

                <div className="bg-black/30 border border-white/5 rounded-lg p-2.5 flex items-center gap-2.5">
                  <Compass size={14} style={{ color: node.color }} />
                  <div>
                    <div className="text-[8px] text-white/40 uppercase tracking-wider mb-0.5">Volatility</div>
                    <div className="text-[10px] text-white font-medium">
                      {node.condition === "Volatile" ? "Long Vol" : node.condition === "Neutral" ? "Short Vol" : "Directional"}
                    </div>
                  </div>
                </div>

                <div className="bg-black/30 border border-white/5 rounded-lg p-2.5 flex items-center gap-2.5">
                  <AlertTriangle size={14} style={{ color: node.color }} />
                  <div>
                    <div className="text-[8px] text-white/40 uppercase tracking-wider mb-0.5">Risk Limit</div>
                    <div className="text-[10px] text-white font-medium">
                      {node.complexity === 1 ? "Defined Risk" : "Defined Spread"}
                    </div>
                  </div>
                </div>

                <div className="bg-black/30 border border-white/5 rounded-lg p-2.5 flex items-center gap-2.5">
                  <BarChart3 size={14} style={{ color: node.color }} />
                  <div>
                    <div className="text-[8px] text-white/40 uppercase tracking-wider mb-0.5">Complexity</div>
                    <div className="flex gap-0.5 mt-0.5">
                      {[1, 2, 3].map(lvl => (
                        <div 
                          key={lvl} 
                          className="h-1 w-2 rounded-sm" 
                          style={{ backgroundColor: lvl <= node.complexity ? node.color : "rgba(255,255,255,0.08)" }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Theta Simulator Trigger */}
              {THETA_ELIGIBLE.has(node.name) && (
                <motion.div variants={itemVariants} className="mt-1">
                  <button
                    onClick={() => setThetaMode(true)}
                    className="w-full group relative overflow-hidden flex items-center justify-center gap-2 py-2.5 rounded-xl border transition-all duration-300 hover:scale-[1.01] cursor-pointer"
                    style={{
                      borderColor: node.color + "30",
                      background: node.color + "08",
                    }}
                  >
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                         style={{ background: `linear-gradient(90deg, transparent, ${node.color}15, transparent)` }} />
                    <Timer size={12} style={{ color: node.color }} />
                    <span className="text-[10px] font-mono uppercase tracking-[0.15em]" style={{ color: node.color }}>
                      Simulate Theta Decay
                    </span>
                    <span className="text-[8px] font-mono text-white/30 ml-1">→</span>
                  </button>
                </motion.div>
              )}

            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    </div>
    </>
  );
}
