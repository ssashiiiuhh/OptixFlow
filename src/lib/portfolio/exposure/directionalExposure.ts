import { StrategyHoldingGroup } from "../types/portfolioTypes";

// Standard institutional beta coefficients relative to SPY
export const ASSET_BETAS: Record<string, number> = {
  SPY: 1.0,
  QQQ: 1.25,
  AAPL: 1.15,
  MSFT: 1.10,
  NVDA: 2.15,
  TSLA: 1.85,
  GLD: 0.15, // Low correlation to equity index
};

export interface DirectionalExposureProfile {
  netDelta: number;
  netBetaDelta: number;          // Beta-weighted Delta relative to SPY
  dollarDeltaExposure: number;   // Total capital-equivalent exposure in dollars
  directionalBias: "bullish" | "bearish" | "neutral" | "volatile";
  leverageRatio: number;         // Net dollar exposure divided by cash/cost basis
}

/**
 * Calculates net directional bias, standard Delta, and Beta-weighted SPY-equivalent Delta.
 */
export function computeDirectionalExposure(
  holdings: StrategyHoldingGroup[],
  spotPrices: Record<string, number>,
  totalPortfolioValue: number
): DirectionalExposureProfile {
  let netDelta = 0;
  let netBetaDelta = 0;
  let dollarDeltaExposure = 0;

  holdings.forEach((h) => {
    const spot = spotPrices[h.ticker] || 100.0;
    const beta = ASSET_BETAS[h.ticker.toUpperCase()] ?? 1.0;
    const groupDelta = h.greeks.delta;

    netDelta += groupDelta;
    // Beta-weighted Delta = Delta * Beta * (Stock Price / SPY Price)
    // To represent direct stock equivalent share count:
    const spyPrice = spotPrices.SPY || 528.0;
    const betaWeightedShares = groupDelta * beta * (spot / spyPrice);
    
    netBetaDelta += betaWeightedShares;
    dollarDeltaExposure += groupDelta * spot;
  });

  // Classify bias based on beta-weighted Delta relative to portfolio value
  // If beta-delta is significantly positive, it's bullish.
  let bias: "bullish" | "bearish" | "neutral" | "volatile" = "neutral";
  const normalizedExposure = totalPortfolioValue > 0 ? dollarDeltaExposure / totalPortfolioValue : 0;
  
  if (normalizedExposure > 0.15) bias = "bullish";
  else if (normalizedExposure < -0.15) bias = "bearish";
  else bias = "neutral";

  // If there are large offsets or straddles, it could be classified as "volatile"
  const totalVega = holdings.reduce((sum, h) => sum + h.greeks.vega, 0);
  const totalTheta = holdings.reduce((sum, h) => sum + h.greeks.theta, 0);
  if (Math.abs(netDelta) < 10 && totalVega > 150 && totalTheta < -50) {
    bias = "volatile";
  }

  const leverageRatio = totalPortfolioValue > 0 ? Math.abs(dollarDeltaExposure) / totalPortfolioValue : 0;

  return {
    netDelta: Math.round(netDelta * 100) / 100,
    netBetaDelta: Math.round(netBetaDelta * 100) / 100,
    dollarDeltaExposure: Math.round(dollarDeltaExposure * 100) / 100,
    directionalBias: bias,
    leverageRatio: Math.round(leverageRatio * 100) / 100,
  };
}
