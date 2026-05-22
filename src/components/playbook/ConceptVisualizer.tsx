"use client";

import { motion } from "framer-motion";

export default function ConceptVisualizer() {
  return (
    <div className="glass rounded-2xl border border-[var(--ox-border-default)] p-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1.5 h-4 rounded-full bg-[#f5a623]" style={{ boxShadow: "0 0 8px rgba(245,166,35,0.5)" }} />
        <h2 className="text-sm font-semibold text-[var(--ox-text-primary)]">Core Concepts</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Delta Module */}
        <div className="rounded-xl border border-white/5 bg-black/20 p-4">
          <h3 className="text-[11px] font-bold text-[var(--ox-accent-cyan)] font-mono uppercase tracking-widest mb-2">Delta (Δ)</h3>
          <p className="text-[10px] text-[var(--ox-text-muted)] mb-4">
            Directional exposure. Rate of change of the option price with respect to $1 change in the underlying asset.
          </p>
          <div className="h-2 rounded-full bg-white/5 overflow-hidden flex relative">
            <div className="w-1/2 border-r border-white/20" />
            {/* Visualizer animation: Delta shifting */}
            <motion.div 
              className="absolute top-0 bottom-0 left-1/2 w-1/4 rounded-full"
              style={{ background: "linear-gradient(90deg, #00d4ff00, #00d4ff)" }}
              animate={{ x: ["0%", "50%", "0%"] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
          <div className="flex justify-between text-[9px] text-[var(--ox-text-muted)] mt-1.5 font-mono">
            <span>-1.00 (Short)</span>
            <span>0.00</span>
            <span>+1.00 (Long)</span>
          </div>
        </div>

        {/* Theta Module */}
        <div className="rounded-xl border border-white/5 bg-black/20 p-4">
          <h3 className="text-[11px] font-bold text-[#ff4d6a] font-mono uppercase tracking-widest mb-2">Theta (Θ)</h3>
          <p className="text-[10px] text-[var(--ox-text-muted)] mb-4">
            Time decay. The amount an option's price decreases each day as it approaches expiration. Non-linear.
          </p>
          <div className="relative h-12 flex items-end px-2 border-b border-l border-white/10">
            {/* Exponential decay curve approximation */}
            <svg className="absolute inset-0 w-full h-full overflow-visible">
              <path 
                d="M 0,0 Q 60,0 100,40" 
                fill="none" 
                stroke="#ff4d6a" 
                strokeWidth="2" 
                vectorEffect="non-scaling-stroke" 
                className="opacity-50"
              />
              <motion.circle
                r="3"
                fill="#ff4d6a"
                animate={{ cx: ["0%", "100%"], cy: ["0%", "100%"] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeIn" }}
                style={{ filter: "drop-shadow(0 0 4px #ff4d6a)" }}
              />
            </svg>
            <span className="absolute bottom-1 right-2 text-[8px] text-[var(--ox-text-muted)]">Expiry</span>
          </div>
        </div>
      </div>
    </div>
  );
}
