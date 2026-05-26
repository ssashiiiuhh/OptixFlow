// ============================================================================
// OPTIXFLOW — Portfolio Telemetry Terminal Console v2
// Now includes AI Narration streaming with Gemini integration.
// ============================================================================

"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePortfolio } from "./PortfolioContext";
import { Terminal, Trash2, Cpu, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type LogFilter = "all" | "warnings" | "engine" | "ai";

interface LogLine {
  id: string;
  text: string;
  type: "quant" | "warning" | "engine" | "ai";
}

export default function PortfolioConsole() {
  const { narration, isTicking, aiNarrationLines, isNarrating, requestAINarration } = usePortfolio();
  const [lines, setLines] = useState<LogLine[]>([]);
  const [filter, setFilter] = useState<LogFilter>("all");
  const consoleRef = useRef<HTMLDivElement>(null);
  const seenRef = useRef<Set<string>>(new Set());

  // Classify a quant narration line
  function classify(text: string): LogLine["type"] {
    if (text.toLowerCase().includes("warning") || text.toLowerCase().includes("hazard") || text.toLowerCase().includes("concave")) return "warning";
    if (text.toLowerCase().includes("ingestion") || text.toLowerCase().includes("completed") || text.toLowerCase().includes("diversified")) return "engine";
    return "quant";
  }

  // Add quant narration lines
  useEffect(() => {
    if (!narration?.length) return;
    const newItems: LogLine[] = [];
    narration.forEach((text) => {
      if (!seenRef.current.has(text)) {
        seenRef.current.add(text);
        newItems.push({ id: `q-${Date.now()}-${Math.random()}`, text, type: classify(text) });
      }
    });
    if (!newItems.length) return;
    setLines((prev) => {
      const next = [...prev, ...newItems];
      return next.length > 100 ? next.slice(next.length - 100) : next;
    });
  }, [narration]);

  // Add AI narration lines (handling streaming)
  useEffect(() => {
    if (!aiNarrationLines?.length) return;
    setLines((prev) => {
      const next = [...prev];
      aiNarrationLines.forEach((text) => {
        const isStreaming = text.startsWith("__STREAMING__");
        const cleanText = isStreaming ? text.slice(13) : text;
        const cacheKey = `ai-${text}`;
        
        // For streaming lines, replace the last streaming entry
        if (isStreaming) {
          const lastIdx = next.findLastIndex((l) => l.type === "ai" && l.text.startsWith("__STREAMING__"));
          if (lastIdx >= 0) {
            next[lastIdx] = { ...next[lastIdx], text };
            return;
          }
        }
        
        if (!seenRef.current.has(cacheKey)) {
          seenRef.current.add(cacheKey);
          next.push({ id: `ai-${Date.now()}-${Math.random()}`, text, type: "ai" as const });
        }
      });
      return next.length > 100 ? next.slice(next.length - 100) : next;
    });
  }, [aiNarrationLines]);

  // Autoscroll
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [lines]);

  // Seed on mount
  useEffect(() => {
    if (lines.length === 0 && narration?.length) {
      const seed: LogLine[] = narration.map((text) => {
        seenRef.current.add(text);
        return { id: `q-seed-${Math.random()}`, text, type: classify(text) };
      });
      setLines(seed);
    }
  }, [narration, lines.length]);

  const filteredLines = lines.filter((l) => {
    if (filter === "warnings") return l.type === "warning";
    if (filter === "engine") return l.type === "engine";
    if (filter === "ai") return l.type === "ai";
    return true;
  });

  const LINE_STYLES: Record<LogLine["type"], string> = {
    quant:   "border-white/[0.05] text-[var(--ox-text-secondary)]",
    warning: "border-[var(--ox-accent-red)] text-[var(--ox-accent-red)]/90 bg-[var(--ox-accent-red)]/[0.02]",
    engine:  "border-[var(--ox-accent-cyan)] text-[var(--ox-accent-cyan)]/90 bg-[var(--ox-accent-cyan)]/[0.02]",
    ai:      "border-[#a855f7] text-[#c084fc]/95 bg-[#a855f7]/[0.03]",
  };

  const LINE_PREFIX: Record<LogLine["type"], string> = {
    quant:   "",
    warning: "⚠ ",
    engine:  "◈ ",
    ai:      "✦ ",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
      className="glass rounded-2xl border border-[var(--ox-border-default)] p-4 flex flex-col h-72 relative overflow-hidden"
      style={{ background: "rgba(7,9,15,0.90)" }}
    >
      {/* Scanlines */}
      <div className="absolute inset-0 scanlines pointer-events-none opacity-[0.025]" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-2 shrink-0">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-[var(--ox-accent-green)]" style={{ filter: "drop-shadow(0 0 6px rgba(0,229,160,0.5))" }} />
          <span className="text-[11px] font-mono uppercase tracking-widest text-[var(--ox-text-primary)]">
            Cognition Engine Telemetry
          </span>
          <span className="text-[9px] font-mono text-[var(--ox-text-muted)] opacity-50">
            // {isTicking ? "ACTIVE" : "STANDBY"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter tabs */}
          <div className="flex items-center border border-white/[0.06] rounded-lg p-0.5 bg-black/30">
            {(["all", "ai", "warnings", "engine"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "text-[8px] font-mono px-1.5 py-0.5 rounded-md uppercase tracking-wide transition-all duration-150 flex items-center gap-1",
                  filter === f
                    ? f === "ai"
                      ? "bg-[#a855f7]/20 text-[#c084fc] font-semibold"
                      : "bg-white/10 text-[var(--ox-text-primary)] font-semibold"
                    : "text-[var(--ox-text-muted)] hover:text-[var(--ox-text-secondary)]"
                )}
              >
                {f === "ai" && <Sparkles size={8} />}
                {f}
              </button>
            ))}
          </div>

          {/* AI Narrate button */}
          <button
            onClick={requestAINarration}
            disabled={isNarrating}
            className={cn(
              "flex items-center gap-1 text-[9px] font-mono px-2 py-1 rounded-lg border transition-all duration-200",
              isNarrating
                ? "border-[#a855f7]/30 bg-[#a855f7]/10 text-[#c084fc] cursor-wait"
                : "border-[#a855f7]/20 bg-[#a855f7]/5 text-[#a855f7]/80 hover:text-[#c084fc] hover:border-[#a855f7]/40 hover:bg-[#a855f7]/10"
            )}
            title="Request AI Risk Narration"
          >
            {isNarrating
              ? <Loader2 size={9} className="animate-spin" />
              : <Cpu size={9} />
            }
            {isNarrating ? "Thinking..." : "AI Narrate"}
          </button>

          {/* Clear */}
          <button
            onClick={() => { setLines([]); seenRef.current.clear(); }}
            className="text-[var(--ox-text-muted)] hover:text-[var(--ox-accent-red)] transition-colors p-1"
            title="Clear Console"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Terminal body */}
      <div
        ref={consoleRef}
        className="flex-1 overflow-y-auto font-mono text-[10px] space-y-1 pr-1 select-text"
        style={{ scrollbarWidth: "thin" }}
      >
        <AnimatePresence initial={false}>
          {filteredLines.length === 0 ? (
            <div className="h-full flex items-center justify-center text-[var(--ox-text-muted)] text-[9px] italic">
              Console cleared. Awaiting cognition engine tick...
            </div>
          ) : (
            filteredLines.map((line) => (
              <motion.div
                key={line.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.12 }}
                className={cn(
                  "leading-relaxed border-l-2 pl-2 py-0.5 rounded-r-sm",
                  LINE_STYLES[line.type]
                )}
              >
                <span className="opacity-60">{LINE_PREFIX[line.type]}</span>
                {line.text.startsWith("__STREAMING__") ? (
                  <>
                    <span>{line.text.slice(13)}</span>
                    <span className="inline-block w-1.5 h-3 bg-[#a855f7]/70 animate-pulse ml-0.5 align-middle rounded-sm" />
                  </>
                ) : (
                  line.text
                )}
              </motion.div>
            ))
          )}
        </AnimatePresence>

        {/* AI thinking indicator */}
        {isNarrating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="border-l-2 border-[#a855f7]/60 pl-2 py-0.5 text-[#a855f7]/60 flex items-center gap-1.5"
          >
            <span className="inline-flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1 w-1 rounded-full bg-[#a855f7]/60 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </span>
            <span>Gemini AI generating risk narration...</span>
          </motion.div>
        )}
      </div>

      {/* Status bar */}
      <div className="absolute bottom-2 right-4 flex items-center gap-2 pointer-events-none">
        <span className="text-[7px] font-mono text-[var(--ox-text-muted)] uppercase opacity-40">
          {lines.length} entries
        </span>
        <span className="relative flex h-1.5 w-1.5">
          <span className={cn(
            "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
            isTicking ? "bg-[var(--ox-accent-green)]" : isNarrating ? "bg-[#a855f7]" : "bg-[var(--ox-accent-amber)]"
          )} />
          <span className={cn(
            "relative inline-flex rounded-full h-1.5 w-1.5",
            isTicking ? "bg-[var(--ox-accent-green)]" : isNarrating ? "bg-[#a855f7]" : "bg-[var(--ox-accent-amber)]"
          )} />
        </span>
      </div>
    </motion.div>
  );
}
