// ============================================================================
// OPTIXFLOW — Playbook Constellation Canvas
// Subscribes to live market feeds. Dynamically evaluates strategy nodes
// against active regimes and renders visual glowing suitability networks.
// ============================================================================

"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Database, TrendingUp, HelpCircle, Activity, Play } from "lucide-react";

import AmbientParticles from "./AmbientParticles";
import ConnectionLayer, { CONSTELLATION_LINKS } from "./ConnectionLayer";
import StrategyNode, { SuitabilityVisualType } from "./StrategyNode";
import StrategyPreview from "./StrategyPreview";
import { PLAYBOOK_NODES } from "@/lib/playbook-data";
import { marketDataService, MarketAsset } from "@/lib/market/MarketDataService";
import { evaluateStrategySuitability } from "@/lib/market/RegimeSuitabilityEngine";

// Volatility Regime visual styling helpers
const REGIME_ACCENTS: Record<string, string> = {
  LOW_VOL_COMPLACENCY: "#00d4ff",   // cyan
  PANIC_EXPANSION: "#ff4d6a",      // crimson
  EARNINGS_INSTABILITY: "#a855f7", // purple
  POST_EVENT_CRUSH: "#00e5a0",     // emerald
  VOL_COMPRESSION: "#10b981",      // green
  LIQUIDITY_SHOCK: "#f5a623",      // amber
};

const REGIME_LABELS: Record<string, string> = {
  LOW_VOL_COMPLACENCY: "LOW-VOL COMPLACENCY",
  PANIC_EXPANSION: "PANIC RISK EXPANSION",
  EARNINGS_INSTABILITY: "EVENT VOL INSTABILITY",
  POST_EVENT_CRUSH: "POST-EVENT IV CRUSH",
  VOL_COMPRESSION: "VOL COMPRESSION ZONE",
  LIQUIDITY_SHOCK: "LIQUIDITY RISK SHOCK",
};

export default function ConstellationCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Real-time market feed state
  const [assets, setAssets] = useState<Record<string, MarketAsset>>({});
  const [selectedTicker, setSelectedTicker] = useState("SPY");

  // Subscribe to live market ticking
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

  const activeAsset = useMemo(() => {
    return assets[selectedTicker] || marketDataService.getAsset(selectedTicker);
  }, [assets, selectedTicker]);

  // Interaction State
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  // Theta decay intensity from simulator
  const [decayIntensity, setDecayIntensity] = useState(0);

  // IV regime intensity
  const ivIntensityRef = useRef(0.5);
  const handleIVChange = useCallback((v: number) => { ivIntensityRef.current = v; }, []);

  // Simulation exclusivity
  const [isSimulationActive, setIsSimulationActive] = useState(false);
  const handleThetaModeChange = useCallback((active: boolean) => {
    setIsSimulationActive(active);
    if (active) setHoveredNode(null);
  }, []);

  // Cinematic Camera State (Mouse Tracking)
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 100, stiffness: 30, mass: 4 };
  const smoothMouseX = useSpring(mouseX, springConfig);
  const smoothMouseY = useSpring(mouseY, springConfig);

  const layerX = useTransform(() => -smoothMouseX.get());
  const layerY = useTransform(() => -smoothMouseY.get());

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      const rawX = e.clientX - width / 2;
      const rawY = e.clientY - height / 2;
      
      const normX = rawX / (width / 2);
      const normY = rawY / (height / 2);

      const clampedX = Math.max(-1, Math.min(1, normX));
      const clampedY = Math.max(-1, Math.min(1, normY));
      
      const easedX = Math.sin(clampedX * (Math.PI / 2));
      const easedY = Math.sin(clampedY * (Math.PI / 2));

      const MAX_DRIFT = 10; 
      
      mouseX.set(easedX * MAX_DRIFT);
      mouseY.set(easedY * MAX_DRIFT);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  // Resolve visual suitability settings for each node
  const nodesSuitability = useMemo(() => {
    const map: Record<string, SuitabilityVisualType> = {};
    PLAYBOOK_NODES.forEach((n) => {
      const res = evaluateStrategySuitability(n.id, activeAsset);
      if (res.score >= 65) map[n.id] = "favored";
      else if (res.score < 40) map[n.id] = "vulnerable";
      else map[n.id] = "neutral";
    });
    return map;
  }, [activeAsset]);

  const activeColor = REGIME_ACCENTS[activeAsset.regime] || "#00d4ff";

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden bg-[#02040a] ${isSimulationActive ? "cursor-default" : "cursor-crosshair"}`}
      onClick={() => {
        if (!hoveredNode && !isSimulationActive) setSelectedNode(null);
      }}
    >
      {/* Dynamic atmospheric backplate that shifts colors with the active regime */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] rounded-full pointer-events-none z-0 filter blur-[150px] opacity-25 transition-all duration-1000"
        style={{
          background: `radial-gradient(circle, ${activeColor}40 0%, transparent 80%)`
        }}
      />

      {/* Deep Background Particle Layer */}
      <AmbientParticles 
        cameraX={smoothMouseX} 
        cameraY={smoothMouseY} 
        activeColor={selectedNode ? PLAYBOOK_NODES.find(n => n.id === selectedNode)?.color : activeColor}
        decayIntensity={decayIntensity}
        ivIntensityRef={ivIntensityRef}
      />

      {/* Constellation Foreground Node Link network */}
      <motion.div 
        className="absolute inset-0"
        style={{
          x: layerX,
          y: layerY,
          pointerEvents: isSimulationActive ? "none" : "none",
          visibility: isSimulationActive ? "hidden" : "visible",
        }}
      >
        <ConnectionLayer hoveredNode={hoveredNode} selectedNode={selectedNode} />
        
        {/* Nodes: pointer-events only active when constellation is active */}
        <div 
          className="absolute inset-0"
          style={{ pointerEvents: isSimulationActive ? "none" : "auto" }}
        >
          {PLAYBOOK_NODES.map((node) => {
            const activeNodeId = selectedNode || hoveredNode;
            
            const connectedNodes = new Set<string>();
            if (activeNodeId) {
              CONSTELLATION_LINKS.forEach(link => {
                if (link.source === activeNodeId) connectedNodes.add(link.target);
                if (link.target === activeNodeId) connectedNodes.add(link.source);
              });
            }
            
            const isNeighbor = connectedNodes.has(node.id);

            let nodeState: "inactive" | "dimmed" | "dimmed-heavy" | "connected" | "hovered" | "selected" = "inactive";
            
            if (activeNodeId) {
              if (selectedNode === node.id) {
                nodeState = "selected";
              } else if (hoveredNode === node.id) {
                nodeState = "hovered";
              } else if (isNeighbor) {
                nodeState = "connected";
              } else {
                nodeState = selectedNode ? "dimmed-heavy" : "dimmed";
              }
            }
            
            const suitability = nodesSuitability[node.id] || "neutral";

            return (
              <StrategyNode
                key={node.id}
                node={node}
                state={nodeState}
                suitability={suitability}
                onHover={setHoveredNode}
                onClick={setSelectedNode}
              />
            );
          })}
        </div>
      </motion.div>

      {/* ── TOP-LEFT HEADER: Platform Branding ── */}
      <div 
        className="absolute top-6 left-6 pointer-events-none select-none"
        style={{
          visibility: isSimulationActive ? "hidden" : "visible",
        }}
      >
        <span className="text-[9px] font-mono tracking-[0.25em] text-cyan-400 uppercase">Interactive Map</span>
        <h1 className="text-lg font-extrabold tracking-tight text-[var(--ox-text-primary)] mt-0.5">
          Strategy Constellation
        </h1>
        <p className="text-[10px] font-mono text-[var(--ox-text-muted)] tracking-wider mt-1 flex items-center gap-1.5">
          <Database size={10} className="text-cyan-400" />
          <span>SUITABILITY MATRICES SYNCED TO REALTIME FEEDS</span>
        </p>
      </div>

      {/* ── TOP-RIGHT CONTROL: Ticker selection and suitability dashboard ── */}
      <div
        className="absolute top-6 right-6 flex flex-col items-end gap-3 z-30"
        style={{
          visibility: isSimulationActive ? "hidden" : "visible",
        }}
      >
        {/* Ticker Buttons */}
        <div className="flex gap-1 p-0.5 bg-black/60 border border-white/5 rounded-lg font-mono text-[9px] backdrop-blur-md">
          {["SPY", "AAPL", "NVDA", "TSLA", "IWM"].map((tk) => {
            const isSel = selectedTicker === tk;
            return (
              <button
                key={tk}
                onClick={() => setSelectedTicker(tk)}
                className={`px-2.5 py-1 rounded cursor-pointer transition-all font-bold ${
                  isSel
                    ? "bg-cyan-500/10 border border-cyan-500/20 text-cyan-400"
                    : "text-white/40 border border-transparent hover:text-white/80"
                }`}
              >
                {tk}
              </button>
            );
          })}
        </div>

        {/* Monospace Suitability Console */}
        <div className="w-[280px] bg-[#07090e]/95 border border-white/10 rounded-xl p-3.5 shadow-2xl font-mono text-[9px] flex flex-col gap-2.5 backdrop-blur-lg">
          <div className="flex items-center justify-between border-b border-white/5 pb-1.5 text-white/30 font-bold uppercase tracking-wider">
            <span>Regime Intelligence</span>
            <div className="flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
              <span>Synced</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-white/50 uppercase">Active Asset:</span>
            <span className="text-cyan-400 font-bold">{selectedTicker} // ${activeAsset.price.toFixed(2)}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-white/50 uppercase">Volatility Regime:</span>
            <span className="font-bold" style={{ color: activeColor }}>
              {REGIME_LABELS[activeAsset.regime] || activeAsset.regime}
            </span>
          </div>

          <div className="text-white/60 leading-normal text-[8.5px] bg-white/3 border border-white/5 p-2 rounded leading-relaxed">
            {activeAsset.regime === "PANIC_EXPANSION" 
              ? "VIX spike. Downside puts are strongly bid. Defined-risk bearish and long-vol geometries (Long Put, Straddle) are highly favored; dimming range structures."
              : activeAsset.regime === "EARNINGS_INSTABILITY"
              ? "Catalyst volatility concentrated near spot. High premium decay imminent. defined-risk spreads preferred over naked positions."
              : activeAsset.regime === "POST_EVENT_CRUSH"
              ? "Extrinsic collapse active. Options premiums deflating. Range trade and short theta capture structures highly favored; long vol severely penalized."
              : "Complacent baseline. Option implied vols trading at discount. Income strategies and range trades preferred. Long premium structures penalized."}
          </div>
        </div>
      </div>

      <StrategyPreview 
        nodeId={selectedNode} 
        onClose={() => setSelectedNode(null)}
        onDecayChange={setDecayIntensity}
        onIVChange={handleIVChange}
        onThetaModeChange={handleThetaModeChange}
        activeAsset={activeAsset} // Pass active asset down for dynamic suitability alignment
      />
      
      {/* Vignette edge shadows */}
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]" />
    </div>
  );
}
