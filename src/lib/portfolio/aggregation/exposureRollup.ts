import { StrategyHoldingGroup, ExposureSegment } from "../types/portfolioTypes";

/**
 * Rolls up portfolio holdings by their directional bias (Bullish, Bearish, Neutral, Vol Long).
 * Maps directly to the ExposureSegment interface used by the frontend visualization charts.
 */
export function rollupExposureByBias(holdings: StrategyHoldingGroup[]): ExposureSegment[] {
  const totalValue = holdings.reduce((sum, h) => sum + Math.abs(h.currentValue), 0);

  const biasGroups: Record<
    "bullish" | "bearish" | "neutral" | "volatile",
    { label: string; color: string; glowColor: string; desc: string; value: number; strategies: string[] }
  > = {
    bullish: {
      label: "Bullish",
      color: "#00e5a0",
      glowColor: "rgba(0,229,160,0.3)",
      desc: "Long delta positions with directional upside",
      value: 0,
      strategies: [],
    },
    bearish: {
      label: "Bearish",
      color: "#ff4d6a",
      glowColor: "rgba(255,77,106,0.3)",
      desc: "Negative delta hedging and downside protection",
      value: 0,
      strategies: [],
    },
    neutral: {
      label: "Neutral",
      color: "#00d4ff",
      glowColor: "rgba(0,212,255,0.3)",
      desc: "Delta-neutral range-bound income strategies",
      value: 0,
      strategies: [],
    },
    volatile: {
      label: "Vol Long",
      color: "#a855f7",
      glowColor: "rgba(168,85,247,0.3)",
      desc: "Long vega positions benefiting from volatility expansion",
      value: 0,
      strategies: [],
    },
  };

  holdings.forEach((h) => {
    const bias = h.bias;
    const entry = biasGroups[bias];
    if (entry) {
      entry.value += Math.abs(h.currentValue);
      entry.strategies.push(`${h.ticker} ${h.strategyName}`);
    }
  });

  return Object.entries(biasGroups).map(([id, data]) => {
    const pct = totalValue > 0 ? Math.round((data.value / totalValue) * 100) : 0;
    return {
      id,
      label: data.label,
      value: Math.round(data.value),
      pct,
      color: data.color,
      glowColor: data.glowColor,
      description: data.desc,
      strategies: data.strategies,
    };
  });
}

/**
 * Rolls up portfolio holdings by GICS Sector classification.
 */
export function rollupExposureBySector(
  holdings: StrategyHoldingGroup[]
): { sector: string; value: number; pct: number }[] {
  const totalValue = holdings.reduce((sum, h) => sum + Math.abs(h.currentValue), 0);
  const sectorWeights: Record<string, number> = {};

  holdings.forEach((h) => {
    sectorWeights[h.sector] = (sectorWeights[h.sector] || 0) + Math.abs(h.currentValue);
  });

  return Object.entries(sectorWeights)
    .map(([sector, val]) => {
      const pct = totalValue > 0 ? Math.round((val / totalValue) * 100) : 0;
      return { sector, value: Math.round(val), pct };
    })
    .sort((a, b) => b.value - a.value);
}

/**
 * Rolls up options exposure by Maturity bracket (Days to Expiration).
 */
export function rollupExposureByMaturity(
  holdings: StrategyHoldingGroup[]
): { range: string; value: number; pct: number }[] {
  const totalValue = holdings.reduce((sum, h) => sum + Math.abs(h.currentValue), 0);
  
  const maturityBrackets = [
    { label: "Ultra Short (<7d)", min: 0, max: 7, value: 0 },
    { label: "Short (7-30d)", min: 8, max: 30, value: 0 },
    { label: "Medium (30-90d)", min: 31, max: 90, value: 0 },
    { label: "Long (90d+)", min: 91, max: 9999, value: 0 },
  ];

  holdings.forEach((h) => {
    // Skip equity spot (0 DTE) for option maturity calculations, or group them as Ultra Short
    const isEquityOnly = h.legs.every((l) => l.type === "stock");
    const dte = isEquityOnly ? 9999 : h.daysToExpiry;

    const bracket = maturityBrackets.find((b) => dte >= b.min && dte <= b.max);
    if (bracket) {
      bracket.value += Math.abs(h.currentValue);
    }
  });

  return maturityBrackets
    .map((b) => {
      const pct = totalValue > 0 ? Math.round((b.value / totalValue) * 100) : 0;
      return { range: b.label, value: Math.round(b.value), pct };
    })
    .filter((b) => b.value > 0);
}
