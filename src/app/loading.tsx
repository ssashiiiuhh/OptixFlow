"use client";

import React from "react";
import { Cpu, Activity } from "lucide-react";

export default function Loading() {
  return (
    <div className="w-full h-screen bg-[#020408] text-white flex flex-col items-center justify-center font-mono text-[10px] gap-4 select-none relative overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Pulsing Core */}
      <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-white/2 border border-white/10 animate-pulse">
        <Cpu className="text-cyan-400 animate-spin-slow" size={24} />
        <div className="absolute inset-0 border border-cyan-500/20 rounded-2xl animate-ping opacity-30" />
      </div>

      <div className="text-center space-y-1.5 z-10">
        <div className="flex items-center justify-center gap-1.5 text-cyan-400 font-bold tracking-widest uppercase">
          <Activity size={11} className="animate-pulse" />
          <span>OptixFlow Engine</span>
        </div>
        <p className="text-white/40 text-[9px] uppercase tracking-wider">
          Initializing telemetry grid & modeling risk bounds...
        </p>
      </div>

      {/* Progress Bar mockup */}
      <div className="w-48 h-1 bg-white/5 border border-white/10 rounded-full overflow-hidden relative z-10">
        <div className="h-full bg-cyan-400 w-1/3 animate-loading-bar rounded-full" />
      </div>
    </div>
  );
}
