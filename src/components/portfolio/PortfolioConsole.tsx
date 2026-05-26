// ============================================================================
// OPTIXFLOW — Portfolio Telemetry Terminal Console
// Renders live quantitative risk logs from the portfolio cognition engine.
// ============================================================================

"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePortfolio } from "./PortfolioContext";
import { Terminal, Trash2, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

type LogFilter = "all" | "warnings" | "engine";

export default function PortfolioConsole() {
  const { narration, isTicking } = usePortfolio();
  const [logs, setLogs] = useState<string[]>([]);
  const [filter, setFilter] = useState<LogFilter>("all");
  const consoleRef = useRef<HTMLDivElement>(null);

  // Append new unique logs when narration updates
  useEffect(() => {
    if (!narration || narration.length === 0) return;

    setLogs((prev) => {
      // Find logs from the current narration that aren't already in the buffer
      const newLogs = narration.filter((line) => !prev.includes(line));
      if (newLogs.length === 0) return prev;

      // Combine and cap at 80 lines to prevent memory bloat
      const combined = [...prev, ...newLogs];
      if (combined.length > 80) {
        return combined.slice(combined.length - 80);
      }
      return combined;
    });
  }, [narration]);

  // Autoscroll to bottom
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [logs]);

  // Filter logic
  const filteredLogs = logs.filter((log) => {
    if (filter === "warnings") {
      return log.toLowerCase().includes("warning") || log.toLowerCase().includes("hazard") || log.toLowerCase().includes("concave");
    }
    if (filter === "engine") {
      return log.toLowerCase().includes("ingestion") || log.toLowerCase().includes("completed") || log.toLowerCase().includes("diversified");
    }
    return true; // all
  });

  const clearLogs = () => {
    setLogs([]);
  };

  // If there are no logs yet, pre-populate with the current narration
  useEffect(() => {
    if (logs.length === 0 && narration && narration.length > 0) {
      setLogs(narration);
    }
  }, [narration, logs.length]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
      className="glass rounded-2xl border border-[var(--ox-border-default)] p-4 flex flex-col h-64 relative overflow-hidden"
      style={{ background: "rgba(7,9,15,0.85)" }}
    >
      {/* Scanning background overlay */}
      <div className="absolute inset-0 scanlines pointer-events-none opacity-[0.03]" />

      {/* Console Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-2 shrink-0">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-[var(--ox-accent-green)] glow-green" />
          <span className="text-[11px] font-mono uppercase tracking-widest text-[var(--ox-text-primary)]">
            Cognition Engine Telemetry Console
          </span>
          <span className="text-[9px] font-mono text-[var(--ox-text-muted)] opacity-60">
            // STATUS: {isTicking ? "ACTIVE_TICKING" : "STANDBY"}
          </span>
        </div>

        {/* Toggles and Clear Button */}
        <div className="flex items-center gap-3">
          <div className="flex items-center border border-white/[0.06] rounded-lg p-0.5 bg-black/30">
            {(["all", "warnings", "engine"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "text-[9px] font-mono px-2 py-0.5 rounded-md uppercase transition-all duration-150",
                  filter === f
                    ? "bg-white/10 text-[var(--ox-text-primary)] shadow-sm font-semibold"
                    : "text-[var(--ox-text-muted)] hover:text-[var(--ox-text-secondary)]"
                )}
              >
                {f}
              </button>
            ))}
          </div>

          <button
            onClick={clearLogs}
            className="text-[var(--ox-text-muted)] hover:text-[var(--ox-accent-red)] transition-colors p-1"
            title="Clear Console"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Terminal Screen */}
      <div
        ref={consoleRef}
        className="flex-1 overflow-y-auto font-mono text-[10px] space-y-1.5 pr-2 select-text"
        style={{ scrollbarWidth: "thin" }}
      >
        <AnimatePresence>
          {filteredLogs.length === 0 ? (
            <div className="h-full flex items-center justify-center text-[var(--ox-text-muted)] text-[9px] italic">
              Console cleared. Awaiting next cognition engine tick...
            </div>
          ) : (
            filteredLogs.map((log, idx) => {
              const isWarning = log.includes("WARNING") || log.includes("hazard") || log.includes("concave");
              const isEngine = log.includes("Ingestion") || log.includes("completed");

              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15 }}
                  className={cn(
                    "leading-relaxed border-l-2 pl-2 py-0.5",
                    isWarning
                      ? "border-[var(--ox-accent-red)] text-[var(--ox-accent-red)]/90 bg-[var(--ox-accent-red)]/[0.02]"
                      : isEngine
                      ? "border-[var(--ox-accent-cyan)] text-[var(--ox-accent-cyan)]/90 bg-[var(--ox-accent-cyan)]/[0.02]"
                      : "border-white/[0.05] text-[var(--ox-text-secondary)] bg-white/[0.005]"
                  )}
                >
                  {log}
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* Live Flashing status light */}
      <div className="absolute bottom-2 right-4 flex items-center gap-1.5 pointer-events-none">
        <span className="text-[8px] font-mono text-[var(--ox-text-muted)] uppercase opacity-50">
          Telemetry stream
        </span>
        <span className="relative flex h-1.5 w-1.5">
          <span
            className={cn(
              "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
              isTicking ? "bg-[var(--ox-accent-green)]" : "bg-[var(--ox-accent-amber)]"
            )}
          ></span>
          <span
            className={cn(
              "relative inline-flex rounded-full h-1.5 w-1.5",
              isTicking ? "bg-[var(--ox-accent-green)]" : "bg-[var(--ox-accent-amber)]"
            )}
          ></span>
        </span>
      </div>
    </motion.div>
  );
}
