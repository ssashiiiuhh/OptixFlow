import { StrategyHoldingGroup, VaRMetrics } from "../types/portfolioTypes";
import { generateGbmPaths } from "../utils/portfolioMath";
import { revalueStrategyHolding } from "../stress/shockModels";

export interface MonteCarloSimulationResult {
  pnlDistribution: number[]; // Sorted list of simulated P&L outcomes
  varMetrics: VaRMetrics;
  meanPnl: number;
  expectedStdDev: number;
}

/**
 * Runs a multi-asset Monte Carlo simulation to estimate portfolio Value at Risk (VaR) and CVaR.
 * Simulates joint asset price paths using geometric Brownian motion (GBM).
 */
export function runPortfolioMonteCarlo(
  holdings: StrategyHoldingGroup[],
  spotPrices: Record<string, number>,
  ivs: Record<string, number>,
  horizonDays: number = 10,
  numPaths: number = 1000,
  r: number = 0.05
): MonteCarloSimulationResult {
  const pnlOutcomes: number[] = [];

  // Generate paths for each unique ticker in parallel
  const tickers = Array.from(new Set(holdings.map((h) => h.ticker)));
  const assetPaths: Record<string, number[][]> = {};

  tickers.forEach((ticker) => {
    const spot = spotPrices[ticker] || 100.0;
    const vol = ivs[ticker] || 0.25;

    // Simulate GBM price paths for the target horizon
    assetPaths[ticker] = generateGbmPaths(
      spot,
      r,           // drift is standard rate
      vol,
      1.0 / 365,   // daily steps
      horizonDays,
      numPaths
    );
  });

  // Evaluate the portfolio value at the end of the horizon across all paths
  for (let path = 0; path < numPaths; path++) {
    let pathPnl = 0;

    holdings.forEach((h) => {
      const pathsForTicker = assetPaths[h.ticker];
      if (!pathsForTicker) return;

      const pathPrices = pathsForTicker[path];
      const endingSpot = pathPrices[pathPrices.length - 1]; // spot at end of horizon

      // Apply spot shift relative to original spot
      const originalSpot = spotPrices[h.ticker] || 100.0;
      const spotShiftPct = (endingSpot - originalSpot) / originalSpot;

      // Re-value options under time decay and spot shift
      const revalued = revalueStrategyHolding(h, originalSpot, ivs[h.ticker] || 0.25, {
        spotShiftPct,
        ivShiftPct: 0, // Assume IV is constant for baseline VaR
        dteShiftDays: horizonDays,
        rShift: 0,
      });

      pathPnl += revalued.pnlImpact;
    });

    pnlOutcomes.push(pathPnl);
  }

  // Sort outcomes ascending (worst outcomes at the beginning)
  pnlOutcomes.sort((a, b) => a - b);

  // Exact Linear Interpolation for Percentiles
  const getQuantile = (arr: number[], p: number) => {
    const idx = (arr.length - 1) * p;
    const lower = Math.floor(idx);
    const upper = Math.ceil(idx);
    const weight = idx - lower;
    if (lower === upper) return arr[lower];
    return arr[lower] * (1 - weight) + arr[upper] * weight;
  };

  // Value at Risk (VaR): quantile indexes
  const index95 = Math.floor((numPaths - 1) * 0.05); // For CVaR slice
  const index99 = Math.floor((numPaths - 1) * 0.01); // For CVaR slice

  // VaR values are positive losses
  const var95 = -getQuantile(pnlOutcomes, 0.05);
  const var99 = -getQuantile(pnlOutcomes, 0.01);

  // Conditional Value at Risk (CVaR): Average loss beyond VaR threshold
  const worst95Outcomes = pnlOutcomes.slice(0, index95 + 1);
  const cvar95 = worst95Outcomes.length > 0 
    ? -worst95Outcomes.reduce((a, b) => a + b, 0) / worst95Outcomes.length
    : var95;

  const worst99Outcomes = pnlOutcomes.slice(0, index99 + 1);
  const cvar99 = worst99Outcomes.length > 0
    ? -worst99Outcomes.reduce((a, b) => a + b, 0) / worst99Outcomes.length
    : var99;

  // Mean & Standard Deviation of simulated outcomes
  const meanPnl = pnlOutcomes.reduce((a, b) => a + b, 0) / numPaths;
  const variance = pnlOutcomes.reduce((a, b) => a + Math.pow(b - meanPnl, 2), 0) / numPaths;
  const expectedStdDev = Math.sqrt(variance);

  return {
    pnlDistribution: pnlOutcomes.map((v) => Math.round(v * 100) / 100),
    varMetrics: {
      var95: Math.max(0, Math.round(var95 * 100) / 100),
      var99: Math.max(0, Math.round(var99 * 100) / 100),
      cvar95: Math.max(0, Math.round(cvar95 * 100) / 100),
      cvar99: Math.max(0, Math.round(cvar99 * 100) / 100),
    },
    meanPnl: Math.round(meanPnl * 100) / 100,
    expectedStdDev: Math.round(expectedStdDev * 100) / 100,
  };
}
