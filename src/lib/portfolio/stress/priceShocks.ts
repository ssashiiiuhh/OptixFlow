import { ShockParameters } from "./shockModels";

/**
 * Price Shocks Engine.
 * Models discrete price shifts, tail gap risks, and black swan price drops.
 */

export interface PriceShockProfile extends ShockParameters {
  isTailEvent: boolean;
  gapMultiplier: number; // Factor representing overnight execution slippage risk
}

/**
 * Generates parameters for a severe downside index crash.
 */
export function getTailCrashShock(): PriceShockProfile {
  return {
    spotShiftPct: -0.22, // -22% index drawdown
    ivShiftPct: 0.75,    // IV expands by 75%
    skewShift: 0.25,     // massive put skew smirk
    isTailEvent: true,
    gapMultiplier: 1.5,  // high risk of limit-down trading halts
  };
}

/**
 * Generates parameters for a rapid short squeeze / market breakout.
 */
export function getShortSqueezeShock(): PriceShockProfile {
  return {
    spotShiftPct: 0.12,  // +12% breakout
    ivShiftPct: 0.20,    // IV rises as calls get squeezed
    skewShift: -0.05,    // flattens put skew, steepens call side
    isTailEvent: false,
    gapMultiplier: 1.0,
  };
}
