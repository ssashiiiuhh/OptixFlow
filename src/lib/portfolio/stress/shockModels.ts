import { StrategyHoldingGroup, PortfolioGreeks } from "../types/portfolioTypes";
import { bsmPrice, bsmGreeks } from "../../quant/greeks/bsm";
import { calculateStrikeIv } from "../../quant/volatility/surface";

export interface ShockParameters {
  spotShiftPct: number;    // e.g. -0.15 for -15%
  ivShiftPct: number;      // e.g. 0.30 for +30% parallel shift of IV
  dteShiftDays?: number;   // days passed (time decay)
  skewShift?: number;      // shift in skew steepness coefficient
  rShift?: number;         // interest rate shift
}

/**
 * Re-values a strategy holding under custom spot, volatility, and time shocks.
 * Outputs the P&L impact and the post-shock Greeks.
 */
export function revalueStrategyHolding(
  h: StrategyHoldingGroup,
  spot: number,            // current spot price before shock
  baseIv: number,          // current baseline IV (decimal) before shock
  params: ShockParameters
): { pnlImpact: number; shiftedGreeks: PortfolioGreeks; newCurrentValue: number } {
  const { spotShiftPct, ivShiftPct, dteShiftDays = 0, skewShift = 0, rShift = 0 } = params;

  const newSpot = spot * (1 + spotShiftPct);
  const newBaseIv = Math.max(0.01, baseIv * (1 + ivShiftPct));
  const newR = 0.05 + rShift;

  let newCurrentValue = 0;
  
  const greeksList: PortfolioGreeks[] = [];

  h.legs.forEach((leg) => {
    const qty = leg.quantity;
    const sign = leg.side === "long" ? 1 : -1;

    if (leg.type === "stock") {
      // Stock value moves linearly with spot
      const val = newSpot * qty * sign;
      newCurrentValue += val;
      greeksList.push({
        delta: qty * sign,
        gamma: 0,
        theta: 0,
        vega: 0,
        rho: 0,
      });
    } else {
      // Option revaluation
      const newDte = Math.max(0, leg.expiryDte - dteShiftDays);
      const t = newDte / 365;

      // Recalculate strike-specific IV under shock
      const newIv = calculateStrikeIv(
        newSpot,
        leg.strike,
        newDte,
        newBaseIv * 100,
        0.18 + skewShift, // apply skew shift
        -0.35,            // skew tilt baseline
        false
      );

      const price = bsmPrice(newSpot, leg.strike, t, newIv, newR, leg.type as "call" | "put");
      newCurrentValue += price * qty * sign * 100;

      const g = bsmGreeks(newSpot, leg.strike, t, newIv, newR, leg.type as "call" | "put");
      greeksList.push({
        delta: g.delta * qty * sign * 100,
        gamma: g.gamma * qty * sign * 100,
        theta: g.theta * qty * sign * 100,
        vega: g.vega * qty * sign * 100,
        rho: g.rho * qty * sign * 100,
      });
    }
  });

  const pnlImpact = newCurrentValue - h.currentValue;

  const aggregatedGreeks = greeksList.reduce(
    (acc, curr) => ({
      delta: acc.delta + curr.delta,
      gamma: acc.gamma + curr.gamma,
      theta: acc.theta + curr.theta,
      vega: acc.vega + curr.vega,
      rho: acc.rho + curr.rho,
    }),
    { delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0 }
  );

  return {
    pnlImpact: Math.round(pnlImpact * 100) / 100,
    newCurrentValue: Math.round(newCurrentValue * 100) / 100,
    shiftedGreeks: {
      delta: Math.round(aggregatedGreeks.delta * 100) / 100,
      gamma: Math.round(aggregatedGreeks.gamma * 1000) / 1000,
      theta: Math.round(aggregatedGreeks.theta * 100) / 100,
      vega: Math.round(aggregatedGreeks.vega * 100) / 100,
      rho: Math.round(aggregatedGreeks.rho * 100) / 100,
    },
  };
}
