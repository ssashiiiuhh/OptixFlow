// ============================================================================
// OPTIXFLOW — Multi-Slice SVI Implied Volatility Surface Generator
// Uses Vectorized SVI parameters with Linear Total Variance Interpolation.
// ============================================================================

import {
  SVISlice,
  sviVariance,
  varianceToIV,
  computeForwardPrice,
  computeLogMoneyness,
  butterflyViolation,
  calendarViolation,
} from "../../quant/volatility";

/**
 * Interpolates total variance linearly between two SVI slices, given log-moneyness (k).
 * It returns the interpolated total variance w.
 * If targetT is outside the slices, it extrapolates w by scaling the nearest slice's w linearly by T.
 */
export function interpolateSVISlices(
  k: number,
  targetT: number,
  slices: SVISlice[]
): { w: number; bViol: number; cViol: number } {
  let leftSlice = slices[0];
  let rightSlice = slices[slices.length - 1];

  for (let i = 0; i < slices.length - 1; i++) {
    if (targetT >= slices[i].T && targetT <= slices[i + 1].T) {
      leftSlice = slices[i];
      rightSlice = slices[i + 1];
      break;
    }
  }

  const w1 = sviVariance(k, leftSlice);
  const w2 = sviVariance(k, rightSlice);
  
  let w: number;
  let cViol = 0;

  if (targetT <= leftSlice.T) {
    w = w1 * (targetT / leftSlice.T);
  } else if (targetT >= rightSlice.T) {
    w = w2 * (targetT / rightSlice.T);
  } else {
    const tRatio = (targetT - leftSlice.T) / (rightSlice.T - leftSlice.T);
    w = w1 + tRatio * (w2 - w1);
    cViol = calendarViolation(w1, w2);
  }

  const bViol1 = butterflyViolation(k, leftSlice);
  const bViol2 = butterflyViolation(k, rightSlice);
  const bViol = Math.max(bViol1, bViol2);

  return { w, bViol, cViol };
}

export interface IVSurfacePoint {
  strike: number;       // Normalized strike (moneyness: K/S)
  dte: number;          // Days to expiry
  iv: number;           // Implied volatility (0..1)
  x: number;            // Grid index x
  y: number;            // Grid index y
  isLowConfidence?: boolean;
  butterflyArbitrage?: boolean;
  calendarArbitrage?: boolean;
  violationMagnitude?: number;
}

export interface IVSurfaceGrid {
  points: IVSurfacePoint[];
  strikes: number[];   // Moneyness levels
  dtes: number[];      // DTE buckets
  minIV: number;
  maxIV: number;
  ivBuffer: Float64Array;
  violationBuffer: Float64Array;
}

// Default SPX-style SVI Stack
const DEFAULT_SVI_STACK: SVISlice[] = [
  { T: 7 / 365.25, a: 0.04, b: 0.15, rho: -0.8, m: 0.05, sigma: 0.1 },
  { T: 30 / 365.25, a: 0.045, b: 0.14, rho: -0.75, m: 0.06, sigma: 0.12 },
  { T: 90 / 365.25, a: 0.05, b: 0.12, rho: -0.7, m: 0.08, sigma: 0.15 },
  { T: 180 / 365.25, a: 0.06, b: 0.1, rho: -0.6, m: 0.1, sigma: 0.2 },
];

export function generateIVSurface(
  avgIV: number,
  spot: number,
  nStrikes = 24,
  nDTEs = 16,
): IVSurfaceGrid {
  const strikes: number[] = [];
  for (let i = 0; i < nStrikes; i++) {
    strikes.push(-0.25 + (i / (nStrikes - 1)) * 0.5);
  }

  const dtes: number[] = [];
  for (let j = 0; j < nDTEs; j++) {
    dtes.push(7 + Math.round((j / (nDTEs - 1)) * 173));
  }

  const totalNodes = nStrikes * nDTEs;
  const ivBuffer = new Float64Array(totalNodes);
  const violationBuffer = new Float64Array(totalNodes);
  const points: IVSurfacePoint[] = [];

  const RISK_FREE_RATE = 0.05;
  const DIVIDEND_YIELD = 0.0;

  let minIV = Infinity;
  let maxIV = -Infinity;

  let nodeIndex = 0;
  for (let xi = 0; xi < nStrikes; xi++) {
    for (let yi = 0; yi < nDTEs; yi++) {
      const moneyness = strikes[xi];
      const dte = dtes[yi];
      const T = dte / 365.25;
      const K = spot * (1 + moneyness);
      
      const F = computeForwardPrice(spot, RISK_FREE_RATE, DIVIDEND_YIELD, T);
      const k = computeLogMoneyness(K, F);

      const { w, bViol, cViol } = interpolateSVISlices(k, T, DEFAULT_SVI_STACK);

      const iv = varianceToIV(w, T);
      
      const maxViol = Math.max(bViol, cViol);
      
      ivBuffer[nodeIndex] = iv;
      violationBuffer[nodeIndex] = maxViol;
      
      minIV = Math.min(minIV, iv);
      maxIV = Math.max(maxIV, iv);

      points.push({
        strike: moneyness,
        dte,
        iv,
        x: xi,
        y: yi,
        butterflyArbitrage: bViol > 0,
        calendarArbitrage: cViol > 0,
        violationMagnitude: maxViol,
      });
      
      nodeIndex++;
    }
  }

  // Ensure identical sorting for the renderer
  points.sort((a, b) => {
    if (a.x !== b.x) return a.x - b.x;
    return a.y - b.y;
  });

  return { points, strikes, dtes, minIV, maxIV, ivBuffer, violationBuffer };
}

/**
 * Fast ASYNC IV update — now runs synchronously due to O(1) SVI efficiency,
 * wrapped in a Promise to maintain API compatibility.
 */
export async function updateIVSurfaceAsync(
  grid: IVSurfaceGrid,
  avgIV: number,
  spot: number,
): Promise<IVSurfaceGrid> {
  return generateIVSurface(avgIV, spot, grid.strikes.length, grid.dtes.length);
}
