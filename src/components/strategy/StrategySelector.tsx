"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { StrategyType } from "@/types/options";
import { STRATEGIES } from "@/lib/finance/strategies";

interface StrategySelectorProps {
  selected: StrategyType;
  onChange: (strategy: StrategyType) => void;
}

export default function StrategySelector({ selected, onChange }: StrategySelectorProps) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] uppercase tracking-widest text-[var(--ox-text-muted)] mb-3">
        Strategy
      </p>

      <div className="space-y-1.5">
        {STRATEGIES.map((strategy) => {
          const isSelected = selected === strategy.id;

          return (
            <motion.button
              key={strategy.id}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onChange(strategy.id)}
              className={cn(
                "w-full text-left px-3 py-2.5 rounded-lg border transition-all duration-150",
                "flex items-center gap-3",
                isSelected
                  ? "border-[var(--ox-border-focus)] bg-[var(--ox-accent-cyan-dim)]"
                  : "border-[var(--ox-border-default)] bg-transparent hover:bg-white/[0.03]"
              )}
              style={
                isSelected
                  ? { boxShadow: `0 0 0 1px rgba(0, 212, 255, 0.15) inset` }
                  : {}
              }
            >
              {/* Color dot */}
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  backgroundColor: strategy.color,
                  boxShadow: isSelected ? `0 0 6px ${strategy.color}` : "none",
                }}
              />

              <div className="min-w-0">
                <p
                  className={cn(
                    "text-sm font-medium",
                    isSelected
                      ? "text-[var(--ox-text-primary)]"
                      : "text-[var(--ox-text-secondary)]"
                  )}
                >
                  {strategy.label}
                </p>
                {isSelected && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-[10px] text-[var(--ox-text-muted)] mt-0.5 leading-relaxed"
                  >
                    {strategy.description}
                  </motion.p>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
