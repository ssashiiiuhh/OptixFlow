import { ShockParameters } from "./shockModels";

/**
 * Volatility Shocks Engine.
 * Models parallel shifts, term structure flattening, and skew smile steepening.
 */

export interface VolatilityShockProfile extends ShockParameters {
  volatilityRegimeTension: number; // 0-1 indicator of system volatility stress
}

/**
 * Generates parameters for an Implied Volatility expansion shock.
 * E.g. VIX double shift with front-end steepening.
 */
export function getIvExpansionShock(vixShiftPct: number = 0.50): VolatilityShockProfile {
  return {
    spotShiftPct: 0,
    ivShiftPct: vixShiftPct,
    skewShift: 0.12, // steepens options skew curve (greater put demand)
    volatilityRegimeTension: Math.min(1.0, vixShiftPct * 1.5),
  };
}

/**
 * Generates parameters for an IV compression/crush event (e.g., post-FOMC or earnings release).
 */
export function getIvCompressionShock(vixDropPct: number = -0.30): VolatilityShockProfile {
  return {
    spotShiftPct: 0,
    ivShiftPct: vixDropPct,
    skewShift: -0.08, // flattens skew (crushes tail premium)
    volatilityRegimeTension: 0.10,
  };
}
