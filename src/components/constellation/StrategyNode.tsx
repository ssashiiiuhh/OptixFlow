"use client";

import { motion } from "framer-motion";
import { type StrategyNode } from "@/lib/playbook-data";

export type NodeInteractionState = "inactive" | "dimmed" | "connected" | "hovered" | "selected";

interface NodeProps {
  node: StrategyNode;
  state: NodeInteractionState;
  onHover: (id: string | null) => void;
  onClick: (id: string) => void;
}

export default function StrategyNode({ node, state, onHover, onClick }: NodeProps) {
  // Visual Hierarchy Mappings
  const isSelected = state === "selected";
  const isHovered = state === "hovered";
  const isConnected = state === "connected";
  const isInactive = state === "inactive";
  const isDimmed = state === "dimmed";

  // State-based configurations
  const scale = isSelected ? 1.4 : isHovered ? 1.3 : isConnected ? 1.1 : isDimmed ? 0.9 : 1;
  const opacity = isSelected || isHovered ? 1 : isConnected ? 0.9 : isInactive ? 0.6 : 0.15;
  const zIndex = isSelected || isHovered ? 50 : isConnected ? 30 : 10;
  
  const glowOpacity = isSelected ? 1 : isHovered ? 0.8 : isConnected ? 0.4 : 0.1;
  const glowScale = isSelected ? 3 : isHovered ? 2.5 : isConnected ? 1.5 : 1;
  const dotColor = isSelected || isHovered ? "#fff" : isConnected ? node.color : "rgba(255,255,255,0.15)";
  const dotShadow = isSelected || isHovered ? `0 0 20px ${node.color}, 0 0 40px ${node.color}` : isConnected ? `0 0 10px ${node.color}` : "none";

  const textColor = isSelected || isHovered ? "#fff" : isConnected ? node.color : "rgba(255,255,255,0.4)";
  const textShadow = isSelected || isHovered ? `0 0 10px ${node.color}, 0 0 20px ${node.color}` : isConnected ? `0 0 8px ${node.color}80` : "none";
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
        {/* Breathing ambient glow */}
        <motion.div 
          className="absolute inset-0 rounded-full blur-xl pointer-events-none"
          animate={{ opacity: glowOpacity, scale: glowScale }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{ background: node.color }}
        />
        
        {/* Core Dot */}
        <div 
          className="relative w-3 h-3 rounded-full border border-white/20 transition-all duration-300"
          style={{ 
            background: dotColor,
            boxShadow: dotShadow,
          }}
        />

        {/* Label */}
        <motion.div 
          className="absolute top-6 whitespace-nowrap pointer-events-none"
          animate={{ y: textY, opacity: isDimmed ? 0.5 : 1 }}
        >
          <span 
            className="text-[11px] font-bold font-mono tracking-widest transition-colors duration-300"
            style={{ color: textColor, textShadow }}
          >
            {node.name}
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}
