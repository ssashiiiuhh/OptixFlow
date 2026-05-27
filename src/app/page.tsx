// ============================================================================
// OPTIXFLOW — Interactive Officevibe Light Theme Landing Page
// Balanced, corporate, trustworthy layout with Brand Electric accents.
// ============================================================================

"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  TrendingUp,
  BarChart2,
  Cpu,
  Layers,
  ChevronRight,
  Activity,
  ArrowRight,
  ShieldCheck,
  Zap,
  Globe,
  Sliders,
  Terminal,
  Mail
} from "lucide-react";

import { PortfolioProvider } from "@/components/portfolio/PortfolioContext";
import VolatilitySurface3D from "@/components/portfolio/VolatilitySurface3D";
import DeltaHedger from "@/components/portfolio/DeltaHedger";
import PortfolioConsole from "@/components/portfolio/PortfolioConsole";
import MarketPlayback from "@/components/portfolio/MarketPlayback";

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState<"intel" | "lab" | "analytics">("intel");
  const [email, setEmail] = useState("");

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Subscribed: ${email}`);
    setEmail("");
  };

  return (
    <div className="min-h-screen bg-[#f9f8f6] text-[#171417] font-sans selection:bg-[#d9d4ff] selection:text-[#0c1754] overflow-x-hidden">
      
      {/* 1. Header (Sticky Top Bar) */}
      <header className="sticky top-0 z-50 bg-[#f9f8f6]/90 backdrop-blur-md border-b border-[#eaebf8] py-4 px-6 md:px-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="shrink-0 w-7 h-7 rounded-md bg-[#2545ff]/10 border border-[#2545ff]/20 flex items-center justify-center">
            <Zap size={14} className="text-[#2545ff]" />
          </div>
          <span className="text-base font-bold tracking-tight text-[#0c1754]">
            Optix<span className="text-[#2545ff] font-medium">Flow</span>
          </span>
          <span className="text-[#eaebf8] hidden sm:inline">|</span>
          <span className="text-[#0c1754]/50 text-[10px] font-mono tracking-wider uppercase hidden sm:inline">
            DERIVATIVES COGNITION ENGINE
          </span>
        </div>

        <nav className="hidden lg:flex items-center gap-8">
          <Link href="/strategy" className="text-[#222222] hover:text-[#2545ff] font-medium text-sm transition-colors uppercase tracking-wider">
            STRATEGY LAB
          </Link>
          <Link href="/analytics" className="text-[#222222] hover:text-[#2545ff] font-medium text-sm transition-colors uppercase tracking-wider">
            ANALYTICS
          </Link>
          <Link href="/intelligence" className="text-[#222222] hover:text-[#2545ff] font-medium text-sm transition-colors uppercase tracking-wider">
            TRADE INTEL
          </Link>
          <Link href="/portfolio" className="text-[#222222] hover:text-[#2545ff] font-medium text-sm transition-colors uppercase tracking-wider">
            PORTFOLIO
          </Link>
          <Link href="/playbook" className="text-[#222222] hover:text-[#2545ff] font-medium text-sm transition-colors uppercase tracking-wider">
            PLAYBOOK
          </Link>
        </nav>

        <div>
          <Link
            href="/strategy"
            className="inline-block bg-[#2545ff] text-white hover:bg-[#1a3aff] text-sm font-medium py-[11.2px] px-[32px] rounded-[100px] transition-all cursor-pointer text-center"
          >
            ENTER PLATFORM
          </Link>
        </div>
      </header>

      {/* 2. Hero Section (Split Screen) */}
      <section className="max-w-7xl mx-auto px-6 md:px-12 py-16 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        
        {/* Hero Left: Headline and CTA */}
        <div className="flex flex-col items-start text-left">
          
          {/* Informative Badge */}
          <div className="bg-[#eaebf8] text-[#0c1754] rounded-[16px] py-[4px] px-[12px] font-sans font-medium text-[12px] tracking-wide inline-flex items-center gap-1.5 mb-6">
            <Activity size={12} className="text-[#2545ff]" />
            <span>PRODUCTION SYSTEMS OPERATIONAL</span>
          </div>

          {/* Headline - Abcfavoritvariable style with Martinaplantijn calligraphic accent */}
          <h1 
            style={{ fontFamily: "Arial, sans-serif", lineHeight: "1.0" }} 
            className="text-[44px] md:text-[56px] lg:text-[64px] font-medium tracking-[-3.2px] text-[#0c1754]"
          >
            The future of risk, mapped in <span style={{ fontFamily: "Georgia, serif" }} className="italic font-normal text-[#2545ff] pl-1 pr-2">real-time</span>.
          </h1>

          {/* Subtitle - Inter style */}
          <p className="text-[#171417] text-[16px] leading-[1.60] max-w-xl mt-6">
            OptixFlow transforms options strategy design into a reality-aware spatial environment. 
            Interpret skew, model dynamic risk, stress-test positions under volatility regimes, 
            and map your market thesis to optimal structural geometry.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/intelligence"
              className="bg-[#2545ff] text-white hover:bg-[#1a3aff] text-sm font-medium py-[11.2px] px-[32px] rounded-[100px] transition-all flex items-center gap-2 cursor-pointer text-center"
            >
              <span>Initialize Console</span>
              <ArrowRight size={14} />
            </Link>
            <Link
              href="/strategy"
              className="bg-transparent text-[#2545ff] border border-[#2545ff] hover:bg-[#2545ff]/5 text-sm font-medium py-[11.2px] px-[32px] rounded-[100px] transition-all cursor-pointer text-center"
            >
              Open Strategy Lab
            </Link>
          </div>

          {/* Telemetry Dashboard Stats */}
          <div className="mt-12 w-full border border-[#eaebf8] bg-white rounded-[16px] p-4.5 font-mono text-[10px] text-[#222222] grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <span className="block text-[8px] uppercase tracking-wider text-[#0c1754]/50 mb-0.5">Asset Reference</span>
              <span className="text-[#0c1754] font-bold text-[11px] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ffc13a]" /> SPY Index
              </span>
            </div>
            <div>
              <span className="block text-[8px] uppercase tracking-wider text-[#0c1754]/50 mb-0.5">Scoring Model</span>
              <span className="text-[#2545ff] font-bold text-[11px] uppercase">Black-Scholes</span>
            </div>
            <div>
              <span className="block text-[8px] uppercase tracking-wider text-[#0c1754]/50 mb-0.5">Diagnostics</span>
              <span className="text-[#0c1754] font-bold text-[11px]">Suitability V3</span>
            </div>
            <div>
              <span className="block text-[8px] uppercase tracking-wider text-[#0c1754]/50 mb-0.5">Theme System</span>
              <span className="text-[#ff5b22] font-bold text-[11px] uppercase">Officevibe light</span>
            </div>
          </div>

        </div>

        {/* Hero Right: Product UI Illustration (3D Vol Surface) */}
        <div className="w-full relative">
          {/* Abstract background highlight */}
          <div className="absolute inset-0 bg-gradient-to-tr from-[#2545ff]/5 to-[#eaebf8] rounded-[16px] filter blur-xl opacity-80 pointer-events-none" />
          
          {/* Card Container for Live 3D Surface */}
          <div className="relative border border-[#eaebf8] bg-[#07090f] rounded-[16px] shadow-xl overflow-hidden self-stretch min-h-[380px] p-2 flex flex-col justify-center">
            <PortfolioProvider>
              <div className="w-full h-full">
                <VolatilitySurface3D />
              </div>
            </PortfolioProvider>
          </div>
        </div>

      </section>

      {/* 3. Core Modules Interactive Showcase (Section Gap 64px) */}
      <section className="max-w-7xl mx-auto px-6 md:px-12 py-16 border-t border-[#eaebf8]">
        
        {/* Section Heading */}
        <div className="text-center mb-12">
          <div className="bg-[#eaebf8] text-[#0c1754] rounded-[16px] py-[4px] px-[12px] font-sans font-medium text-[12px] tracking-wide inline-flex items-center gap-1.5 mb-3">
            <span>SYSTEM WORKSPACES</span>
          </div>
          <h2 
            style={{ fontFamily: "Arial, sans-serif", letterSpacing: "-0.64px" }}
            className="text-[32px] font-medium text-[#0c1754] leading-[1.1] mt-2"
          >
            Three Connected Cognition Systems
          </h2>
          <p className="text-[#171417]/70 text-[14px] leading-[1.43] mt-3 max-w-lg mx-auto">
            OptixFlow compartmentalizes option pricing theory, delta hedging dynamics, and real-time market regimes into accessible workspace profiles.
          </p>
        </div>

        {/* Tab Controls (rounded pill bar) */}
        <div className="flex justify-center mb-10">
          <div className="bg-[#eaebf8] p-1.5 rounded-[100px] flex gap-1.5">
            {(["intel", "lab", "analytics"] as const).map((tab) => {
              const isActive = activeTab === tab;
              const labels = {
                intel: "1. Trade Intelligence",
                lab: "2. Strategy Lab",
                analytics: "3. Volatility Analytics"
              };
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-2.5 rounded-[100px] text-xs font-semibold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                    isActive
                      ? "bg-[#2545ff] text-white shadow-md"
                      : "text-[#222222] hover:text-[#2545ff]"
                  }`}
                >
                  {labels[tab]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Tab Showcase Render styled as a transparent/Soft Off-White Feature Card */}
        <div className="border border-[#eaebf8] bg-white rounded-[16px] p-8 md:p-12 min-h-[460px] flex flex-col lg:flex-row gap-12 items-center">
          
          {/* Showcase Left: Description */}
          <div className="flex-1 space-y-4 text-left">
            {activeTab === "intel" && (
              <>
                <div className="bg-[#eaebf8] text-[#0c1754] rounded-[16px] py-[4px] px-[12px] font-sans font-medium text-[11px] tracking-wide inline-flex items-center gap-1.5 mb-2">
                  <Cpu size={12} className="text-[#2545ff]" />
                  <span>ROUTE: /INTELLIGENCE</span>
                </div>
                <h3 
                  style={{ fontFamily: "Arial, sans-serif", letterSpacing: "-0.64px" }}
                  className="text-[24px] font-medium text-[#0c1754] leading-[1.1]"
                >
                  Trade Intelligence Cockpit
                </h3>
                <p className="text-[#171417]/80 text-[14px] leading-[1.43]">
                  The central diagnostics hub. OptixFlow validates and scores structured option layouts against a configurable directional, volatility, and timing thesis, producing live telemetry logs and risk narrative feeds.
                </p>
                <div className="pt-2">
                  <Link
                    href="/intelligence"
                    className="inline-flex items-center gap-1 text-sm font-semibold text-[#2545ff] hover:underline"
                  >
                    <span>Launch Intelligence Console</span>
                    <ChevronRight size={14} />
                  </Link>
                </div>
              </>
            )}

            {activeTab === "lab" && (
              <>
                <div className="bg-[#eaebf8] text-[#0c1754] rounded-[16px] py-[4px] px-[12px] font-sans font-medium text-[11px] tracking-wide inline-flex items-center gap-1.5 mb-2">
                  <Sliders size={12} className="text-[#2545ff]" />
                  <span>ROUTE: /STRATEGY</span>
                </div>
                <h3 
                  style={{ fontFamily: "Arial, sans-serif", letterSpacing: "-0.64px" }}
                  className="text-[24px] font-medium text-[#0c1754] leading-[1.1]"
                >
                  Strategy Lab Sandbox
                </h3>
                <p className="text-[#171417]/80 text-[14px] leading-[1.43]">
                  Experiment with complex multi-leg synthetic options structures. Set strike ranges, view dynamic Greek distributions, model risk parameters, and evaluate structural resilience scores against ticking market realities.
                </p>
                <div className="pt-2">
                  <Link
                    href="/strategy"
                    className="inline-flex items-center gap-1 text-sm font-semibold text-[#2545ff] hover:underline"
                  >
                    <span>Launch Strategy Lab</span>
                    <ChevronRight size={14} />
                  </Link>
                </div>
              </>
            )}

            {activeTab === "analytics" && (
              <>
                <div className="bg-[#eaebf8] text-[#0c1754] rounded-[16px] py-[4px] px-[12px] font-sans font-medium text-[11px] tracking-wide inline-flex items-center gap-1.5 mb-2">
                  <BarChart2 size={12} className="text-[#2545ff]" />
                  <span>ROUTE: /ANALYTICS</span>
                </div>
                <h3 
                  style={{ fontFamily: "Arial, sans-serif", letterSpacing: "-0.64px" }}
                  className="text-[24px] font-medium text-[#0c1754] leading-[1.1]"
                >
                  Volatility Analytics Lab
                </h3>
                <p className="text-[#171417]/80 text-[14px] leading-[1.43]">
                  A professional-grade market diagnostics environment. Observe active volatility curves, evaluate historical regimes, and analyze live implied volatility surfaces.
                </p>
                <div className="pt-2">
                  <Link
                    href="/analytics"
                    className="inline-flex items-center gap-1 text-sm font-semibold text-[#2545ff] hover:underline"
                  >
                    <span>Launch Analytics Lab</span>
                    <ChevronRight size={14} />
                  </Link>
                </div>
              </>
            )}
          </div>

          {/* Showcase Right: Interactive Mockup Panel */}
          <div className="flex-1 w-full relative overflow-hidden self-stretch min-h-[350px] flex flex-col justify-center bg-[#07090f] border border-[#eaebf8] rounded-[16px] p-2">
            <PortfolioProvider>
              <div className="w-full h-full">
                {activeTab === "intel" && (
                  <div className="w-full h-full flex flex-col justify-center">
                    <div className="scale-[0.85] origin-center">
                      <PortfolioConsole />
                    </div>
                  </div>
                )}
                
                {activeTab === "lab" && (
                  <div className="w-full h-full flex flex-col gap-2 justify-center">
                    <div className="scale-[0.85] origin-center flex flex-col gap-2">
                      <DeltaHedger />
                      <MarketPlayback />
                    </div>
                  </div>
                )}
                
                {activeTab === "analytics" && (
                  <div className="w-full h-full flex flex-col justify-center">
                    <div className="scale-[0.85] origin-center">
                      <VolatilitySurface3D />
                    </div>
                  </div>
                )}
              </div>
            </PortfolioProvider>
          </div>
        </div>

      </section>

      {/* 4. Philosophy Section (Section Gap 64px) */}
      <section className="max-w-7xl mx-auto px-6 md:px-12 py-16 border-t border-[#eaebf8]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          <div className="text-left">
            <div className="bg-[#eaebf8] text-[#0c1754] rounded-[16px] py-[4px] px-[12px] font-sans font-medium text-[12px] tracking-wide inline-flex items-center gap-1.5 mb-3">
              <span>PRODUCT PHILOSOPHY</span>
            </div>
            <h2 
              style={{ fontFamily: "Arial, sans-serif", letterSpacing: "-0.64px" }}
              className="text-[32px] font-medium text-[#0c1754] leading-[1.1] mt-2"
            >
              Probabilistic Calibration vs. Directional Speculation
            </h2>
            <p className="text-[#171417]/80 text-[14px] leading-[1.43] mt-6">
              OptixFlow is not a predictive advisory tool. We reject speculative "buy signals" in favor of mathematical mapping. The system operates as a cognition layer, exposing the volatility smile, delta boundaries, and mathematical decay.
            </p>
            <p className="text-[#171417]/80 text-[14px] leading-[1.43] mt-3">
              By structuring positions through spatial delta-tolerance boundaries, options design shifts from speculation to structured probability calibration.
            </p>
          </div>

          {/* Grid of philosophy points (Pure White cards, 16px radius, no shadows) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <div className="bg-white border border-[#eaebf8] rounded-[16px] p-6 text-left">
              <div className="shrink-0 w-8 h-8 rounded-full bg-[#2545ff]/10 flex items-center justify-center mb-4">
                <ShieldCheck className="text-[#2545ff]" size={16} />
              </div>
              <h4 className="text-[#0c1754] font-semibold text-sm tracking-wider uppercase font-mono mb-2">Risk Geometry</h4>
              <p className="text-[#171417]/60 text-[12px] leading-[1.4]">
                Clear physical delta boundaries to buffer portfolio value under systemic market stress.
              </p>
            </div>

            <div className="bg-white border border-[#eaebf8] rounded-[16px] p-6 text-left">
              <div className="shrink-0 w-8 h-8 rounded-full bg-[#ffc13a]/10 flex items-center justify-center mb-4">
                <Globe className="text-[#ffc13a]" size={16} />
              </div>
              <h4 className="text-[#0c1754] font-semibold text-sm tracking-wider uppercase font-mono mb-2">Regime Awareness</h4>
              <p className="text-[#171417]/60 text-[12px] leading-[1.4]">
                Adaptive Greek scoring structures that respond dynamically to vol expansion and compression.
              </p>
            </div>

            <div className="bg-white border border-[#eaebf8] rounded-[16px] p-6 text-left">
              <div className="shrink-0 w-8 h-8 rounded-full bg-[#ff5b22]/10 flex items-center justify-center mb-4">
                <Activity className="text-[#ff5b22]" size={16} />
              </div>
              <h4 className="text-[#0c1754] font-semibold text-sm tracking-wider uppercase font-mono mb-2">Decay Physics</h4>
              <p className="text-[#171417]/60 text-[12px] leading-[1.4]">
                Real-time modeling of Theta decay curves across Standard expirations.
              </p>
            </div>

            <div className="bg-white border border-[#eaebf8] rounded-[16px] p-6 text-left">
              <div className="shrink-0 w-8 h-8 rounded-full bg-[#2545ff]/10 flex items-center justify-center mb-4">
                <Terminal className="text-[#2545ff]" size={16} />
              </div>
              <h4 className="text-[#0c1754] font-semibold text-sm tracking-wider uppercase font-mono mb-2">Telemetry Logs</h4>
              <p className="text-[#171417]/60 text-[12px] leading-[1.4]">
                Streamed execution logging providing detailed diagnostic calculations.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* 5. Call to Action (CTE) Section (Section Gap 64px) */}
      <section className="max-w-5xl mx-auto px-6 py-16 text-center">
        <div className="bg-[#eaebf8] rounded-[16px] p-10 md:p-16 relative overflow-hidden flex flex-col items-center justify-center">
          
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#2545ff]/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[#d9d4ff]/10 rounded-full blur-3xl pointer-events-none" />

          <h2 
            style={{ fontFamily: "Arial, sans-serif", letterSpacing: "-0.64px" }}
            className="text-[32px] font-medium text-[#0c1754] leading-[1.1] text-center"
          >
            Calibrate Your Market Thesis.
          </h2>
          <p className="text-[#171417]/80 text-sm mt-4 max-w-xl mx-auto leading-relaxed">
            Construct complex multi-leg options spreads, stress-test Greek curves, and stream AI risk narrative commentary in real time.
          </p>

          <div className="mt-8 flex justify-center">
            <Link
              href="/intelligence"
              className="bg-[#2545ff] text-white hover:bg-[#1a3aff] text-sm font-medium py-[11.2px] px-[32px] rounded-[100px] transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>Initialize System</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* 6. Footer (Full bleed, Boardroom Navy) */}
      <footer className="bg-[#0c1754] text-white/70 py-16 px-6 md:px-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          
          {/* Footer Info */}
          <div className="space-y-4 text-left">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-white/10 flex items-center justify-center">
                <Zap size={12} className="text-white" />
              </div>
              <span className="text-base font-bold text-white uppercase tracking-wider">
                OPTIXFLOW
              </span>
            </div>
            <p className="text-[12px] max-w-md leading-relaxed text-white/50">
              An institutional-grade volumetric environment for exploring derivatives behavior. Deconstruct volatility smiles, simulate portfolio Greeks, and stress-test structures under regime shifts.
            </p>
            <p className="text-[10px] font-mono text-white/35 pt-4">
              © {new Date().getFullYear()} OPTIXFLOW SYSTEMS INC. ALL RIGHTS RESERVED.
            </p>
          </div>

          {/* Footer Email subscription input */}
          <div className="flex flex-col items-start gap-4">
            <h4 
              style={{ fontFamily: "Arial, sans-serif" }}
              className="text-white font-medium text-sm tracking-wide"
            >
              SUBSCRIBE FOR DECAY PHYSICS UPDATES
            </h4>
            <form onSubmit={handleSubscribe} className="w-full max-w-md flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="email"
                  required
                  placeholder="Enter your institutional email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent text-white border-b border-[#cccccc] rounded-[0px] py-[12px] pl-[0px] focus:outline-none focus:border-white font-sans text-sm placeholder-white/35"
                />
              </div>
              <button 
                type="submit" 
                className="bg-white text-[#0c1754] hover:bg-white/90 text-xs font-semibold py-3 px-6 rounded-[100px] transition-all flex items-center gap-2 shrink-0 cursor-pointer"
              >
                <Mail size={12} />
                <span>SUBSCRIBE</span>
              </button>
            </form>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-[11px] text-white/50 pt-4">
              <Link href="/strategy" className="hover:text-white transition-colors">STRATEGY LAB</Link>
              <Link href="/analytics" className="hover:text-white transition-colors">ANALYTICS</Link>
              <Link href="/intelligence" className="hover:text-white transition-colors">TRADE INTEL</Link>
              <Link href="/portfolio" className="hover:text-white transition-colors">PORTFOLIO</Link>
              <Link href="/playbook" className="hover:text-white transition-colors">PLAYBOOK</Link>
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
}
