import { StrategyHoldingGroup, PortfolioGreeks } from "../types/portfolioTypes";

export interface GreekNettingSummary {
  net: number;
  longSum: number;
  shortSum: number;
  gross: number;
  offsetPct: number; // 0-100% netting efficiency
}

export interface PortfolioNettingProfile {
  delta: GreekNettingSummary;
  gamma: GreekNettingSummary;
  theta: GreekNettingSummary;
  vega: GreekNettingSummary;
  rho: GreekNettingSummary;
}

/**
 * Computes the netting efficiency and offsets of Greeks across all holdings.
 * Netting efficiency = (1 - |Net| / Gross) * 100
 */
export function computeGreeksNetting(holdings: StrategyHoldingGroup[]): PortfolioNettingProfile {
  const rollups = {
    delta: { net: 0, long: 0, short: 0 },
    gamma: { net: 0, long: 0, short: 0 },
    theta: { net: 0, long: 0, short: 0 },
    vega: { net: 0, long: 0, short: 0 },
    rho: { net: 0, long: 0, short: 0 },
  };

  holdings.forEach((h) => {
    const g = h.greeks;
    
    // Delta netting
    rollups.delta.net += g.delta;
    if (g.delta > 0) rollups.delta.long += g.delta;
    else rollups.delta.short += Math.abs(g.delta);

    // Gamma netting
    rollups.gamma.net += g.gamma;
    if (g.gamma > 0) rollups.gamma.long += g.gamma;
    else rollups.gamma.short += Math.abs(g.gamma);

    // Theta netting
    rollups.theta.net += g.theta;
    if (g.theta > 0) rollups.theta.long += g.theta;
    else rollups.theta.short += Math.abs(g.theta);

    // Vega netting
    rollups.vega.net += g.vega;
    if (g.vega > 0) rollups.vega.long += g.vega;
    else rollups.vega.short += Math.abs(g.vega);

    // Rho netting
    rollups.rho.net += g.rho;
    if (g.rho > 0) rollups.rho.long += g.rho;
    else rollups.rho.short += Math.abs(g.rho);
  });

  const makeSummary = (net: number, long: number, short: number, precision: number = 2): GreekNettingSummary => {
    const gross = long + short;
    const offsetPct = gross > 0 ? (1 - Math.abs(net) / gross) * 100 : 0;
    
    const factor = Math.pow(10, precision);
    return {
      net: Math.round(net * factor) / factor,
      longSum: Math.round(long * factor) / factor,
      shortSum: Math.round(short * factor) / factor,
      gross: Math.round(gross * factor) / factor,
      offsetPct: Math.round(offsetPct * 10) / 10,
    };
  };

  return {
    delta: makeSummary(rollups.delta.net, rollups.delta.long, rollups.delta.short, 2),
    gamma: makeSummary(rollups.gamma.net, rollups.gamma.long, rollups.gamma.short, 4),
    theta: makeSummary(rollups.theta.net, rollups.theta.long, rollups.theta.short, 2),
    vega: makeSummary(rollups.vega.net, rollups.vega.long, rollups.vega.short, 2),
    rho: makeSummary(rollups.rho.net, rollups.rho.long, rollups.rho.short, 2),
  };
}
