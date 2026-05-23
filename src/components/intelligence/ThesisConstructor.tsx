// ============================================================================
// OPTIXFLOW — Thesis Constructor Component
// Spacecraft cockpit UI controls to construct direction, vol, and risk.
// ============================================================================

"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Compass, TrendingUp, TrendingDown, Eye, ShieldAlert, Cpu, Sparkles } from "lucide-react";
import { ThesisInput } from "@/lib/market/TradeIntelEngine";

interface ThesisConstructorProps {
  onChange: (thesis: ThesisInput) => void;
}

export default function ThesisConstructor({ onChange }: ThesisConstructorProps) {
  // Configured thesis state
  const [direction, setDirection] = useState<ThesisInput["direction"]>("bullish");
  const [magnitude, setMagnitude] = useState<ThesisInput["magnitude"]>("moderate");
  const [horizon, setHorizon] = useState<ThesisInput["horizon"]>(30);
  const [ivExpectation, setIvExpectation] = useState<ThesisInput["ivExpectation"]>("stable");
  const [riskAppetite, setRiskAppetite] = useState<ThesisInput["riskAppetite"]>("defined");

  // Push updates up to dashboard when state shifts
  useEffect(() => {
    onChange({
      direction,
      magnitude,
      horizon,
      ivExpectation,
      riskAppetite
    });
  }, [direction, magnitude, horizon, ivExpectation, riskAppetite, onChange]);

  // Direction definitions
  const directionOptions = [
    { id: "bullish", label: "Bullish", icon: TrendingUp, color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/40" },
    { id: "bearish", label: "Bearish", icon: TrendingDown, color: "text-rose-400 border-rose-500/20 bg-rose-500/5 hover:border-rose-500/40" },
    { id: "neutral", label: "Neutral", icon: Eye, color: "text-cyan-400 border-cyan-500/20 bg-cyan-500/5 hover:border-cyan-500/40" },
    { id: "volatile", label: "Volatile", icon: ShieldAlert, color: "text-purple-400 border-purple-500/20 bg-purple-500/5 hover:border-purple-500/40" }
  ] as const;

  return (
    <div className="bg-[#05070c]/90 border border-white/10 rounded-2xl p-5 shadow-2xl overflow-hidden relative flex flex-col gap-4 font-mono text-[10.5px]">
      
      {/* Decorative backdrop rotating circle */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 opacity-[0.02] pointer-events-none z-0">
        <svg viewBox="0 0 100 100" className="w-full h-full animate-spin-slow">
          <circle cx="50" cy="50" r="45" fill="none" stroke="#fff" strokeWidth="0.5" strokeDasharray="3 3" />
          <circle cx="50" cy="50" r="38" fill="none" stroke="#fff" strokeWidth="0.3" />
          <circle cx="50" cy="50" r="28" fill="none" stroke="#fff" strokeWidth="0.6" strokeDasharray="12 4" />
        </svg>
      </div>

      <div className="relative z-10 flex flex-col gap-4">
        {/* Cockpit header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <Cpu size={14} className="text-cyan-400 animate-pulse" />
            <span className="text-[9px] uppercase tracking-widest text-white/50 font-bold">Thesis Constructor Cockpit</span>
          </div>
          <span className="text-[7.5px] border border-cyan-500/20 bg-cyan-500/5 px-2 py-0.5 rounded text-cyan-400 font-bold">
            CALIBRATION: ONLINE
          </span>
        </div>

        {/* Section 1: Direction Outlook (Segmented dials) */}
        <div className="space-y-2">
          <label className="text-[8px] text-white/35 uppercase tracking-widest block font-bold">
            1. Directional Vector
          </label>
          <div className="grid grid-cols-2 gap-2">
            {directionOptions.map((opt) => {
              const active = direction === opt.id;
              const Icon = opt.icon;
              return (
                <button
                  key={opt.id}
                  onClick={() => setDirection(opt.id)}
                  className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between ${
                    active 
                      ? "bg-white/10 text-white border-white/30 font-bold shadow-lg"
                      : opt.color
                  }`}
                  style={{
                    boxShadow: active ? `0 0 12px rgba(255,255,255,0.05)` : "none"
                  }}
                >
                  <span className="tracking-wider">{opt.label}</span>
                  <Icon size={12} className={active ? "text-white" : "text-current"} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2: Expected Move Magnitude */}
        <div className="space-y-2">
          <label className="text-[8px] text-white/35 uppercase tracking-widest block font-bold">
            2. Dispersion Magnitude
          </label>
          <div className="grid grid-cols-3 gap-1.5 p-0.5 bg-white/3 border border-white/5 rounded-xl">
            {(["small", "moderate", "large"] as const).map((mag) => {
              const active = magnitude === mag;
              return (
                <button
                  key={mag}
                  onClick={() => setMagnitude(mag)}
                  className={`py-1.5 rounded-lg text-center cursor-pointer transition-all uppercase tracking-wider text-[8.5px] ${
                    active
                      ? "bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-bold"
                      : "text-white/40 border border-transparent hover:text-white/70"
                  }`}
                >
                  {mag}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 3: Time Horizon (snapping nodes) */}
        <div className="space-y-2.5">
          <div className="flex justify-between text-[8px] uppercase tracking-widest text-white/35 font-bold">
            <span>3. Temporal Horizon</span>
            <span className="text-cyan-400">{horizon} Days to Expiry</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5 font-bold text-[8.5px]">
            {([7, 14, 30, 60] as const).map((h) => {
              const active = horizon === h;
              return (
                <button
                  key={h}
                  onClick={() => setHorizon(h)}
                  className={`py-1.5 rounded-lg text-center cursor-pointer transition-all border ${
                    active
                      ? "bg-cyan-500/15 border-cyan-500/35 text-cyan-400"
                      : "bg-white/3 border-white/5 text-white/40 hover:text-white/70"
                  }`}
                >
                  {h}D
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 4: IV Expectation */}
        <div className="space-y-2">
          <label className="text-[8px] text-white/35 uppercase tracking-widest block font-bold">
            4. Volatility regime shift
          </label>
          <div className="grid grid-cols-3 gap-1.5 p-0.5 bg-white/3 border border-white/5 rounded-xl">
            {(["expansion", "stable", "crush"] as const).map((iv) => {
              const active = ivExpectation === iv;
              return (
                <button
                  key={iv}
                  onClick={() => setIvExpectation(iv)}
                  className={`py-1.5 rounded-lg text-center cursor-pointer transition-all uppercase tracking-wider text-[8px] ${
                    active
                      ? "bg-purple-500/15 border border-purple-500/25 text-purple-400 font-bold"
                      : "text-white/40 border border-transparent hover:text-white/70"
                  }`}
                >
                  {iv === "expansion" ? "Expansion" : iv === "crush" ? "Crush" : "Stable"}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 5: Risk Appetite */}
        <div className="space-y-2">
          <label className="text-[8px] text-white/35 uppercase tracking-widest block font-bold">
            5. Risk Geometry Appetite
          </label>
          <div className="grid grid-cols-3 gap-1.5 p-0.5 bg-white/3 border border-white/5 rounded-xl">
            {(["defined", "moderate", "aggressive"] as const).map((risk) => {
              const active = riskAppetite === risk;
              return (
                <button
                  key={risk}
                  onClick={() => setRiskAppetite(risk)}
                  className={`py-1.5 rounded-lg text-center cursor-pointer transition-all uppercase tracking-wider text-[8px] ${
                    active
                      ? "bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 font-bold"
                      : "text-white/40 border border-transparent hover:text-white/70"
                  }`}
                >
                  {risk === "defined" ? "Defined" : risk === "aggressive" ? "Aggressive" : "Moderate"}
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
