// ============================================
// OPTIXFLOW — Strategy Registry
// Metadata about each available strategy
// ============================================

import type { StrategyMeta } from "@/types/options";

export const STRATEGIES: StrategyMeta[] = [
  {
    id: "long_call",
    label: "Long Call",
    description: "Buy a call option. Profit when stock rises above breakeven.",
    color: "#00e5a0",
  },
  {
    id: "long_put",
    label: "Long Put",
    description: "Buy a put option. Profit when stock falls below breakeven.",
    color: "#ff4d6a",
  },
  {
    id: "bull_call_spread",
    label: "Bull Call Spread",
    description:
      "Buy a lower-strike call, sell a higher-strike call. Defined risk and reward.",
    color: "#00d4ff",
  },
];

export const STRATEGY_MAP = Object.fromEntries(
  STRATEGIES.map((s) => [s.id, s])
) as Record<string, StrategyMeta>;
