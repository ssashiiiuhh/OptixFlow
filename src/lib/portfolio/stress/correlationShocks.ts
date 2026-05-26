import { ASSET_BETAS } from "../exposure/directionalExposure";

/**
 * Correlation Shocks Engine.
 * Models correlation convergence during systemic selloffs.
 * In a crash, all stock correlations rise toward 1.0, increasing portfolio beta risk.
 */

export interface CorrelationAdjustmentSummary {
  originalBetas: Record<string, number>;
  shockedBetas: Record<string, number>;
  correlationExpansionFactor: number;
}

/**
 * Recalculates asset betas under systemic market distress, modeling correlation convergence.
 */
export function applyCorrelationExpansion(
  marketMovePct: number // standard SPY move pct
): CorrelationAdjustmentSummary {
  const shockedBetas = { ...ASSET_BETAS };
  
  // Correlation expansion is highest when index declines steeply
  let expansionFactor = 1.0;
  if (marketMovePct < -0.05) {
    // Decline exceeds 5%: Correlations expand.
    // expansionFactor represents how much asset betas compress toward high systemic risk
    const distressSeverity = Math.min(2.0, Math.abs(marketMovePct) * 10); // cap at 2.0x weight
    expansionFactor = 1.0 + 0.35 * distressSeverity;
  }

  Object.keys(shockedBetas).forEach((ticker) => {
    const origBeta = ASSET_BETAS[ticker];
    if (ticker === "SPY") {
      shockedBetas[ticker] = 1.0; // Market is baseline
    } else if (ticker === "GLD") {
      // Gold can decorrelate or become a liquidity source
      // In mild panic, gold beta drops; in extreme panic, it moves towards 0.5 as everything is liquidated
      shockedBetas[ticker] = marketMovePct < -0.15 ? 0.45 : 0.05;
    } else {
      // Equity betas expand under systemic pressure
      shockedBetas[ticker] = Math.min(3.0, Math.round(origBeta * expansionFactor * 100) / 100);
    }
  });

  return {
    originalBetas: ASSET_BETAS,
    shockedBetas,
    correlationExpansionFactor: Math.round(expansionFactor * 100) / 100,
  };
}
