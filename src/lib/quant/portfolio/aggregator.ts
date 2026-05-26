import { bsmGreeks } from "../greeks/bsm";
import { PortfolioPosition, PortfolioGreeksSummary } from "./types";

/**
 * Aggregates net portfolio Greeks across multiple positions.
 */
export function aggregatePortfolioGreeks(
  positions: PortfolioPosition[],
  spotPrices: Record<string, number>,
  ivs: Record<string, number>
): PortfolioGreeksSummary {
  let delta = 0;
  let gamma = 0;
  let theta = 0;
  let vega = 0;
  let rho = 0;

  for (const pos of positions) {
    const spot = spotPrices[pos.ticker] ?? pos.initialSpot;
    const iv = ivs[pos.ticker] ?? pos.initialIv;
    const sign = pos.side === "long" ? 1 : -1;
    const qty = pos.quantity;

    if (pos.type === "stock") {
      delta += 100 * qty * sign;
      continue;
    }

    const t = pos.expiryDte / 365;
    const greeks = bsmGreeks(spot, pos.strike, t, iv, 0.05, pos.type);

    delta += greeks.delta * qty * sign * 100;
    gamma += greeks.gamma * qty * sign * 100;
    theta += greeks.theta * qty * sign * 100;
    vega += greeks.vega * qty * sign * 100;
    rho += greeks.rho * qty * sign * 100;
  }

  return {
    delta: Math.round(delta * 100) / 100,
    gamma: Math.round(gamma * 1000) / 1000,
    theta: Math.round(theta * 100) / 100,
    vega: Math.round(vega * 100) / 100,
    rho: Math.round(rho * 100) / 100,
    netDelta: Math.round(delta * 100) / 100,
    netGamma: Math.round(gamma * 1000) / 1000,
    netTheta: Math.round(theta * 100) / 100,
    netVega: Math.round(vega * 100) / 100,
    netRho: Math.round(rho * 100) / 100,
  };
}
