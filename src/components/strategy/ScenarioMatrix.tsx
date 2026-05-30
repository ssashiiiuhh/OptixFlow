"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Grid, TrendingDown, TrendingUp } from "lucide-react";
import { computeDynamicMetrics } from "@/lib/finance/theta";
import { ScenarioState } from "@/hooks/useScenarioHistory";

interface ScenarioMatrixProps {
  state: ScenarioState;
  initialSpot: number;
  initialIv: number;
}

export default function ScenarioMatrix({ state, initialSpot, initialIv }: ScenarioMatrixProps) {
  const SPOT_STEPS = [-15, -10, -5, 0, 5, 10, 15]; // Percent changes
  const IV_STEPS = [-20, -10, -5, 0, 5, 10, 20]; // Percent changes

  // Precompute the matrix of P&L values
  const matrixData = useMemo(() => {
    const grid: number[][] = [];
    
    for (const ivDelta of IV_STEPS) {
      const row: number[] = [];
      const testIv = Math.max(1, state.iv + ivDelta);
      
      for (const spotDelta of SPOT_STEPS) {
        const testSpot = initialSpot * (1 + spotDelta / 100);
        
        const metrics = computeDynamicMetrics(
          state.strategy,
          testSpot,
          state.strike,
          state.dte,
          testIv,
          initialSpot,
          initialIv,
          state.spreadWidth
        );
        row.push(metrics.pnl * state.quantity * 100);
      }
      grid.push(row);
    }
    return grid;
  }, [state, initialSpot, initialIv]);

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-6 relative z-10 flex flex-col items-center">
      <div className="w-full max-w-5xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[var(--ox-text-primary)] uppercase tracking-tight flex items-center gap-2">
              <Grid className="text-[var(--ox-accent-cyan)]" />
              Scenario Payoff Matrix
            </h2>
            <p className="text-[11px] text-[var(--ox-text-muted)] font-mono mt-1">
              Projected P&L based on Spot Price vs. Implied Volatility shocks.
            </p>
          </div>
          <div className="text-right text-[10px] font-mono text-white/50">
            Strategy: <span className="text-white font-bold">{state.strategy}</span><br/>
            DTE: <span className="text-cyan-400 font-bold">{state.dte}</span>
          </div>
        </div>

        <div className="relative glass border border-white/5 rounded-2xl p-6 shadow-2xl overflow-x-auto">
          {/* Y-Axis Label */}
          <div className="absolute left-2 top-1/2 -translate-y-1/2 -rotate-90 text-[9px] font-mono tracking-widest text-white/30 uppercase font-bold">
            IV Shift (%)
          </div>
          
          <table className="w-full border-collapse ml-4">
            <thead>
              <tr>
                <th className="p-2 border-b border-r border-white/5 text-[9px] font-mono text-white/40 font-normal">
                  Spot Δ →
                </th>
                {SPOT_STEPS.map((spotDelta, i) => (
                  <th key={i} className="p-3 border-b border-white/5 text-center font-mono text-[10px]">
                    <div className="flex flex-col items-center gap-1">
                      <span className={spotDelta > 0 ? "text-emerald-400" : spotDelta < 0 ? "text-rose-400" : "text-white/60"}>
                        {spotDelta > 0 ? "+" : ""}{spotDelta}%
                      </span>
                      <span className="text-white/30 text-[9px]">
                        ${(initialSpot * (1 + spotDelta / 100)).toFixed(1)}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {IV_STEPS.map((ivDelta, rIdx) => (
                <tr key={rIdx}>
                  <td className="p-3 border-r border-white/5 text-right font-mono text-[10px] whitespace-nowrap">
                    <span className={ivDelta > 0 ? "text-emerald-400" : ivDelta < 0 ? "text-rose-400" : "text-white/60"}>
                      {ivDelta > 0 ? "+" : ""}{ivDelta}% IV
                    </span>
                  </td>
                  
                  {matrixData[rIdx].map((pnl, cIdx) => {
                    // Compute intensity for color scaling
                    const maxPnl = Math.max(...matrixData.flat().map(Math.abs));
                    const intensity = maxPnl > 0 ? Math.min(1, Math.abs(pnl) / maxPnl) : 0;
                    
                    const isWin = pnl >= 0;
                    const bgColor = isWin 
                      ? `rgba(16, 185, 129, ${intensity * 0.4})` // Emerald
                      : `rgba(244, 63, 94, ${intensity * 0.4})`; // Rose
                      
                    const textColor = isWin ? "text-emerald-300" : "text-rose-300";

                    return (
                      <td key={cIdx} className="p-1">
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: (rIdx * 0.02) + (cIdx * 0.02) }}
                          className="w-full h-full rounded flex items-center justify-center p-3 font-mono text-[11px] font-bold border border-white/5 backdrop-blur-sm transition-colors hover:brightness-125 cursor-default"
                          style={{ backgroundColor: bgColor }}
                        >
                          <span className={Math.abs(pnl) < 1 ? "text-white/30 font-normal" : textColor}>
                            {pnl >= 0 ? "+" : "-"}${Math.abs(pnl).toFixed(0)}
                          </span>
                        </motion.div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          
          {/* X-Axis Label */}
          <div className="w-full text-center text-[9px] font-mono tracking-widest text-white/30 uppercase mt-4 font-bold">
            Underlying Price Shift (%)
          </div>
        </div>
      </div>
    </div>
  );
}
