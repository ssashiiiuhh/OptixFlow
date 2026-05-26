export type VolatilityRegime =
  | "LOW_VOL_COMPLACENCY"   // Quiet, low VIX, range-bound
  | "PANIC_EXPANSION"      // Short-term IV spike, backwardation, heavy put skew
  | "EARNINGS_INSTABILITY" // Elevated front-end IV, localized near spot
  | "POST_EVENT_CRUSH"     // IV collapse post earnings/macro release
  | "VOL_COMPRESSION"      // Implied Volatility drifts lower, contango steepens
  | "LIQUIDITY_SHOCK";     // Wide spreads, market structure stress

export interface SurfacePoint {
  strike: number;
  dte: number;
  iv: number;
}

export interface VolatilityParams {
  iv30: number;
  hv30: number;
  ivRank: number;
  vix: number;
  skewSteepness: number;
  skewTilt: number;
  isBackwardation: boolean;
}
