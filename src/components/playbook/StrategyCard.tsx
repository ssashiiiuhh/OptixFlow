"use client";

import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, ReferenceLine } from "recharts";
import { generateMiniPayoff } from "@/lib/playbook-data";

export default function StrategyCard({ strategy, description, color }: { strategy: string; description: string; color: string }) {
  const data = generateMiniPayoff(strategy);

  return (
    <motion.div 
      className="glass rounded-xl border p-4 transition-all"
      style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(11,14,22,0.6)" }}
      whileHover={{ y: -4, borderColor: `${color}40`, boxShadow: `0 8px 24px -4px ${color}20` }}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="text-[12px] font-bold font-mono" style={{ color }}>{strategy}</h4>
          <p className="text-[10px] text-[var(--ox-text-muted)] mt-1 line-clamp-2 max-w-[200px]">
            {description}
          </p>
        </div>
      </div>

      <div className="h-20 bg-black/20 rounded-lg overflow-hidden border border-white/5 relative">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`fill-${strategy}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                <stop offset="100%" stopColor={color} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="2 2" />
            <XAxis dataKey="price" hide />
            <YAxis hide domain={['dataMin - 5', 'dataMax + 5']} />
            <Area 
              type="linear" 
              dataKey="pnl" 
              stroke={color} 
              strokeWidth={1.5} 
              fill={`url(#fill-${strategy})`} 
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

export function StrategyShowcase() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-4 rounded-full bg-[#00d4ff]" style={{ boxShadow: "0 0 8px rgba(0,212,255,0.5)" }} />
        <h2 className="text-sm font-semibold text-[var(--ox-text-primary)]">Strategy Deep Dives</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StrategyCard strategy="Long Call" description="Unlimited upside. Profit from a bullish move." color="#00e5a0" />
        <StrategyCard strategy="Iron Condor" description="Collect premium. Profit when underlying stays within a defined range." color="#00d4ff" />
        <StrategyCard strategy="Straddle" description="Bet on volatility. Needs a large move in either direction to profit." color="#a855f7" />
      </div>
    </div>
  );
}
