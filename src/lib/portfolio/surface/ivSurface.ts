// ============================================================================
// OPTIXFLOW — Implied Volatility Surface Grid Generator
// Produces a parameterized (strike, dte, iv) mesh for the 3D WebGL renderer.
// Uses a quadratic smile + skew model calibrated per-ticker.
// ============================================================================

export interface IVSurfacePoint {
  strike: number;       // Normalized strike (moneyness: K/S)
  dte: number;          // Days to expiry
  iv: number;           // Implied volatility (0..1)
  x: number;            // Grid index x
  y: number;            // Grid index y
}

export interface IVSurfaceGrid {
  points: IVSurfacePoint[];
  strikes: number[];   // Moneyness levels
  dtes: number[];      // DTE buckets
  minIV: number;
  maxIV: number;
}

// Smile/Skew parameters per regime
interface SmileParams {
  atm: number;      // ATM base IV
  skew: number;     // Left skew steepness (puts more expensive)
  smile: number;    // Convexity (quadratic coefficient)
  term: number;     // Term structure slope (IV term premium per DTE)
}

function getSmileParams(baseIV: number): SmileParams {
  return {
    atm: baseIV,
    skew: -0.08 + (Math.random() - 0.5) * 0.02,   // Typically negative (put skew)
    smile: 0.12 + (Math.random() - 0.5) * 0.02,    // Convexity
    term: -0.004 + (Math.random() - 0.5) * 0.001,  // VIX term structure
  };
}

/**
 * Compute IV for a given moneyness (K/S - 1) and DTE using a SABR-inspired
 * quadratic approximation. Realistic for equity index skew.
 */
function computeIV(moneyness: number, dte: number, params: SmileParams): number {
  const m = moneyness; // e.g. -0.1 = 10% OTM put, +0.1 = 10% OTM call
  // Quadratic smile: IV(m) = atm + skew*m + smile*m^2
  const smileContrib = params.atm + params.skew * m + params.smile * m * m;
  // Term structure: longer DTE options have slightly different IV
  const termContrib = params.term * (dte - 30);
  return Math.max(0.04, Math.min(2.5, smileContrib + termContrib));
}

/**
 * Generate a complete IV surface grid for the 3D renderer.
 *
 * @param avgIV - Current portfolio average implied volatility (0..1)
 * @param nStrikes - Number of strike buckets (default 24)
 * @param nDTEs - Number of DTE buckets (default 16)
 */
export function generateIVSurface(
  avgIV: number,
  nStrikes = 24,
  nDTEs = 16,
): IVSurfaceGrid {
  // Strike grid: moneyness from -25% to +25%
  const strikes: number[] = [];
  for (let i = 0; i < nStrikes; i++) {
    strikes.push(-0.25 + (i / (nStrikes - 1)) * 0.5);
  }

  // DTE grid: 7 to 180 days
  const dtes: number[] = [];
  for (let j = 0; j < nDTEs; j++) {
    dtes.push(7 + Math.round((j / (nDTEs - 1)) * 173));
  }

  const params = getSmileParams(avgIV);
  const points: IVSurfacePoint[] = [];
  let minIV = Infinity;
  let maxIV = -Infinity;

  for (let xi = 0; xi < nStrikes; xi++) {
    for (let yi = 0; yi < nDTEs; yi++) {
      const iv = computeIV(strikes[xi], dtes[yi], params);
      minIV = Math.min(minIV, iv);
      maxIV = Math.max(maxIV, iv);
      points.push({
        strike: strikes[xi],
        dte: dtes[yi],
        iv,
        x: xi,
        y: yi,
      });
    }
  }

  return { points, strikes, dtes, minIV, maxIV };
}

/**
 * Fast IV update — recomputes all Z values in-place for a new avgIV.
 * Used on each ticking step to avoid re-instantiating the grid.
 */
export function updateIVSurface(
  grid: IVSurfaceGrid,
  avgIV: number,
): IVSurfaceGrid {
  const params = getSmileParams(avgIV);
  let minIV = Infinity;
  let maxIV = -Infinity;

  const updatedPoints = grid.points.map((p) => {
    const iv = computeIV(p.strike, p.dte, params);
    minIV = Math.min(minIV, iv);
    maxIV = Math.max(maxIV, iv);
    return { ...p, iv };
  });

  return { ...grid, points: updatedPoints, minIV, maxIV };
}
