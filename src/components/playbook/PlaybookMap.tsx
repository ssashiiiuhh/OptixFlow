"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { PLAYBOOK_NODES, type StrategyNode } from "@/lib/playbook-data";

// ── Background constellation links ────────────────────────────────────────

function ConstellationLinks() {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.15 }}>
      {/* Just draw some aesthetic lines connecting nodes */}
      <line x1="20%" y1="30%" x2="35%" y2="20%" stroke="#00e5a0" strokeWidth="1" strokeDasharray="4 4" />
      <line x1="20%" y1="30%" x2="30%" y2="45%" stroke="#00e5a0" strokeWidth="1" strokeDasharray="4 4" />
      
      <line x1="80%" y1="30%" x2="65%" y2="20%" stroke="#ff4d6a" strokeWidth="1" strokeDasharray="4 4" />
      <line x1="80%" y1="30%" x2="70%" y2="45%" stroke="#ff4d6a" strokeWidth="1" strokeDasharray="4 4" />

      <line x1="50%" y1="10%" x2="50%" y2="25%" stroke="#a855f7" strokeWidth="1" strokeDasharray="4 4" />
      
      <line x1="50%" y1="50%" x2="50%" y2="70%" stroke="#00d4ff" strokeWidth="1" strokeDasharray="4 4" />
    </svg>
  );
}

// ── Node component ────────────────────────────────────────────────────────

function Node({ node, active, onClick }: { node: StrategyNode; active: boolean; onClick: () => void }) {
  return (
    <motion.div
      className="absolute cursor-pointer -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${node.x}%`, top: `${node.y}%`, zIndex: active ? 20 : 10 }}
      whileHover={{ scale: 1.1 }}
      onClick={onClick}
    >
      <div className="relative group">
        {/* Glow */}
        <div 
          className="absolute inset-0 rounded-full blur-md transition-opacity duration-300"
          style={{ background: node.color, opacity: active ? 0.6 : 0 }}
        />
        
        {/* Core */}
        <div 
          className="relative w-4 h-4 rounded-full border-2 transition-all duration-300"
          style={{ 
            borderColor: node.color, 
            background: active ? node.color : "var(--ox-bg-void)",
            boxShadow: active ? `0 0 15px ${node.color}` : "none"
          }}
        />

        {/* Label */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 text-center pointer-events-none">
          <p 
            className="text-[10px] font-mono font-bold whitespace-nowrap transition-colors"
            style={{ color: active ? node.color : "var(--ox-text-secondary)" }}
          >
            {node.name}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main Map Component ────────────────────────────────────────────────────

export default function PlaybookMap({ activeNode, onSelectNode }: { activeNode: string; onSelectNode: (id: string) => void }) {
  const activeDetails = PLAYBOOK_NODES.find((n) => n.id === activeNode);

  return (
    <div className="glass rounded-2xl border border-[var(--ox-border-default)] flex flex-col h-[400px] overflow-hidden relative">
      <div className="px-4 py-3 border-b border-[var(--ox-border-subtle)] bg-white/[0.01] shrink-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-4 rounded-full bg-[var(--ox-accent-cyan)] glow-cyan" />
          <h2 className="text-sm font-semibold text-[var(--ox-text-primary)]">Strategy Constellation</h2>
        </div>
        <p className="text-[10px] text-[var(--ox-text-muted)] mt-0.5 ml-3.5">
          Map of common option strategies grouped by directional bias.
        </p>
      </div>

      <div className="flex-1 relative">
        <ConstellationLinks />
        
        {/* Map quadrants labels */}
        <div className="absolute inset-0 p-4 pointer-events-none flex flex-col justify-between">
          <div className="flex justify-between">
            <span className="text-[10px] font-mono text-[var(--ox-accent-green)] opacity-40 uppercase">Bullish</span>
            <span className="text-[10px] font-mono text-[var(--ox-accent-red)] opacity-40 uppercase">Bearish</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[10px] font-mono text-[var(--ox-accent-cyan)] opacity-40 uppercase">Neutral</span>
            <span className="text-[10px] font-mono text-[var(--ox-accent-purple)] opacity-40 uppercase">Volatile</span>
          </div>
        </div>

        {PLAYBOOK_NODES.map((node) => (
          <Node key={node.id} node={node} active={activeNode === node.id} onClick={() => onSelectNode(node.id)} />
        ))}

        {/* Selected Node Details Panel (Glassmorphism overlay at bottom) */}
        {activeDetails && (
          <motion.div 
            key={activeDetails.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-4 left-4 right-4 p-4 rounded-xl border border-white/10"
            style={{ background: "rgba(7,9,15,0.85)", backdropFilter: "blur(12px)" }}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-bold font-mono" style={{ color: activeDetails.color }}>
                  {activeDetails.name}
                </h3>
                <p className="text-[11px] text-[var(--ox-text-muted)] mt-1 max-w-sm">
                  {activeDetails.description}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[9px] uppercase tracking-wider text-[var(--ox-text-muted)] block mb-1">Complexity</span>
                <div className="flex gap-1 justify-end">
                  {[1, 2, 3].map((level) => (
                    <div 
                      key={level} 
                      className="w-3 h-1 rounded-full" 
                      style={{ background: level <= activeDetails.complexity ? activeDetails.color : "var(--ox-border-strong)" }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              {activeDetails.tags.map((tag) => (
                <span key={tag} className="text-[9px] font-mono px-2 py-0.5 rounded border border-white/10 text-[var(--ox-text-secondary)]">
                  {tag}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
