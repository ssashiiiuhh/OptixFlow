"use client";

import { motion } from "framer-motion";
import { Bookmark, Play, Target, Shield, Zap } from "lucide-react";
import { ScenarioState } from "@/hooks/useScenarioHistory";

interface SavedStrategiesProps {
  onLoadStrategy: (strategyData: Partial<ScenarioState>) => void;
}

const PRESETS = [
  {
    id: "preset-1",
    name: "Earnings Crush Iron Condor",
    description: "Neutral stance to capture high IV crush post-earnings. Defined risk on both sides.",
    icon: Shield,
    color: "#00d4ff",
    data: {
      strategy: "Iron Condor",
      dte: 5,
      spreadWidth: 10,
      iv: 65,
    }
  },
  {
    id: "preset-2",
    name: "VIX Spike Straddle",
    description: "Long volatility play anticipating extreme directional move or systemic shock.",
    icon: Zap,
    color: "#a855f7",
    data: {
      strategy: "Long Straddle",
      dte: 30,
      iv: 25,
    }
  },
  {
    id: "preset-3",
    name: "Bullish Tech Squeeze",
    description: "Aggressive directional exposure using a debit spread to limit entry cost.",
    icon: Target,
    color: "#00e5a0",
    data: {
      strategy: "Bull Call Spread",
      dte: 14,
      spreadWidth: 5,
      iv: 35,
    }
  },
  {
    id: "preset-4",
    name: "Bearish Market Hedge",
    description: "Portfolio protection using a put spread to finance downside tails.",
    icon: Shield,
    color: "#ff4d6a",
    data: {
      strategy: "Bear Put Spread",
      dte: 45,
      spreadWidth: 15,
      iv: 18,
    }
  }
];

export default function SavedStrategies({ onLoadStrategy }: SavedStrategiesProps) {
  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-6 relative z-10 flex flex-col items-center">
      <div className="w-full max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[var(--ox-text-primary)] uppercase tracking-tight flex items-center gap-2">
              <Bookmark className="text-[var(--ox-accent-cyan)]" />
              Strategy Library
            </h2>
            <p className="text-[11px] text-[var(--ox-text-muted)] font-mono mt-1">
              Quick-load optimized option geometries and institutional presets.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PRESETS.map((preset, i) => {
            const Icon = preset.icon;
            return (
              <motion.div
                key={preset.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="group relative glass border border-white/5 rounded-xl p-5 hover:bg-white/[0.02] transition-colors cursor-pointer overflow-hidden"
                onClick={() => onLoadStrategy(preset.data)}
              >
                {/* Background glow on hover */}
                <div 
                  className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500"
                  style={{ backgroundColor: preset.color }}
                />

                <div className="flex items-start justify-between relative z-10">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center bg-black/40 border border-white/10"
                      style={{ boxShadow: `inset 0 0 10px ${preset.color}20` }}
                    >
                      <Icon size={18} style={{ color: preset.color }} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white tracking-wide">{preset.name}</h3>
                      <div className="flex items-center gap-2 text-[10px] font-mono text-white/50 mt-1 uppercase">
                        <span>{preset.data.strategy}</span>
                        <span>•</span>
                        <span>{preset.data.dte} DTE</span>
                      </div>
                    </div>
                  </div>
                  
                  <button className="w-8 h-8 rounded-full border border-white/10 bg-black/40 flex items-center justify-center text-white/50 group-hover:bg-white/10 group-hover:text-white transition-colors">
                    <Play size={12} className="ml-0.5" />
                  </button>
                </div>
                
                <p className="text-[11px] text-white/40 leading-relaxed mt-4 relative z-10">
                  {preset.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
