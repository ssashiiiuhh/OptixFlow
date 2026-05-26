import { StrategyHoldingGroup, RiskSurfacePoint, PortfolioGreeks } from "../types/portfolioTypes";
import { revalueStrategyHolding } from "../stress/shockModels";
import { aggregateGreeks } from "../aggregation/positionAggregation";

/**
 * Generates a 3D mesh representation of portfolio risk.
 * Iterates through combinations of Spot Move (-20% to +20%) vs IV Move (-20% to +30%)
 * and computes P&L and shifted Greeks at each mesh coordinate.
 */
export function generatePortfolioRiskSurface(
  holdings: StrategyHoldingGroup[],
  spotPrices: Record<string, number>,
  ivs: Record<string, number>
): RiskSurfacePoint[] {
  const mesh: RiskSurfacePoint[] = [];

  // Discrete coordinate points for Spot Move (%) and IV Move (%)
  const spotShifts = [-20, -15, -10, -5, -2, 0, 2, 5, 10, 15, 20];
  const ivShifts = [-20, -10, -5, 0, 5, 10, 15, 20, 30];

  spotShifts.forEach((xMove) => {
    ivShifts.forEach((yMove) => {
      let totalPnl = 0;
      const greeksList: PortfolioGreeks[] = [];

      const spotShiftPct = xMove / 100;
      const ivShiftPct = yMove / 100;

      holdings.forEach((h) => {
        const spot = spotPrices[h.ticker] || 100.0;
        const iv = ivs[h.ticker] || 0.25;

        const revalued = revalueStrategyHolding(h, spot, iv, {
          spotShiftPct,
          ivShiftPct,
          dteShiftDays: 0,
        });

        totalPnl += revalued.pnlImpact;
        greeksList.push(revalued.shiftedGreeks);
      });

      const netShifted = aggregateGreeks(greeksList);

      mesh.push({
        spotOffset: xMove,
        ivOffset: yMove,
        pnl: Math.round(totalPnl),
        delta: netShifted.delta,
        gamma: netShifted.gamma,
        vega: netShifted.vega,
      });
    });
  });

  return mesh;
}
