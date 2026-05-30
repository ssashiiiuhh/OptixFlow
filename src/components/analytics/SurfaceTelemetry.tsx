"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Activity } from "lucide-react";
import { usePortfolio } from "../portfolio/PortfolioContext";
import type { IVSurfaceGrid } from "@/lib/quant/surface/ivSurface";

export default function SurfaceTelemetry({ grid }: { grid: IVSurfaceGrid | null }) {
  const { addAiNarrationLine } = usePortfolio();
  const [worstPoint, setWorstPoint] = useState<{ strike: number; dte: number; viol: number; type: string } | null>(null);

  useEffect(() => {
    if (!grid) return;

    let maxWeightedScore = 0;
    let worst = null;
    let rawViol = 0;
    let violType = "";

    for (let i = 0; i < grid.points.length; i++) {
      const p = grid.points[i];
      const cViol = p.cViol || 0;
      const bViol = p.bViol || 0;
      
      // Calendar arbitrage is heavily penalized over butterfly wing convexity
      const weightedScore = (cViol * 5.0) + bViol;
      
      if (weightedScore > maxWeightedScore) {
        maxWeightedScore = weightedScore;
        worst = p;
        rawViol = Math.max(cViol, bViol);
        violType = cViol > bViol ? "CALENDAR (TIME)" : "BUTTERFLY (SKEW)";
      }
    }

    if (maxWeightedScore > 0 && worst && rawViol > 0) {
      setWorstPoint({ strike: worst.strike, dte: worst.dte, viol: rawViol, type: violType });
      if (rawViol > 0.8) {
        addAiNarrationLine(`[SURFACE HAZARD] Severe ${violType} arbitrage violation detected at Strike $${Math.round(worst.strike)}, ${Math.round(worst.dte)} DTE (Magnitude: ${rawViol.toFixed(2)})`);
      }
    } else {
      setWorstPoint(null);
    }
  }, [grid, addAiNarrationLine]);

  return (
    <AnimatePresence>
      {worstPoint && worstPoint.viol > 0.2 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="absolute top-14 right-4 z-20 pointer-events-none"
        >
          <div className="glass rounded-xl border border-[var(--ox-accent-red)]/50 p-2.5 bg-black/80 backdrop-blur-md shadow-[0_0_20px_rgba(255,77,106,0.15)] flex flex-col gap-1.5 min-w-[160px]">
            <div className="flex items-center gap-1.5 text-[var(--ox-accent-red)]">
              <AlertTriangle size={12} className="animate-pulse" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest">
                Arbitrage Alert
              </span>
            </div>
            
            <div className="flex flex-col gap-0.5 mt-1">
              <div className="flex justify-between items-center text-[9px] font-mono">
                <span className="text-[var(--ox-text-muted)]">Worst Node</span>
                <span className="text-[var(--ox-text-primary)] font-semibold">
                  {Math.round(worstPoint.strike)}K / {Math.round(worstPoint.dte)}D
                </span>
              </div>
              <div className="flex justify-between items-center text-[9px] font-mono mt-0.5">
                <span className="text-[var(--ox-text-muted)]">Magnitude</span>
                <span className="text-[var(--ox-accent-red)] font-semibold flex items-center gap-1">
                  {worstPoint.viol.toFixed(2)}
                  {worstPoint.viol > 0.8 && <Activity size={8} className="animate-pulse" />}
                </span>
              </div>
            </div>
            
            {/* Intensity Bar */}
            <div className="w-full h-1 bg-white/5 rounded-full mt-1.5 overflow-hidden relative">
              <motion.div 
                className="absolute inset-y-0 left-0 bg-[var(--ox-accent-red)]"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, worstPoint.viol * 100)}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
