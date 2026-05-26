import { SurfacePoint } from "./types";

/**
 * Pure function: Calculates strike-specific Implied Volatility incorporating skew smile
 * and term structure (contango/backwardation).
 */
export function calculateStrikeIv(
  spot: number,
  strike: number,
  dte: number,
  iv30: number,
  skewSteepness: number,
  skewTilt: number,
  isBackwardation: boolean
): number {
  const diff = strike - spot;
  
  // 1. Skew Smile Model: baseIv + steepness * diff^2 + tilt * diff
  const smileIv = iv30 + skewSteepness * Math.pow(diff, 2) + skewTilt * diff;
  const baseStrikeIv = Math.max(5.0, smileIv);

  // 2. Term Structure Model: Adjust based on Contango vs Backwardation
  let finalIv = baseStrikeIv;
  if (isBackwardation) {
    // In backwardation: front-end DTE has higher IV than long-end
    finalIv = baseStrikeIv * (1.35 * Math.exp(-dte / 30));
  } else {
    // In contango: front-end DTE is lower, long-end is higher
    finalIv = baseStrikeIv * (0.8 + 0.25 * (1 - Math.exp(-dte / 35)));
  }

  return Math.max(5.0, Math.round(finalIv * 10) / 10) / 100; // Return as decimal
}

/**
 * Generates a full volatility surface mesh.
 */
export function generateVolSurface(
  spot: number,
  iv30: number,
  skewSteepness: number,
  skewTilt: number,
  isBackwardation: boolean,
  strikes: number[],
  dtes: number[]
): SurfacePoint[] {
  const points: SurfacePoint[] = [];
  for (const dte of dtes) {
    for (const strike of strikes) {
      const iv = calculateStrikeIv(spot, strike, dte, iv30, skewSteepness, skewTilt, isBackwardation);
      points.push({ strike, dte, iv });
    }
  }
  return points;
}
