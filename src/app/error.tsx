"use client";

import React, { useEffect } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to console for debugging in production
    console.error("System Runtime Alert:", error);
  }, [error]);

  return (
    <div className="w-full h-screen bg-[#020408] text-white flex flex-col items-center justify-center font-mono text-[10px] gap-5 select-none relative overflow-hidden p-6">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-grid opacity-15 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Pulsing Core */}
      <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-white/2 border border-rose-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
        <AlertTriangle className="text-rose-400 animate-pulse" size={24} />
      </div>

      <div className="text-center space-y-2 z-10 max-w-md">
        <div className="text-rose-400 font-bold tracking-widest uppercase text-[11px] font-glow-rose">
          ⚠️ System Runtime Alert
        </div>
        <p className="text-white/70 text-[9.5px] uppercase tracking-wider leading-relaxed">
          An unexpected execution discontinuity occurred in the derivatives cognition stack.
        </p>
        
        {/* Error Details */}
        <div className="p-3 bg-rose-500/5 border border-rose-500/10 rounded-xl text-left text-[8.5px] text-rose-300/80 leading-normal max-h-24 overflow-y-auto mt-2 break-all select-text selection:bg-rose-500/20">
          <span className="font-bold text-rose-400 block mb-1">EXCEPTION_LOG:</span>
          {error.message || "Unknown runtime exception. Check terminal diagnostics."}
          {error.digest && <span className="block mt-1 text-white/30">Digest: {error.digest}</span>}
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 z-10">
        <button
          onClick={() => reset()}
          className="border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 px-4 py-2 rounded-xl text-cyan-400 font-bold transition-all hover:shadow-[0_0_15px_rgba(6,182,212,0.15)] cursor-pointer flex items-center gap-1.5"
        >
          <RotateCcw size={11} />
          <span>RECALIBRATE CORE</span>
        </button>

        <Link
          href="/"
          className="border border-white/10 hover:border-white/20 bg-white/3 hover:bg-white/5 px-4 py-2 rounded-xl text-white/80 transition-all cursor-pointer flex items-center gap-1.5"
        >
          <Home size={11} />
          <span>RETURN HOME</span>
        </Link>
      </div>
    </div>
  );
}
