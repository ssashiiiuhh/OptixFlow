import { bsmGreeks } from "../../quant/greeks/bsm";
import { PositionLeg, PortfolioGreeks } from "../types/portfolioTypes";

/**
 * Calculates Greeks for a single position leg based on current market state.
 */
export function calculateLegGreeks(
  leg: PositionLeg,
  underlierPrice: number,
  iv: number,
  r: number = 0.05
): PortfolioGreeks {
  const sign = leg.side === "long" ? 1 : -1;
  const qty = leg.quantity;

  if (leg.type === "stock") {
    // 1 share of stock = 1.0 Delta, other Greeks are 0.
    return {
      delta: qty * sign,
      gamma: 0,
      theta: 0,
      vega: 0,
      rho: 0,
    };
  }

  if (leg.type === "cash") {
    return { delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0 };
  }

  // Options: each contract represents 100 shares.
  const t = leg.expiryDte / 365;
  const greeks = bsmGreeks(underlierPrice, leg.strike, t, iv, r, leg.type as "call" | "put");

  return {
    delta: greeks.delta * qty * sign * 100,
    gamma: greeks.gamma * qty * sign * 100,
    theta: greeks.theta * qty * sign * 100,
    vega: greeks.vega * qty * sign * 100,
    rho: greeks.rho * qty * sign * 100,
  };
}

/**
 * Aggregates a list of Greek profiles into a single net Greek summary.
 */
export function aggregateGreeks(greeksList: PortfolioGreeks[]): PortfolioGreeks {
  const aggregated = greeksList.reduce(
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
    delta: Math.round(aggregated.delta * 100) / 100,
    gamma: Math.round(aggregated.gamma * 1000) / 1000,
    theta: Math.round(aggregated.theta * 100) / 100,
    vega: Math.round(aggregated.vega * 100) / 100,
    rho: Math.round(aggregated.rho * 100) / 100,
  };
}
