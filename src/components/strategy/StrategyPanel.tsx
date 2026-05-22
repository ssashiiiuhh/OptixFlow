"use client";

import { motion, AnimatePresence } from "framer-motion";
import { SlidersHorizontal } from "lucide-react";
import StrategySelector from "./StrategySelector";
import ParameterSlider from "./ParameterSlider";
import type { StrategyParams, StrategyType } from "@/types/options";

interface StrategyPanelProps {
  params: StrategyParams;
  onParamsChange: (params: StrategyParams) => void;
}

// ── Default param factories ──────────────────

function defaultSingleLeg(
  strategyType: "long_call" | "long_put",
  current?: Partial<StrategyParams>
): StrategyParams {
  return {
    strategyType,
    optionType: strategyType === "long_call" ? "call" : "put",
    strikePrice: 175,
    premium: 5.0,
    quantity: 1,
    currentStockPrice: 170,
  };
}

function defaultSpread(): StrategyParams {
  return {
    strategyType: "bull_call_spread",
    lowerStrike: 165,
    upperStrike: 185,
    netPremium: 4.0,
    quantity: 1,
    currentStockPrice: 170,
  };
}

// ── Panel component ──────────────────────────

export default function StrategyPanel({ params, onParamsChange }: StrategyPanelProps) {
  const handleStrategyChange = (strategyType: StrategyType) => {
    if (strategyType === "bull_call_spread") {
      onParamsChange(defaultSpread());
    } else {
      onParamsChange(defaultSingleLeg(strategyType));
    }
  };

  return (
    <aside className="h-full glass border-r border-[var(--ox-border-default)] overflow-y-auto relative z-10">
      <div className="p-4 space-y-6">
        {/* Panel header */}
        <div className="flex items-center gap-2 pb-3 border-b border-[var(--ox-border-subtle)]">
          <SlidersHorizontal size={14} className="text-[var(--ox-accent-cyan)]" />
          <h2 className="text-sm font-semibold text-[var(--ox-text-primary)]">
            Strategy Configuration
          </h2>
        </div>

        {/* Strategy selector */}
        <StrategySelector
          selected={params.strategyType}
          onChange={handleStrategyChange}
        />

        {/* Divider */}
        <div className="h-px bg-[var(--ox-border-subtle)]" />

        {/* Parameter inputs — animate when strategy changes */}
        <AnimatePresence mode="wait">
          <motion.div
            key={params.strategyType}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <p className="text-[10px] uppercase tracking-widest text-[var(--ox-text-muted)]">
              Parameters
            </p>

            {/* ── Single-leg parameters ── */}
            {(params.strategyType === "long_call" ||
              params.strategyType === "long_put") && (
              <div className="space-y-5">
                <ParameterSlider
                  label="Current Stock Price"
                  value={params.currentStockPrice}
                  min={50}
                  max={500}
                  step={0.5}
                  prefix="$"
                  color="cyan"
                  description="Underlying asset spot price"
                  onChange={(v) =>
                    onParamsChange({ ...params, currentStockPrice: v })
                  }
                />

                <ParameterSlider
                  label="Strike Price"
                  value={params.strikePrice}
                  min={50}
                  max={500}
                  step={0.5}
                  prefix="$"
                  color={params.strategyType === "long_call" ? "green" : "red"}
                  description="Option exercise price"
                  onChange={(v) =>
                    onParamsChange({ ...params, strikePrice: v })
                  }
                />

                <ParameterSlider
                  label="Premium Paid"
                  value={params.premium}
                  min={0.1}
                  max={50}
                  step={0.1}
                  prefix="$"
                  color="amber"
                  description="Cost per share (× 100 per contract)"
                  onChange={(v) => onParamsChange({ ...params, premium: v })}
                />

                <ParameterSlider
                  label="Contracts"
                  value={params.quantity}
                  min={1}
                  max={20}
                  step={1}
                  suffix="x"
                  color="cyan"
                  description="1 contract = 100 shares"
                  onChange={(v) => onParamsChange({ ...params, quantity: v })}
                />
              </div>
            )}

            {/* ── Bull Call Spread parameters ── */}
            {params.strategyType === "bull_call_spread" && (
              <div className="space-y-5">
                <ParameterSlider
                  label="Current Stock Price"
                  value={params.currentStockPrice}
                  min={50}
                  max={500}
                  step={0.5}
                  prefix="$"
                  color="cyan"
                  description="Underlying asset spot price"
                  onChange={(v) =>
                    onParamsChange({ ...params, currentStockPrice: v })
                  }
                />

                <ParameterSlider
                  label="Lower Strike (Long)"
                  value={params.lowerStrike}
                  min={50}
                  max={500}
                  step={0.5}
                  prefix="$"
                  color="green"
                  description="Strike of the purchased call"
                  onChange={(v) =>
                    onParamsChange({
                      ...params,
                      lowerStrike: Math.min(v, params.upperStrike - 1),
                    })
                  }
                />

                <ParameterSlider
                  label="Upper Strike (Short)"
                  value={params.upperStrike}
                  min={50}
                  max={500}
                  step={0.5}
                  prefix="$"
                  color="red"
                  description="Strike of the sold call"
                  onChange={(v) =>
                    onParamsChange({
                      ...params,
                      upperStrike: Math.max(v, params.lowerStrike + 1),
                    })
                  }
                />

                <ParameterSlider
                  label="Net Premium"
                  value={params.netPremium}
                  min={0.1}
                  max={30}
                  step={0.1}
                  prefix="$"
                  color="amber"
                  description="Net debit paid (long − short premium)"
                  onChange={(v) =>
                    onParamsChange({ ...params, netPremium: v })
                  }
                />

                <ParameterSlider
                  label="Contracts"
                  value={params.quantity}
                  min={1}
                  max={20}
                  step={1}
                  suffix="x"
                  color="cyan"
                  description="1 contract = 100 shares"
                  onChange={(v) => onParamsChange({ ...params, quantity: v })}
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Info card */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="rounded-lg border border-[var(--ox-accent-cyan)]/10 bg-[var(--ox-accent-cyan-dim)] p-3"
        >
          <p className="text-[10px] text-[var(--ox-text-muted)] leading-relaxed">
            <span className="text-[var(--ox-accent-cyan)] font-medium">Note: </span>
            All calculations represent P&amp;L at expiration. Live options
            pricing (Black-Scholes Greeks) coming in v2.
          </p>
        </motion.div>
      </div>
    </aside>
  );
}
