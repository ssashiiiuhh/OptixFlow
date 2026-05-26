import { StrategyHoldingGroup } from "../types/portfolioTypes";

export interface ConvexityRiskProfile {
  totalGamma: number;
  gammaClass: "convex" | "concave" | "neutral"; // convex = net long gamma, concave = net short gamma
  pinRiskTicker: string | null;                 // ticker with the highest near-term pin risk
  gammaVulnerabilityScore: number;              // 0-100 score representing risk of rapid delta shifts
  nearTermShortStrikes: { ticker: string; strike: number; dte: number }[];
}

/**
 * Maps the portfolio's Gamma convexity and detects near-expiration short-strike pin risks.
 */
export function computeConvexityMapping(
  holdings: StrategyHoldingGroup[],
  spotPrices: Record<string, number>
): ConvexityRiskProfile {
  let totalGamma = 0;
  const nearTermShortStrikes: { ticker: string; strike: number; dte: number }[] = [];
  let maxPinRiskScore = 0;
  let pinRiskTicker: string | null = null;

  holdings.forEach((h) => {
    totalGamma += h.greeks.gamma;

    // Scan individual legs for short option positions expiring in < 15 days
    h.legs.forEach((leg) => {
      const isShortOption = (leg.type === "call" || leg.type === "put") && leg.side === "short";
      if (isShortOption && leg.expiryDte <= 15) {
        nearTermShortStrikes.push({
          ticker: h.ticker,
          strike: leg.strike,
          dte: leg.expiryDte,
        });

        // Compute proximity-to-strike risk factor
        const spot = spotPrices[h.ticker] || 100.0;
        const pctDist = Math.abs(leg.strike - spot) / spot;
        
        // Pin risk is highest when spot is close to strike and DTE is low
        if (pctDist < 0.05) {
          const pinRiskScore = (1.0 - pctDist / 0.05) * (15.0 / Math.max(1, leg.expiryDte));
          if (pinRiskScore > maxPinRiskScore) {
            maxPinRiskScore = pinRiskScore;
            pinRiskTicker = h.ticker;
          }
        }
      }
    });
  });

  const gammaClass = totalGamma > 0.005 ? "convex" : totalGamma < -0.005 ? "concave" : "neutral";

  // Gamma vulnerability score is scaled by net negative gamma and near-term pin risk
  let vulnerability = 0;
  if (totalGamma < 0) {
    vulnerability = Math.min(100, Math.round(Math.abs(totalGamma) * 800 + maxPinRiskScore * 15));
  } else {
    vulnerability = Math.min(40, Math.round(maxPinRiskScore * 10)); // even positive gamma has minor pin tracking
  }

  return {
    totalGamma: Math.round(totalGamma * 10000) / 10000,
    gammaClass,
    pinRiskTicker,
    gammaVulnerabilityScore: Math.max(0, vulnerability),
    nearTermShortStrikes,
  };
}
