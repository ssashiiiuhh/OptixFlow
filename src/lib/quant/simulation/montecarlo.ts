import { MonteCarloConfig, MonteCarloResult } from "./types";

/**
 * Box-Muller transform to generate standard normal random variables.
 */
function randomNormal(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random(); // Converting [0,1) to (0,1)
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * Simulates future underlying price paths using Geometric Brownian Motion (GBM).
 * dS = r*S*dt + sigma*S*dW_t
 */
export function simulatePaths(config: MonteCarloConfig): MonteCarloResult {
  const {
    spot,
    iv,
    r = 0.05,
    dte,
    pathsCount = 1000,
    stepsCount = 30
  } = config;

  const t = dte / 365;
  const dt = t / stepsCount;
  const sqrtDt = Math.sqrt(dt);
  const drift = (r - 0.5 * iv * iv) * dt;
  const vol = iv * sqrtDt;

  const paths: number[][] = [];
  const terminalPrices: number[] = [];
  const halfPaths = Math.ceil(pathsCount / 2);

  for (let p = 0; p < halfPaths; p++) {
    const path1: number[] = [spot];
    const path2: number[] = [spot];
    let currentSpot1 = spot;
    let currentSpot2 = spot;

    for (let s = 1; s <= stepsCount; s++) {
      const rand = randomNormal();
      currentSpot1 = currentSpot1 * Math.exp(drift + vol * rand);
      currentSpot2 = currentSpot2 * Math.exp(drift + vol * -rand);
      path1.push(currentSpot1);
      path2.push(currentSpot2);
    }

    paths.push(path1);
    terminalPrices.push(currentSpot1);
    
    if (paths.length < pathsCount) {
      paths.push(path2);
      terminalPrices.push(currentSpot2);
    }
  }

  // Sort terminal prices to calculate statistics
  const sortedPrices = [...terminalPrices].sort((a, b) => a - b);
  
  // Mean
  const sum = sortedPrices.reduce((acc, val) => acc + val, 0);
  const mean = sum / pathsCount;

  // Variance & StdDev
  const sqDiffSum = sortedPrices.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0);
  const stdDev = Math.sqrt(sqDiffSum / pathsCount);

  // Exact Linear Interpolation for Percentiles
  const getQuantile = (arr: number[], p: number) => {
    const idx = (arr.length - 1) * p;
    const lower = Math.floor(idx);
    const upper = Math.ceil(idx);
    const weight = idx - lower;
    if (lower === upper) return arr[lower];
    return arr[lower] * (1 - weight) + arr[upper] * weight;
  };

  const p10 = getQuantile(sortedPrices, 0.10);
  const p50 = getQuantile(sortedPrices, 0.50);
  const p90 = getQuantile(sortedPrices, 0.90);

  return {
    paths,
    terminalPrices,
    mean: Math.round(mean * 100) / 100,
    stdDev: Math.round(stdDev * 100) / 100,
    percentiles: {
      p10: Math.round(p10 * 100) / 100,
      p50: Math.round(p50 * 100) / 100,
      p90: Math.round(p90 * 100) / 100
    }
  };
}
