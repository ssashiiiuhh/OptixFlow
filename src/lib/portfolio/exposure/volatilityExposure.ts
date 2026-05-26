import { StrategyHoldingGroup } from "../types/portfolioTypes";

export interface VolatilityExposureProfile {
  totalVega: number;
  vegaByMaturity: {
    ultraShort: number; // < 7 DTE
    short: number;      // 7-30 DTE
    medium: number;     // 30-90 DTE
    long: number;       // 90 DTE+
  };
  vegaWeightedDte: number; // Average DTE weighted by Vega exposure magnitude
  volatilitySkewRisk: "high" | "medium" | "low"; // assessment of skew slope risk
}

/**
 * Profiles the volatility exposure (Vega) of the portfolio across the expiration curve.
 */
export function computeVolatilityExposure(holdings: StrategyHoldingGroup[]): VolatilityExposureProfile {
  let totalVega = 0;
  let weightedDteSum = 0;
  let absoluteVegaSum = 0;

  const vegaByMaturity = {
    ultraShort: 0,
    short: 0,
    medium: 0,
    long: 0,
  };

  holdings.forEach((h) => {
    const v = h.greeks.vega;
    const dte = h.daysToExpiry;

    totalVega += v;
    absoluteVegaSum += Math.abs(v);
    weightedDteSum += Math.abs(v) * dte;

    if (dte < 7) {
      vegaByMaturity.ultraShort += v;
    } else if (dte <= 30) {
      vegaByMaturity.short += v;
    } else if (dte <= 90) {
      vegaByMaturity.medium += v;
    } else {
      vegaByMaturity.long += v;
    }
  });

  const vegaWeightedDte = absoluteVegaSum > 0 ? weightedDteSum / absoluteVegaSum : 0;

  // Evaluate volatility skew risk based on front-end vega concentration
  // Front-end vega is more sensitive to sudden IV crush
  let skewRisk: "high" | "medium" | "low" = "low";
  const frontEndRatio = absoluteVegaSum > 0 ? (Math.abs(vegaByMaturity.ultraShort) + Math.abs(vegaByMaturity.short)) / absoluteVegaSum : 0;
  if (frontEndRatio > 0.65) {
    skewRisk = "high";
  } else if (frontEndRatio > 0.40) {
    skewRisk = "medium";
  }

  return {
    totalVega: Math.round(totalVega * 100) / 100,
    vegaByMaturity: {
      ultraShort: Math.round(vegaByMaturity.ultraShort * 100) / 100,
      short: Math.round(vegaByMaturity.short * 100) / 100,
      medium: Math.round(vegaByMaturity.medium * 100) / 100,
      long: Math.round(vegaByMaturity.long * 100) / 100,
    },
    vegaWeightedDte: Math.round(vegaWeightedDte * 10) / 10,
    volatilitySkewRisk: skewRisk,
  };
}
