import { StrategyHoldingGroup, PortfolioGreeks } from "../types/portfolioTypes";
import { revalueStrategyHolding } from "../stress/shockModels";
import { aggregateGreeks } from "../aggregation/positionAggregation";

export interface EarningsShockResult {
  ticker: string;
  priceMovePct: number;
  ivCrushPct: number;
  pnlImpact: number;
  shiftedGreeks: PortfolioGreeks;
  impactedHoldingsPnl: Record<string, number>;
}

/**
 * Simulates the localized portfolio impact of a single-stock earnings release.
 * Models a sharp price move (positive or negative) accompanied by volatility crush.
 */
export function simulateEarningsShock(
  holdings: StrategyHoldingGroup[],
  spotPrices: Record<string, number>,
  ivs: Record<string, number>,
  targetTicker: string,
  priceMovePct: number,   // e.g. 0.08 for +8% move
  ivCrushPct: number     // e.g. -0.35 for -35% IV crush
): EarningsShockResult {
  let totalPnlImpact = 0;
  const impactedHoldingsPnl: Record<string, number> = {};
  const shiftedGreeksList: PortfolioGreeks[] = [];

  holdings.forEach((h) => {
    const spot = spotPrices[h.ticker] || 100.0;
    const iv = ivs[h.ticker] || 0.25;

    if (h.ticker.toUpperCase() === targetTicker.toUpperCase()) {
      // Apply the localized price and IV shocks
      const revalued = revalueStrategyHolding(h, spot, iv, {
        spotShiftPct: priceMovePct,
        ivShiftPct: ivCrushPct,
        dteShiftDays: 1, // 1 day decay (overnight earnings release)
        skewShift: -0.10, // post-earnings smile flattening
      });

      totalPnlImpact += revalued.pnlImpact;
      impactedHoldingsPnl[h.id] = Math.round(revalued.pnlImpact);
      shiftedGreeksList.push(revalued.shiftedGreeks);
    } else {
      // Unimpacted holding: only experiences 1 day time decay
      const revalued = revalueStrategyHolding(h, spot, iv, {
        spotShiftPct: 0,
        ivShiftPct: 0,
        dteShiftDays: 1,
      });

      totalPnlImpact += revalued.pnlImpact;
      impactedHoldingsPnl[h.id] = Math.round(revalued.pnlImpact);
      shiftedGreeksList.push(revalued.shiftedGreeks);
    }
  });

  const netShiftedGreeks = aggregateGreeks(shiftedGreeksList);

  return {
    ticker: targetTicker,
    priceMovePct,
    ivCrushPct,
    pnlImpact: Math.round(totalPnlImpact),
    shiftedGreeks: netShiftedGreeks,
    impactedHoldingsPnl,
  };
}
