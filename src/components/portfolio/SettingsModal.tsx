import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sliders, Zap, Eye, MonitorOff, Activity, Shield } from "lucide-react";
import { usePortfolio } from "./PortfolioContext";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { settings, updateSettings } = usePortfolio();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 m-auto w-full max-w-md h-fit z-50"
          >
            <div className="glass rounded-xl border border-[var(--ox-border-default)] shadow-[0_8px_32px_rgba(0,212,255,0.1)] overflow-hidden m-4">
              <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-2 text-[var(--ox-text-primary)]">
                  <Sliders size={16} className="text-[var(--ox-accent-cyan)]" />
                  <span className="font-mono text-sm tracking-widest uppercase">System Settings</span>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg border border-transparent hover:border-white/[0.08] hover:bg-white/[0.02] text-[var(--ox-text-muted)] hover:text-white transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="p-5 space-y-6">
                {/* AI Aggression */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[var(--ox-text-primary)]">
                    <Activity size={14} className="text-[var(--ox-accent-amber)]" />
                    <span className="font-mono text-xs uppercase tracking-wider">AI Copilot Aggression</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(["low", "medium", "high"] as const).map((level) => {
                      const isActive = settings.aiAggression === level;
                      return (
                        <button
                          key={level}
                          onClick={() => updateSettings({ aiAggression: level })}
                          className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all duration-300 font-mono text-[10px] uppercase tracking-wider ${
                            isActive
                              ? "border-[var(--ox-accent-cyan)] bg-[var(--ox-accent-cyan)]/10 text-[var(--ox-accent-cyan)] shadow-[0_0_12px_rgba(0,212,255,0.2)]"
                              : "border-white/[0.08] bg-white/[0.02] text-[var(--ox-text-muted)] hover:border-white/[0.2]"
                          }`}
                        >
                          {level === "low" && <Shield size={16} className="mb-1" />}
                          {level === "medium" && <Activity size={16} className="mb-1" />}
                          {level === "high" && <Zap size={16} className="mb-1" />}
                          {level}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-[var(--ox-text-muted)] mt-2 pl-1">
                    {settings.aiAggression === "low" && "AI focuses on risk mitigation and capital preservation."}
                    {settings.aiAggression === "medium" && "AI balances risk management with opportunistic plays."}
                    {settings.aiAggression === "high" && "AI aggressively pursues high-convexity, high-yield opportunities."}
                  </p>
                </div>

                <div className="h-px bg-[var(--ox-border-subtle)] w-full" />

                {/* Display Flags */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[var(--ox-text-primary)]">
                    <Eye size={14} className="text-[var(--ox-accent-green)]" />
                    <span className="font-mono text-xs uppercase tracking-wider">Display Preferences</span>
                  </div>
                  
                  <div className="space-y-2">
                    <button
                      onClick={() => updateSettings({ highContrast: !settings.highContrast })}
                      className="w-full flex items-center justify-between p-3 rounded-lg border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <MonitorOff size={14} className={settings.highContrast ? "text-[var(--ox-accent-green)]" : "text-[var(--ox-text-muted)]"} />
                        <div className="text-left">
                          <p className="font-mono text-xs text-[var(--ox-text-primary)]">High Contrast Mode</p>
                          <p className="font-sans text-[10px] text-[var(--ox-text-muted)]">Enhance visibility for critical data</p>
                        </div>
                      </div>
                      <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${settings.highContrast ? 'bg-[var(--ox-accent-green)]' : 'bg-white/20'}`}>
                        <div className={`w-3 h-3 rounded-full bg-black transform transition-transform ${settings.highContrast ? 'translate-x-4' : 'translate-x-0'}`} />
                      </div>
                    </button>

                    <button
                      onClick={() => updateSettings({ showTooltips: !settings.showTooltips })}
                      className="w-full flex items-center justify-between p-3 rounded-lg border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Eye size={14} className={settings.showTooltips ? "text-[var(--ox-accent-cyan)]" : "text-[var(--ox-text-muted)]"} />
                        <div className="text-left">
                          <p className="font-mono text-xs text-[var(--ox-text-primary)]">Show Tooltips</p>
                          <p className="font-sans text-[10px] text-[var(--ox-text-muted)]">Display contextual help overlays</p>
                        </div>
                      </div>
                      <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${settings.showTooltips ? 'bg-[var(--ox-accent-cyan)]' : 'bg-white/20'}`}>
                        <div className={`w-3 h-3 rounded-full bg-black transform transition-transform ${settings.showTooltips ? 'translate-x-4' : 'translate-x-0'}`} />
                      </div>
                    </button>
                  </div>
                </div>

              </div>
              <div className="px-5 py-3 border-t border-white/[0.06] bg-black/40 text-right">
                <button
                  onClick={onClose}
                  className="px-4 py-1.5 rounded-lg border border-[var(--ox-accent-cyan)]/30 bg-[var(--ox-accent-cyan)]/10 text-[var(--ox-accent-cyan)] hover:bg-[var(--ox-accent-cyan)]/20 hover:shadow-[0_0_12px_rgba(0,212,255,0.2)] transition-all font-mono text-[10px] uppercase tracking-wider"
                >
                  Done
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
