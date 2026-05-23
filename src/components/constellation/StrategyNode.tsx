// ============================================================================
// OPTIXFLOW — Playbook Strategy Node Component
// Strategy star nodes which adapt their glows and layouts to suitability.
// ============================================================================

"use client";

import { motion } from "framer-motion";
import { type StrategyNode } from "@/lib/playbook-data";

export type NodeInteractionState = "inactive" | "dimmed" | "dimmed-heavy" | "connected" | "hovered" | "selected";
export type SuitabilityVisualType = "favored" | "vulnerable" | "neutral";

interface NodeProps {
  node: StrategyNode;
  state: NodeInteractionState;
  suitability?: SuitabilityVisualType;
  onHover: (id: string | null) => void;
  onClick: (id: string) => void;
}

export default function StrategyNode({ node, state, suitability = "neutral", onHover, onClick }: NodeProps) {
  // Visual Hierarchy Mappings
  const isSelected = state === "selected";
  const isHovered = state === "hovered";
  const isConnected = state === "connected";
  const isInactive = state === "inactive";
  const isDimmed = state === "dimmed";
  const isDimmedHeavy = state === "dimmed-heavy";

  // Suitability overrides
  const isFavored = suitability === "favored";
  const isVulnerable = suitability === "vulnerable";

  // State-based configurations
  let scale = isSelected ? 1.45 : isHovered ? 1.35 : isConnected ? 1.15 : isDimmed ? 0.85 : isDimmedHeavy ? 0.80 : 1.0;
  if (isFavored && isInactive) scale = 1.1; // Favored nodes are slightly larger
  if (isVulnerable && isInactive) scale = 0.9; // Vulnerable nodes are slightly smaller

  let opacity = isSelected || isHovered ? 1.0 : isConnected ? 0.9 : isInactive ? 0.65 : isDimmed ? 0.20 : 0.05;
  if (isVulnerable && isInactive) opacity = 0.25; // Force vulnerable nodes to dim
  if (isFavored && isInactive) opacity = 0.85; // Favored nodes shine brighter

  const zIndex = isSelected || isHovered ? 50 : isConnected ? 30 : 10;
  
  // Custom glowing halos
  let glowColor = node.color;
  if (isFavored) glowColor = "#00e5a0"; // force emerald
  else if (isVulnerable) glowColor = "#ff4d6a"; // force red
  
  let glowOpacity = isSelected ? 1.0 : isHovered ? 0.85 : isConnected ? 0.45 : 0.12;
  if (isFavored && isInactive) glowOpacity = 0.45; // elevated glow for favored
  if (isVulnerable && isInactive) glowOpacity = 0.05; // tiny glow for vulnerable

  const glowScale = isSelected ? 3.0 : isHovered ? 2.6 : isConnected ? 1.6 : isFavored ? 1.5 : 1.0;

  // Center dot styles
  let dotColor = isSelected || isHovered ? "#fff" : isConnected ? node.color : "rgba(255,255,255,0.18)";
  if (isFavored && isInactive) dotColor = "#00e5a0";
  if (isVulnerable && isInactive) dotColor = "rgba(255, 77, 106, 0.25)";

  let dotShadow = isSelected || isHovered 
    ? `0 0 20px ${glowColor}, 0 0 40px ${glowColor}` 
    : isConnected 
    ? `0 0 10px ${node.color}` 
    : isFavored 
    ? `0 0 12px #00e5a0` 
    : "none";

  // Text label styles
  let textColor = isSelected || isHovered ? "#fff" : isConnected ? node.color : "rgba(255,255,255,0.45)";
  if (isFavored && isInactive) textColor = "#00e5a0";
  if (isVulnerable && isInactive) textColor = "rgba(255, 77, 106, 0.35)";

  const textShadow = isSelected || isHovered 
    ? `0 0 10px ${glowColor}, 0 0 20px ${glowColor}` 
    : isConnected 
    ? `0 0 8px ${node.color}80` 
    : isFavored 
    ? `0 0 6px rgba(0, 229, 160, 0.4)` 
    : "none";

  const textY = isSelected || isHovered ? 0 : 4;

  return (
    <motion.div
      className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer"
      style={{ 
        left: `${node.x}%`, 
        top: `${node.y}%`, 
        zIndex 
      }}
      initial={false}
      animate={{ opacity, scale }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onClick(node.id)}
    >
      <div className="relative group flex items-center justify-center">
        
        {/* Breathing glowing halo overlay */}
        <motion.div 
          className={`absolute inset-0 rounded-full blur-xl pointer-events-none ${
            isFavored && isInactive ? "animate-pulse" : ""
          }`}
          animate={{ opacity: glowOpacity, scale: glowScale }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{ background: glowColor }}
        />
        
        {/* Favored breathing border circle */}
        {isFavored && isInactive && (
          <motion.div
            className="absolute w-6 h-6 rounded-full border border-emerald-500/30 pointer-events-none"
            animate={{ scale: [1.0, 1.8, 1.0], opacity: [0.6, 0.1, 0.6] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        {/* Vulnerable warning border circle */}
        {isVulnerable && isInactive && (
          <div className="absolute w-5 h-5 rounded-full border border-rose-500/10 pointer-events-none" />
        )}

        {/* Core center dot */}
        <div 
          className={`relative w-3 h-3 rounded-full border border-white/20 transition-all duration-300 ${
            isVulnerable ? "border-rose-500/40" : ""
          }`}
          style={{ 
            background: dotColor,
            boxShadow: dotShadow,
          }}
        />

        {/* Text Label */}
        <motion.div 
          className="absolute top-6 whitespace-nowrap pointer-events-none flex flex-col items-center"
          animate={{ y: textY, opacity: isDimmed ? 0.5 : isDimmedHeavy ? 0.2 : 1 }}
        >
          <span 
            className="text-[10px] font-bold font-mono tracking-widest transition-colors duration-300"
            style={{ color: textColor, textShadow }}
          >
            {node.name}
          </span>
          {isFavored && isInactive && (
            <span className="text-[7px] text-emerald-400 font-mono tracking-widest font-normal uppercase mt-0.5 animate-pulse">
              ▲ FAVORED
            </span>
          )}
          {isVulnerable && isInactive && (
            <span className="text-[7px] text-rose-500 font-mono tracking-widest font-normal uppercase mt-0.5">
              ▼ VULNERABLE
            </span>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
