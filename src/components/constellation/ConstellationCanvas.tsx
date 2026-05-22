"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import AmbientParticles from "./AmbientParticles";
import ConnectionLayer, { CONSTELLATION_LINKS } from "./ConnectionLayer";
import StrategyNode from "./StrategyNode";
import StrategyPreview from "./StrategyPreview";
import { PLAYBOOK_NODES } from "@/lib/playbook-data";

export default function ConstellationCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Interaction State
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // Cinematic Camera State (Mouse Tracking)
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Apply spring physics for smooth, heavily damped cinematic drift
  const springConfig = { damping: 100, stiffness: 30, mass: 4 };
  const smoothMouseX = useSpring(mouseX, springConfig);
  const smoothMouseY = useSpring(mouseY, springConfig);

  // We removed focusX and focusY tracking here.
  // Shifting the entire constellation layer via a focus target causes the hovered StrategyNode 
  // to physically move out from under the user's cursor, instantly triggering an onMouseLeave 
  // event and creating an infinite jitter/flicker loop near screen edges.


  // Combined camera transform for the foreground constellation layer
  // smoothMouseX represents the actual offset directly now, so we subtract it for inverse parallax.
  const layerX = useTransform(() => -smoothMouseX.get());
  const layerY = useTransform(() => -smoothMouseY.get());

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Use window dimensions to prevent any container bounding box discontinuities
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      // 1. Center-relative raw coordinates
      const rawX = e.clientX - width / 2;
      const rawY = e.clientY - height / 2;
      
      // 2. Normalize to [-1, 1] relative to viewport center
      const normX = rawX / (width / 2);
      const normY = rawY / (height / 2);

      // 3. Soft nonlinear falloff (Sine wave interpolation)
      const clampedX = Math.max(-1, Math.min(1, normX));
      const clampedY = Math.max(-1, Math.min(1, normY));
      
      const easedX = Math.sin(clampedX * (Math.PI / 2));
      const easedY = Math.sin(clampedY * (Math.PI / 2));

      // 4. Scale by maximum pixel drift range
      const MAX_DRIFT = 10; 
      
      mouseX.set(easedX * MAX_DRIFT);
      mouseY.set(easedY * MAX_DRIFT);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-[#02040a] cursor-crosshair"
      onClick={() => {
        // If clicking on empty space, deselect
        if (!hoveredNode) setSelectedNode(null);
      }}
    >
      {/* Deep Background Layer */}
      <AmbientParticles cameraX={smoothMouseX} cameraY={smoothMouseY} />

      {/* Foreground Strategy Layer with Parallax */}
      <motion.div 
        className="absolute inset-0 pointer-events-none"
        style={{ x: layerX, y: layerY }}
      >
        <ConnectionLayer hoveredNode={hoveredNode} selectedNode={selectedNode} />
        
        {/* Nodes must have pointer-events-auto to receive hover/clicks */}
        <div className="absolute inset-0 pointer-events-auto">
          {PLAYBOOK_NODES.map((node) => {
            const activeNodeId = hoveredNode || selectedNode;
            
            // Determine graph relationships
            const connectedNodes = new Set<string>();
            if (activeNodeId) {
              CONSTELLATION_LINKS.forEach(link => {
                if (link.source === activeNodeId) connectedNodes.add(link.target);
                if (link.target === activeNodeId) connectedNodes.add(link.source);
              });
            }
            
            const isNeighbor = connectedNodes.has(node.id);

            let nodeState: "inactive" | "dimmed" | "connected" | "hovered" | "selected" = "inactive";
            
            if (activeNodeId) {
              if (selectedNode === node.id) {
                nodeState = "selected";
              } else if (hoveredNode === node.id) {
                nodeState = "hovered";
              } else if (isNeighbor) {
                nodeState = "connected";
              } else {
                nodeState = "dimmed";
              }
            }
            
            return (
              <StrategyNode
                key={node.id}
                node={node}
                state={nodeState}
                onHover={setHoveredNode}
                onClick={setSelectedNode}
              />
            );
          })}
        </div>
      </motion.div>

      {/* UI Overlay Layer (Fixed to screen, unaffected by camera) */}
      <div className="absolute top-6 left-6 pointer-events-none">
        <h1 className="text-xl font-bold tracking-tight text-[var(--ox-text-primary)]">
          Strategy Constellation
        </h1>
        <p className="text-[11px] text-[var(--ox-text-muted)] tracking-wider uppercase mt-1">
          OptixFlow Intelligence Map
        </p>
      </div>

      <StrategyPreview 
        nodeId={selectedNode} 
        onClose={() => setSelectedNode(null)} 
      />
      
      {/* Vignette edge shadows */}
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]" />
    </div>
  );
}
