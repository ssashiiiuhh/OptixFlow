"use client";

import { motion } from "framer-motion";
import { PLAYBOOK_NODES } from "@/lib/playbook-data";

interface ConnectionLayerProps {
  hoveredNode: string | null;
  selectedNode: string | null;
}

// Hardcoded logical relationships for the constellation
export const CONSTELLATION_LINKS = [
  { source: "long-call", target: "bull-call" },
  { source: "long-call", target: "cash-secured-put" },
  { source: "long-put", target: "bear-put" },
  { source: "long-put", target: "credit-call" },
  { source: "straddle", target: "strangle" },
  { source: "iron-condor", target: "credit-call" },
  { source: "covered-call", target: "cash-secured-put" },
];

export default function ConnectionLayer({ hoveredNode, selectedNode }: ConnectionLayerProps) {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
      {CONSTELLATION_LINKS.map((link, idx) => {
        const sourceNode = PLAYBOOK_NODES.find(n => n.id === link.source);
        const targetNode = PLAYBOOK_NODES.find(n => n.id === link.target);
        
        if (!sourceNode || !targetNode) return null;

        const isSourceHovered = hoveredNode === sourceNode.id || selectedNode === sourceNode.id;
        const isTargetHovered = hoveredNode === targetNode.id || selectedNode === targetNode.id;
        const isLinkedToActive = isSourceHovered || isTargetHovered;

        // If something is hovered but this link isn't part of it, dim it.
        const isActiveState = hoveredNode !== null || selectedNode !== null;
        const opacity = isActiveState ? (isLinkedToActive ? 0.8 : 0.05) : 0.2;
        const color = isLinkedToActive && isSourceHovered ? sourceNode.color : 
                      isLinkedToActive && isTargetHovered ? targetNode.color : 
                      "rgba(255,255,255,0.2)";

        return (
          <g key={idx}>
            {/* Base Line */}
            <motion.line
              x1={`${sourceNode.x}%`}
              y1={`${sourceNode.y}%`}
              x2={`${targetNode.x}%`}
              y2={`${targetNode.y}%`}
              stroke={color}
              strokeWidth={isLinkedToActive ? 2 : 1}
              strokeDasharray={isLinkedToActive ? "none" : "4 4"}
              initial={false}
              animate={{ opacity }}
              transition={{ duration: 0.4 }}
            />
            {/* Glow Line for Active States */}
            {isLinkedToActive && (
              <motion.line
                x1={`${sourceNode.x}%`}
                y1={`${sourceNode.y}%`}
                x2={`${targetNode.x}%`}
                y2={`${targetNode.y}%`}
                stroke={color}
                strokeWidth={8}
                initial={{ opacity: 0 }}
                animate={{ opacity: opacity * 0.4 }}
                transition={{ duration: 0.4 }}
                style={{ filter: "blur(4px)" }}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}
