// ============================================================================
// OPTIXFLOW — Implied Volatility Surface Grid Generator
// Produces a parameterized (strike, dte, iv) mesh for the 3D WebGL renderer.
// Uses the true BSM Math Engine and Vectorized IV Solver to generate the mesh.
// ============================================================================

import { bsmPrice } from "../../quant/greeks/bsm";
import { vectorizedSolveIV } from "../../quant/volatility/ivSolver";
import { VectorizedIVInput } from "../../quant/volatility/types";

export interface IVSurfacePoint {
  strike: number;       // Normalized strike (moneyness: K/S)
  dte: number;          // Days to expiry
  iv: number;           // Implied volatility (0..1)
  x: number;            // Grid index x
  y: number;            // Grid index y
  isLowConfidence?: boolean;
  butterflyArbitrage?: boolean;
  calendarArbitrage?: boolean;
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

export function generateIVSurface(
  avgIV: number,
  spot: number,
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
  const inputs: VectorizedIVInput[] = [];
  
  const RISK_FREE_RATE = 0.05;

  for (let xi = 0; xi < nStrikes; xi++) {
    for (let yi = 0; yi < nDTEs; yi++) {
      // 1. Target theoretical IV based on skew model
      const theoreticalIV = computeIV(strikes[xi], dtes[yi], params);
      
      // 2. Map moneyness to strike price
      const strikePrice = spot * (1 + strikes[xi]);
      const t = dtes[yi] / 365.25;

      // 3. Generate theoretical option price using BSM
      const targetPrice = bsmPrice(spot, strikePrice, t, theoreticalIV, RISK_FREE_RATE, "call", 0.0);

      inputs.push({
        id: `${xi}-${yi}`,
        targetPrice,
        spot,
        strike: strikePrice,
        t,
        type: "call",
        r: RISK_FREE_RATE,
        q: 0.0,
      });
    }
  }

  // 4. Run Vectorized Solver!
  const solvedGrid = vectorizedSolveIV(inputs);

  const points: IVSurfacePoint[] = [];
  let minIV = Infinity;
  let maxIV = -Infinity;

  for (let i = 0; i < solvedGrid.length; i++) {
    const solved = solvedGrid[i];
    const [xStr, yStr] = solved.id.split("-");
    const xi = parseInt(xStr, 10);
    const yi = parseInt(yStr, 10);

    const finalIV = solved.converged || solved.method === "brent" ? solved.iv : 0.04;
    
    minIV = Math.min(minIV, finalIV);
    maxIV = Math.max(maxIV, finalIV);

    points.push({
      strike: strikes[xi],
      dte: dtes[yi],
      iv: finalIV,
      x: xi,
      y: yi,
      isLowConfidence: solved.isLowConfidence,
      butterflyArbitrage: solved.butterflyArbitrage,
      calendarArbitrage: solved.calendarArbitrage,
    });
  }

  // Ensure points are sorted identically to how the mesh builder expects them
  // The renderer maps `points[xi * N_DTES + yi]` directly.
  points.sort((a, b) => {
    if (a.x !== b.x) return a.x - b.x;
    return a.y - b.y;
  });

  return { points, strikes, dtes, minIV, maxIV };
}

/**
 * Fast IV update — recomputes all Z values in-place for a new avgIV.
 * Used on each ticking step to avoid re-instantiating the grid.
 */
export function updateIVSurface(
  grid: IVSurfaceGrid,
  avgIV: number,
  spot: number,
): IVSurfaceGrid {
  const params = getSmileParams(avgIV);
  
  const inputs: VectorizedIVInput[] = [];
  const RISK_FREE_RATE = 0.05;

  for (const p of grid.points) {
    const theoreticalIV = computeIV(p.strike, p.dte, params);
    const strikePrice = spot * (1 + p.strike);
    const t = p.dte / 365.25;
    const targetPrice = bsmPrice(spot, strikePrice, t, theoreticalIV, RISK_FREE_RATE, "call", 0.0);

    inputs.push({
      id: `${p.x}-${p.y}`,
      targetPrice,
      spot,
      strike: strikePrice,
      t,
      type: "call",
      r: RISK_FREE_RATE,
      q: 0.0,
    });
  }

  const solvedGrid = vectorizedSolveIV(inputs);
  
  let minIV = Infinity;
  let maxIV = -Infinity;

  const pointMap = new Map<string, IVSurfacePoint>();
  
  for (let i = 0; i < solvedGrid.length; i++) {
    const solved = solvedGrid[i];
    const finalIV = solved.converged || solved.method === "brent" ? solved.iv : 0.04;
    minIV = Math.min(minIV, finalIV);
    maxIV = Math.max(maxIV, finalIV);

    const [xStr, yStr] = solved.id.split("-");
    const xi = parseInt(xStr, 10);
    const yi = parseInt(yStr, 10);

    pointMap.set(solved.id, {
      strike: grid.points.find(gp => gp.x === xi && gp.y === yi)!.strike,
      dte: grid.points.find(gp => gp.x === xi && gp.y === yi)!.dte,
      iv: finalIV,
      x: xi,
      y: yi,
      isLowConfidence: solved.isLowConfidence,
      butterflyArbitrage: solved.butterflyArbitrage,
      calendarArbitrage: solved.calendarArbitrage,
    });
  }

  const updatedPoints = grid.points.map(p => pointMap.get(`${p.x}-${p.y}`)!);

  return { ...grid, points: updatedPoints, minIV, maxIV };
}

