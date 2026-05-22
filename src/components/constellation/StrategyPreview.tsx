"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, ReferenceLine } from "recharts";
import { generateMiniPayoff, PLAYBOOK_NODES } from "@/lib/playbook-data";
import { X } from "lucide-react";

interface StrategyPreviewProps {
  nodeId: string | null;
  onClose: () => void;
}

export default function StrategyPreview({ nodeId, onClose }: StrategyPreviewProps) {
  const node = PLAYBOOK_NODES.find(n => n.id === nodeId);

  return (
    <AnimatePresence>
      {node && (
        <motion.div
          initial={{ opacity: 0, x: 40, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 40, scale: 0.95 }}
          transition={{ duration: 0.4, type: "spring", bounce: 0 }}
          className="absolute right-8 top-1/2 -translate-y-1/2 w-[340px] z-50 glass rounded-2xl border pointer-events-auto"
          style={{ 
            borderColor: "rgba(255,255,255,0.1)", 
            background: "rgba(11,14,22,0.85)",
            backdropFilter: "blur(24px)",
            boxShadow: `0 24px 48px -12px rgba(0,0,0,0.5), 0 0 24px ${node.color}15`
          }}
        >
          <div className="p-5">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold font-mono tracking-tight" style={{ color: node.color }}>
                  {node.name}
                </h3>
                <div className="flex gap-2 mt-2">
                  <span className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded border border-white/10 text-[var(--ox-text-secondary)]">
                    {node.condition}
                  </span>
                  <span className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded border border-white/10 text-[var(--ox-text-secondary)]">
                    Lvl {node.complexity}
                  </span>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-1 rounded-full hover:bg-white/10 transition-colors text-white/50 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-[12px] text-[var(--ox-text-muted)] leading-relaxed mb-6">
              {node.description}
            </p>

            <div className="h-32 bg-black/40 rounded-xl overflow-hidden border border-white/5 relative mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={generateMiniPayoff(node.name)} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id={`fill-${node.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={node.color} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={node.color} stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" strokeDasharray="2 2" />
                  <XAxis dataKey="price" hide />
                  <YAxis hide domain={['dataMin - 5', 'dataMax + 5']} />
                  <Area 
                    type="linear" 
                    dataKey="pnl" 
                    stroke={node.color} 
                    strokeWidth={2} 
                    fill={`url(#fill-${node.id})`} 
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
              <div className="absolute bottom-2 left-2 right-2 flex justify-between px-1 text-[9px] font-mono text-white/30">
                <span>Loss</span>
                <span>Profit</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {node.tags.map(tag => (
                <span key={tag} className="text-[10px] text-[var(--ox-text-secondary)] bg-white/5 px-2 py-1 rounded-md">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          
          {/* Subtle bottom glow line */}
          <div className="h-1 w-full rounded-b-2xl" style={{ background: `linear-gradient(90deg, transparent, ${node.color}, transparent)`, opacity: 0.5 }} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
