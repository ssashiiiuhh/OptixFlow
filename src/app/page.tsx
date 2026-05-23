// ============================================================================
// OPTIXFLOW — Interactive Cinematic Landing Page
// Quant-terminal aesthetic (Bloomberg Terminal × Interstellar × Quant Lab)
// ============================================================================

"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  TrendingUp,
  BarChart2,
  Cpu,
  Layers,
  BookOpen,
  ChevronRight,
  Activity,
  ArrowRight,
  ShieldCheck,
  Zap,
  Globe,
  Sliders,
  Terminal
} from "lucide-react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
}

export default function LandingPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeTab, setActiveTab] = useState<"lab" | "analytics" | "intel">("intel");

  // Atmospheric Background Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    const maxParticles = 90;

    const handleResize = () => {
      if (!canvas) return;
      canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    const colors = [
      "rgba(6, 182, 212, 0.25)", // Cyan
      "rgba(16, 185, 129, 0.15)", // Emerald
      "rgba(168, 85, 247, 0.2)",  // Purple
      "rgba(251, 146, 60, 0.1)"   // Amber
    ];

    // Generate particles
    for (let i = 0; i < maxParticles; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.15,
        size: Math.random() * 2 + 0.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: Math.random() * 0.4 + 0.1
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw particle flow
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      });

      // Draw subtle grid lines
      ctx.strokeStyle = "rgba(255, 255, 255, 0.015)";
      ctx.lineWidth = 0.5;
      const step = 80;
      for (let x = 0; x < canvas.width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#020408] text-[var(--ox-text-primary)] font-sans relative overflow-x-hidden select-none">
      
      {/* Interactive Background Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full z-0 pointer-events-none"
      />

      {/* Floating telemetry mesh elements */}
      <div className="absolute top-1/4 left-10 w-96 h-96 opacity-[0.01] pointer-events-none z-0">
        <svg viewBox="0 0 100 100" className="w-full h-full animate-spin-slow">
          <circle cx="50" cy="50" r="45" fill="none" stroke="#fff" strokeWidth="0.5" strokeDasharray="3 3" />
          <circle cx="50" cy="50" r="30" fill="none" stroke="#fff" strokeWidth="0.2" />
        </svg>
      </div>
      
      <div className="absolute bottom-10 right-10 w-96 h-96 opacity-[0.01] pointer-events-none z-0">
        <svg viewBox="0 0 100 100" className="w-full h-full animate-spin-reverse-slow">
          <circle cx="50" cy="50" r="40" fill="none" stroke="#fff" strokeWidth="0.5" strokeDasharray="5 5" />
          <circle cx="50" cy="50" r="20" fill="none" stroke="#fff" strokeWidth="0.3" />
        </svg>
      </div>

      {/* Navigation Header */}
      <header className="border-b border-white/5 bg-[#03060c]/50 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between font-mono text-[11px]">
        <div className="flex items-center gap-3">
          <div className="shrink-0 w-7 h-7 rounded-md bg-[var(--ox-accent-cyan-dim)] border border-[var(--ox-accent-cyan)]/30 flex items-center justify-center glow-cyan">
            <Zap size={13} className="text-[var(--ox-accent-cyan)] animate-pulse" />
          </div>
          <span className="text-sm font-bold tracking-tight text-white">
            Optix<span className="text-[var(--ox-accent-cyan)]">Flow</span>
          </span>
          <span className="text-white/10">|</span>
          <span className="text-white/40 tracking-wider">DERIVATIVES COGNITION ENGINE</span>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-white/50">
          <Link href="/strategy" className="hover:text-white transition-colors">STRATEGY LAB</Link>
          <Link href="/analytics" className="hover:text-white transition-colors">ANALYTICS</Link>
          <Link href="/intelligence" className="hover:text-white transition-colors">TRADE INTEL</Link>
          <Link href="/portfolio" className="hover:text-white transition-colors">PORTFOLIO</Link>
          <Link href="/playbook" className="hover:text-white transition-colors">PLAYBOOK</Link>
        </nav>

        <div>
          <Link
            href="/strategy"
            className="border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 px-4 py-2 rounded-xl text-cyan-400 font-bold transition-all hover:shadow-[0_0_15px_rgba(6,182,212,0.15)] cursor-pointer"
          >
            ENTER PLATFORM
          </Link>
        </div>
      </header>

      {/* Section 1: Hero Cinematic Intro */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-16 flex flex-col items-center text-center">
        
        {/* Glowing badge */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="border border-white/5 bg-white/2 rounded-full px-4 py-1.5 mb-6 flex items-center gap-2 font-mono text-[9.5px] text-white/50 tracking-wider"
        >
          <Activity size={10} className="text-cyan-400 animate-pulse" />
          <span>PRODUCTION SYSTEMS FULLY CALIBRATED</span>
        </motion.div>

        {/* Hero Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-tight max-w-4xl"
        >
          A Market Cognition System for Understanding <span className="bg-gradient-to-r from-cyan-400 via-emerald-400 to-purple-400 bg-clip-text text-transparent">Derivatives Behavior.</span>
        </motion.h1>

        {/* Hero Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25 }}
          className="text-white/60 text-sm md:text-base max-w-2xl mt-6 leading-relaxed"
        >
          OptixFlow transforms options strategy design into a reality-aware spatial environment. 
          Interpret skew, model dynamic risk, stress-test positions under volatility regimes, 
          and map your market thesis to optimal structural geometry.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-10 flex flex-wrap justify-center gap-4"
        >
          <Link
            href="/intelligence"
            className="border border-cyan-500/40 bg-cyan-500/10 text-cyan-400 font-bold px-7 py-3.5 rounded-xl hover:bg-cyan-500/20 transition-all flex items-center gap-2 hover:shadow-[0_0_20px_rgba(6,182,212,0.2)] cursor-pointer"
          >
            <span>ENTER INTEL COCKPIT</span>
            <ArrowRight size={14} />
          </Link>
          <Link
            href="/strategy"
            className="border border-white/10 hover:border-white/20 bg-white/3 hover:bg-white/5 text-white/80 px-7 py-3.5 rounded-xl transition-all cursor-pointer"
          >
            LAUNCH STRATEGY LAB
          </Link>
        </motion.div>

        {/* Live HUD telemetry ticker */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
          className="mt-16 w-full border border-white/5 bg-[#05070c]/60 backdrop-blur rounded-2xl p-4.5 font-mono text-[9px] text-white/35 grid grid-cols-2 md:grid-cols-4 gap-4 text-left"
        >
          <div>
            <span className="block text-[8px] uppercase tracking-wider text-white/20 mb-0.5">Asset Reference</span>
            <span className="text-white font-bold text-xs flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> SPY Index
            </span>
          </div>
          <div>
            <span className="block text-[8px] uppercase tracking-wider text-white/20 mb-0.5">Scoring Model</span>
            <span className="text-cyan-400 font-bold text-xs uppercase">Black-Scholes analytical</span>
          </div>
          <div>
            <span className="block text-[8px] uppercase tracking-wider text-white/20 mb-0.5">Volatility Diagnostics</span>
            <span className="text-white font-bold text-xs">Regime Suitability V3</span>
          </div>
          <div>
            <span className="block text-[8px] uppercase tracking-wider text-white/20 mb-0.5">Render Engine</span>
            <span className="text-purple-400 font-bold text-xs uppercase">Atmospheric Web GL / CSS</span>
          </div>
        </motion.div>

      </section>

      {/* Section 2: Core Platform Systems Interactive Showcase */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-20 border-t border-white/5">
        <div className="text-center mb-12">
          <span className="text-[8.5px] uppercase tracking-widest text-cyan-400 font-bold font-mono">
            System Modules
          </span>
          <h2 className="text-2xl md:text-3xl font-bold text-white mt-1">
            Five Connected Cognition Systems
          </h2>
          <p className="text-white/40 text-xs mt-2 max-w-lg mx-auto">
            OptixFlow compartmentalizes raw market mechanics, portfolio diagnostic risk, and learning pathways into individual dashboards.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex justify-center gap-2 mb-8 font-mono text-[10px]">
          {(["intel", "lab", "analytics"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 border rounded-xl cursor-pointer transition-all uppercase tracking-wider font-bold ${
                activeTab === tab
                  ? "bg-white/10 border-white/20 text-white shadow-lg"
                  : "border-transparent text-white/40 hover:text-white/70"
              }`}
            >
              {tab === "intel" ? "1. Trade Intelligence" : tab === "lab" ? "2. Strategy Lab" : "3. Analytics Lab"}
            </button>
          ))}
        </div>

        {/* Render Active Tab Mockup Showcase */}
        <div className="border border-white/10 bg-[#05070c]/90 rounded-2xl shadow-2xl p-5 md:p-8 min-h-[400px] flex flex-col md:flex-row gap-8 items-center">
          
          {/* Mockup Left Side (Description) */}
          <div className="flex-1 space-y-4">
            {activeTab === "intel" && (
              <>
                <div className="inline-flex items-center gap-1 text-[8.5px] font-mono border border-cyan-500/20 bg-cyan-500/5 px-2 py-0.5 rounded text-cyan-400">
                  <Cpu size={10} /> ROUTE: /INTELLIGENCE
                </div>
                <h3 className="text-xl font-bold text-white">Trade Intelligence Cockpit</h3>
                <p className="text-white/60 text-xs leading-relaxed">
                  The high-level intelligence center. Instead of recommending specific trades, it scores option payouts against a configured directional, volatility, and risk thesis. Features a spacecraft-style console, structural rankings, and a monospace risk telemetry log.
                </p>
                <div className="pt-2">
                  <Link
                    href="/intelligence"
                    className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    <span>Launch Intelligence Engine</span>
                    <ChevronRight size={12} />
                  </Link>
                </div>
              </>
            )}

            {activeTab === "lab" && (
              <>
                <div className="inline-flex items-center gap-1 text-[8.5px] font-mono border border-emerald-500/20 bg-emerald-500/5 px-2 py-0.5 rounded text-emerald-400">
                  <Sliders size={10} /> ROUTE: /STRATEGY
                </div>
                <h3 className="text-xl font-bold text-white">Strategy Lab Sandbox</h3>
                <p className="text-white/60 text-xs leading-relaxed">
                  Experiment with complex multi-leg synthetic options structures. Set strike ranges, view dynamic Greek distributions, model risk parameters, and evaluate structural resilience scores against ticking market realities.
                </p>
                <div className="pt-2">
                  <Link
                    href="/strategy"
                    className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    <span>Launch Strategy Lab</span>
                    <ChevronRight size={12} />
                  </Link>
                </div>
              </>
            )}

            {activeTab === "analytics" && (
              <>
                <div className="inline-flex items-center gap-1 text-[8.5px] font-mono border border-purple-500/20 bg-purple-500/5 px-2 py-0.5 rounded text-purple-400">
                  <BarChart2 size={10} /> ROUTE: /ANALYTICS
                </div>
                <h3 className="text-xl font-bold text-white">Analytics Intelligence Lab</h3>
                <p className="text-white/60 text-xs leading-relaxed">
                  A professional-grade market diagnostics environment. Toggle ticker feeds, view dynamic 3D volatility surfaces, track probability cones, and observe atmospheric Greek indicators ticking in real-time.
                </p>
                <div className="pt-2">
                  <Link
                    href="/analytics"
                    className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    <span>Launch Analytics Lab</span>
                    <ChevronRight size={12} />
                  </Link>
                </div>
              </>
            )}
          </div>

          {/* Mockup Right Side (Simulated UI Graphics using pure HTML/CSS) */}
          <div className="flex-1 w-full bg-[#020408] border border-white/5 rounded-xl p-4 font-mono text-[9px] text-white/50 space-y-3 relative overflow-hidden self-stretch min-h-[250px] flex flex-col justify-between">
            <div className="flex justify-between items-center border-b border-white/5 pb-2 text-[8px] uppercase text-white/35">
              <span>Telemetry Monitor</span>
              <span className="text-cyan-400 font-bold">STATUS: RUNNING</span>
            </div>

            {/* Custom Interactive HTML Graphic rendering based on active tab */}
            {activeTab === "intel" && (
              <div className="space-y-3 flex-1 flex flex-col justify-center">
                {/* Visual #1 Strategy ranking list */}
                <div className="p-2 border border-cyan-500/25 bg-cyan-500/5 rounded-lg flex items-center justify-between">
                  <div>
                    <span className="text-[7.5px] border border-cyan-500/30 px-1 rounded text-cyan-400 uppercase font-bold">#1 Ranked</span>
                    <span className="text-white font-bold ml-2 text-xs">Iron Condor</span>
                  </div>
                  <span className="text-emerald-400 font-bold text-xs">Score: 92</span>
                </div>

                {/* mini payoff graphic */}
                <div className="h-20 w-full relative flex items-center justify-center border border-white/5 bg-white/2 rounded-lg">
                  {/* Path rendering */}
                  <svg className="w-[80%] h-[70%]" viewBox="0 0 100 40">
                    <line x1="0" y1="35" x2="30" y2="35" stroke="rgba(255, 77, 106, 0.4)" strokeWidth="1.5" />
                    <line x1="30" y1="35" x2="45" y2="10" stroke="#00e5a0" strokeWidth="1.5" />
                    <line x1="45" y1="10" x2="55" y2="10" stroke="#00e5a0" strokeWidth="1.5" />
                    <line x1="55" y1="10" x2="70" y2="35" stroke="#00e5a0" strokeWidth="1.5" />
                    <line x1="70" y1="35" x2="100" y2="35" stroke="rgba(255, 77, 106, 0.4)" strokeWidth="1.5" />
                    <line x1="0" y1="28" x2="100" y2="28" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" strokeDasharray="2 2" />
                    <circle cx="50" cy="10" r="1.5" fill="#22d3ee" className="animate-ping" />
                  </svg>
                </div>

                <div className="text-[7.5px] text-white/35 flex justify-between uppercase">
                  <span>Delta: 0.02</span>
                  <span>Gamma: -0.025</span>
                  <span>Theta: +4.80</span>
                </div>
              </div>
            )}

            {activeTab === "lab" && (
              <div className="space-y-2 flex-1 flex flex-col justify-center">
                {/* Visual simulated sliders */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[8px] text-white/40">
                    <span>Strike Calibration</span>
                    <span className="text-white font-bold">100 (ATM)</span>
                  </div>
                  <div className="h-1 bg-white/10 rounded-full relative">
                    <div className="absolute left-[50%] -translate-x-1/2 -top-1 w-3 h-3 rounded-full bg-cyan-400 border border-white" />
                  </div>
                </div>

                <div className="space-y-1 pt-2">
                  <div className="flex justify-between text-[8px] text-white/40">
                    <span>Days to Expiry (DTE)</span>
                    <span className="text-emerald-400 font-bold">30 Days</span>
                  </div>
                  <div className="h-1 bg-white/10 rounded-full relative">
                    <div className="absolute left-[66%] -translate-x-1/2 -top-1 w-3 h-3 rounded-full bg-emerald-400 border border-white" />
                  </div>
                </div>

                {/* mini greeks matrix */}
                <div className="grid grid-cols-4 gap-1 pt-2">
                  {[
                    { label: "Delta", val: "0.55", col: "text-white" },
                    { label: "Gamma", val: "0.035", col: "text-white" },
                    { label: "Theta", val: "-3.50", col: "text-rose-400" },
                    { label: "Vega", val: "12.00", col: "text-purple-400" }
                  ].map((g, idx) => (
                    <div key={idx} className="bg-white/2 border border-white/5 rounded p-1 text-center">
                      <span className="text-[6.5px] text-white/20 uppercase block">{g.label}</span>
                      <span className={`font-bold ${g.col} text-[9px]`}>{g.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "analytics" && (
              <div className="space-y-3 flex-1 flex flex-col justify-center">
                {/* simulated 3D Surface grid representation */}
                <div className="h-28 w-full border border-white/5 bg-white/2 rounded-lg flex flex-col items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 opacity-[0.08] flex flex-col justify-between">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="h-[1px] bg-cyan-400 transform -skew-y-12" />
                    ))}
                  </div>
                  <svg className="w-[90%] h-[80%] z-10" viewBox="0 0 100 40">
                    {/* Simulated surface outline */}
                    <path d="M 10 30 Q 30 15 50 20 T 90 10" fill="none" stroke="rgba(168, 85, 247, 0.6)" strokeWidth="1.5" />
                    <path d="M 10 35 Q 30 20 50 25 T 90 15" fill="none" stroke="rgba(6, 182, 212, 0.4)" strokeWidth="1" />
                    <path d="M 10 25 Q 30 10 50 15 T 90 5" fill="none" stroke="rgba(16, 185, 129, 0.3)" strokeWidth="1" />
                  </svg>
                  <span className="absolute bottom-1 right-2 text-[7px] text-white/30 uppercase font-mono">Volatility Smile Grid</span>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center text-[7.5px] text-white/25 border-t border-white/5 pt-2">
              <span>SYSTEM: CALIBRATED</span>
              <span>GRID PROJECTION: OK</span>
            </div>
          </div>

        </div>
      </section>

      {/* Section 3: Deep Quant Philosophy Explanation */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-20 border-t border-white/5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-[8.5px] uppercase tracking-widest text-cyan-400 font-bold font-mono">
              Product Philosophy
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-white mt-1">
              Probabilistic Modeling vs. Direct Speculation
            </h2>
            <p className="text-white/60 text-xs leading-relaxed mt-4">
              OptixFlow is built on a simple premise: options are not bets on direction; they are spatial and temporal contracts defined by uncertainty. 
              We do not provide trade ideas or buy recommendations. Rather, the system functions as a cognition layer that interprets volatility structures, skew compression, event risk parameters, and mathematical decay.
            </p>
            <p className="text-white/60 text-xs leading-relaxed mt-3">
              By separating the platform into **Strategy Lab** (synthetic modeling) and **Analytics** (real market metrics), quants can transition seamlessly from raw research to structural risk validation.
            </p>
          </div>

          {/* Grid of features */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-[#05070c]/80 border border-white/5 p-5 rounded-2xl shadow">
              <ShieldCheck className="text-cyan-400 mb-2" size={16} />
              <h4 className="text-white font-bold text-xs uppercase">Risk Geometry</h4>
              <p className="text-white/40 text-[10px] mt-1 leading-normal">
                Defined boundaries that protect portfolio health under catastrophic tail events.
              </p>
            </div>
            <div className="bg-[#05070c]/80 border border-white/5 p-5 rounded-2xl shadow">
              <Globe className="text-emerald-400 mb-2" size={16} />
              <h4 className="text-white font-bold text-xs uppercase">Regime Awareness</h4>
              <p className="text-white/40 text-[10px] mt-1 leading-normal">
                Scoring system adapts instantly when VIX indices contract or implied volatility spikes.
              </p>
            </div>
            <div className="bg-[#05070c]/80 border border-white/5 p-5 rounded-2xl shadow">
              <Activity className="text-purple-400 mb-2" size={16} />
              <h4 className="text-white font-bold text-xs uppercase">Decay Physics</h4>
              <p className="text-white/40 text-[10px] mt-1 leading-normal">
                Interactive modeling of Theta acceleration curves near standard expirations.
              </p>
            </div>
            <div className="bg-[#05070c]/80 border border-white/5 p-5 rounded-2xl shadow">
              <Terminal className="text-amber-400 mb-2" size={16} />
              <h4 className="text-white font-bold text-xs uppercase">Telemetry Feedback</h4>
              <p className="text-white/40 text-[10px] mt-1 leading-normal">
                Continuous logging of mathematical alignments for structural design integrity.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Call to Action (CTE) */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-24 text-center">
        <div className="border border-white/10 bg-gradient-to-b from-[#05070c]/90 to-[#020408]/90 rounded-3xl p-8 md:p-12 relative overflow-hidden shadow-2xl">
          
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

          <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Calibrate Your Market Thesis.
          </h2>
          <p className="text-white/50 text-xs md:text-sm mt-4 max-w-xl mx-auto leading-relaxed">
            Enter the intelligence network to explore multi-leg option profiles, map risk boundaries, and diagnostic exposure models.
          </p>

          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/intelligence"
              className="border border-cyan-500/40 bg-cyan-500/15 text-cyan-400 font-bold px-8 py-3.5 rounded-xl hover:bg-cyan-500/25 transition-all flex items-center gap-2 hover:shadow-[0_0_20px_rgba(6,182,212,0.25)] cursor-pointer text-xs uppercase tracking-wider"
            >
              <span>Initialize System</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-[#03060c]/80 backdrop-blur px-6 py-8 relative z-10 font-mono text-[9px] text-white/30 text-center">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <span>© {new Date().getFullYear()} OPTIXFLOW SYSTEMS INC. INSTITUTIONAL RISK TECHNOLOGY.</span>
          </div>
          <div className="flex gap-4">
            <Link href="/strategy" className="hover:text-white transition-colors">STRATEGY</Link>
            <Link href="/analytics" className="hover:text-white transition-colors">ANALYTICS</Link>
            <Link href="/intelligence" className="hover:text-white transition-colors">INTELLIGENCE</Link>
            <Link href="/portfolio" className="hover:text-white transition-colors">PORTFOLIO</Link>
            <Link href="/playbook" className="hover:text-white transition-colors">PLAYBOOK</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
