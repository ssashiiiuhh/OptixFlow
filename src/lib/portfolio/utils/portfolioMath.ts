/**
 * Math utilities for portfolio simulation, interpolation, and risk distributions.
 */

/**
 * Standard normal cumulative distribution function (CDF) approximation.
 */
export function normCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x) / Math.sqrt(2.0);

  const t = 1.0 / (1.0 + p * absX);
  const erf = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);

  return 0.5 * (1.0 + sign * erf);
}

/**
 * Inverse Normal Cumulative Distribution Function (Rational approximation).
 * Beasley-Springer-Moro algorithm or equivalent for high accuracy.
 */
export function normalQuantile(p: number, mean: number = 0, stdDev: number = 1): number {
  if (p <= 0 || p >= 1) return mean; // Out of bounds

  let x = 0;
  // Rational approximation for central and tail regions
  const a = [-3.969683028e1,  2.209460984e2, -2.759285108e2,  1.383577518e2, -3.066479809e1,  2.506628277];
  const b = [-5.447609879e1,  1.615858368e2, -1.556989798e2,  6.680131188e1, -1.328068155e1];
  const c = [-7.784894002e-3, -3.223964580e-1, -2.400758277,     -2.549732539,      4.374664141e-1,  2.938163983];
  const d = [ 7.784695709e-3,  3.224671290e-1,  2.445134137,      3.754408661];

  const pLow = 0.02425;
  const pHigh = 1.0 - pLow;

  if (p < pLow) {
    const q = Math.sqrt(-2.0 * Math.log(p));
    x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1.0);
  } else if (p <= pHigh) {
    const q = p - 0.5;
    const r = q * q;
    x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
        (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1.0);
  } else {
    const q = Math.sqrt(-2.0 * Math.log(1.0 - p));
    x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
         ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1.0);
  }

  return mean + x * stdDev;
}

/**
 * Box-Muller transform to generate standard normal random variables.
 */
export function randomNormal(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random(); // Avoid log(0)
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * Generates asset paths using Geometric Brownian Motion (GBM).
 * dS = r * S * dt + sigma * S * dW
 */
export function generateGbmPaths(
  spot: number,
  drift: number,     // Annual drift (e.g. risk-free rate 0.05)
  volatility: number,// Annual volatility (e.g. 0.20)
  timeStep: number,  // Time step in years (e.g. 1/365 for daily steps)
  numSteps: number,  // Number of time steps to walk forward
  numPaths: number   // Number of paths to simulate
): number[][] {
  const paths: number[][] = [];

  for (let path = 0; path < numPaths; path++) {
    const prices: number[] = [spot];
    let s = spot;

    for (let step = 0; step < numSteps; step++) {
      const z = randomNormal();
      // Price iteration using log-normal formula
      s = s * Math.exp((drift - 0.5 * volatility * volatility) * timeStep + volatility * Math.sqrt(timeStep) * z);
      prices.push(s);
    }
    paths.push(prices);
  }

  return paths;
}

/**
 * Performs bilinear interpolation on a 2D grid.
 * Useful for resolving stress tests between discrete data points.
 */
export function interpolate2D(
  targetX: number,
  targetY: number,
  points: { x: number; y: number; val: number }[]
): number {
  if (points.length === 0) return 0;
  if (points.length === 1) return points[0].val;

  // Find the four nearest points surrounding (targetX, targetY)
  // To keep it robust, if exact matches are found, return them.
  const exact = points.find((p) => Math.abs(p.x - targetX) < 1e-5 && Math.abs(p.y - targetY) < 1e-5);
  if (exact) return exact.val;

  // Sort points by distance and take the closest 4
  const sorted = [...points].sort((a, b) => {
    const distA = Math.pow(a.x - targetX, 2) + Math.pow(a.y - targetY, 2);
    const distB = Math.pow(b.x - targetX, 2) + Math.pow(b.y - targetY, 2);
    return distA - distB;
  });

  // Simplified Inverse Distance Weighting (IDW) interpolation
  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < Math.min(4, sorted.length); i++) {
    const p = sorted[i];
    const distSq = Math.pow(p.x - targetX, 2) + Math.pow(p.y - targetY, 2);
    
    if (distSq < 1e-7) return p.val; // extremely close

    const weight = 1.0 / distSq;
    numerator += p.val * weight;
    denominator += weight;
  }

  return numerator / denominator;
}
