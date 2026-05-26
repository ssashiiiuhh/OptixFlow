// ============================================================================
// OPTIXFLOW — Historical Market Playback Transport Bar
// Play/pause/step/scrub through pre-recorded crisis event datasets.
// ============================================================================

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Pause, SkipBack, SkipForward, ChevronDown,
  Rewind, FastForward, Clock, Activity,
} from "lucide-react";
import { usePortfolio } from "./PortfolioContext";
import { HISTORICAL_SCENARIOS } from "@/lib/portfolio/playback/historicalScenarios";
import { cn } from "@/lib/utils";

export default function MarketPlayback() {
  const {
    playbackMode,
    playbackScenarioId,
    playbackFrameIndex,
    playbackIsPlaying,
    setPlaybackScenario,
    stepPlayback,
    togglePlayback,
    resetPlayback,
    exitPlayback,
  } = usePortfolio();

  const [showSelector, setShowSelector] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const activeScenario = HISTORICAL_SCENARIOS.find((s) => s.id === playbackScenarioId) ?? null;
  const totalFrames = activeScenario?.frames.length ?? 0;
  const currentFrame = activeScenario?.frames[playbackFrameIndex] ?? null;
  const progress = totalFrames > 1 ? (playbackFrameIndex / (totalFrames - 1)) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass rounded-2xl border border-[var(--ox-border-default)] overflow-hidden relative"
      style={{
        borderColor: playbackMode && activeScenario ? activeScenario.color + "33" : undefined,
      }}
    >
      {/* Playback mode ambient glow */}
      {playbackMode && activeScenario && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse 100% 50% at 50% 0%, ${activeScenario.glowColor} 0%, transparent 70%)` }}
        />
      )}

      {/* Header row */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05]">
        <div className="flex items-center gap-2">
          <Clock
            size={13}
            className={cn(
              "transition-colors",
              playbackMode ? "text-[var(--ox-accent-amber)]" : "text-[var(--ox-text-muted)]"
            )}
            style={playbackMode && activeScenario ? { color: activeScenario.color } : {}}
          />
          <span className="text-[11px] font-mono uppercase tracking-widest text-[var(--ox-text-primary)]">
            Market Playback
          </span>
          {playbackMode && activeScenario && (
            <span
              className="text-[8px] font-mono px-1.5 py-0.5 rounded-full border font-bold tracking-widest animate-pulse"
              style={{
                color: activeScenario.color,
                borderColor: activeScenario.color + "44",
                background: activeScenario.color + "14",
              }}
            >
              {playbackIsPlaying ? "● LIVE" : "‖ PAUSED"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {playbackMode && (
            <button
              onClick={exitPlayback}
              className="text-[9px] font-mono text-[var(--ox-text-muted)] hover:text-[var(--ox-accent-red)] transition-colors px-2 py-0.5 rounded border border-white/[0.06] hover:border-[var(--ox-accent-red)]/30"
            >
              Exit Playback
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[var(--ox-text-muted)] hover:text-[var(--ox-text-secondary)] transition-colors"
          >
            <ChevronDown
              size={13}
              className={cn("transition-transform duration-200", isExpanded && "rotate-180")}
            />
          </button>
        </div>
      </div>

      {/* Scenario selector */}
      <div className="px-4 py-3 border-b border-white/[0.04]">
        <div className="relative">
          <button
            onClick={() => setShowSelector(!showSelector)}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 rounded-xl border transition-all duration-200",
              showSelector
                ? "border-[var(--ox-accent-cyan)]/30 bg-[var(--ox-accent-cyan)]/5"
                : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1]"
            )}
          >
            {activeScenario ? (
              <div className="flex items-center gap-2">
                <span className="text-base leading-none">{activeScenario.icon}</span>
                <div className="text-left">
                  <p className="text-[10px] font-mono font-bold text-[var(--ox-text-primary)]">{activeScenario.name}</p>
                  <p className="text-[8px] font-mono text-[var(--ox-text-muted)]">{activeScenario.subtitle}</p>
                </div>
                <span
                  className="ml-2 text-[8px] font-mono px-1.5 py-0.5 rounded-full"
                  style={{ color: activeScenario.color, background: activeScenario.color + "18" }}
                >
                  {activeScenario.frames.length} frames
                </span>
              </div>
            ) : (
              <span className="text-[10px] font-mono text-[var(--ox-text-muted)]">Select historical scenario...</span>
            )}
            <ChevronDown
              size={12}
              className={cn(
                "text-[var(--ox-text-muted)] transition-transform duration-200",
                showSelector && "rotate-180"
              )}
            />
          </button>

          {/* Dropdown */}
          <AnimatePresence>
            {showSelector && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full mt-1 left-0 right-0 z-50 glass-elevated rounded-xl border border-white/[0.1] overflow-hidden shadow-xl"
              >
                {HISTORICAL_SCENARIOS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setPlaybackScenario(s.id);
                      setShowSelector(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors border-b border-white/[0.04] last:border-0",
                      playbackScenarioId === s.id
                        ? "bg-white/[0.06]"
                        : "hover:bg-white/[0.03]"
                    )}
                  >
                    <span className="text-base">{s.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] font-mono font-bold text-[var(--ox-text-primary)]">{s.name}</p>
                        <span
                          className="text-[7px] font-mono px-1 py-0.5 rounded-full uppercase"
                          style={{ color: s.color, background: s.color + "20" }}
                        >
                          {s.regime.replace("_", " ")}
                        </span>
                      </div>
                      <p className="text-[8px] font-mono text-[var(--ox-text-muted)] truncate">{s.description}</p>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Transport Controls */}
      <div className="px-4 py-3 space-y-3">
        {/* Progress scrubber */}
        {activeScenario && (
          <div className="space-y-1.5">
            <div className="relative h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
              <motion.div
                className="absolute top-0 left-0 h-full rounded-full"
                style={{ background: activeScenario ? `linear-gradient(90deg, ${activeScenario.color}88, ${activeScenario.color})` : "var(--ox-accent-cyan)" }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </div>
            <div className="flex justify-between text-[8px] font-mono text-[var(--ox-text-muted)]">
              <span>{currentFrame?.label ?? "—"}</span>
              <span>{playbackFrameIndex + 1} / {totalFrames}</span>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={resetPlayback}
            disabled={!activeScenario}
            className="p-2 rounded-lg border border-white/[0.06] text-[var(--ox-text-muted)] hover:text-[var(--ox-text-secondary)] disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Reset to Start"
          >
            <Rewind size={13} />
          </button>
          <button
            onClick={() => stepPlayback(-1)}
            disabled={!activeScenario || playbackFrameIndex === 0}
            className="p-2 rounded-lg border border-white/[0.06] text-[var(--ox-text-muted)] hover:text-[var(--ox-text-secondary)] disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Step Back"
          >
            <SkipBack size={13} />
          </button>

          {/* Play/Pause */}
          <button
            onClick={togglePlayback}
            disabled={!activeScenario}
            className={cn(
              "p-2.5 rounded-xl border-2 transition-all duration-200 disabled:opacity-30 disabled:pointer-events-none",
              playbackIsPlaying
                ? "border-[var(--ox-accent-amber)]/40 bg-[var(--ox-accent-amber)]/10 text-[var(--ox-accent-amber)]"
                : "border-[var(--ox-accent-cyan)]/30 bg-[var(--ox-accent-cyan)]/10 text-[var(--ox-accent-cyan)]"
            )}
            style={activeScenario && !playbackIsPlaying ? { borderColor: activeScenario.color + "50", background: activeScenario.color + "18", color: activeScenario.color } : {}}
            title={playbackIsPlaying ? "Pause Playback" : "Start Playback"}
          >
            {playbackIsPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>

          <button
            onClick={() => stepPlayback(1)}
            disabled={!activeScenario || playbackFrameIndex >= totalFrames - 1}
            className="p-2 rounded-lg border border-white/[0.06] text-[var(--ox-text-muted)] hover:text-[var(--ox-text-secondary)] disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Step Forward"
          >
            <SkipForward size={13} />
          </button>
          <button
            onClick={() => stepPlayback(totalFrames - 1 - playbackFrameIndex)}
            disabled={!activeScenario || playbackFrameIndex >= totalFrames - 1}
            className="p-2 rounded-lg border border-white/[0.06] text-[var(--ox-text-muted)] hover:text-[var(--ox-text-secondary)] disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Jump to End"
          >
            <FastForward size={13} />
          </button>
        </div>

        {/* Frame annotation */}
        <AnimatePresence mode="wait">
          {currentFrame?.annotation && isExpanded && (
            <motion.div
              key={playbackFrameIndex}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-start gap-2 px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.05]"
            >
              <Activity size={10} className="mt-0.5 shrink-0" style={{ color: activeScenario?.color }} />
              <p className="text-[9px] font-mono text-[var(--ox-text-secondary)] leading-relaxed">
                {currentFrame.annotation}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* VIX + quick stats when active */}
        {playbackMode && currentFrame && (
          <div className="grid grid-cols-5 gap-1.5">
            {(["SPY", "AAPL", "NVDA", "QQQ"] as const).map((t) => (
              <div key={t} className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-1.5 text-center">
                <p className="text-[7px] font-mono text-[var(--ox-text-muted)]">{t}</p>
                <p className="text-[9px] font-mono font-bold text-[var(--ox-text-secondary)] tabular-nums">
                  ${(currentFrame.spotPrices[t] ?? 0).toFixed(0)}
                </p>
              </div>
            ))}
            <div
              className="bg-white/[0.02] border rounded-lg p-1.5 text-center"
              style={{ borderColor: currentFrame.vix > 30 ? "rgba(255,77,106,0.25)" : "rgba(255,255,255,0.04)" }}
            >
              <p className="text-[7px] font-mono text-[var(--ox-text-muted)]">VIX</p>
              <p
                className="text-[9px] font-mono font-bold tabular-nums"
                style={{ color: currentFrame.vix > 40 ? "var(--ox-accent-red)" : currentFrame.vix > 25 ? "var(--ox-accent-amber)" : "var(--ox-accent-green)" }}
              >
                {currentFrame.vix.toFixed(1)}
              </p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
