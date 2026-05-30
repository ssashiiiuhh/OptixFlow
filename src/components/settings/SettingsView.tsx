"use client";

import { motion } from "framer-motion";
import { Sliders, Zap, Shield, Eye, Palette, Activity } from "lucide-react";
import { usePortfolioSafe } from "../portfolio/PortfolioContext";

export default function SettingsView() {
  const portfolio = usePortfolioSafe();

  if (!portfolio) {
    return (
      <div className="flex-1 flex flex-col p-6 items-center justify-center">
        <span className="text-[var(--ox-text-muted)] font-mono text-sm">
          Settings requires PortfolioProvider.
        </span>
      </div>
    );
  }

  const { settings, updateSettings } = portfolio;

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto space-y-8"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--ox-text-primary)]">Settings & Preferences</h1>
          <p className="text-[var(--ox-text-muted)] mt-1 font-mono text-sm">
            Configure algorithmic constraints, visual themes, and telemetry bounds.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Core Engine */}
          <div className="glass rounded-xl border border-[var(--ox-border-default)] p-5 space-y-6">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <Activity className="text-[var(--ox-accent-cyan)]" size={16} />
              <h2 className="text-sm font-semibold tracking-wide uppercase">Core Engine</h2>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-mono text-[var(--ox-text-muted)]">Engine Tick Rate (ms)</label>
                <div className="flex gap-2">
                  {[500, 1500, 3000].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => updateSettings({ tickRateMs: rate })}
                      className={`flex-1 py-1.5 rounded-md text-xs font-mono transition-colors ${
                        settings.tickRateMs === rate
                          ? "bg-[var(--ox-accent-cyan)] text-black font-bold"
                          : "bg-white/5 text-[var(--ox-text-secondary)] hover:bg-white/10"
                      }`}
                    >
                      {rate}ms
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-mono text-[var(--ox-text-muted)]">AI Diagnostic Aggression</label>
                <div className="flex gap-2">
                  {["low", "medium", "high"].map((level) => (
                    <button
                      key={level}
                      onClick={() => updateSettings({ aiAggression: level as any })}
                      className={`flex-1 py-1.5 rounded-md text-xs font-mono uppercase transition-colors ${
                        settings.aiAggression === level
                          ? "bg-[#7c3aed] text-white font-bold"
                          : "bg-white/5 text-[var(--ox-text-secondary)] hover:bg-white/10"
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Risk Limits */}
          <div className="glass rounded-xl border border-[var(--ox-border-default)] p-5 space-y-6">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <Shield className="text-[var(--ox-accent-magenta)]" size={16} />
              <h2 className="text-sm font-semibold tracking-wide uppercase">Risk Tolerance</h2>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-mono text-[var(--ox-text-muted)]">Portfolio Risk Profile</label>
                <div className="flex flex-col gap-2">
                  {["conservative", "balanced", "aggressive"].map((profile) => (
                    <button
                      key={profile}
                      onClick={() => updateSettings({ riskTolerance: profile as any })}
                      className={`text-left px-4 py-2.5 rounded-lg border text-sm transition-colors ${
                        settings.riskTolerance === profile
                          ? "border-[var(--ox-accent-magenta)] bg-[var(--ox-accent-magenta)]/10 text-white"
                          : "border-white/5 bg-transparent text-[var(--ox-text-secondary)] hover:bg-white/5"
                      }`}
                    >
                      <div className="font-semibold capitalize">{profile}</div>
                      <div className="text-[10px] text-[var(--ox-text-muted)] font-mono mt-0.5">
                        {profile === "conservative" && "Tight hedging, lower VaR thresholds."}
                        {profile === "balanced" && "Standard multi-leg strategy execution."}
                        {profile === "aggressive" && "Allows extreme skew exposures & naked tails."}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Interface & Visuals */}
          <div className="glass rounded-xl border border-[var(--ox-border-default)] p-5 space-y-6 md:col-span-2">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <Palette className="text-emerald-400" size={16} />
              <h2 className="text-sm font-semibold tracking-wide uppercase">Interface Aesthetics</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-mono text-[var(--ox-text-muted)]">Color Theme</label>
                <div className="flex gap-2">
                  {["void", "neon", "terminal"].map((theme) => (
                    <button
                      key={theme}
                      onClick={() => updateSettings({ theme: theme as any })}
                      className={`flex-1 py-1.5 rounded-md text-xs font-mono capitalize transition-colors ${
                        settings.theme === theme
                          ? "bg-emerald-400 text-black font-bold"
                          : "bg-white/5 text-[var(--ox-text-secondary)] hover:bg-white/10"
                      }`}
                    >
                      {theme}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-mono text-[var(--ox-text-muted)]">High Contrast Toggles</label>
                <button
                  onClick={() => updateSettings({ highContrast: !settings.highContrast })}
                  className={`py-1.5 rounded-md text-xs font-mono transition-colors ${
                    settings.highContrast
                      ? "bg-white text-black font-bold"
                      : "bg-white/5 text-[var(--ox-text-secondary)] hover:bg-white/10"
                  }`}
                >
                  {settings.highContrast ? "Enabled" : "Disabled"}
                </button>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-mono text-[var(--ox-text-muted)]">Verbose Tooltips</label>
                <button
                  onClick={() => updateSettings({ showTooltips: !settings.showTooltips })}
                  className={`py-1.5 rounded-md text-xs font-mono transition-colors ${
                    settings.showTooltips
                      ? "bg-[var(--ox-accent-green)] text-black font-bold"
                      : "bg-white/5 text-[var(--ox-text-secondary)] hover:bg-white/10"
                  }`}
                >
                  {settings.showTooltips ? "Visible" : "Hidden"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
